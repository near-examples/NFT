import { PersistentMap, storage, context, ContractPromiseBatch, u128 } from 'near-sdk-as'


/**************************/
/* DATA TYPES AND STORAGE */
/**************************/

class NFTContractMetadata {
  spec: string = "default"; // required, essentially a version like "nft-1.0.0"
  name: string = "default"; // required, ex. "Mochi Rising — Digital Edition" or "Metaverse 3"
  symbol: string = "default"; // required, ex. "MOCHI"
  icon: string|null; // Data URL
  base_uri: string|null; // Centralized gateway known to have reliable access to decentralized storage assets referenced by `reference` or `media` URLs
  reference: string|null; // URL to a JSON file with more info
  reference_hash: string|null; // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
}

type AccountId = string
type TokenId = u64
type Price = u128


// The strings used to index variables in storage can be any string
// Let's set them to single characters to save storage space
const tokenToOwner = new PersistentMap<TokenId, AccountId>('a')

// Note that with this implementation, an account can only set one escrow at a
// time. You could make values an array of AccountIds if you need to, but this
// complicates the code and costs more in storage rent.
const escrowAccess = new PersistentMap<AccountId, AccountId>('b')

// key in storage used to track the current minted supply
const CURRENT_SUPPLY = 'c'
// maximum supply that can be ever minted, it can only be set once
const MAX_SUPPLY = 'd'
// store for admin account id, used to give special privileges
const ADMIN = 'e'

const publishers = new PersistentMap<AccountId, u8>('f')

const prices = new PersistentMap<u8, Price>('j')
const PUBLISHER_FEE = 0
const ARTICLE_PRICE = 1

// nft metadata, nep-171
/*
const METADATA = 'j'
const Metadata_Obj = new NFTContractMetadata()
Metadata_Obj.spec = "nft-1.0.0"
Metadata_Obj.name = "some Article about someting" // required, ex. "Mochi Rising — Digital Edition" or "Metaverse 3"
Metadata_Obj.symbol = "article-01" // required, ex. "MOCHI"
Metadata_Obj.icon = "https://near.org/wp-content/uploads/2019/03/icon-user-first.svg" // Data URL
Metadata_Obj.base_uri = null // Centralized gateway known to have reliable access to decentralized storage assets referenced by `reference` or `media` URLs
Metadata_Obj.reference = null // URL to a JSON file with more info
Metadata_Obj.reference_hash = null // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.

*/
/******************/
/* ERROR MESSAGES */
/******************/

// These are exported for convenient unit testing
export const ERROR_NO_ESCROW_REGISTERED = 'Caller has no escrow registered'
export const ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION = 'Caller ID does not match expectation'
export const ERROR_MAXIMUM_TOKEN_LIMIT_REACHED = 'Maximum token limit reached'
export const ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION = 'Owner id does not match real token owner id'
export const ERROR_TOKEN_NOT_OWNED_BY_CALLER = 'Token is not owned by the caller. Please use transfer_from for this scenario'

/******************/
/* CHANGE METHODS */
/******************/

// Grant access to the given `accountId` for all tokens the caller has
export function grant_access(escrow_account_id: string): void {
  escrowAccess.set(context.predecessor, escrow_account_id)
}

// Revoke access to the given `accountId` for all tokens the caller has
export function revoke_access(escrow_account_id: string): void {
  escrowAccess.delete(context.predecessor)
}

// Transfer the given `token_id` to the given `new_owner_id`. Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor`) should have access to the token.
export function transfer_from(owner_id: string, new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor

  // fetch token owner and escrow; assert access
  const owner = tokenToOwner.getSome(token_id)
  assert(owner == owner_id, ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION)
  const escrow = escrowAccess.get(owner)
  assert([owner, escrow].includes(predecessor), ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

  // assign new owner to token
  tokenToOwner.set(token_id, new_owner_id)
}


// Transfer the given `token_id` to the given `new_owner_id`. Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor`) should be the owner of the token. Callers who have
// escrow access should use transfer_from.
export function transfer(new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor

  // fetch token owner and escrow; assert access
  const owner = tokenToOwner.getSome(token_id)
  assert(owner == predecessor, ERROR_TOKEN_NOT_OWNED_BY_CALLER)

  // assign new owner to token
  tokenToOwner.set(token_id, new_owner_id)
}

//add publisher to the array
export function add_publisher(account_id: AccountId): void {
  const owner = storage.getString(ADMIN)
  assert(owner != account_id, 'admin cannot be publisher')
  let publisherFee = get_publisher_fee()
  let receivedAmt = context.attachedDeposit
  assert(receivedAmt >= publisherFee, 'attached amount is not enough')
  publishers.set(account_id, 1)
  if(receivedAmt > publisherFee) {
    // refund excess amount to sender
    // tranfer the deposit to token owner and smart contract
    ContractPromiseBatch.create(context.predecessor).transfer(receivedAmt - publisherFee)
  }
}

// journalist has to call this to identify himself as admin
// this gives him special privileges. This can only be done once
export function init_admin(): void {
  assert(storage.getString(ADMIN) == null, "Already initialized admin")
  storage.setString(ADMIN, context.predecessor)
  assert(storage.getString(ADMIN) == context.predecessor, "initialization failed")
}

// set maximum supply to ever be minted
// can only be done once
export function init_max_supply(max_supp: u64): void {
  let registered_admin = storage.getString(ADMIN)
  assert(context.predecessor == registered_admin, "only admin can initialize max supply")
  assert(storage.getPrimitive<u64>(MAX_SUPPLY, 0) == 0, "Already initialized max supply")
  storage.set(MAX_SUPPLY, max_supp)
  assert(storage.getPrimitive<u64>(MAX_SUPPLY, 0) == max_supp, "initialization failed")
}

export function set_pub_fee(pub_fee: Price): boolean {
  let admin = storage.getString(ADMIN)
  let pred = context.predecessor
  assert(pred == admin, "only admin can set publisher fee")
  prices.set(PUBLISHER_FEE as u8, pub_fee)
  return true
}

export function set_price(price: Price): boolean {
  let admin = storage.getString(ADMIN)
  let pred = context.predecessor
  assert(pred == admin, "only admin can set article price")
  prices.set(ARTICLE_PRICE as u8, price)
  return true
}

/****************/
/* VIEW METHODS */
/****************/

// Returns `true` or `false` based on caller of the function (`predecessor`) having access to account_id's tokens
export function check_access(account_id: string): boolean {
  const caller = context.predecessor

  // throw error if someone tries to check if they have escrow access to their own account;
  // not part of the spec, but an edge case that deserves thoughtful handling
  assert(caller != account_id, ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

  // if we haven't set an escrow yet, then caller does not have access to account_id
  if (!escrowAccess.contains(account_id)) {
    return false
  }

  const escrow = escrowAccess.getSome(account_id)
  return escrow == caller
}

// Get an individual owner by given `tokenId`
export function get_token_owner(token_id: TokenId): string {
  return tokenToOwner.getSome(token_id)
}

export function get_max_supply(): u64 {
  return storage.getPrimitive<u64>(MAX_SUPPLY, 0)
}

export function get_current_supply(): u64 {
  return storage.getPrimitive<u64>(CURRENT_SUPPLY, 0)
}

export function get_admin(): string | null {
  return storage.getString(ADMIN)
}

export function get_publisher_fee() : Price {
  return prices.getSome(PUBLISHER_FEE as u8)
}

export function is_publisher(account_id: AccountId) : boolean {
  return publishers.contains(account_id)
}

export function get_price() : Price {
  return prices.getSome(ARTICLE_PRICE as u8)
}

/*
export function nft_metadata(): string {
  return JSON.stringify(Metadata_Obj)
}
*/

/********************/
/* NON-SPEC METHODS */
/********************/

// internal function for minting an NFT
// implement a real NFT like this!
function _mint_to(owner_id: AccountId): u64 {
  // Fetch the next tokenId, using a simple indexing strategy that matches IDs
  // to current supply, defaulting the first token to ID=1
  //
  // * If your implementation allows deleting tokens, this strategy will not work!
  // * To verify uniqueness, you could make IDs hashes of the data that makes tokens
  //   special; see https://twitter.com/DennisonBertram/status/1264198473936764935
  const tokenId = storage.getPrimitive<u64>(CURRENT_SUPPLY, 0)
  const maxSupply = storage.getPrimitive<u64>(MAX_SUPPLY, 0)

  // enforce token limits – not part of the spec but important!
  assert(tokenId <= maxSupply, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)

  // assign ownership
  tokenToOwner.set(tokenId, owner_id)

  // increment and store the next tokenId
  storage.set<u64>(CURRENT_SUPPLY, tokenId + 1)

  // return the tokenId – while typical change methods cannot return data, this
  // is handy for unit tests
  return tokenId
}

import { PersistentMap, storage, context } from 'near-sdk-as'

/**************************/
/* DATA TYPES AND STORAGE */
/**************************/

type AccountId = string
type TokenId = u64

// Note that MAX_SUPPLY is implemented here as a simple constant
// It is exported only to facilitate unit testing
export const MAX_SUPPLY = u64(10)

// The strings used to index variables in storage can be any string
// Let's set them to single characters to save storage space
const tokenToOwner = new PersistentMap<TokenId, AccountId>('a')

// Note that with this implementation, an account can only set one escrow at a
// time. You could make values an array of AccountIds if you need to, but this
// complicates the code and costs more in storage rent.
const escrowAccess = new PersistentMap<AccountId, AccountId>('b')

// This is a key in storage used to track the current minted supply
const TOTAL_SUPPLY = 'c'

/******************/
/* ERROR MESSAGES */
/******************/

// These are exported for convenient unit testing
export const ERROR_NO_ESCROW_REGISTERED = 'Caller has no escrow registered'
export const ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION = 'Caller ID does not match expectation'
export const ERROR_MAXIMUM_TOKEN_LIMIT_REACHED = 'Maximum token limit reached'

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

// Transfer the given `token_id` to the given `new_owner_id`. Account `new_owner_id` becomes the new owner
// Requirements:
// * The caller of the function (`predecessor`) should own or have access to the token
export function transfer(new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor

  // fetch token owner and escrow; assert access
  const owner = tokenToOwner.getSome(token_id)
  const escrow = escrowAccess.get(owner)
  assert([owner, escrow].includes(predecessor), ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

  // assign new owner to token
  tokenToOwner.set(token_id, new_owner_id)
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

/********************/
/* NON-SPEC METHODS */
/********************/

// Note that ANYONE can call this function! You probably would not want to
// implement a real NFT like this!
export function mint_to(owner_id: AccountId): u64 {
  // Fetch the next tokenId, using a simple indexing strategy that matches IDs
  // to current supply, defaulting the first token to ID=1
  //
  // * If your implementation allows deleting tokens, this strategy will not work!
  // * To verify uniqueness, you could make IDs hashes of the data that makes tokens
  //   special; see https://twitter.com/DennisonBertram/status/1264198473936764935
  const tokenId = storage.getPrimitive<u64>(TOTAL_SUPPLY, 1)

  // enforce token limits – not part of the spec but important!
  assert(tokenId <= MAX_SUPPLY, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)

  // assign ownership
  tokenToOwner.set(tokenId, owner_id)

  // increment and store the next tokenId
  storage.set<u64>(TOTAL_SUPPLY, tokenId + 1)

  // return the tokenId – while typical change methods cannot return data, this
  // is handy for unit tests
  return tokenId
}

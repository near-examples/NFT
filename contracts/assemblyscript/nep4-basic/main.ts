import { PersistentMap, storage, context, ContractPromiseBatch, base64 } from 'near-sdk-as'
import { Storage, u128 } from 'near-sdk-core';

/**************************/
/* DATA TYPES AND STORAGE */
/**************************/

type AccountId = string
type TokenId = u64

// Note that MAX_SUPPLY is implemented here as a simple constant
// It is exported only to facilitate unit testing
export const MAX_SUPPLY = u64(100)
export const MAX_MIXES_PER_TOKEN = 20;
export const MAX_MIX_BYTES = 200;

// The strings used to index variables in storage can be any string
// Let's set them to single characters to save storage space
const tokenToOwner = new PersistentMap<TokenId, AccountId>('a')


// Note that with this implementation, an account can only set one escrow at a
// time. You could make values an array of AccountIds if you need to, but this
// complicates the code and costs more in storage rent.
const escrowAccess = new PersistentMap<AccountId, AccountId>('b')

// This is a key in storage used to track the current minted supply
const TOTAL_SUPPLY = 'c'

@deprecated("content is stored as Uint8Array")
const tokenToContent = new PersistentMap<TokenId, string>('d')

const tokenForSale = new PersistentMap<TokenId, string>('e');
const tokenListenPrice = new PersistentMap<TokenId, string>('f');
const tokenMixes = new PersistentMap<TokenId,Array<string>>('g');

/******************/
/* ERROR MESSAGES */
/******************/

// These are exported for convenient unit testing
export const ERROR_NO_ESCROW_REGISTERED = 'Caller has no escrow registered'
export const ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION = 'Caller ID does not match expectation'
export const ERROR_MAXIMUM_TOKEN_LIMIT_REACHED = 'Maximum token limit reached'
export const ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION = 'Owner id does not match real token owner id'
export const ERROR_TOKEN_NOT_OWNED_BY_CALLER = 'Token is not owned by the caller. Please use transfer_from for this scenario'
export const ERROR_TOKEN_NOT_FOR_SALE = 'Token is not for sale'
export const ERROR_LISTENING_NOT_AVAILABLE = 'Listening is not available'
export const ERROR_LISTENING_REQUIRES_PAYMENT = 'Listening requires payment, call request_listening first'
export const ERROR_OWNERS_NOT_REQUIRED_TO_REQUEST_LISTENING = 'Owners are not required to request listening'
export const ERROR_MIX_TOO_LARGE = 'Mix too large, max size is '+MAX_MIX_BYTES.toString()
export const ERROR_TOKEN_DOES_NOT_SUPPORT_MIXING = 'Token does not support mixing'

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

@deprecated
@payable
export function mint_to(owner_id: AccountId, content: string): u64 {
  const mintprice: u128 = u128.pow(u128.from(10), 24) * u128.from(content.length); // 1 N per character
  assert(context.attachedDeposit == mintprice, "Method requires deposit of " + mintprice.toString());
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
  tokenToContent.set(tokenId, content)

  // increment and store the next tokenId
  storage.set<u64>(TOTAL_SUPPLY, tokenId + 1)

  // return the tokenId – while typical change methods cannot return data, this
  // is handy for unit tests
  return tokenId
}

@payable
export function mint_to_base64(owner_id: AccountId, contentbase64: string, supportmixing: boolean = false): u64 {
  const content = base64.decode(contentbase64);
  const mintprice: u128 = u128.pow(u128.from(10), 20) * u128.from(contentbase64.length); // 0.0001 N per character
  assert(context.attachedDeposit == mintprice, "Method requires deposit of " + mintprice.toString());
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
  Storage.setBytes('t' + tokenId.toString(), content)

  // increment and store the next tokenId
  storage.set<u64>(TOTAL_SUPPLY, tokenId + 1)

  if (supportmixing) {
    tokenMixes.set(tokenId,new Array<string>());
  }
  // return the tokenId – while typical change methods cannot return data, this
  // is handy for unit tests
  return tokenId
}

export function replace_content_base64(tokenId: TokenId, contentbase64: string, supportmixing: boolean = false): void {
  const predecessor = context.predecessor
  const owner = tokenToOwner.getSome(tokenId)
  assert(owner == predecessor, ERROR_TOKEN_NOT_OWNED_BY_CALLER)

  const mintprice: u128 = u128.pow(u128.from(10), 20) * u128.from(contentbase64.length); // 0.0001 N per character
  assert(context.attachedDeposit == mintprice, "Method requires deposit of " + mintprice.toString());

  const content = base64.decode(contentbase64);
  
  Storage.setBytes('t' + tokenId.toString(), content)

  if (supportmixing) {
    tokenMixes.set(tokenId,new Array<string>())
  } else {
    tokenMixes.delete(tokenId)
  }
}

// Get content behind token
@deprecated
export function get_token_content(token_id: TokenId): string {
  const predecessor = context.predecessor
  const owner = tokenToOwner.getSome(token_id)
  assert(owner == predecessor, ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  return tokenToContent.getSome(token_id)
}

@payable
export function request_listening(token_id: TokenId): ContractPromiseBatch {
  const predecessor = context.predecessor
  const owner = tokenToOwner.getSome(token_id)
  assert(owner != predecessor, ERROR_OWNERS_NOT_REQUIRED_TO_REQUEST_LISTENING)
  assert(tokenListenPrice.contains(token_id), ERROR_LISTENING_NOT_AVAILABLE)
  const listenPrice = u128.from(tokenListenPrice.get(token_id)!);
  assert(context.attachedDeposit == listenPrice, "Method requires deposit " + listenPrice.toString())
  
  const listeningKey = 'l:' + predecessor
  Storage.set<u64>(listeningKey, token_id)
  // 99 % to owner
  const amountToOwner = changetype<u128>(context.attachedDeposit * u128.fromI32(99) / u128.fromI32(100))
  return ContractPromiseBatch.create(owner).transfer(amountToOwner)  
}

export function view_token_content_base64(token_id: TokenId): String {
  return base64.encode(Storage.getBytes('t' + token_id.toString())!)
}

export function get_token_content_base64(token_id: TokenId): Uint8Array {
  const predecessor = context.predecessor
  const owner = tokenToOwner.getSome(token_id)
  
  if (owner != predecessor) {
    const listeningKey = 'l:' + predecessor;
    assert(Storage.getPrimitive<u64>(listeningKey, 0) === token_id, ERROR_LISTENING_REQUIRES_PAYMENT)
    Storage.delete(listeningKey)
  }  
  const contentbytes = Storage.getBytes('t' + token_id.toString())!
  return contentbytes
}

export function get_listening_price(token_id: TokenId): String {
  return tokenListenPrice.get(token_id)!;
}

export function set_listening_price(token_id: TokenId, price: u128): void {
  const predecessor = context.predecessor
  assert(predecessor == tokenToOwner.get(token_id), ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  tokenListenPrice.set(token_id, price.toString())
}

export function sell_token(token_id: TokenId, price: u128): void {
  const predecessor = context.predecessor
  assert(predecessor == tokenToOwner.get(token_id), ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  tokenForSale.set(token_id, price.toString())
}

export function view_price(token_id: TokenId): u128 {
  assert(tokenForSale.contains(token_id), ERROR_TOKEN_NOT_FOR_SALE)
  return u128.from(tokenForSale.getSome(token_id))
}

@payable
export function buy_token(token_id: TokenId): ContractPromiseBatch {
  const predecessor = context.predecessor
  assert(tokenForSale.contains(token_id), ERROR_TOKEN_NOT_FOR_SALE)

  const askingPrice = u128.from(tokenForSale.get(token_id)!);
  assert(context.attachedDeposit == askingPrice, "Method requires deposit " + askingPrice.toString())
  const owner = tokenToOwner.get(token_id)!

  tokenToOwner.set(token_id, predecessor)
  tokenForSale.delete(token_id)

  return ContractPromiseBatch.create(owner).transfer(context.attachedDeposit)
}

export function publish_token_mix(token_id: TokenId, mix: u8[]): void {
  assert(tokenMixes.contains(token_id), ERROR_TOKEN_DOES_NOT_SUPPORT_MIXING)
  assert(mix.length < MAX_MIX_BYTES, ERROR_MIX_TOO_LARGE)
    
  let mixes: Array<string> = tokenMixes.get(token_id)!

  mixes.unshift(context.predecessor+';'+context.blockTimestamp.toString()+';'+mix.toString());

  if (mixes.length > MAX_MIXES_PER_TOKEN) {
    mixes = mixes.slice(0, MAX_MIXES_PER_TOKEN)
  }
  tokenMixes.set(token_id, mixes)
}

export function upvote_mix(token_id: TokenId, mix: string): void {
  assert(tokenMixes.contains(token_id), ERROR_TOKEN_DOES_NOT_SUPPORT_MIXING)

  let mixes: Array<string> = tokenMixes.get(token_id)!
  let matchingMixIndex = -1;

  for (let n=0;n<mixes.length; n++) {
    if (mixes[n] == mix) {
      matchingMixIndex = n;
      break;
    }
  }
  
  if (matchingMixIndex > 0) {
    const matchingMix = mixes[matchingMixIndex];
    mixes[matchingMixIndex] = mixes[matchingMixIndex - 1]
    mixes[matchingMixIndex - 1] = matchingMix
    tokenMixes.set(token_id, mixes)
  }
}

export function get_token_mixes(token_id: TokenId): string[] {
  return tokenMixes.get(token_id)!
}

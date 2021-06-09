import { PersistentMap, storage, context, ContractPromiseBatch, base64, util } from 'near-sdk-as'
import { Storage, u128 } from 'near-sdk-core'
import { sha256HashInit, sha256HashUpdate, sha256HashFinal } from '../../../node_modules/wasm-crypto/assembly/crypto';

/**************************/
/* DATA TYPES AND STORAGE */
/**************************/

type AccountId = string
type TokenId = u64
type ListenRequest = string
type ListenCredit = string

// Note that MAX_SUPPLY is implemented here as a simple constant
// It is exported only to facilitate unit testing
export const MAX_SUPPLY = u64(100)
export const MAX_MIXES_PER_TOKEN = 20
export const MAX_MIX_BYTES = 200
export const MAX_MIX_BYTES_BASE64 = 2000
export const LISTEN_PRICE = u128.from('10000000000000000000000') // 0.01 per listen
export const LISTEN_REQUEST_TIMEOUT: u64 = 5 * 60 * 1000000000 // 5 secs

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
const remixTokens = new PersistentMap<TokenId, string>('d')
const tokenForSale = new PersistentMap<TokenId, string>('e')

const tokenMixes = new PersistentMap<TokenId, Array<string>>('g')
const listenCredit = new PersistentMap<AccountId, ListenCredit>('lc')

const BENEFICIARY_ACCOUNT_ID = 'beneficiary_account';
const SELL_CONTRACT_TO = 'sell_contract_to';

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
export const ERROR_LISTENING_NOT_AUTHORIZED = 'Listening is not authorized'
export const ERROR_LISTENING_REQUIRES_PAYMENT = 'Listening requires payment, call request_listening first'
export const ERROR_LISTENING_EXPIRED = 'Listening request expired, please create a new'
export const ERROR_LISTENING_CREDIT_NOT_ENOUGH = 'Not enough credits'
export const ERROR_LISTENING_CREDIT_TRANSFER_AMOUNT_NEGATIVE = 'Stealing credits is not allowed'
export const ERROR_LISTENING_CREDIT_TRANSFER_RECEIVER_INVALID = 'Invalid receiver'
export const ERROR_MIX_TOO_LARGE = 'Mix too large, max size is ' + MAX_MIX_BYTES.toString()
export const ERROR_TOKEN_DOES_NOT_SUPPORT_MIXING = 'Token does not support mixing'
export const ERROR_NO_LISTENING_CREDIT = 'No credits'
export const MUST_BE_CALLED_BY_BENEFICIARY = 'Must be called by beneficiary'
export const NO_BENEFICIARY_SET = 'Account has no beneficiary'
export const CONTRACT_NOT_FOR_SALE = 'Contract is not for sale'
export const INVALID_CONTRACT_BUYER = 'Invalid contract buyer'

const WEB4_STORAGEKEY_PREFIX = 'web4_';
@nearBindgen
class Web4Request {
  accountId: string | null;
  path: string;
  params: Map<string, string>;
  query: Map<string, Array<string>>;
  preloads: Map<string, Web4Response>;
}

@nearBindgen
class Web4Response {
  contentType: string;
  body: Uint8Array;
  preloadUrls: string[] = [];
}

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

export function sell_contract_to(sell_to_account_id: string, amount: u128): void {
  const predecessor = context.predecessor
  assert(
    (!storage.contains(BENEFICIARY_ACCOUNT_ID) && predecessor == context.contractName) ||
    predecessor == storage.get<string>(BENEFICIARY_ACCOUNT_ID), MUST_BE_CALLED_BY_BENEFICIARY
  )
  if (sell_to_account_id.length > 0) {
    storage.set<string>(SELL_CONTRACT_TO, sell_to_account_id + ':' + amount.toString())
  } else {
    storage.delete(SELL_CONTRACT_TO)
  }
}

@payable
export function buy_contract(): void {
  const predecessor = context.predecessor
  assert(storage.contains(SELL_CONTRACT_TO), CONTRACT_NOT_FOR_SALE)
  const targetBuyerInfo = storage.get<string>(SELL_CONTRACT_TO)!.split(':');
  const targetBuyer = targetBuyerInfo[0];
  const amount = u128.fromString(targetBuyerInfo[1]);

  assert(
    targetBuyer == predecessor, INVALID_CONTRACT_BUYER
  )
  assert(context.attachedDeposit == amount, 'wrong amount, price for buying the contract is ' + amount.toString())
  storage.set<string>(BENEFICIARY_ACCOUNT_ID, targetBuyer)
}

export function transfer_funds(amount: u128): ContractPromiseBatch {
  const predecessor = context.predecessor

  assert(storage.contains(BENEFICIARY_ACCOUNT_ID), NO_BENEFICIARY_SET)
  const beneficiary_account = storage.get<string>(BENEFICIARY_ACCOUNT_ID)
  assert(predecessor == beneficiary_account, MUST_BE_CALLED_BY_BENEFICIARY)
  return ContractPromiseBatch.create(predecessor).transfer(amount)
}

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
    tokenMixes.set(tokenId, new Array<string>());
  }
  // return the tokenId – while typical change methods cannot return data, this
  // is handy for unit tests
  return tokenId
}

// Get content behind token
@deprecated
export function get_token_content(token_id: TokenId): string {
  const predecessor = context.predecessor
  const owner = tokenToOwner.getSome(token_id)
  assert(owner == predecessor, ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  return tokenToContent.getSome(token_id)
}

export function view_remix_content(token_id: TokenId): string {
  return remixTokens.getSome(token_id)
}

function spend_listening_credit(listener: string, token_id: TokenId, listenRequestPasswordHash: string): void {
  const owner = tokenToOwner.getSome(token_id)
  if (owner != listener) {
    assert(listenCredit.contains(listener), ERROR_NO_LISTENING_CREDIT)
    const currentListenCredit = I32.parseInt(listenCredit.get(listener)!)

    assert(currentListenCredit > 0, ERROR_NO_LISTENING_CREDIT)
    listenCredit.set(listener, (currentListenCredit - 1).toString())

    // credit the NFT owner
    const ownerListenCredit: i32 = listenCredit.contains(owner) ? I32.parseInt(listenCredit.get(owner)!) : 0
    listenCredit.set(owner, (ownerListenCredit + 1).toString())
  }
  const listeningKey = 'l:' + listener + ':' + token_id.toString()
  Storage.set<ListenRequest>(listeningKey, listenRequestPasswordHash + ',' + context.blockTimestamp.toString())
}

export function request_listening(token_id: TokenId, listenRequestPasswordHash: string, remix_token_id: TokenId = 0): void {
  const listener = context.predecessor
  spend_listening_credit(listener, token_id, listenRequestPasswordHash)
  if (remix_token_id > 0) {
    spend_listening_credit(listener, remix_token_id, listenRequestPasswordHash)
  }
}

export function view_listening_credit(account: AccountId): i32 {
  const currentListenCredit: i32 = listenCredit.contains(account) ? I32.parseInt(listenCredit.get(account)!) : 0
  return currentListenCredit
}

@payable
export function buy_listening_credit(): void {
  const predecessor = context.predecessor

  const currentListenCredit: u128 = listenCredit.contains(predecessor) ? u128.fromString(listenCredit.get(predecessor)!) : u128.Zero
  listenCredit.set(predecessor, (currentListenCredit +
    (context.attachedDeposit / LISTEN_PRICE)).toString())
}

export function transfer_listening_credit(receiver_account: string, amount: i32): void {
  assert(amount > 0, ERROR_LISTENING_CREDIT_TRANSFER_AMOUNT_NEGATIVE)
  assert(receiver_account.length > 2 && receiver_account.length <= 64, ERROR_LISTENING_CREDIT_TRANSFER_RECEIVER_INVALID)
  const predecessor = context.predecessor
  const senderCurrentListenCredit: i32 = listenCredit.contains(predecessor) ? I32.parseInt(listenCredit.get(predecessor)!) : 0
  assert(senderCurrentListenCredit >= amount, ERROR_LISTENING_CREDIT_NOT_ENOUGH)
  const receiverCurrentListenCredit: i32 = listenCredit.contains(receiver_account) ? I32.parseInt(listenCredit.get(receiver_account)!) : 0

  listenCredit.set(predecessor, (senderCurrentListenCredit - amount).toString())
  listenCredit.set(receiver_account, (receiverCurrentListenCredit + amount).toString())
}

export function view_token_content_base64(token_id: TokenId): String {
  return base64.encode(Storage.getBytes('t' + token_id.toString())!)
}

function verifyListenRequestPassword(token_id: TokenId, caller: string, listenRequestPassword: string): void {
  const listeningKey = 'l:' + caller + ':' + token_id.toString()

  assert(Storage.contains(listeningKey), ERROR_LISTENING_REQUIRES_PAYMENT)
  const listenRequestParts = Storage.getPrimitive<ListenRequest>(listeningKey, '').split(',')
  const listenRequestPasswordHash = base64.decode(listenRequestParts[0])
  const listenRequestTimeStamp = U64.parseInt(listenRequestParts[1])

  const hashState = sha256HashInit();
  sha256HashUpdate(hashState, Uint8Array.wrap(String.UTF8.encode(listenRequestPassword)))
  const hash = sha256HashFinal(hashState)
  let hashEquals = true;
  for (let n = 0; n < hash.length; n++) {
    if (hash[n] != listenRequestPasswordHash[n]) {
      hashEquals = false
      break
    }
  }

  assert(hashEquals, ERROR_LISTENING_NOT_AUTHORIZED)
  assert((context.blockTimestamp - listenRequestTimeStamp) < LISTEN_REQUEST_TIMEOUT, ERROR_LISTENING_EXPIRED)
}

export function get_token_content_base64(token_id: TokenId, caller: string, listenRequestPassword: string): Uint8Array {
  verifyListenRequestPassword(token_id, caller, listenRequestPassword)
  const contentbytes = Storage.getBytes('t' + token_id.toString())!
  return contentbytes
}

export function get_remix_token_content(token_id: TokenId, caller: string, listenRequestPassword: string): string {
  verifyListenRequestPassword(token_id, caller, listenRequestPassword)
  return remixTokens.getSome(token_id)
}

export function sell_token(token_id: TokenId, price: u128): void {
  const predecessor = context.predecessor
  assert(predecessor == tokenToOwner.get(token_id), ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  tokenForSale.set(token_id, price.toString())
}

export function remove_token_from_sale(token_id: TokenId): void {
  const predecessor = context.predecessor
  assert(predecessor == tokenToOwner.get(token_id), ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  tokenForSale.delete(token_id)
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

  if (token_id > 1 && remixTokens.contains(token_id)) {
    const remixcontentparts = remixTokens.get(token_id)!.split(';')
    const original_token_id = u128.fromString(remixcontentparts[0]).toU64();
    const original_token_owner = tokenToOwner.get(original_token_id)!
    const remix_author = remixcontentparts[1]
    // 2% to original content owner
    const amountToOriginalTokenOwner = changetype<u128>(context.attachedDeposit * u128.fromI32(2) / u128.fromI32(100))
    // 2% to remix author
    const amountToRemixAuthor = changetype<u128>(context.attachedDeposit * u128.fromI32(2) / u128.fromI32(100))
    // 1% to contract
    const amountToContract = changetype<u128>(context.attachedDeposit * u128.fromI32(1) / u128.fromI32(100))
    const amountToRemixOwner = context.attachedDeposit - amountToContract - amountToRemixAuthor - amountToOriginalTokenOwner
    return ContractPromiseBatch.create(owner).transfer(amountToRemixOwner)
      .then(original_token_owner).transfer(amountToOriginalTokenOwner)
      .then(remix_author).transfer(amountToRemixAuthor)
  } else {
    // 1% to contract
    const amountToContract = changetype<u128>(context.attachedDeposit * u128.fromI32(1) / u128.fromI32(100))
    return ContractPromiseBatch.create(owner).transfer(context.attachedDeposit - amountToContract)
  }
}

@payable
export function buy_mix(original_token_id: TokenId, mix: string): ContractPromiseBatch {
  assert(mix.split(';')[1].indexOf('nft:') !== 0, 'mix is already an nft')

  let mixes: Array<string> = tokenMixes.get(original_token_id)!

  for (let n = 0; n < mixes.length; n++) {
    if (mixes[n] == mix) {
      // create a new NFT
      const tokenId = storage.getPrimitive<u64>(TOTAL_SUPPLY, 1)

      const predecessor = context.predecessor
      // assign ownership
      tokenToOwner.set(tokenId, predecessor)
      remixTokens.set(tokenId, original_token_id.toString() + ';' + mix)

      // increment and store the next tokenId
      storage.set<u64>(TOTAL_SUPPLY, tokenId + 1)

      const originalTokenOwner = tokenToOwner.get(original_token_id)!
      const mixauthor = mix.split(';')[0]
      mixes[n] = mixauthor + ';nft:' + tokenId.toString()

      tokenMixes.set(original_token_id, mixes)

      const askingPrice = u128.fromString('10000000000000000000000000')
      assert(context.attachedDeposit == askingPrice, "Method requires deposit " + askingPrice.toString())

      // 40 % to owner, 40 % to mix author, 20% to contract
      const amountToOwner = changetype<u128>(context.attachedDeposit * u128.fromI32(40) / u128.fromI32(100))
      const amountToMixAuthor = amountToOwner

      return ContractPromiseBatch.create(originalTokenOwner).transfer(amountToOwner)
        .then(mixauthor).transfer(amountToMixAuthor)
    }
  }
  throw ('No mix found')
}

function publish_token_mix_internal(token_id: TokenId, mix: string): void {
  assert(tokenMixes.contains(token_id), ERROR_TOKEN_DOES_NOT_SUPPORT_MIXING)

  let mixes: Array<string> = tokenMixes.get(token_id)!

  const mixstring = context.predecessor + ';' + context.blockTimestamp.toString() + ';' + mix;

  if (mixes.length < MAX_MIXES_PER_TOKEN) {
    mixes.push(mixstring)
  } else {
    let oldestAvailableMixIndex = -1
    let oldestMixBlockTimestamp = context.blockTimestamp
    for (let n = 0; n < mixes.length; n++) {
      const mixparts = mixes[n].split(';')
      if (mixparts.length > 2) {
        // is not yet an NFT
        const mixBlockTimestamp: u64 = u128.fromString(mixparts[1]).toU64()
        if (mixBlockTimestamp < oldestMixBlockTimestamp) {
          oldestMixBlockTimestamp = mixBlockTimestamp
          oldestAvailableMixIndex = n
        }
      }
    }
    assert(oldestAvailableMixIndex > -1, 'No more remixes allowed')
    mixes[oldestAvailableMixIndex] = mixstring
  }
  tokenMixes.set(token_id, mixes)
}

export function publish_token_mix_base64(token_id: TokenId, mixbase64: string): void {
  assert(base64.decode(mixbase64).length <= MAX_MIX_BYTES_BASE64, 'Must be base64 encoded and no more than ' + MAX_MIX_BYTES_BASE64.toString() + 'bytes');
  publish_token_mix_internal(token_id, mixbase64);
}

export function publish_token_mix(token_id: TokenId, mix: u8[]): void {
  assert(mix.length <= MAX_MIX_BYTES, ERROR_MIX_TOO_LARGE)
  publish_token_mix_internal(token_id, mix.toString());
}

export function get_token_mixes(token_id: TokenId): string[] {
  return tokenMixes.get(token_id)!
}

export function upload_web_content(filename: string, contentbase64: string): void {
  assert(context.predecessor == context.contractName, "Can only be called by the contract account");
  const storageKey = WEB4_STORAGEKEY_PREFIX + filename;
  if (contentbase64.length > 0) {
    const content = base64.decode(contentbase64);
    Storage.setBytes(storageKey, content);
  } else {
    Storage.delete(storageKey);
  }
}

export function web4_get(request: Web4Request): Web4Response {
  const requestedpath = WEB4_STORAGEKEY_PREFIX + request.path;
  if (!Storage.contains(requestedpath)) {
    return { contentType: 'text/html; charset=UTF-8', body: util.stringToBytes('not found'), preloadUrls: [] };
  } else {
    const content = Storage.getBytes(requestedpath)!;
    let contentType: string;
    if (request.path.endsWith('.js')) {
      contentType = 'application/javascript; charset=UTF-8';
    } else if (request.path.endsWith('.css')) {
      contentType = 'text/css; charset=UTF-8';
    } else {
      contentType = 'text/html; charset=UTF-8';
    }
    return { contentType: contentType, body: content, preloadUrls: [] };
  }
}
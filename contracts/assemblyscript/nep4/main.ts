import { logging, PersistentMap, storage, context } from 'near-sdk-as'

/**************************/
/* DATA TYPES AND STORAGE */
/**************************/

type AccountId = string
type TokenId = u64

export const MAX_SUPPLY = u64(1_000)

export const tokenToOwner = new PersistentMap<TokenId, AccountId>('a')
export const escrowAccess = new PersistentMap<AccountId, AccountId[]>('b')
const TOTAL_SUPPLY = 'c'

/******************/
/* ERROR MESSAGES */
/******************/

export const ERROR_NO_TOKENS_CONTROLLED = "Caller does not control any tokens."
export const ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION = "Caller ID does not match expectation."
export const ERROR_INVALID_TOKEN_ID = "Invalid token identifier"
export const ERROR_CLAIMED_OWNER_DOES_NOT_OWN_TOKEN = "Claimed owner does not own token"
export const ERROR_MAXIMUM_TOKEN_LIMIT_REACHED = "Maximum token limit reached."

/******************/
/* CHANGE METHODS */
/******************/

// Grant the access to the given `accountId` for all tokens that account has.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the tokens.
export function grant_access(escrow_account_id: string): void {
  const predecessor = context.predecessor

  // fetch all accounts with escrow access to predecessor tokens
  assert(escrowAccess.contains(predecessor), ERROR_NO_TOKENS_CONTROLLED)
  const escrowAccounts = escrowAccess.getSome(predecessor)

  // add escrow_account_id to list of escrow accounts
  escrowAccounts.push(escrow_account_id)

  // grant escrow account access to all predecessor tokens
  escrowAccess.set(predecessor, escrowAccounts)
}

// Revoke the access to the given `accountId` for the given `tokenId`.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function revoke_access(escrow_account_id: string): void {
  const predecessor = context.predecessor

  // fetch escrow_account_id from list of escrow accounts
  assert(escrowAccess.contains(predecessor), ERROR_NO_TOKENS_CONTROLLED)
  const escrowAccounts = escrowAccess.getSome(predecessor)

  // remove the escrow account from list of accounts with access to owner's tokens
  // note we can't use Array<string>.filter() since it's not implemented in AssemblyScript
  // and only number types seem to work with Array<T>.filter()
  // also there are no clojures in AssemblyScript yet so passing in the value to filter on
  // seems like a non-starter.  for loops FTW!
  let filteredAccounts: AccountId[] = []
  for (let index = 0; index < escrowAccounts.length; index++) {
    const account = escrowAccounts[index]
    if(account != escrow_account_id) {
      filteredAccounts.push(account)
    }
  }

  // commit the removal to the escrow registry
  escrowAccess.set(predecessor, filteredAccounts)
}

// Transfer the given `token_id` from the given `owner_id`.  Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function transfer_from(owner_id: string, new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor
  assert(owner_id == predecessor, ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

  // delegate to transfer function since this seems redundant
  transfer(new_owner_id, token_id)
}

// Transfer the given `token_id` to the given `new_owner_id`.  Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function transfer(new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor

  // fetch token owner and assert ownership
  assert(tokenToOwner.contains(token_id), ERROR_INVALID_TOKEN_ID)
  const owner = tokenToOwner.getSome(token_id)
  assert(owner == predecessor, ERROR_CLAIMED_OWNER_DOES_NOT_OWN_TOKEN)

  // assign new owner to token
  tokenToOwner.set(token_id, new_owner_id)
}

/****************/
/* VIEW METHODS */
/****************/

// Returns `true` or `false` based on caller of the function (`predecessor_id`) having access to a user's tokens
export function check_access(account_id: string): bool {
  const owner = context.predecessor

  // confirm the caller has been minted at least one token
  if(!escrowAccess.contains(owner)) {
    // caller has never been minted a token and does not appear in the registry
    return false
  } else {
    // fetch list of escrow accounts with access to owner's tokens
    const escrowAccounts = escrowAccess.getSome(owner)
    // return result of check
    return escrowAccounts.includes(account_id)
  }
}

// Get an individual owner by given `tokenId`.
export function get_token_owner(token_id: TokenId): string {
  return tokenToOwner.getSome(token_id)
}

/********************/
/* NON-SPEC METHODS */
/********************/

export function mint_to(owner_id: AccountId): u64 {
  // fetch the next tokenId
  const tokenId = storage.getPrimitive<u64>(TOTAL_SUPPLY, 0)
  const nextId = tokenId + 1

  // enforce token limits
  assert(nextId <= MAX_SUPPLY, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)

  // assign ownership
  tokenToOwner.set(tokenId, owner_id)
  escrowAccess.set(owner_id, [])

  // increment and store the next tokenId
  storage.set<u64>(TOTAL_SUPPLY, nextId)

  // return the tokenId
  return tokenId
}

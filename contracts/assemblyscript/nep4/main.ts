import { logging, PersistentMap, storage, context } from 'near-sdk-as'

/**************************/
/* DATA TYPES AND STORAGE */
/**************************/

type AccountId = string
type TokenId = u64

export const MAX_SUPPLY = u64(1_000)

const tokenToOwner = new PersistentMap<TokenId, AccountId>('a')
const escrowAccess = new PersistentMap<AccountId, AccountId>('b')
const TOTAL_SUPPLY = 'c'

/******************/
/* ERROR MESSAGES */
/******************/

export const ERROR_NO_ESCROW_REGISTERED = "Caller has no escrow registered."
export const ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION = "Caller ID does not match expectation."
export const ERROR_CLAIMED_OWNER_DOES_NOT_OWN_TOKEN = "Claimed owner does not own token"
export const ERROR_MAXIMUM_TOKEN_LIMIT_REACHED = "Maximum token limit reached."

/******************/
/* CHANGE METHODS */
/******************/

// Grant the access to the given `accountId` for all tokens that account has.
export function grant_access(escrow_account_id: string): void {
  escrowAccess.set(context.predecessor, escrow_account_id)
}

// Revoke the access to the given `accountId` for all tokens that account has.
export function revoke_access(escrow_account_id: string): void {
  workaround()
  escrowAccess.delete(context.predecessor)
}

// Transfer the given `token_id` from the given `owner_id`.  Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor`) should have access to the token.
export function transfer_from(owner_id: string, new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor

  // fetch token escrow & verify access
  const escrow = escrowAccess.getSome(owner_id)
  assert(escrow == predecessor, ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

  // assign new owner to token
  tokenToOwner.set(token_id, new_owner_id)
}

// Transfer the given `token_id` to the given `new_owner_id`.  Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor`) should own the token.
export function transfer(new_owner_id: string, token_id: TokenId): void {
  const predecessor = context.predecessor

  // fetch token owner and assert ownership
  const owner = tokenToOwner.getSome(token_id)
  assert(owner == predecessor, ERROR_CLAIMED_OWNER_DOES_NOT_OWN_TOKEN)

  // assign new owner to token
  tokenToOwner.set(token_id, new_owner_id)
}

/****************/
/* VIEW METHODS */
/****************/

// Returns `true` or `false` based on caller of the function (`predecessor`) having access to account_id's tokens
export function check_access(account_id: string): boolean {
  const caller = context.predecessor

  assert(caller != account_id, ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

  if (!escrowAccess.contains(account_id)) {
    return false
  }

  const escrow = escrowAccess.getSome(account_id)
  return escrow == caller
}

// Get an individual owner by given `tokenId`.
export function get_token_owner(token_id: TokenId): string {
  return tokenToOwner.getSome(token_id)
}

/********************/
/* NON-SPEC METHODS */
/********************/

// removing last item from PersistentMap throws error when testing; this works around it
function workaround() {
  escrowAccess.set('garbage', 'nonsense')
}

export function mint_to(owner_id: AccountId): u64 {
  // fetch the next tokenId
  const tokenId = storage.getPrimitive<u64>(TOTAL_SUPPLY, 1)

  // enforce token limits
  assert(tokenId <= MAX_SUPPLY, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)

  // assign ownership
  tokenToOwner.set(tokenId, owner_id)

  // increment and store the next tokenId
  storage.set<u64>(TOTAL_SUPPLY, tokenId + 1)

  // return the tokenId
  return tokenId
}

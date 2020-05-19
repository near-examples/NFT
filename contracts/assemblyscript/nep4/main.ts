type TokenId = u128

/******************/
/* CHANGE METHODS */
/******************/

// Grant the access to the given `accountId` for all tokens that account has.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the tokens.
export function grant_access(escrow_account_id: string): void {
}

// Revoke the access to the given `accountId` for the given `tokenId`.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function revoke_access(escrow_account_id: string): void {
}

// Transfer the given `tokenId` from the given `accountId`.  Account `newAccountId` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function transfer_from(owner_id: string, new_owner_id: string, tokenId: TokenId): void {
}

// Transfer the given `tokenId` to the given `accountId`.  Account `accountId` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function transfer(new_owner_id: string, token_id: TokenId): void {
}


/****************/
/* VIEW METHODS */
/****************/

// Returns `true` or `false` based on caller of the function (`predecessor_id`) having access to a user's tokens
export function check_access(account_id: string): boolean {
  return false
}

// Get an individual owner by given `tokenId`.
export function get_token_owner(token_id: TokenId): string {
  return 'lol'
}

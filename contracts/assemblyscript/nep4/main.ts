import { context, PersistentVector } from "near-sdk-as";
import {
  types,
  tokens,
  OwnerId,
  Token,
  TokenType,
  TokenId,
  TokenTypeId,
  typeId2Type,
  ownerId2Token,
  tokenId2Token,
} from "./model";

// Initialize the token types with respective supplies.
// Requirements:
// * It should initilize at least the first token type and supply of tokens for type.
// * The contract account id should be the first token holder.
export function init(): void {}

// Create a new type of token within the same contract with given `data` as metadata/display data and `totalSupply`.
// Requirements:
// * token types should be stored in collection ordered by index with index serving as TokenTypeId.
export function mintTokenType(data: string, totalSupply: u64): TokenTypeId {
  return 0;
}

// Create a unique token from a previously minted type for given `ownerId`. Note `token` is constructed before minting occurs.
// Requirements:
// * TokenType should already be minted.
// * Tokens should be stored in a collection ordered by index.
// * It should not mint a token when token supply has been exhausted.
// * Access should be granted by default to initial token owner.
export function mintToken(ownerId: string, type: TokenType): Token {
  return new Token(type.id, ownerId, "");
}

// Get an individual token by given `tokenId`.
// Requirements:
// * The token should exist.
export function getToken(tokenId: TokenId): Token {
  assert(tokenId2Token.contains(tokenId), "Token ID not found");
  return tokenId2Token.getSome(tokenId);
}

// Get an individual token type by given `tokenTypeId`.
// Requirements:
// * The token type should exist.
export function getTokenType(tokenTypeId: TokenTypeId): TokenType {
  assert(typeId2Type.contains(tokenTypeId), "Token Type not found");
  return typeId2Type.getSome(tokenTypeId);
}

// Get all the token types that exist in contract.
export function getAllTokenTypes(): PersistentVector<TokenType> {
  return types;
}

// Get an individual owner by given `tokenId`.
// Note that owner of token isn't associated within token data.
// Requirements:
// * The token should exist.
// * The owner should exist.
export function getTokenOwner(tokenId: TokenId): string {
  let owner = Token.findOwner(tokenId);
  return owner;
}

// Allows for the retrieval of tokens from given `ownerId` starting from given `startTokenIdx`.
// up to the provided `limit.`
// Requirements:
// * Owner should exist.
// * Starting index should not be larger than total number of tokens.
export function getTokensByOwner(
  ownerId: string,
  startTokenIdx: u64 = 0,
  limit: u32 = 10
): Token[] {
  let results = Token.byOwner(ownerId, startTokenIdx, limit);
  return results;
}

// Get a count of all tokens of an indicated type for an indicated owner
// Get count of all tokens of all types if type is not indicated
export function getCountByOwner(
  ownerId: string,
  tokenTypeId: TokenTypeId = -1
): u64 {
  throw new Error("todo");
}

// Grant the access to the given `accountId` for the given `tokenId`.
// Requirements:
// * The caller of the function (`predecessorId`) should have access to the token.
// * The token should not be locked.
export function grantAccess(tokenId: TokenId, accountId: string): void {
  let predecessorId = context.predecessor;
  throw new Error("todo");
}

// Revoke the access to the given `accountId` for the given `tokenId`.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
// * The token should not be locked.
export function revokeAccess(tokenId: TokenId, accountId: string): void {
  throw new Error("todo");
}

// Lock the given `tokenId` to the caller of the function (`predecessor_id`).
// The `predecessor_id` becomes the owner of the lock.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
// * The token should not be locked.
export function lock(tokenId: TokenId): void {
  throw new Error("todo");
}

// Unlock the given `tokenId`. Removes lock owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should be the owner of the lock.
// * The token should be locked.
export function unlock(tokenId: TokenId): void {
  throw new Error("todo");
}

// Transfer the given `tokenId` to the given `accountId`.  Account `accountId` becomes the new owner.
// The token unlocks (if it was locked) and all access is revoked except for the new owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
// * If the token is locked, the locked owner should be `predecessor_id`.
export function transfer(tokenId: TokenId, accountId: string): void {
  let token = tokenId2Token.getSome(tokenId);
  token.transfer(accountId);
}

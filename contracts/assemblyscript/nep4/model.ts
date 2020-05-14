import {
  context,
  PersistentSet,
  PersistentMap,
  PersistentVector,
} from "near-sdk-as";

export type TokenTypeId = i32;
export type TokenId = u64;
export type OwnerId = string;

// TODO: seems like the wrong place to keep this
let nextId: u64 = 0;

/**
 * Notes:
 * Token owner always has access to the token. But the owner can't override locks.
 *
 */
@nearBindgen
export class Token {
  // global counter for token ids

  tokenId: TokenId; // identifier for this particular token
  lockOwnerId: OwnerId; // optional field. An account ID of the owner of the lock. Or the field is not set, if the token is unlocked.
  access: Array<OwnerId>; // a set of account IDs who currently hold access to the token.

  // TODO: this constructor seems over complicated
  constructor(
    public tokenTypeId: TokenTypeId,
    public ownerId: OwnerId,
    public data: string
  ) {
    // grab the next available token ID
    this.tokenId = nextId;
    nextId += 1;

    // record token in token registry
    tokenId2Token.set(this.tokenId, this);

    // record token owner in owner registry
    let ownersTokens = ownerId2Token.get(this.ownerId);
    if (ownersTokens) {
      // owner already holds tokens, add this to their collection
      ownersTokens.push(this.tokenId);
    } else {
      // this is the owner's first token
      ownersTokens = [this.tokenId];
    }
    ownerId2Token.set(this.ownerId, ownersTokens);

    // record new access holder
    this.access.push(this.ownerId);
  }

  // TODO: this method seems overcomplicated
  static byOwner(owner: OwnerId, start: TokenId, limit: u32 = 10): Token[] {
    let tokenIds = ownerId2Token
      .get(owner, [])!
      .sort((a: TokenId, b: TokenId) => u32(a - b));

    // return early if we haven't found any tokens belonging to the owner
    if (tokenIds.length == 0) {
      return [];
    }

    // prepare results collection and find first token
    let result = new Array<Token>();
    let startIndex: TokenId = tokenIds.findIndex(
      // (token) => token == start  // can't get this to compile, not sure how to resolve
      () => true
    );

    // grab the next token from sorted collection until we reach the limit
    while (limit >= 0) {
      limit -= 1;
      let index = startIndex + limit;
      if (tokenId2Token.contains(index)) {
        let token = tokenId2Token.getSome(index);
        result.push(token);
      }
    }

    return result;
  }

  static findOwner(tokenId: TokenId): string {
    return "";
  }

  public transfer(to: OwnerId): void {
    assert(context.predecessor == this.ownerId, "Only owner can transfer");
    this.ownerId = to;
  }

  public lock(): void {
    assert(context.predecessor == this.ownerId, "Only owner can lock");
    this.lockOwnerId = this.ownerId;
  }

  public isLocked(): bool {
    return !!this.lockOwnerId;
  }
}

@nearBindgen
export class TokenType {
  id: TokenTypeId;
  totalSupply: u64;
  data: string;
}

// TODO: seems like too many redundant copies of the same data
// in storage but how better to maintain maps of data
// and vectors of data since the PersistentMap doesn't let
// us retrieve a collection of keys nor values?
export const types = new PersistentVector<TokenType>("typ");
export const tokens = new PersistentVector<Token>("tok");

export const typeId2Type = new PersistentMap<TokenTypeId, TokenType>("typ-tok");
export const ownerId2Token = new PersistentMap<OwnerId, TokenId[]>("own-tok");
export const tokenId2Token = new PersistentMap<TokenId, Token>("tid-tok");

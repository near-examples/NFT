import { context, storage, PersistentVector } from "near-sdk-as";
import PersistentOrderedMap from "./persistentOrderedMap";

export type TokenTypeId = u32;
export type TokenId = u64;
export type AccountId = string;

/**
 * Notes:
 * Token owner always has access to the token. But the owner can't override locks.
 *
 */
@nearBindgen
export class Token {
  id: TokenId; // identifier for this particular token
  lockOwnerId: AccountId; // optional field. An account ID of the owner of the lock. Or the field is not set, if the token is unlocked.
  access: PersistentVector<AccountId>; // a set of account IDs who currently hold access to the token.
  // access: Array<AccountId>; // a set of account IDs who currently hold access to the token.

  // TODO: this constructor seems over complicated
  constructor(public tokenTypeId: TokenTypeId, public ownerId: AccountId) {
    const type = typeRegistry.get(tokenTypeId);

    assert(type != null, "Invalid TokenType");
    assert(type!.isMintable(), "All tokens of this type have been minted");

    this.assignNextAvailableId();
    this.recordOwnership();
    this.recordAccessibility();
    this.addToTokenRegistry();
  }

  static getNextTokenId(): TokenId {
    let maxId = storage.getPrimitive("maxTokenId", 0);
    maxId += 1;
    storage.set<TokenId>("maxTokenId", maxId);
    return maxId;
  }

  // TODO: this method seems overcomplicated
  static byOwner(owner: AccountId, start: TokenId, limit: u32 = 10): Token[] {
    let tokenIds = ownerRegistry
      .get(owner, [])!
      .sort((a: TokenId, b: TokenId) => u32(a - b));

    // return early if we haven't found any tokens belonging to the owner
    if (tokenIds.length == 0) {
      return [];
    }

    // prepare results collection and find first token
    let result = new Array<Token>();

    // TODO: wtf?
    // ERROR AS100: Not implemented, not sure what's up here
    // let startIndex: TokenId = tokenIds.findIndex((token) => token == start);
    let startIndex: TokenId = tokenIds.findIndex((token) => true);

    // grab the next token from sorted collection until we reach the limit
    while (limit >= 0) {
      limit -= 1;
      let index = startIndex + limit;
      if (tokenRegistry.contains(index)) {
        let token = tokenRegistry.getSome(index);
        result.push(token);
      }
    }

    return result;
  }

  static findOwner(tokenId: TokenId): string | null {
    const token = tokenRegistry.get(tokenId);
    assert(token, "Token ID not found in Token registry");

    if (token) {
      return token.ownerId;
    } else {
      return null;
    }
  }

  public transfer(to: AccountId): void {
    assert(context.predecessor == this.ownerId, "Only owner can transfer");
    this.ownerId = to;
  }

  public lock(): void {
    assert(context.predecessor == this.ownerId, "Only owner can lock");
    this.lockOwnerId = this.ownerId;
  }

  public isLocked(): boolean {
    return !!this.lockOwnerId;
  }

  public addAccess(account: AccountId): boolean {
    return false;
  }

  private assignNextAvailableId(): void {
    this.id = Token.getNextTokenId();
  }

  private recordOwnership(): void {
    let ownersTokens = ownerRegistry.get(this.ownerId, [])!;
    ownersTokens.push(this.id);
    ownerRegistry.upsert(this.ownerId, ownersTokens);
  }

  private recordAccessibility(): void {
    // pending discussion w Willem re: isArrayLike<T> vs. isArray<T> in near-sdk-as/bindgen.ts
    this.access = new PersistentVector<AccountId>(this.id.toString() + "a");
    // this.access = this.access || [];
    this.access.push(this.ownerId);
  }

  private addToTokenRegistry(): void {
    tokenRegistry.upsert(this.id, this);
  }
}

@nearBindgen
export class TokenType {
  id: TokenTypeId;
  minted: u64;

  constructor(public totalSupply: u64) {
    this.assignNextAvailableId();
    this.addToTokenTypeRegistry();
  }

  /**
   * returns a list of all token types available
   * 
   * _example_
   * 
   * ```
   * const totalSupply = 1000
   * const kitty = new TokenType(totalSupply) // type.id = 0
   * const corgi = new TokenType(totalSupply) // type.id = 1

   * const types = TokenType.all()
   * types[0] // for "kitty" the type.id == 0
   * ```
   */
  static all(): TokenType[] {
    return typeRegistry.last(typeRegistry.length).values();
  }

  static getNextTokenTypeId(): TokenTypeId {
    let maxId = storage.getPrimitive("maxTokenTypeId", 0);
    maxId += 1;
    storage.set<TokenTypeId>("maxTokenTypeId", maxId);
    return maxId;
  }

  public isMintable(): boolean {
    return this.minted < this.totalSupply;
  }

  public mint(): boolean {
    if (this.isMintable()) {
      this.minted++;
      return true;
    }
    return false;
  }

  private assignNextAvailableId(): void {
    this.id = TokenType.getNextTokenTypeId();
  }

  private addToTokenTypeRegistry(): void {
    typeRegistry.upsert(this.id, this);
  }
}

// TODO: seems like too many redundant copies of the same data
// in storage but how better to maintain maps of data
// and vectors of data since the PersistentMap doesn't let
// us retrieve a collection of keys nor values?
export const typeRegistry = new PersistentOrderedMap<TokenTypeId, TokenType>(
  "typ-tok"
);
export const ownerRegistry = new PersistentOrderedMap<AccountId, TokenId[]>(
  "own-tok"
);
export const tokenRegistry = new PersistentOrderedMap<TokenId, Token>(
  "tid-tok"
);

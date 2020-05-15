import {
  Token,
  TokenId,
  TokenType,
  TokenTypeId,
  AccountId,
  typeRegistry,
  ownerRegistry,
  tokenRegistry,
} from "../model";
import { Context, VM } from "near-sdk-as";

const contract = "nep4";
const alice = "alice";
const bob = "bob";
const carol = "carol";

function createToken(
  typeId: TokenTypeId = 0,
  ownerId: AccountId = contract
): Token {
  return new Token(typeId, ownerId);
}

function createTokenType(id: TokenTypeId = 0, supply: u64 = 1_000): TokenType {
  return new TokenType(supply);
}

// we have to clear storage between test runs to keep vm in sync w tests
// but only needed for PersistentVectors since they track index outside of storage
function clearStorage(): void {
  while (!(typeRegistry.length == 0)) typeRegistry.pop();
  while (!(tokenRegistry.length == 0)) tokenRegistry.pop();
}

let type: TokenType;
describe("NEP4 Token", () => {
  beforeEach(() => {
    type = createTokenType();
  });

  afterEach(() => {
    clearStorage();
  });

  it("should be initialized", () => {
    // expect(() => createToken()).not.toThrow(); // this throws a compilation error still, something for as-pect to handle
    createToken(type.id);
    expect(typeRegistry.length).toBe(1);
  });
});

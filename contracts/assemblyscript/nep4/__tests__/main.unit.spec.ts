import * as nonSpec from '../main'
import {
  grant_access,
  revoke_access,
  transfer_from,
  transfer,
  check_access,
  get_token_owner,
} from '../main'

import { VM, Context } from 'near-sdk-as'

const alice = 'alice'
const bob = 'bob'
const carol = 'carol'

describe('grant_access', () => {
  it('grants access to the given account_id for all the tokens that account has', () => {
    const aliceToken = nonSpec.mint_to(alice)
    Context.setPredecessor_account_id(alice)

    grant_access(bob)

    expect(check_access(bob)).toBe(true)
  })

  it('requires the caller of the function to have access to the token.', () => {
    expect(() => {
      const aliceToken = nonSpec.mint_to(alice)
      Context.setPredecessor_account_id(bob)

      grant_access(bob);
    }).toThrow(nonSpec.ERROR_NO_TOKENS_CONTROLLED)
  })
});

describe('revoke_access', () => {
  it('revokes access to the given `accountId` for the given `tokenId`', () => {
    const aliceToken = nonSpec.mint_to(alice)
    Context.setPredecessor_account_id(alice)

    grant_access(bob);
    expect(check_access(bob)).toBe(true)

    revoke_access(bob);
    expect(check_access(bob)).toBe(false)
  })

  it('requires caller of the function to have access to the token.', () => {
    expect(() => {
      const aliceToken = nonSpec.mint_to(alice)
      Context.setPredecessor_account_id(bob)

      revoke_access(bob);
    }).toThrow(nonSpec.ERROR_NO_TOKENS_CONTROLLED)
  })
})

describe('transfer_from', () => {
  it('transfers the given `token_id` from the given `owner_id` to  `new_owner_id`', () => {
    const aliceToken = nonSpec.mint_to(alice)

    Context.setPredecessor_account_id(alice)
    grant_access(bob)

    Context.setPredecessor_account_id(bob)
    transfer_from(alice, carol, aliceToken)

    expect(get_token_owner(aliceToken)).toBe(carol)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)
  })

  it('requires the caller of the function to have access to the token.', () => {
    expect(() => {
      const aliceToken = nonSpec.mint_to(alice)
      Context.setPredecessor_account_id(bob)

      transfer_from(alice, bob, aliceToken);
    }).toThrow(nonSpec.ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)
  })

  it('requires the caller of the function to not have ownership of the token', () => {
    expect(() => {
      const aliceToken = nonSpec.mint_to(alice)
      Context.setPredecessor_account_id(alice)

      transfer_from(alice, bob, aliceToken);
    }).toThrow(nonSpec.ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)
  })
})

describe('transfer', () => {
  it('transfers the given `token_id` to the given `owner_id`', () => {

    const aliceToken = nonSpec.mint_to(alice)
    Context.setPredecessor_account_id(alice)

    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    transfer(bob, aliceToken)

    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
  })

  it('requires the caller of the function to have access to the token', () => {
    expect(() => {
      const aliceToken = nonSpec.mint_to(alice)
      Context.setPredecessor_account_id(bob)

      transfer(bob, aliceToken);
    }).toThrow(nonSpec.ERROR_CLAIMED_OWNER_DOES_NOT_OWN_TOKEN)
  })
})

describe('check_access', () => {
  it('returns true if caller of the function has access to the token', () => {
    const aliceToken = nonSpec.mint_to(alice)
    Context.setPredecessor_account_id(alice)

    grant_access(bob)

    expect(check_access(bob)).toBe(true)
  })

  it('returns false if caller of function does not have access', () => {
    const aliceToken = nonSpec.mint_to(alice)
    Context.setPredecessor_account_id(alice)

    expect(check_access(bob)).toBe(false)
  })
})

describe('get_token_owner', () => {
  it('returns accountId of owner of given `tokenId`', () => {
    const aliceToken = nonSpec.mint_to(alice)
    const bobToken = nonSpec.mint_to(bob)

    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    expect(get_token_owner(bobToken)).toBe(bob)
    expect(get_token_owner(bobToken)).not.toBe(alice)
  })
})

// not sure if these are needed?
describe('nonSpec interface', () => {
  it('should throw if we attempt to mint more than the MAX_SUPPLY', () => {
    expect(() => {
      let limit = nonSpec.MAX_SUPPLY
      while(limit-- > 0) {
        nonSpec.mint_to(alice)
      }
    }).not.toThrow()

    // minting one more than the max should throw
    expect(() => {
      nonSpec.mint_to(alice)
    }).toThrow(nonSpec.ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)
  })
})

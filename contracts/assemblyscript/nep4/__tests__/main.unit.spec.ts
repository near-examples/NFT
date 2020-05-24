import { VM, Context } from 'near-sdk-as'
import * as nonSpec from '../main'

function testNep4Interface(contract: string, accounts: { id: string, token: string }[]): void {
  const {
    grant_access,
    revoke_access,
    transfer,
    check_access,
    get_token_owner,
  } = require(contract)

  const [alice, bob, carol] = accounts.map(a => a.id)
  const [aliceToken, bobToken, carolToken] = accounts.map(a => a.token)

  describe('grant_access', () => {
    it('grants access to the given account_id for all the tokens that account has', () => {
      Context.setPredecessor_account_id(alice)
      grant_access(bob)

      Context.setPredecessor_account_id(bob)
      expect(check_access(alice)).toBe(true)
    })
  })

  describe('revoke_access', () => {
    it('revokes access to the given `accountId` for the given `tokenId`', () => {
      // Prevent error `InconsistentStateError(IntegerOverflow)` thrown by near-sdk-rs
      Context.setStorage_usage(100)

      Context.setPredecessor_account_id(alice)
      grant_access(bob)

      Context.setPredecessor_account_id(bob)
      expect(check_access(alice)).toBe(true)

      Context.setPredecessor_account_id(alice)
      revoke_access(bob)

      Context.setPredecessor_account_id(bob)
      expect(check_access(alice)).toBe(false)
    })
  })

  describe('transfer', () => {
    it('allows owner to transfer given `token_id` to given `owner_id`', () => {
      Context.setPredecessor_account_id(alice)

      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      transfer(bob, aliceToken)

      expect(get_token_owner(aliceToken)).toBe(bob)
      expect(get_token_owner(aliceToken)).not.toBe(alice)
    })

    it('allows escrow to transfer given `token_id` to given `owner_id`', () => {
      // alice grants access to bob
      Context.setPredecessor_account_id(alice)
      grant_access(bob)

      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      // bob transfers to himself
      Context.setPredecessor_account_id(bob)
      transfer(bob, aliceToken)

      expect(get_token_owner(aliceToken)).toBe(bob)
      expect(get_token_owner(aliceToken)).not.toBe(alice)
    })

    it('prevents anyone else from transferring the token', () => {
      expect(() => {
        Context.setPredecessor_account_id(bob)

        transfer(bob, aliceToken)
      }).toThrow(nonSpec.ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)
    })
  })

  describe('check_access', () => {
    it('returns true if caller of the function has access to the token', () => {
      const aliceToken = nonSpec.mint_to(alice)

      Context.setPredecessor_account_id(alice)
      grant_access(bob)

      Context.setPredecessor_account_id(bob)
      expect(check_access(alice)).toBe(true)
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
}

testNep4Interface('../main', [
  { id: 'alice', token: nonSpec.mint_to('alice') },
  { id: 'bobby', token: nonSpec.mint_to('bobby') },
  { id: 'carol', token: nonSpec.mint_to('carol') },
])

//////////////////////////////
// non-spec interface tests //
//////////////////////////////

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

import { VM, Context } from 'near-sdk-as'

// explicitly import functions required by spec
import {
  grant_access,
  revoke_access,
  transfer,
  transfer_from,
  check_access,
  get_token_owner,
} from '../main'

// wrap all other functions in `nonSpec` variable, to make it clear when
// tests are using functionality that isn't defined by the spec
import * as nonSpec from '../main'

const alice = 'alice'
const bob = 'bob'
const carol = 'carol'

describe('grant_access', () => {
  it('grants access to the given account_id for all the tokens that account has', () => {
    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)

    // Alice calls `grant_access` to make Bob her escrow
    Context.setPredecessor_account_id(alice)
    grant_access(bob)

    // Bob checks if Alice has done so
    Context.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(true)
  })
})

describe('revoke_access', () => {
  it('revokes access to the given `accountId` for the given `tokenId`', () => {
    // Prevent error `InconsistentStateError(IntegerOverflow)` thrown by near-sdk-rs
    Context.setStorage_usage(100)

    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)

    // Alice makes Bob her escrow
    Context.setPredecessor_account_id(alice)
    grant_access(bob)

    // Bob checks if he has access to Alice's account
    Context.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(true)

    // Alice revokes Bob's access
    Context.setPredecessor_account_id(alice)
    revoke_access(bob)

    // Bob checks again
    Context.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(false)
  })
})

describe('transfer_from', () => {
  it('allows owner to transfer_from given `token_id` to given `owner_id`', () => {
    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Alice transfers her token to Bob
    Context.setPredecessor_account_id(alice)
    transfer_from(alice, bob, aliceToken)

    // it works!
    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
  })

  it('allows escrow to transfer_from given `token_id` to given `new_owner_id` if `owner_id` matches', () => {
    // Alice grants access to Bob
    Context.setPredecessor_account_id(alice)
    grant_access(bob)

    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Bob transfers to himself
    Context.setPredecessor_account_id(bob)
    transfer_from(alice, bob, aliceToken)

    // it works!
    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
  })

  it('prevents escrow from using transfer_from given `token_id` to given `new_owner_id if `owner_id` does not match`', () => {
    expect(() => {
      // Alice grants access to Bob
      Context.setPredecessor_account_id(alice)
      grant_access(bob)

      // Alice has a token
      const aliceToken = nonSpec.mint_to(alice)
      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      // Bob attempts to transfer and has access, but owner_id is wrong
      Context.setPredecessor_account_id(bob)
      transfer_from(bob, carol, aliceToken)
    }).toThrow(nonSpec.ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION)
  })

  it('prevents anyone else from using transfer_from on the token', () => {
    expect(() => {
      // Alice has a token
      const aliceToken = nonSpec.mint_to(alice)

      // Bob tries to transfer it to himself
      Context.setPredecessor_account_id(bob)
      transfer_from(alice, bob, aliceToken)
    }).toThrow(nonSpec.ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)
  })
})

describe('transfer', () => {
  it('allows owner to transfer given `token_id` to given `owner_id`', () => {
    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Alice transfers her token to Bob
    Context.setPredecessor_account_id(alice)
    transfer(bob, aliceToken)

    // it works!
    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
  })
  
  it('prevents escrow from using transfer. Escrow can only use transfer_from', () => {
    expect(() => {
      // Alice grants access to Bob
      Context.setPredecessor_account_id(alice)
      grant_access(bob)

      // Alice has a token
      const aliceToken = nonSpec.mint_to(alice)
      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      // Bob attempts to transfer and has access, but owner_id is wrong
      Context.setPredecessor_account_id(bob)
      transfer(carol, aliceToken)
    }).toThrow(nonSpec.ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  })
})


describe('check_access', () => {
  it('returns true if caller of the function has access to the token', () => {
    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)

    // Alice grants access to Bob
    Context.setPredecessor_account_id(alice)
    grant_access(bob)

    // Bob checks if he has access
    Context.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(true)
  })

  it('returns false if caller of function does not have access', () => {
    // Alice has a token
    const aliceToken = nonSpec.mint_to(alice)

    // Bob checks if he has access
    Context.setPredecessor_account_id(alice)
    expect(check_access(bob)).toBe(false)
  })
})

describe('get_token_owner', () => {
  it('returns accountId of owner of given `tokenId`', () => {
    // Alice and Bob both have tokens
    const aliceToken = nonSpec.mint_to(alice)
    const bobToken = nonSpec.mint_to(bob)

    // Alice owns her own token
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Bob owns his own token
    expect(get_token_owner(bobToken)).toBe(bob)
    expect(get_token_owner(bobToken)).not.toBe(alice)
  })
})

describe('nonSpec interface', () => {
  it('should throw if we attempt to mint more than the MAX_SUPPLY', () => {
    // we can mint up to MAX_SUPPLY tokens
    expect(() => {
      let limit = nonSpec.MAX_SUPPLY
      while(limit-- > 0) {
        nonSpec.mint_to(alice)
      }
    }).not.toThrow()

    // minting one more than the max throws an error
    expect(() => {
      nonSpec.mint_to(alice)
    }).toThrow(nonSpec.ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)
  })
})

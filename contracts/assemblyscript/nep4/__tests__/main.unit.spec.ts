import * as nonSpec from '../main'
import {
  grant_access,
  revoke_access,
  transfer_from,
  transfer,
  check_access,
  get_token_owner,
} from '../main'

const alice = 'alice'
const bob = 'bob'

describe('grant_access', () => {
  xit('grants access to the given account_id for all the tokens that account has', () => {
  })

  xit('requires the caller of the function to have access to the token.', () => {
  })
});

describe('revoke_access', () => {
  xit('revokes access to the given `accountId` for the given `tokenId`', () => {
  })

  xit('requires caller of the function to have access to the token.', () => {
  })
})

describe('transfer_from', () => {
  xit('transfers the given `tokenId` from the given `owner_id` to  `new_owner_id`', () => {
  })

  xit('requires the caller of the function to have access to the token.', () => {
  })
})

describe('transfer', () => {
  xit('transfers the given `token_id` to the given `owner_id`', () => {
  })

  xit('requires the caller of the function to have access to the token', () => {
  })
})

describe('check_access', () => {
  xit('returns true if caller of the function has access to the token', () => {
  })
  xit('returns false if caller of function does not have access', () => {
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

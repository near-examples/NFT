import {
  grant_access,
  revoke_access,
  transfer_from,
  transfer,
  check_access,
  get_token_owner,
} from '../main'

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
  xit('returns accountId of owner of given `tokenId`', () => {
  })
})

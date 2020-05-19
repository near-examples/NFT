import { Context, VM, Storage } from 'near-sdk-as'
import {
  init,
  totalSupply,
  getBalance,
} from '../main'

const accountId = 'corgis'

beforeEach(() => {
  Context.setCurrent_account_id(accountId)
})

// This token should allow the following:
describe('init', () => {
  // - Initialize contract once...
  xit('cannot be called twice', () => {
    init(1)
    // TODO: not yet supported by as-pect
    // expect(() => init(2)).toThrow()
    expect(totalSupply()).toBe(1)
  })

  // ...The given total supply...
  it('creates specified supply', () => {
    init(1_000)
    expect(totalSupply()).toBe(1000)
  })

  // ...will be owned by the given account ID.
  it('assigns all the tokens to the account of the contract', () => {
    log('Why do this at all? What does it mean for an NFT, which needs to have an ID, to not yet be minted, not have an ID, and yet have an owner?')
    init(10)
    expect(getBalance(accountId)).toBe(10)
  })
})

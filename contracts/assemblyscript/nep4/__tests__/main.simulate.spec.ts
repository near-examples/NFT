import { Runtime } from 'near-sdk-as/runtime'
import path from 'path'

const WASM_FILE = path.join(__dirname, "../../../out/nep4-as.wasm")

const runtime = new Runtime()
const nft = runtime.newAccount('nft', WASM_FILE)
const alice = 'alice'
const bob = 'bob'

beforeAll(() => {
})

afterEach(() => {
  corgis.state = {};
});

describe('grant_access', () => {
  xit('grants access to the given account_id for all the tokens that account has', () => {
  })

  xit('requires the caller of the function to have access to the token.', () => {
  })
})

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
    // GIVEN ('mint' not part of spec)
    nft.call('mint', { owner_id: alice }) // => IMPLEMENTATION DETAIL: creates token with id=0
    nft.call('mint', { owner_id: bob }) // => IMPLEMENTATION DETAIL: creates token with id=1

    // THEN
    expect(nft.view('get_token_owner', { token_id: 0 }).return_data).toBe(alice)
    expect(nft.view('get_token_owner', { token_id: 1 }) return_data).toBe(bob)
  })
})

// function simulate({ signer, contract, method }, printResponse = false) {
//   let response
//
//   if (signer) {
//     response = signer.call_other(
//       contract.account_id,
//       method.name,
//       method.params
//     )
//   } else {
//     response = contract[method.type](method.name, method.params)
//   }
//
//   if (printResponse) {
//     console.log("\n\n------ Near VM Response ------")
//     console.log(JSON.stringify(response, null, 2))
//   }
//
//   return {
//     data: response.return_data,
//     error: response.err,
//     result: response.result,
//     results: response.results,
//     calls: response.calls,
//   }
// }

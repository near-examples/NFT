const { Runtime } = require('near-sdk-as/runtime')
const path = require('path')

const buildFolder = '../../../../out'
const NEP4_WASM_FILE = path.join(__dirname, `${buildFolder}/nep4-as.wasm`)
const ESCROW_WASM_FILE = path.join(__dirname, `${buildFolder}/escrow-as.wasm`)

const runtime = new Runtime()
let accounts

describe('NEP4 Escrow Simulation', () => {
  beforeAll(() => {
    accounts = setup([
      // user accounts are strings of the format 'name'
      'alice',
      'jerry',
      'escrowilla',
      // contract accounts are objects of the format { name: contract }
      { nep4: NEP4_WASM_FILE },
      { corgis: NEP4_WASM_FILE },
      { sausages: NEP4_WASM_FILE },
      { escrow: ESCROW_WASM_FILE },
    ])
  })

  afterEach(() => {
    // reset contract state
    accounts.nep4.state = {}
    accounts.corgis.state = {}
    accounts.sausages.state = {}
    accounts.escrow.state = {}
  })

  describe('Non-spec methods on Token contract', () => {
    xit('should respond to mint_to', () => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'change',
          name: 'mint_to',
          params: { owner_id: accounts.alice.account_id },
        },
      }

      let { data, state } = simulate(transaction)

      // first token id is 0
      expect(data).toEqual('0')

      // account has been added to owner registry
      expectToFind(accounts.alice.account_id, {
        inObject: state,
      })
    })

    xit('should honor maximum limit on token supply', () => {
      const MAX_SUPPLY = 1 // 1.5s
      // const MAX_SUPPLY = 10 // 3.24s user 0.79s system 124% cpu 3.246 total
      // const MAX_SUPPLY = 20 // 4.47s user 1.06s system 116% cpu 4.741 total
      // const MAX_SUPPLY = 100 // 11.33s user 2.48s system 106% cpu 12.915 total
      // const MAX_SUPPLY = 200 // 20.48s user 4.45s system 104% cpu 23.855 total
      // const MAX_SUPPLY = 500 // 48.05s user 10.28s system 102% cpu 57.014 total
      // const MAX_SUPPLY = 1000 // 115s

      expect(() => {
        let limit = MAX_SUPPLY
        while (limit-- >= 0) {
          assign(nep4, accounts.alice)
        }
      }).not.toThrow()

      // minting one more than the max should throw
      let error, logs
      expect(() => {
        const result = assign(nep4, accounts.alice)

        expectToFind('Maximum token limit reached', {
          inObject: result.error,
        })

        expectToFind('ABORT: Maximum token limit reached', {
          inArray: result.logs,
        })
      }).toThrow()

      // "err": {
      //   "FunctionCallError": {
      //     "HostError": {
      //       "GuestPanic": {
      //         "panic_msg": "Maximum token limit reached., filename: \"contracts/assemblyscript/nep4/main.ts\" line: 65 col: 2"
      //       }
      //     }
      //   }
    })
  })

  describe('NEP4 basics', () => {
    beforeEach(() => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'change',
          name: 'mint_to',
          params: { owner_id: accounts.alice.account_id },
        },
      }

      let { data, results } = simulate(transaction)

      transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'change',
          name: 'get_token_owner',
          params: { token_id: results.token_id },
        },
      }
      // simulate(transaction)
    })

    xit('should recognie the standard NEP4 interface', () => {
      // expectToFind('showYouKnow() was called', {
      //   inArray: result.outcome.logs,
      // })
    })
  })

  describe('Escrow as Trusted Human conducting Token Transfer', () => {
    describe('Phase 1-2-3', () => {
      it('owners should grant access to escrow account', () => {
        // alice owns corgi tokens
        const { data: aliceToken } = assign(accounts.corgis, accounts.alice)
        // and grants access to the escrow account (to transfer her corgi tokens on her behalf)
        grant(accounts.corgis, accounts.alice, accounts.escrowilla)

        // jerry owns sausage tokens
        const { data: jerryToken } = assign(accounts.sausages, accounts.jerry)
        // and grants access to the escrow account (to transfer her corgi tokens on her behalf)
        grant(accounts.sausages, accounts.jerry, accounts.escrowilla)

        // escrow then conducts exchange
        transfer(accounts.escrowilla, accounts.alice, accounts.jerry, accounts.corgis, aliceToken) // prettier-ignore
        transfer(accounts.escrowilla, accounts.jerry, accounts.alice, accounts.sausages, jerryToken) // prettier-ignore

        const ownership = {
          corgiTokenOwner: getOwner(accounts.corgis, aliceToken),
          sausageTokenOwner: getOwner(accounts.sausages, jerryToken),
        }

        // expect that jerry now owns the corgi token
        expect(ownership.corgiTokenOwner).toBe(accounts.jerry.account_id)
        // expect that alice now owns the sausage token
        expect(ownership.sausageTokenOwner).toBe(accounts.alice.account_id)
      })
    })
  })

  describe('Escrow as Trustless Contract conducting Token Transfer', () => {
    /**
     * ----------------------------------------------------------------------------
     * (Phase 1) traders grant access to escrow account
     * ----------------------------------------------------------------------------
     *
     * In this phase, alice and jerry each give permission to an escrow account.
     *
     * This account can be controlled by a trusted friend or a marketplace OpenSea.
     *
     *
     * sample:
     * -------
     *
     * alice calls
     *
     *    - corgi::grant_access({'escrow_account_id':'escrow'})
     *
     * jerry calls
     *
     *    - sausage::grant_access({'escrow_account_id':'escrow'})
     */

    describe('Phase 1', () => {
      it('owners should grant access to escrow account', () => {
        // alice owns corgi tokens
        assign(accounts.corgis, accounts.alice)

        // and grants access to the escrow account
        // (to transfer her corgi tokens on her behalf)
        const transaction = {
          signer: accounts.alice,
          contract: accounts.corgis,
          method: {
            type: 'change',
            name: 'grant_access',
            params: { escrow_account_id: accounts.escrow.account_id },
          },
        }

        let { state } = simulate(transaction)

        // expect that alice owns corgi tokens
        expectToFind('alice', {
          inObject: state,
        })

        // expect that she has granted access to the corgis account
        expectToFind('escrow', {
          inObject: state,
        })
      })
    })

    /**
     * ----------------------------------------------------------------------------
     * (Phase 2) escrow account takes control of tokens in trade
     * ----------------------------------------------------------------------------
     *
     * In this phase, the escrow account reaches in to each of alice and jerry's
     * accounts and pulls out their respective trades into its own account.
     *
     *
     * sample:
     * -------
     *
     * escrow calls
     *
     *    - corgi::transfer_from({'owner_id':'alice', 'new_owner_id:'escrow', 'token_id': 3})
     *               \
     *                `- callback escrow::on_transfer({'owner_id':'alice', 'token_contract':'corgi', 'token_id': 3})
     *
     * escrow calls
     *
     *    - sausage::transfer_from({'owner_id':'jerry', 'new_owner_id:'escrow', 'token_id': 5})
     *               \
     *                `- callback escrow::on_transfer({'owner_id':'jerry', 'token_contract':'sausage', 'token_id': 5})
     */

    describe('Phase 2', () => {
      it('escrow should be able to take control of tokens in trade', () => {
        // alice owns corgi tokens
        const { data: tokenId } = assign(accounts.corgis, accounts.alice)

        // and grants access to the escrow account (to transfer her corgi tokens on her behalf)
        grant(accounts.corgis, accounts.alice, accounts.escrow)

        const beforeTransfer = {
          state: accounts.corgis.state,
          owner: getOwner(accounts.corgis, tokenId),
        }

        // escrow account takes control of tokens from owner account
        const transaction = {
          signer: accounts.escrow,
          contract: accounts.corgis,
          method: {
            type: 'change',
            name: 'transfer_from',
            params: {
              owner_id: accounts.alice.account_id,
              new_owner_id: accounts.escrow.account_id,
              token_id: tokenId,
            },
          },
        }

        simulate(transaction)

        const afterTransfer = {
          state: accounts.corgis.state,
          owner: getOwner(accounts.corgis, tokenId),
        }

        /*
        console.log(beforeTransfer, afterTransfer)
        
        {
          state: { 'a::1': 'alice', 'b::alice': 'escrow', c: 2 },
          owner: 'alice'
        } 
        {
          state: { 'a::1': 'escrow', 'b::alice': 'escrow', c: 2 },
          owner: 'escrow'
        }
        
        */

        // expect that alice owned a corgi token
        expect(beforeTransfer.owner).toBe(accounts.alice.account_id)
        // which is now owned by the escrow account
        expect(afterTransfer.owner).toBe(accounts.escrow.account_id)
      })

      it('escrow should receive callback after taking control of tokens in trade', () => {
        // alice owns corgi tokens
        const { data: tokenId } = assign(accounts.corgis, accounts.alice)

        // and grants access to the escrow account (to transfer her corgi tokens on her behalf)
        grant(accounts.corgis, accounts.alice, accounts.escrow)

        // escrow account then reaches out to token contract to fetch tokens for trade
        const transaction = {
          signer: accounts.escrow,
          contract: accounts.escrow,
          method: {
            type: 'change',
            name: 'fetch_tokens_for_trade',
            params: {
              current_owner_id: accounts.alice.account_id,
              new_owner_id: accounts.jerry.account_id,
              token_contract: accounts.corgis.account_id,
              token_id: tokenId,
            },
          },
        }

        const { calls } = simulate(transaction)

        // we can check for call length
        expect(calls).toHaveLength(3)

        // we can check for a series of ordered cross-contract calls
        ;[
          '0.escrow.fetch_tokens_for_trade',
          '1.corgis.transfer_from',
          '2.escrow.on_transfer',
        ].map((crossContractCall, index) => {
          const call = calls[index]
          const [order, contract, method] = crossContractCall.split('.')
          expect(call).toHaveProperty('index', parseInt(order))
          expect(call).toHaveProperty('account_id', contract)
          expect(call).toHaveProperty('method_name', method)
        })

        // we can check for each of the calls independently, with or without index (order)
        expect(calls).toContainEqual( expect.objectContaining({ index: 0, account_id: 'escrow', method_name: 'fetch_tokens_for_trade', }) ) // prettier-ignore
        expect(calls).toContainEqual( expect.objectContaining({ index: 1, account_id: 'corgis', method_name: 'transfer_from', }) ) // prettier-ignore
        expect(calls).toContainEqual( expect.objectContaining({ index: 2, account_id: 'escrow', method_name: 'on_transfer', }) ) // prettier-ignore
      })

      it('escrow should store data received by callback for use in next phase', () => {
        // alice owns corgi tokens
        const { data: tokenId } = assign(accounts.corgis, accounts.alice)

        // and grants access to the escrow account (to transfer her corgi tokens on her behalf)
        grant(accounts.corgis, accounts.alice, accounts.escrow)

        // then escrow account fetches alice's tokens to prepare for trade
        fetch(accounts.alice, accounts.jerry, accounts.corgis, tokenId, accounts.escrow) // prettier-ignore

        expect(Object.values(accounts.escrow.state)[0]).toMatchObject({
          new_owner_id: accounts.jerry.account_id,
          owner_id: accounts.alice.account_id,
          status: 0,
          token_contract: accounts.corgis.account_id,
          token_id: tokenId,
        })
      })
    })

    /**
     * ----------------------------------------------------------------------------
     * (Phase 3) escrow executes transfer to traders
     * ----------------------------------------------------------------------------
     *
     * In this phase, the escrow account executes the transfer of tokens between
     * accounts using a single batch transaction which will either succeed completely
     * or rollback.
     *
     * This protects against timing issues with account availability and network issues
     *
     * Tx rollback conditions include (??? TODO ??? idk if this list is correct, useful, etc)
     * - trader account was deleted between phase 2 and phase 3
     * - network is unresponsive or other runtime error
     *
     *
     * sample:
     * -------
     *
     * escrow calls (in one Promise)
     *
     *    - corgi::transfer_from({'owner_id':'escrow', 'new_owner_id:'jerry', 'token_id': 3})
     *               \
     *                `- callback escrow::on_transfer({'owner_id':'jerry', 'token_contract:'corgi', 'token_id': 3})
     *
     *    - sausage::transfer_from({'owner_id':'escrow', 'new_owner_id:'alice', 'token_id': 5})
     *               \
     *                `- callback escrow::on_transfer({'owner_id':'alice', 'token_contract':'sausage', 'token_id': 5})
     */
    describe('Phase 3', () => {
      xit('escrow should be able to coordinate a full exchange of tokens', () => {})
    })
  })
})

// ---------------------------------------------------------------
// Contract Testing Helpers
// ---------------------------------------------------------------

function assign(aToken, toAccount) {
  const transaction = {
    signer: toAccount,
    contract: aToken,
    method: {
      type: 'change',
      name: 'mint_to',
      params: { owner_id: toAccount.account_id },
    },
  }

  return simulate(transaction)
}

function grant(tokenAccess, forOwner, toEscrow) {
  const transaction = {
    signer: forOwner,
    contract: tokenAccess,
    method: {
      type: 'change',
      name: 'grant_access',
      params: { escrow_account_id: toEscrow.account_id },
    },
  }

  return simulate(transaction)
}

function transfer(byEscrow, fromOwner, toNewOwner, aToken, id) {
  const transaction = {
    signer: byEscrow,
    contract: aToken,
    method: {
      type: 'change',
      name: 'transfer_from',
      params: {
        owner_id: fromOwner.account_id,
        new_owner_id: toNewOwner.account_id,
        token_id: id,
      },
    },
  }

  return simulate(transaction)
}

function fetch(owner, new_owner, token, id, toEscrow) {
  const transaction = {
    signer: toEscrow,
    contract: toEscrow,
    method: {
      type: 'change',
      name: 'fetch_tokens_for_trade',
      params: {
        current_owner_id: owner.account_id,
        new_owner_id: new_owner.account_id,
        token_contract: token.account_id,
        token_id: id,
      },
    },
  }

  return simulate(transaction)
}

function getOwner(ofToken, id) {
  const transaction = {
    contract: ofToken,
    method: {
      type: 'view',
      name: 'get_token_owner',
      params: { token_id: id },
    },
  }

  const { data } = simulate(transaction)
  return data
}

// ---------------------------------------------------------------
// Simulation Testing Helpers
// ---------------------------------------------------------------

function setup(accounts) {
  return accounts
    .map((account) => {
      switch (typeof account) {
        case 'string':
          return runtime.newAccount(account)
          break
        case 'object':
          let [name, contract] = Object.entries(account)[0]
          return runtime.newAccount(name, contract)
      }
    })
    .reduce((acc, user) => {
      acc[user.account_id] = user
      return acc
    }, {})
}

function expectToFind(target, { inArray, inObject }, partial = true) {
  if (partial) {
    const string = JSON.stringify(inArray || inObject)
    expect(string).toEqual(expect.stringContaining(target))
  } else {
    if (inArray) {
      expect(inArray).toEqual(expect.arrayContaining([target]))
    } else if (inObject) {
      // TODO: make this recursive, maybe using underscore or ?
      const keys = Object.keys(inObject)
      const values = Object.values(inObject)
      expect(keys.concat(values)).toEqual(expect.arrayContaining([target]))
    }
  }
}

// prettier-ignore
function simulate({ signer, contract, method, config = {}}, printResponse = false) {
  for (let [key, value] of Object.entries(config)) {
    runtime[key] = value
  }

  let response

  if (signer) {
    response = signer.call_other(
      contract.account_id,
      method.name,
      method.params
    )
  } else {
    response = contract[method.type](method.name, method.params)
  }

  if (printResponse) {
    console.log('\n\n------ Near VM Response ------')
    console.log(JSON.stringify(response, null, 2))
  }

  return {
    calls: response.calls && Object.values(response.calls),
    data: response.return_data,
    error: response.err,
    logs: response.result.outcome.logs,
    result: response.result,
    results: response.results,
    state: response.result.state,
  }
}

function getContext() {
  return {
    input: '{}',
    output_data_receivers: [],
    prepaid_gas: 10 ** 15,
    attached_deposit: '0',
    is_view: false,
    block_index: 1,
    block_timestamp: 1585778575325000000,
    epoch_height: 1,
    storage_usage: 100,
    random_seed: 'KuTCtARNzxZQ3YvXDeLjx83FDqxv2SdQTSbiq876zR7',
    current_account_id: 'alice',
    signer_account_id: 'alice',
    predecessor_account_id: 'bob',
    account_balance: '1000',
    signer_account_pk: 'KuTCtARNzxZQ3YvXDeLjx83FDqxv2SdQTSbiq876zR7',
    account_locked_balance: '10',
  }
}

// prettier-ignore
function resolveError(message) {
  return {
    GasLimitExceeded: 'Exceeded the maximum amount of gas allowed to burn per contract',
    MethodEmptyName: 'Method name is empty',
    WasmerCompileError: 'Wasmer compilation error: {{msg}}',
    GuestPanic: 'Smart contract panicked: {{panic_msg}}',
    Memory: 'Error creating Wasm memory',
    GasExceeded: 'Exceeded the prepaid gas',
    MethodUTF8Error: 'Method name is not valid UTF8 string',
    BadUTF16: 'String encoding is bad UTF-16 sequence',
    WasmTrap: 'WebAssembly trap: {{msg}}',
    GasInstrumentation: 'Gas instrumentation failed or contract has denied instructions.',
    InvalidPromiseIndex: '{{promise_idx}} does not correspond to existing promises',
    InvalidPromiseResultIndex: 'Accessed invalid promise result index: {{result_idx}}',
    Deserialization: 'Error happened while deserializing the module',
    MethodNotFound: 'Contract method is not found',
    InvalidRegisterId: 'Accessed invalid register id: {{register_id}}',
    InvalidReceiptIndex: 'VM Logic returned an invalid receipt index: {{receipt_index}}',
    EmptyMethodName: 'Method name is empty in contract call',
    CannotReturnJointPromise: 'Returning joint promise is currently prohibited',
    StackHeightInstrumentation: 'Stack instrumentation failed',
    CodeDoesNotExist: 'Cannot find contract code for account {{account_id}}',
    MethodInvalidSignature: 'Invalid method signature',
    IntegerOverflow: 'Integer overflow happened during contract execution',
    MemoryAccessViolation: 'MemoryAccessViolation',
    InvalidIteratorIndex: 'Iterator index {{iterator_index}} does not exist',
    IteratorWasInvalidated: 'Iterator {{iterator_index}} was invalidated after its creation by performing a mutable operation on trie',
    InvalidAccountId: 'VM Logic returned an invalid account id',
    Serialization: 'Error happened while serializing the module',
    CannotAppendActionToJointPromise: 'Actions can only be appended to non-joint promise.',
    InternalMemoryDeclared: 'Internal memory declaration has been found in the module',
    Instantiate: 'Error happened during instantiation',
    ProhibitedInView: '{{method_name}} is not allowed in view calls',
    InvalidMethodName: 'VM Logic returned an invalid method name',
    BadUTF8: 'String encoding is bad UTF-8 sequence',
    BalanceExceeded: 'Exceeded the account balance',
    LinkError: 'Wasm contract link error: {{msg}}',
    InvalidPublicKey: 'VM Logic provided an invalid public key',
    ActorNoPermission: "Actor {{actor_id}} doesn't have permission to account {{account_id}} to complete the action",
    RentUnpaid: "The account {{account_id}} wouldn't have enough balance to pay required rent {{amount}}",
    LackBalanceForState: "The account {{account_id}} wouldn't have enough balance to cover storage, required to have {{amount}}",
    ReceiverMismatch: 'Wrong AccessKey used for transaction: transaction is sent to receiver_id={{tx_receiver}}, but is signed with function call access key that restricted to only use with receiver_id={{ak_receiver}}. Either change receiver_id in your transaction or switch to use a FullAccessKey.',
    CostOverflow: 'Transaction gas or balance cost is too high',
    InvalidSignature: 'Transaction is not signed with the given public key',
    AccessKeyNotFound: 'Signer "{{account_id}}" doesn\'t have access key with the given public_key {{public_key}}',
    NotEnoughBalance: 'Sender {{signer_id}} does not have enough balance {} for operation costing {}',
    NotEnoughAllowance: 'Access Key {account_id}:{public_key} does not have enough balance {{allowance}} for transaction costing {{cost}}',
    Expired: 'Transaction has expired',
    DeleteAccountStaking: 'Account {{account_id}} is staking and can not be deleted',
    SignerDoesNotExist: 'Signer {{signer_id}} does not exist',
    TriesToStake: 'Account {{account_id}} tries to stake {{stake}}, but has staked {{locked}} and only has {{balance}}',
    AddKeyAlreadyExists: 'The public key {{public_key}} is already used for an existing access key',
    InvalidSigner: 'Invalid signer account ID {{signer_id}} according to requirements',
    CreateAccountNotAllowed: "The new account_id {{account_id}} can't be created by {{predecessor_id}}",
    RequiresFullAccess: 'The transaction contains more then one action, but it was signed with an access key which allows transaction to apply only one specific action. To apply more then one actions TX must be signed with a full access key',
    TriesToUnstake: 'Account {{account_id}} is not yet staked, but tries to unstake',
    InvalidNonce: 'Transaction nonce {{tx_nonce}} must be larger than nonce of the used access key {{ak_nonce}}',
    AccountAlreadyExists: "Can't create a new account {{account_id}}, because it already exists",
    InvalidChain: "Transaction parent block hash doesn't belong to the current chain",
    AccountDoesNotExist: "Can't complete the action because account {{account_id}} doesn't exist",
    MethodNameMismatch: "Transaction method name {{method_name}} isn't allowed by the access key",
    DeleteAccountHasRent: "Account {{account_id}} can't be deleted. It has {balance{}}, which is enough to cover the rent",
    DeleteAccountHasEnoughBalance: "Account {{account_id}} can't be deleted. It has {balance{}}, which is enough to cover it's storage",
    InvalidReceiver: 'Invalid receiver account ID {{receiver_id}} according to requirements',
    DeleteKeyDoesNotExist: "Account {{account_id}} tries to remove an access key that doesn't exist",
    Timeout: 'Timeout exceeded',
    Closed: 'Connection closed',
  }[message]
}

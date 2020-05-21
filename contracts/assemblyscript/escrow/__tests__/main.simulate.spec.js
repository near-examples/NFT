const { Runtime } = require('near-sdk-as/runtime')
const path = require('path')

const WASM_FILE = path.join(__dirname, '../../../../out/nep4-as.wasm')

describe('NEP4 Escrow Simulation', () => {
  const users = ['alice', 'escrow']

  let runtime
  let nep4

  beforeAll(() => {
    runtime = new Runtime()

    // configure contract account
    nep4 = runtime.newAccount('nep4', WASM_FILE)

    // configure user accounts
    accounts = users
      .map((name) => runtime.newAccount(name))
      .reduce((acc, user) => {
        acc[user.account_id] = user
        return acc
      }, {})
  })

  afterEach(() => {
    // reset contract state
    nep4.state = {}
  })

  describe('Non-spec methods on Token contract', () => {
    it('should respond to mint_to', () => {
      let transaction = {
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

  describe('basics', () => {
    beforeEach(() => {
      let transaction = {
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

  // describe('exchanging tokens through escrow', () => {
  //   await corgis.call('grant_access', { as: alice, to: carol })
  //   await sausages.call('grant_access', { as: bob, to: carol })
  // })
  // alice makes an async call to corgi::grant_access({'escrow_account_id':'escrow'})
  // jerry makes an async call to ``sausage::grant_access({'escrow_account_id':'escrow'})`
  // escrow calls sausage::transfer_from({'owner_id':'jerry', 'new_owner_id:'escrow', 'token_id': 5})
  // attaches callback escrow::on_transfer({'owner_id':'jerry', 'token_contract':'sausage', 'token_id': 5})
  // escrow calls corgi::transfer_from({'owner_id':'alice', 'new_owner_id:'escrow', 'token_id': 3})
  // attaches callback escrow::on_transfer({'owner_id':'alice', 'token_contract':'corgi', 'token_id': 3})
  // In one Promise:
  // escrow calls corgi::transfer_from({'owner_id':'escrow', 'new_owner_id:'jerry', 'token_id': 3})
  // attaches callback escrow::on_transfer({'owner_id':'alice', 'token_contract:'corgi', 'token_id': 3})
  // escrow calls sausage::transfer_from({'owner_id':'jerry', 'new_owner_id:'escrow', 'token_id': 5})
  // attaches callback escrow::on_transfer({'owner_id':'jerry', 'token_contract':'corgi', 'token_id': 3})

  /*
  describe('View methods', () => {
    it('responds to showYouKnow()', () => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'view',
          name: 'showYouKnow',
        },
      };

      const { result } = simulate(transaction);

      expectToFind('showYouKnow() was called', {
        inArray: result.outcome.logs,
      });
    });

    it('responds to sayHello()', () => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'view',
          name: 'sayHello',
        },
      };

      const { result, data } = simulate(transaction);

      expect(data).toEqual('Hello!');
      expectToFind('sayHello() was called', {
        inArray: result.outcome.logs,
      });
    });

    describe('responds to getAllMessages()', () => {
      it('works with 0 messages', () => {
        const transaction = {
          contract: nep4,
          method: {
            type: 'call',
            name: 'getAllMessages',
          },
        };

        const { result, data } = simulate(transaction);

        expectToFind('getAllMessages() was called', {
          inArray: result.outcome.logs,
        });
      });

      it('works with 1 message', () => {
        sendMessage(accounts.alice, { message: messages[0] });

        const transaction = {
          signer: accounts.alice,
          contract: nep4,
          method: {
            type: 'call',
            name: 'getAllMessages',
          },
        };

        // useful for visualizing contract state
        // console.log(greeting.state);

        const { result, data } = simulate(transaction);

        expectToFind('alice says awesomesauce!', {
          inArray: data,
        });

        expectToFind('getAllMessages() was called', {
          inArray: result.outcome.logs,
        });
      });

      it('works with many messages', () => {
        let expectedMessages = [];

        Object.keys(accounts).map((user, idx) => {
          let signer = accounts[user];
          let message = messages[idx];

          sendMessage(signer, { message });
          expectedMessages.push(`${signer.account_id} says ${message}`);
        });

        const transaction = {
          contract: nep4,
          method: {
            type: 'call',
            name: 'getAllMessages',
          },
        };

        // useful for visualizing contract state
        // console.log(greeting.state);

        const { result, data } = simulate(transaction);

        expectedMessages.map((message) => {
          expectToFind(message, {
            inArray: data,
          });
        });

        expectToFind('getAllMessages() was called', {
          inArray: result.outcome.logs,
        });
      });
    });
  });

  describe('Call methods', () => {
    it('responds to sayMyName()', () => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'call',
          name: 'sayMyName',
        },
      };

      const { data, result } = simulate(transaction);

      expect(data).toEqual(`Hello, ${accounts.alice.account_id}!`);
      expectToFind('sayMyName() was called', {
        inArray: result.outcome.logs,
      });
    });

    it('responds to saveMyName()', () => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'call',
          name: 'saveMyName',
        },
      };

      const { result } = simulate(transaction);

      // 'c2VuZGVy' is ' in base64
      // 'YWxpY2U=' is 'alice' in base64
      expect(result.state).toHaveProperty('sender', 'alice');

      expectToFind('saveMyName() was called', {
        inArray: result.outcome.logs,
      });
    });

    it('responds to saveMyMessage()', () => {
      const transaction = {
        signer: accounts.alice,
        contract: nep4,
        method: {
          type: 'call',
          name: 'saveMyMessage',
          params: { message: 'awesomesauce' },
        },
      };

      const { data, result } = simulate(transaction);

      expect(data).toBeTruthy();

      // 'bWVzc2FnZXM6Oi0x' is  in base64
      // 'YWxpY2Ugc2F5cyBhd2Vzb21lc2F1Y2Uh' is 'alice says awesomesauce' in base64
      expect(result.state).toHaveProperty(
        'messages::-1',
        'alice says awesomesauce'
      );

      expectToFind('saveMyMessage() was called', {
        inArray: result.outcome.logs,
      });
    });
    */
})

// ---------------------------------------------------------------
// Contract Testing Helpers
// ---------------------------------------------------------------

function assign(aToken, toAccount) {
  let transaction = {
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

// ---------------------------------------------------------------
// Simulation Testing Helpers
// ---------------------------------------------------------------
const chalk = require('chalk') // note: this is included w Jest

function expectToFind(target, { inArray, inObject }, partial = true) {
  if (partial) {
    const object = inArray || inObject
    try {
      expect(JSON.stringify(object).search(target)).toBeGreaterThan(0)
    } catch (error) {
      console.log(chalk`{redBright [ ${target} ] not found in ${object}}`)
    }
    // console.log(
    //   target,
    //   object,
    //   JSON.stringify(object),
    //   JSON.stringify(object).search(target)
    // )
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

function simulate({ signer, contract, method }, printResponse = false) {
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
    calls: response.calls,
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


const nearApi = require('near-api-js');
const testUtils  = require('./test-utils');
const fs = require('fs');
const BN = require('bn.js');

const { Account, Contract } = nearApi

jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000;
let near, connection;

beforeAll(async () => {
    near = await testUtils.initConnection();
    connection = near.connection
});

describe('deploy contract', () => {
    let contract, contractId;
    let alice, bob;

    beforeAll(async () => {
        contract = getPrimary();
        contractId = contract.accountId
        await contract.deployContract([...fs.readFileSync('./out/nep4_rs.wasm')]);
        contract = new Contract(contract, contract.accountId, {
            viewMethods: ['get_token_owner'],
            changeMethods:['new', 'mint_token'],
        })
        await contract.new({ owner_id: contractId })
    });

    test('contract hash', async () => {
        let state = (await new Account(connection, contractId)).state();
        expect(state.code_hash).not.toEqual('11111111111111111111111111111111');
    });

    test('mint_token', async () => {
        alice = await testUtils.createAccount(near);
        await contract.mint_token({
            owner_id: alice.accountId,
            token_id: 1,
        })
        const result = await contract.get_token_owner({
            token_id: 1,
        })
        expect(result).toEqual(alice.accountId);
    });

})
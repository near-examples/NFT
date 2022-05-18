import { Worker, NearAccount, captureError, NEAR, BN } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';

const test = anyTest as TestFn<{
    worker: Worker;
    accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async t => {
    const worker = await Worker.init();
    const root = worker.rootAccount;
    const nft = await root.createAndDeploy(
        root.getSubAccount('fungible-token').accountId,
        "../../res/fungible_token.wasm",
        { initialBalance: NEAR.parse('3 N').toJSON() },
    );
    const defi = await root.createAndDeploy(
        root.getSubAccount('defi').accountId,
        '../../res/defi.wasm',
        { initialBalance: NEAR.parse('3 N').toJSON() },
    );
    const alice = await root.createSubAccount('ali', { initialBalance: NEAR.parse('1 N').toJSON() });

    t.context.worker = worker;
    t.context.accounts = { root, nft, alice };
});

test.afterEach(async t => {
    await t.context.worker.tearDown().catch(error => {
        console.log('Failed to tear down the worker:', error);
    });
});


test('Simple approve', async test => {
    const { root, nft, alice } = test.context.accounts;
    // root approves alice
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: alice,
        },
        { 
            attachedDeposit: new BN('270000000000000000000'), // need more deposit than the sim-tests, cause names are longer
            gas: tGas('150') 
        },
    );

    // check nft_is_approved, don't provide approval_id
    test.assert(
        await nft.view(
            'nft_is_approved',
            {
                token_id: '0',
                approved_account_id: alice,
            })
    );

    // check nft_is_approved, with approval_id=1
    test.assert(
        await nft.view(
            'nft_is_approved',
            {
                token_id: '0',
                approved_account_id: alice,
                approval_id: 1,
            })
    );

    // check nft_is_approved, with approval_id=2
    test.false(
        await nft.view(
            'nft_is_approved',
            {
                token_id: '0',
                approved_account_id: alice,
                approval_id: 2,
            })
    );

    // alternatively, one could check the data returned by nft_token
    const token: any = await nft.view('nft_token', { token_id: '0', });
    test.deepEqual(token.approved_account_ids, { [alice.accountId]: 1 })

    // root approves alice again, which changes the approval_id and doesn't require as much deposit
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: alice,
        },
        { attachedDeposit: '1', gas: tGas('150') }
    );

    test.true(
        await nft.view(
            'nft_is_approved',
            {
                token_id: '0',
                approved_account_id: alice,
                approval_id: 2,
            },
        )
    );

    // approving another account gives different approval_id
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: tokenReceiver,
        },
        // note that token_receiver's account name is longer, and so takes more bytes to store and
        // therefore requires a larger deposit!
        { attachedDeposit: new BN('360000000000000000000'), gas: tGas('150') }
    );

    test.true(
        await nft.view(
            'nft_is_approved',
            {
                token_id: '0',
                approved_account_id: tokenReceiver,
                approval_id: 3,
            })
    );
});
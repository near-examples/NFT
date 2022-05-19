import { Worker, NearAccount, tGas, NEAR, BN } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';

const test = anyTest as TestFn<{
    worker: Worker;
    accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async t => {
    const worker = await Worker.init();
    const root = worker.rootAccount;
    const nft = await root.createAndDeploy(
        'non-fungible-token',
        '../../res/non_fungible_token.wasm',
        {
            method: "new_default_meta",
            args: { owner_id: root },
        }
    );
    await root.call(
        nft,
        "nft_mint",
        {
            token_id: "0",
            receiver_id: root,
            token_metadata: {
                title: "Olympus Mons",
                description: "The tallest mountain in the charted solar system",
                media: null,
                media_hash: null,
                copies: 10000,
                issued_at: null,
                expires_at: null,
                starts_at: null,
                updated_at: null,
                extra: null,
                reference: null,
                reference_hash: null,
            }
        },
        { attachedDeposit: '7000000000000000000000' }
    );

    const alice = await root.createSubAccount('alice', { initialBalance: NEAR.parse('100 N').toJSON() });

    const tokenReceiver = await root.createAndDeploy(
        'token-receiver',
        '../../res/token_receiver.wasm',
        {
            method: "new",
            args: { non_fungible_token_account_id: nft },
        }
    );
    const approvalReceiver = await root.createAndDeploy(
        'approval-receiver',
        '../../res/approval_receiver.wasm',
        {
            method: "new",
            args: { non_fungible_token_account_id: nft },
        }
    );

    t.context.worker = worker;
    t.context.accounts = { root, alice, nft, tokenReceiver, approvalReceiver };
});

test.afterEach(async t => {
    await t.context.worker.tearDown().catch(error => {
        console.log('Failed to tear down the worker:', error);
    });
});


test('Simple approve', async test => {
    const { root, alice, nft, tokenReceiver } = test.context.accounts;
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

test('Approval with call', async test => {
    const { root, nft, approvalReceiver } = test.context.accounts;
    let outcome: string = await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: approvalReceiver,
            msg: 'return-now',
        },
        { attachedDeposit: new BN('390000000000000000000'), gas: tGas('150') },
    );

    test.is(outcome, 'cool');

    const msg = 'hahaha';
    outcome = await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: approvalReceiver,
            msg: msg,
        },
        { attachedDeposit: new BN('390000000000000000000'), gas: tGas('150') },
    );
    test.is(outcome, msg);
});

test('Approved account transfers token', async test => {
    const { root, alice, nft } = test.context.accounts;
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: alice,

        },
        { attachedDeposit: new BN('270000000000000000000'), gas: tGas('150') },
    );

    await alice.call(
        nft,
        'nft_transfer',
        {
            receiver_id: alice,
            token_id: '0',
            approval_id: 1,
            memo: 'gotcha! bahahaha',
        },
        { attachedDeposit: '1', gas: tGas('150') }
    );

    const token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, alice.accountId);
});

test('Revoke', async test => {
    const { root, alice, tokenReceiver, nft } = test.context.accounts;
    // root approves alice
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: alice,

        },
        { attachedDeposit: new BN('270000000000000000000'), gas: tGas('150') },
    );

    // root approves token_receiver
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: tokenReceiver,
        },
        { attachedDeposit: new BN('360000000000000000000'), gas: tGas('150') }
    );

    // root revokes alice
    await root.call(nft, 'nft_revoke', { token_id: '0', account_id: alice }, { attachedDeposit: '1' });

    // alice is revoked...
    test.false(
        await nft.view('nft_is_approved', { token_id: '0', approved_account_id: alice })
    );

    // but token_receiver is still approved
    test.true(
        await nft.view('nft_is_approved', { token_id: '0', approved_account_id: tokenReceiver })
    );

    // root revokes token_receiver
    await root.call(nft, 'nft_revoke', { token_id: '0', account_id: tokenReceiver }, { attachedDeposit: '1' });

    // alice is still revoked...
    test.false(
        await nft.view('nft_is_approved', { token_id: '0', approved_account_id: alice })
    );

    // ...and now so is token_receiver
    test.false(
        await nft.view('nft_is_approved', { token_id: '0', approved_account_id: tokenReceiver })
    );
})

test('Revoke all', async test => {
    const { root, alice, tokenReceiver, nft } = test.context.accounts;
    // root approves alice
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: alice,

        },
        { attachedDeposit: new BN('270000000000000000000'), gas: tGas('150') },
    );

    // root approves token_receiver
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: tokenReceiver,
        },
        { attachedDeposit: new BN('360000000000000000000'), gas: tGas('150') }
    );

    await root.call(nft, 'nft_revoke_all', { token_id: '0' }, { attachedDeposit: '1' });

    // everyone revoked...
    test.false(
        await nft.view('nft_is_approved', { token_id: '0', approved_account_id: alice })
    );
    test.false(
        await nft.view('nft_is_approved', { token_id: '0', approved_account_id: tokenReceiver })
    );
})

test('Simple transfer', async test => {
    const { root, alice, nft } = test.context.accounts;
    let token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, root.accountId);

    const result = await root.callRaw(
        nft,
        'nft_transfer',
        {
            receiver_id: alice,
            token_id: '0',
            memo: "simple transfer",
        },
        { attachedDeposit: '1' },
    );
    test.assert(result.succeeded);
    token = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, alice.accountId);
});

test('Transfer call fast return to sender', async test => {
    const { root, tokenReceiver, nft } = test.context.accounts;
    await root.call(
        nft,
        'nft_transfer_call',
        {
            receiver_id: tokenReceiver,
            token_id: '0',
            memo: 'transfer & call',
            msg: 'return-it-now',
        },
        { attachedDeposit: '1', gas: tGas(150) },
    );

    const token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, root.accountId);
});

test('Transfer call slow return to sender', async test => {
    const  { root, tokenReceiver, nft } = test.context.accounts;
    await root.call(
        nft,
        'nft_transfer_call',
        {
            receiver_id: tokenReceiver,
            token_id: '0',
            memo: 'transfer & call',
            msg: 'return-it-later',
        },
        { attachedDeposit: '1', gas: tGas(150) },
    );

    const token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, root.accountId);
});

test('Transfer call fast keep with sender', async test => {
    const { root, tokenReceiver, nft } = test.context.accounts;
    await root.call(
        nft,
        'nft_transfer_call',
        {
            receiver_id: tokenReceiver,
            token_id: '0',
            memo: 'transfer & call',
            msg: 'keep-it-now',
        },
        { attachedDeposit: '1', gas: tGas(150) },
    );
    const token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, tokenReceiver.accountId);
});
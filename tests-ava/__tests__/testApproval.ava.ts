import { workspace } from "./utils";
import { BN, tGas } from 'near-workspaces-ava'

workspace.test('Simple approve', async (test, { root, alice, tokenReceiver, nft }) => {
    // root approves alice
    await root.call(
        nft,
        'nft_approve',
        {
            token_id: '0',
            account_id: alice,
        },
        { attachedDeposit: new BN('270000000000000000000'), gas: tGas('150') } // need more deposit than the sim-tests, cause names are longer
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


workspace.test('Approval with call', async (test, { root, alice, approvalReceiver, nft }) => {
    let outcome:string = await root.call(
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
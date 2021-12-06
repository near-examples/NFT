import { workspace } from "./utils";
import { tGas } from 'near-workspaces-ava'

workspace.test('Simple transfer', async (test, { root, alice, nft }) => {
    let token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, root.accountId);

    const result = await root.call_raw(
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


workspace.test('Transfer call fast return to sender', async (test, { root, alice, tokenReceiver, nft }) => {
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


workspace.test('Transfer call slow return to sender', async (test, { root, alice, tokenReceiver, nft }) => {
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


workspace.test('Transfer call fast keep with sender', async (test, { root, alice, tokenReceiver, nft }) => {
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

workspace.test('Transfer call slow keep with sender', async (test, { root, alice, tokenReceiver, nft }) => {
    await root.call(
        nft,
        'nft_transfer_call',
        {
            receiver_id: tokenReceiver,
            token_id: '0',
            approval_id: null,
            memo: 'transfer & call',
            msg: 'keep-it-later',
        },
        { attachedDeposit: '1', gas: tGas(150) },
    );
    const token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, tokenReceiver.accountId);
});

workspace.test('Transfer call receiver panics', async (test, { root, alice, tokenReceiver, nft }) => {
    await root.call(
        nft,
        'nft_transfer_call',
        {
            receiver_id: tokenReceiver,
            token_id: '0',
            approval_id: null,
            memo: 'transfer & call',
            msg: 'incorrect message',
        },
        { attachedDeposit: '1', gas: tGas(150) },
    );
    const token: any = await nft.view('nft_token', { token_id: '0' });
    test.is(token.owner_id, root.accountId);
});

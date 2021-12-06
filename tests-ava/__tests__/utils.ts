import { Workspace, NearAccount, BN } from 'near-workspaces-ava';

export const workspace = Workspace.init(async ({ root }) => {
    // Create a subaccount of the root account, and also deploy a contract to it
    const nft = await root.createAndDeploy(
        'non-fungible-token',
        '../res/non_fungible_token.wasm',
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

    const alice = await root.createAccount('alice');


    const tokenReceiver = await root.createAndDeploy(
        'token-receiver',
        '../res/token_receiver.wasm',
        {
            method: "new",
            args: { non_fungible_token_account_id: nft },
        }
    );
    const approvalReceiver = await root.createAndDeploy(
        'approval-receiver',
        '../res/approval_receiver.wasm',
        {
            method: "new",
            args: { non_fungible_token_account_id: nft },
        }
    );

    return { alice, nft, tokenReceiver, approvalReceiver };
});
export async function helper_mint(
    token_id: string,
    root: NearAccount,
    nft: NearAccount,
    title: String,
    desc: String) {
    await root.call(
        nft,
        "nft_mint",
        {
            token_id: token_id,
            receiver_id: root,
            token_metadata: {
                title: title,
                description: desc,
                media: null,
                media_hash: null,
                copies: 1,
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
    )
}
export async function mint_more(root: NearAccount, nft: NearAccount) {
    await helper_mint(
        "1",
        root,
        nft,
        "Black as the Night",
        "In charcoal"
    );
    await helper_mint(
        "2",
        root,
        nft,
        "Hamakua",
        "Vintage recording"
    );
    await helper_mint(
        "3",
        root,
        nft,
        "Aloha ke akua",
        "Original with piano"
    );
}

export async function nft_total_supply(nft: NearAccount, user: NearAccount): Promise<BN> {
    return new BN(await nft.view('nft_total_supply'));
}


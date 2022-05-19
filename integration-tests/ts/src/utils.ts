import { NearAccount, BN } from 'near-workspaces';

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


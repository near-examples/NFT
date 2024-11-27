use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
use near_contract_standards::non_fungible_token::TokenId;

use near_sdk::serde_json::json;
use near_sdk::AccountId;
use near_workspaces::types::NearToken;
use near_workspaces::{Account, Contract};

pub async fn mint_nft(
    minter: &Account,
    contract_id: &AccountId,
    token_id: TokenId,
    token_owner_id: &AccountId,
) -> anyhow::Result<()> {
    let token_metadata = TokenMetadata {
        title: Some(format!("Title for {token_id}")),
        description: Some(format!("Description for {token_id}")),
        media: None,
        media_hash: None,
        copies: Some(1u64),
        issued_at: None,
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: None,
        reference: None,
        reference_hash: None,
    };
    let res = minter
        .call(contract_id, "nft_mint")
        .args_json(json!({"token_id": token_id, "token_owner_id": token_owner_id, "token_metadata": token_metadata}))
        .max_gas()
        .deposit(NearToken::from_millinear(7))
        .transact()
        .await?;
    assert!(res.is_success());

    Ok(())
}

pub async fn init_nft_contract(contract: &Contract) -> anyhow::Result<()> {
    let res = contract
        .call("new_default_meta")
        .args_json((contract.id(),))
        .max_gas()
        .transact()
        .await?;
    assert!(res.is_success());

    Ok(())
}

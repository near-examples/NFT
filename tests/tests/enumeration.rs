use crate::common;
use near_contract_standards::non_fungible_token::Token;
use near_sdk::json_types::U128;
use near_workspaces::{network::Sandbox, Worker};

#[tokio::test]
async fn enumeration() -> anyhow::Result<()> {
    let nft_wasm = near_workspaces::compile_project(".").await.unwrap();
    let worker = near_workspaces::sandbox().await?;

    let enum_total_supply = test_enum_total_supply(&worker, &nft_wasm);
    let enum_nft_tokens = test_enum_nft_tokens(&worker, &nft_wasm);
    let enum_nft_supply_for_owner = test_enum_nft_supply_for_owner(&worker, &nft_wasm);
    let enum_nft_tokens_for_owner = test_enum_nft_tokens_for_owner(&worker, &nft_wasm);

    enum_total_supply.await?;
    enum_nft_tokens.await?;
    enum_nft_supply_for_owner.await?;
    enum_nft_tokens_for_owner.await?;

    Ok(())
}

async fn test_enum_total_supply(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    common::init_nft_contract(&nft_contract).await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-0".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-1".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-2".into(),
        nft_contract.id(),
    )
    .await?;

    let total_supply: U128 = nft_contract.call("nft_total_supply").view().await?.json()?;
    assert_eq!(total_supply, U128::from(3));

    Ok(())
}

async fn test_enum_nft_tokens(worker: &Worker<Sandbox>, nft_wasm: &Vec<u8>) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    common::init_nft_contract(&nft_contract).await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-0".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-1".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-2".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-3".into(),
        nft_contract.id(),
    )
    .await?;

    // No optional args should return all
    let mut tokens: Vec<Token> = nft_contract
        .call("nft_tokens")
        .args_json((Option::<U128>::None, Option::<u64>::None))
        .view()
        .await?
        .json()?;
    assert_eq!(tokens.len(), 4);

    // Start at "1", with no limit arg
    tokens = nft_contract
        .call("nft_tokens")
        .args_json((Some(U128::from(1)), Option::<u64>::None))
        .view()
        .await?
        .json()?;
    assert_eq!(tokens.len(), 3);
    assert_eq!(tokens.get(0).unwrap().token_id, "id-1".to_string());
    assert_eq!(tokens.get(1).unwrap().token_id, "id-2".to_string());
    assert_eq!(tokens.get(2).unwrap().token_id, "id-3".to_string());

    // Start at "2", with limit 1
    tokens = nft_contract
        .call("nft_tokens")
        .args_json((Some(U128::from(2)), Some(1u64)))
        .view()
        .await?
        .json()?;
    assert_eq!(tokens.len(), 1);
    assert_eq!(tokens.get(0).unwrap().token_id, "id-2".to_string());

    // Don't specify from_index, but limit 2
    tokens = nft_contract
        .call("nft_tokens")
        .args_json((Option::<U128>::None, Some(2u64)))
        .view()
        .await?
        .json()?;
    assert_eq!(tokens.len(), 2);
    assert_eq!(tokens.get(0).unwrap().token_id, "id-0".to_string());
    assert_eq!(tokens.get(1).unwrap().token_id, "id-1".to_string());

    Ok(())
}

async fn test_enum_nft_supply_for_owner(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    common::init_nft_contract(&nft_contract).await?;

    let alice = worker.dev_create_account().await?;

    // Get number from account with no NFTs
    let owner_num_tokens: U128 = nft_contract
        .call("nft_supply_for_owner")
        .args_json((alice.id(),))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_num_tokens, U128::from(0));

    let owner_num_tokens: U128 = nft_contract
        .call("nft_supply_for_owner")
        .args_json((nft_contract.id(),))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_num_tokens, U128::from(0));

    common::mint_nft(&nft_contract.as_account(), nft_contract.id(), "id-0".into(), nft_contract.id()).await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-1".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-2".into(),
        alice.id(),
    )
    .await?;

    let owner_num_tokens: U128 = nft_contract
        .call("nft_supply_for_owner")
        .args_json((nft_contract.id(),))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_num_tokens, U128::from(2));

    let alice_num_tokens: U128 = nft_contract
        .call("nft_supply_for_owner")
        .args_json((alice.id(),))
        .view()
        .await?
        .json()?;
    assert_eq!(alice_num_tokens, U128::from(1));
    
    Ok(())
}

async fn test_enum_nft_tokens_for_owner(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    common::init_nft_contract(&nft_contract).await?;

    let alice = worker.dev_create_account().await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-0".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-1".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-2".into(),
        nft_contract.id(),
    )
    .await?;

    common::mint_nft(
        &nft_contract.as_account(),
        nft_contract.id(),
        "id-3".into(),
        nft_contract.id(),
    )
    .await?;

    // Get tokens from account with no NFTs
    let owner_tokens: Vec<Token> = nft_contract
        .call("nft_tokens_for_owner")
        .args_json((alice.id(), Option::<U128>::None, Option::<u64>::None))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_tokens.len(), 0);

    // Get tokens with no optional args
    let owner_tokens: Vec<Token> = nft_contract
        .call("nft_tokens_for_owner")
        .args_json((nft_contract.id(), Option::<U128>::None, Option::<u64>::None))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_tokens.len(), 4);

    // With from_index and no limit
    let owner_tokens: Vec<Token> = nft_contract
        .call("nft_tokens_for_owner")
        .args_json((nft_contract.id(), Some(U128::from(2)), Option::<u64>::None))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_tokens.len(), 2);
    assert_eq!(owner_tokens.get(0).unwrap().token_id, "id-2".to_string());
    assert_eq!(owner_tokens.get(1).unwrap().token_id, "id-3".to_string());

    // With from_index and limit 1
    let owner_tokens: Vec<Token> = nft_contract
        .call("nft_tokens_for_owner")
        .args_json((nft_contract.id(), Some(U128::from(1)), Some(1u64)))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_tokens.len(), 1);
    assert_eq!(owner_tokens.get(0).unwrap().token_id, "id-1".to_string());

    // No from_index but limit 3
    let owner_tokens: Vec<Token> = nft_contract
        .call("nft_tokens_for_owner")
        .args_json((nft_contract.id(), Option::<U128>::None, Some(3u64)))
        .view()
        .await?
        .json()?;
    assert_eq!(owner_tokens.len(), 3);
    assert_eq!(owner_tokens.get(0).unwrap().token_id, "id-0".to_string());
    assert_eq!(owner_tokens.get(1).unwrap().token_id, "id-1".to_string());
    assert_eq!(owner_tokens.get(2).unwrap().token_id, "id-2".to_string());

    Ok(())
}

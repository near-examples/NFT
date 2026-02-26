use crate::common;
use near_api::NearToken;
use near_contract_standards::non_fungible_token::Token;
use near_sdk::serde_json::json;

const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
const TOKEN_ID: &str = "id-0";

#[tokio::test]
async fn test_simple_transfer() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the accounts
    let alice = common::init_accounts(&sandbox).await?;
    // Initialize the contracts
    let (nft_contract, _, _, signer) = common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        nft_contract.account_id().to_string()
    );

    let res = nft_contract
        .call_function("nft_transfer", json!({"receiver_id": alice.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "simple transfer"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // A single NFT transfer event should have been logged:
    assert_eq!(res.logs().len(), 1);

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(token.owner_id.to_string(), alice.account_id().clone());

    Ok(())
}

#[tokio::test]
async fn test_transfer_call_fast_return_to_sender() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, token_receiver_contract, _, signer) =
        common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    nft_contract
        .call_function("nft_transfer_call", json!({"receiver_id": token_receiver_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "msg": "transfer & call"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        nft_contract.account_id().to_string()
    );

    Ok(())
}

#[tokio::test]
async fn test_transfer_call_slow_return_to_sender() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, token_receiver_contract, _, signer) =
        common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    nft_contract
        .call_function("nft_transfer_call", json!({"receiver_id": token_receiver_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "transfer & call", "msg": "return-it-later"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        nft_contract.account_id().clone()
    );

    Ok(())
}

#[tokio::test]
async fn test_transfer_call_fast_keep_with_sender() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, token_receiver_contract, _, signer) =
        common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    nft_contract
        .call_function("nft_transfer_call", json!({"receiver_id": token_receiver_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "transfer & call", "msg": "keep-it-now"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        token_receiver_contract.account_id().clone()
    );

    Ok(())
}

#[tokio::test]
async fn test_transfer_call_slow_keep_with_sender() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, token_receiver_contract, _, signer) =
        common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    nft_contract
        .call_function("nft_transfer_call", json!({"receiver_id": token_receiver_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "transfer & call", "msg": "keep-it-later"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        token_receiver_contract.account_id().clone()
    );

    Ok(())
}

#[tokio::test]
async fn test_transfer_call_receiver_panics() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, token_receiver_contract, _, signer) =
        common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    let res = nft_contract
        .call_function("nft_transfer_call", json!({"receiver_id": token_receiver_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "transfer & call", "msg": "incorrect message"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Prints final logs
    assert_eq!(res.logs().len(), 3);

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        nft_contract.account_id().clone()
    );

    Ok(())
}

#[tokio::test]
async fn test_transfer_call_receiver_panics_and_nft_resolve_transfer_produces_no_log_if_not_enough_gas(
) -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, token_receiver_contract, _, signer) =
        common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    nft_contract
        .call_function("nft_transfer_call", json!({"receiver_id": token_receiver_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "transfer & call", "msg": "incorrect message"}))
        .transaction()
        .gas(near_sdk::Gas::from_tgas(3))
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        nft_contract.account_id().clone()
    );

    Ok(())
}

#[tokio::test]
async fn test_simple_transfer_no_logs_on_failure() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, _, _, signer) = common::init_contracts(&sandbox, &sandbox_network).await?;

    common::mint_nft(
        nft_contract.account_id().clone(),
        &nft_contract,
        TOKEN_ID.into(),
        nft_contract.account_id(),
        signer.clone(),
        &sandbox_network,
    )
    .await?;

    let res = nft_contract
        .call_function("nft_transfer", json!({"receiver_id": nft_contract.account_id().clone(), "token_id": TOKEN_ID, "approval_id": Option::<u64>::None, "memo": "simple transfer"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    // Prints no logs
    assert_eq!(res.logs().len(), 0);

    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(
        token.owner_id.to_string(),
        nft_contract.account_id().clone()
    );

    Ok(())
}

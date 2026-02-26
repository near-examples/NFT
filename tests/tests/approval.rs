use crate::common;

use near_api::types::transaction::result::{ExecutionResult, Value};
use near_api::{AccountId, NearToken};
use near_contract_standards::non_fungible_token::Token;

use near_sdk::serde_json::json;
use std::collections::HashMap;

pub const TOKEN_ID: &str = "0";

const ONE_NEAR: NearToken = NearToken::from_near(1);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

#[tokio::test]
async fn test_simple_approve() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the accounts
    let alice = common::init_accounts(&sandbox).await?;
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

    // nft contract approves alice
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": alice.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(510000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // check nft_is_approved, don't provide approval_id
    let alice_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Option::<u64>::None}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(alice_approved);

    // check nft_is_approved, with approval_id=1
    let alice_approval_id_is_1: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Some(1u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(alice_approval_id_is_1);

    // check nft_is_approved, with approval_id=2
    let alice_approval_id_is_2: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Some(2u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(!alice_approval_id_is_2);

    // alternatively, one could check the data returned by nft_token
    let token: Token = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    let mut expected_approvals: HashMap<AccountId, u64> = HashMap::new();
    expected_approvals.insert(alice.account_id().clone(), 1);
    assert_eq!(token.approved_account_ids.unwrap(), expected_approvals);

    // root approves alice again, which changes the approval_id and doesn't require as much deposit
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": alice.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(ONE_NEAR)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let alice_approval_id_is_2: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Some(2u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(alice_approval_id_is_2);

    // approving another account gives different approval_id
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": token_receiver_contract.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(510000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let token_receiver_approval_id_is_3: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": token_receiver_contract.account_id().clone(), "approval_id": Some(3u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(token_receiver_approval_id_is_3);

    Ok(())
}

#[tokio::test]
pub async fn test_approval_with_call() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the contracts
    let (nft_contract, _, approval_receiver_contract, signer) =
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

    let res: ExecutionResult<Value> =nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": approval_receiver_contract.account_id().clone(), "msg": "return-now"}))
        .transaction()
        .deposit(NearToken::from_yoctonear(460000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    assert_eq!(res.json::<String>()?, "cool".to_string());

    // Approve again; will set different approval_id (ignored by approval_receiver).
    // The approval_receiver implementation will return given `msg` after subsequent promise call,
    // if given something other than "return-now".
    let msg = "hahaha".to_string();
    let res: ExecutionResult<Value> = nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": approval_receiver_contract.account_id().clone(), "approval_id": Option::<String>::None, "msg": msg}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    assert_eq!(res.json::<String>()?, msg);

    Ok(())
}

#[tokio::test]
pub async fn test_approved_account_transfers_token() -> anyhow::Result<()> {
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

    // root approves alice
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": alice.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(510000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // alice sends to self
    nft_contract
        .call_function("nft_transfer", json!({"token_id": TOKEN_ID, "receiver_id": alice.account_id().clone(), "approval_id": Option::<String>::None, "memo": "gotcha! bahahaha"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // token now owned by alice
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
pub async fn test_revoke() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the accounts
    let alice = common::init_accounts(&sandbox).await?;
    // Initialize the contracts
    let (nft_contract, _, token_receiver_contract, signer) =
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
    // root approves alice
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": alice.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(510000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // root approves token_receiver
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": token_receiver_contract.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(460000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // root revokes alice
    nft_contract
        .call_function(
            "nft_revoke",
            json!({"token_id": TOKEN_ID, "account_id": alice.account_id().clone()}),
        )
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // alice is revoked...
    let alice_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Some(3u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(!alice_approved);

    // but token_receiver is still approved
    let token_receiver_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": token_receiver_contract.account_id().clone(), "approval_id": Option::<u64>::None}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(token_receiver_approved);

    // root revokes token_receiver
    nft_contract
        .call_function("nft_revoke", json!({"token_id": TOKEN_ID, "account_id": token_receiver_contract.account_id().clone()}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // alice is still revoked...
    let alice_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Some(3u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(!alice_approved);

    // ...and now so is token_receiver
    let token_receiver_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": token_receiver_contract.account_id().clone(), "approval_id": Option::<u64>::None}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(!token_receiver_approved);

    // alice tries to send it to self and fails
    nft_contract
        .call_function("nft_transfer", json!({"token_id": TOKEN_ID, "receiver_id": alice.account_id().clone(), "approval_id": Some(1u64), "memo": "gotcha! bahahaha"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    Ok(())
}

#[tokio::test]
pub async fn test_revoke_all() -> anyhow::Result<()> {
    // Initialize the sandbox
    let (sandbox, sandbox_network) = common::init_sandbox().await?;
    // Initialize the accounts
    let alice = common::init_accounts(&sandbox).await?;
    // Initialize the contracts
    let (nft_contract, _, token_receiver_contract, signer) =
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

    // root approves alice
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": alice.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(510000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // root approves token_receiver
    nft_contract
        .call_function("nft_approve", json!({"token_id": TOKEN_ID, "account_id": token_receiver_contract.account_id().clone(), "approval_id": Option::<String>::None}))
        .transaction()
        .deposit(NearToken::from_yoctonear(460000000000000000000))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // root revokes all
    nft_contract
        .call_function("nft_revoke_all", json!({"token_id": TOKEN_ID}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // alice is revoked...
    let alice_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": alice.account_id().clone(), "approval_id": Some(3u64)}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(!alice_approved);

    // and so is token_receiver
    let token_receiver_approved: bool = nft_contract
        .call_function("nft_is_approved", json!({"token_id": TOKEN_ID, "approved_account_id": token_receiver_contract.account_id().clone(), "approval_id": Option::<u64>::None}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert!(!token_receiver_approved);

    // alice tries to send it to self and fails
    nft_contract
        .call_function("nft_transfer", json!({"token_id": TOKEN_ID, "receiver_id": alice.account_id().clone(), "approval_id": Some(1u64), "memo": "gotcha! bahahaha"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    // so does token_receiver
    nft_contract
        .call_function("nft_transfer", json!({"token_id": TOKEN_ID, "receiver_id": token_receiver_contract.account_id().clone(), "approval_id": Some(1u64), "memo": "gotcha! bahahaha"}))
        .transaction()
        .deposit(ONE_YOCTO)
        .with_signer(token_receiver_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    Ok(())
}

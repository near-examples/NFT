use near_units::{parse_gas, parse_near};
use serde_json::json;
use workspaces::prelude::*;
use workspaces::{network::Sandbox, Account, Contract, Worker};

const NFT_WASM_FILEPATH: &str = "../../res/non_fungible_token.wasm";
const TR_WASM_FILEPATH: &str = "../../res/token_receiver.wasm";
const AR_WASM_FILEPATH: &str = "../../res/approval_receiver.wasm";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // initiate environemnt
    let worker = workspaces::sandbox().await?;

    // deploy contracts
    let nft_wasm = std::fs::read(NFT_WASM_FILEPATH)?;
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let tr_wasm = std::fs::read(TR_WASM_FILEPATH)?;
    let tr_contract = worker.dev_deploy(&tr_wasm).await?;
    let ar_wasm = std::fs::read(AR_WASM_FILEPATH)?;
    let ar_contract = worker.dev_deploy(&ar_wasm).await?;

    // create accounts
    let owner = worker.root_account().unwrap();
    let alice = owner
        .create_subaccount(&worker, "alice")
        .initial_balance(parse_near!("30 N"))
        .transact()
        .await?
        .into_result()?;

    // Initialize contracts
    nft_contract
        .call(&worker, "new_default_meta")
        .args_json(serde_json::json!({
            "owner_id": owner.id()
        }))?
        .transact()
        .await?;
    tr_contract
        .call(&worker, "new")
        .args_json(serde_json::json!({
            "non_fungible_token_account_id": nft_contract.id()
        }))?
        .transact()
        .await?;
    ar_contract
        .call(&worker, "new")
        .args_json(serde_json::json!({
            "non_fungible_token_account_id": nft_contract.id()
        }))?
        .transact()
        .await?;

    // begin tests
    test_simple_approve(&owner, &alice, &nft_contract, &worker).await?;
    test_approval_simple_call(&owner, &nft_contract, &ar_contract, &worker).await?;
    test_approved_account_transfers_token(&owner, &alice, &nft_contract, &worker).await?;
    test_revoke(&owner, &alice, &nft_contract, &tr_contract, &worker).await?;
    test_revoke_all(&owner, &alice, &nft_contract, &tr_contract, &worker).await?;
    test_simple_transfer(&owner, &alice, &nft_contract, &worker).await?;
    test_transfer_call_fast_return_to_sender(&owner, &tr_contract, &nft_contract, &worker).await?;
    test_transfer_call_slow_return_to_sender(&owner, &tr_contract, &nft_contract, &worker).await?;
    test_transfer_call_fast_keep_with_sender(&owner, &tr_contract, &nft_contract, &worker).await?;
    test_transfer_call_slow_keep_with_sender(&owner, &tr_contract, &nft_contract, &worker).await?;
    test_transfer_call_receiver_panics(&owner, &tr_contract, &nft_contract, &worker).await?;
    test_enum_total_supply(&nft_contract, &worker).await?;
    test_enum_nft_tokens(&nft_contract, &worker).await?;
    test_enum_nft_supply_for_owner(&owner, &alice, &nft_contract, &worker).await?;
    test_enum_nft_tokens_for_owner(&owner, &alice, &nft_contract, &worker).await?;
    Ok(())
}

async fn test_simple_approve(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    owner
        .call(&worker, nft_contract.id(), "nft_mint")
        .args_json(json!({
            "token_id": "0",
            "receiver_id": owner.id(),
            "token_metadata": {
                "title": "Olympus Mons",
                "description": "The tallest mountain in the charted solar system",
                "copies": 10000,
            }
        }))?
        .deposit(parse_gas!("5950000000000000000000"))
        .transact()
        .await?;

    // root approves alice
    owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id":  "0",
            "account_id": user.id(),
        }))?
        .deposit(parse_gas!("5950000000000000000000"))
        .transact()
        .await?;

    let approval_no_id: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "0",
            "approved_account_id": user.id()
        }))?
        .transact()
        .await?
        .json()?;

    assert!(approval_no_id);

    let approval: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "0",
            "approved_account_id": user.id(),
            "approval_id": 1
        }))?
        .transact()
        .await?
        .json()?;

    assert!(approval);

    let approval_wrong_id: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "0",
            "approved_account_id": user.id(),
            "approval_id": 2
        }))?
        .transact()
        .await?
        .json()?;

    assert!(!approval_wrong_id);
    println!("      Passed ✅ test_simple_approve");
    Ok(())
}

async fn test_approval_simple_call(
    owner: &Account,
    nft_contract: &Contract,
    approval_receiver: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    owner
        .call(&worker, nft_contract.id(), "nft_mint")
        .args_json(json!({
            "token_id": "1",
            "receiver_id": owner.id(),
            "token_metadata": {
                "title": "Olympus Mons 2",
                "description": "The tallest mountain in the charted solar system",
                "copies": 1,
            }
        }))?
        .deposit(parse_gas!("5950000000000000000000"))
        .transact()
        .await?;

    let outcome: String = owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id": "1",
            "account_id": approval_receiver.id(),
            "msg": "return-now"
        }))?
        .gas(parse_gas!("150 Tgas") as u64)
        .deposit(parse_gas!("450000000000000000000"))
        .transact()
        .await?
        .json()?;
    assert_eq!("cool", outcome);

    let msg = "test message";
    let outcome: String = owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id": "1",
            "account_id": approval_receiver.id(),
            "msg": msg.clone(),
        }))?
        .gas(parse_gas!("150 Tgas") as u64)
        .deposit(parse_gas!("450000000000000000000"))
        .transact()
        .await?
        .json()?;
    assert_eq!(msg, outcome);

    println!("      Passed ✅ test_approval_simple_call");
    Ok(())
}

async fn test_approved_account_transfers_token(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    owner
        .call(&worker, nft_contract.id(), "nft_transfer")
        .args_json(json!({
            "receiver_id": user.id(),
            "token_id": '0',
            "approval_id": 1,
            "memo": "message for test 3",
        }))?
        .deposit(1)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "0"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(token.get("owner_id"), Some(&String(user.id().to_string())));

    println!("      Passed ✅ test_approved_account_transfers_token");
    Ok(())
}

async fn test_revoke(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    token_receiver: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id": "1",
            "account_id": user.id(),
        }))?
        .gas(parse_gas!("150 Tgas") as u64)
        .deposit(parse_gas!("450000000000000000000"))
        .transact()
        .await?;

    // root approves token_receiver
    owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id": "1",
            "account_id": token_receiver.id(),
        }))?
        .gas(parse_gas!("150 Tgas") as u64)
        .deposit(parse_gas!("450000000000000000000"))
        .transact()
        .await?;

    // root revokes user
    owner
        .call(&worker, nft_contract.id(), "nft_revoke")
        .args_json(json!({
            "token_id": "1",
            "account_id": user.id(),
        }))?
        .deposit(1)
        .transact()
        .await?;

    // assert user is revoked
    let revoke_bool: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "1",
            "approved_account_id": user.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(revoke_bool, false);

    // assert token receiver still approved
    let revoke_bool: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "1",
            "approved_account_id": token_receiver.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(revoke_bool, true);

    // root revokes token_receiver
    owner
        .call(&worker, nft_contract.id(), "nft_revoke")
        .args_json(json!({
            "token_id": "1",
            "account_id": token_receiver.id(),
        }))?
        .deposit(1)
        .transact()
        .await?;

    // assert alice is still revoked
    let revoke_bool: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "1",
            "approved_account_id": user.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(revoke_bool, false);

    // and now so is token_receiver
    let revoke_bool: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "1",
            "approved_account_id": token_receiver.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(revoke_bool, false);

    println!("      Passed ✅ test_revoke");
    Ok(())
}

async fn test_revoke_all(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    token_receiver: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    // root approves alice
    owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id": "1",
            "account_id": user.id(),
        }))?
        .gas(parse_gas!("150 Tgas") as u64)
        .deposit(parse_gas!("450000000000000000000"))
        .transact()
        .await?;

    // root approves token_receiver
    owner
        .call(&worker, nft_contract.id(), "nft_approve")
        .args_json(json!({
            "token_id": "1",
            "account_id": token_receiver.id(),
        }))?
        .gas(parse_gas!("150 Tgas") as u64)
        .deposit(parse_gas!("450000000000000000000"))
        .transact()
        .await?;

    // assert everyone is revoked
    let revoke_bool: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "1",
            "approved_account_id": user.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(revoke_bool, true);

    let revoke_bool: bool = nft_contract
        .call(&worker, "nft_is_approved")
        .args_json(json!({
            "token_id":  "1",
            "approved_account_id": token_receiver.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(revoke_bool, true);

    println!("      Passed ✅ test_revoke_all");
    Ok(())
}

async fn test_simple_transfer(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "1"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(token.get("owner_id"), Some(&String(owner.id().to_string())));

    owner
        .call(&worker, nft_contract.id(), "nft_transfer")
        .args_json(json!({
            "token_id": "1",
            "receiver_id": user.id(),
        }))?
        .deposit(1)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "1"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(token.get("owner_id"), Some(&String(user.id().to_string())));

    println!("      Passed ✅ test_simple_transfer");
    Ok(())
}

async fn test_transfer_call_fast_return_to_sender(
    owner: &Account,
    token_receiver: &Contract,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    owner
        .call(&worker, nft_contract.id(), "nft_mint")
        .args_json(json!({
            "token_id": "2",
            "receiver_id": owner.id(),
            "token_metadata": {
                "title": "Olympus Mons 3",
                "description": "The tallest mountain in the charted solar system",
                "copies": 1,
            }
        }))?
        .deposit(parse_gas!("6050000000000000000000"))
        .transact()
        .await?;

    owner
        .call(&worker, nft_contract.id(), "nft_transfer_call")
        .args_json(json!({
            "token_id": "2",
            "receiver_id": token_receiver.id(),
            "memo": "transfer & call",
            "msg": "return-it-now",
        }))?
        .deposit(1)
        .gas(parse_gas!("150 Tgas") as u64)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "2"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(token.get("owner_id"), Some(&String(owner.id().to_string())));

    println!("      Passed ✅ test_transfer_call_fast_return_to_sender");
    Ok(())
}

async fn test_transfer_call_slow_return_to_sender(
    owner: &Account,
    token_receiver: &Contract,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    owner
        .call(&worker, nft_contract.id(), "nft_transfer_call")
        .args_json(json!({
            "token_id": "2",
            "receiver_id": token_receiver.id(),
            "memo": "transfer & call",
            "msg": "return-it-later",
        }))?
        .deposit(1)
        .gas(parse_gas!("150 Tgas") as u64)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "2"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(token.get("owner_id"), Some(&String(owner.id().to_string())));

    println!("      Passed ✅ test_transfer_call_slow_return_to_sender");
    Ok(())
}

async fn test_transfer_call_fast_keep_with_sender(
    owner: &Account,
    token_receiver: &Contract,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    owner
        .call(&worker, nft_contract.id(), "nft_transfer_call")
        .args_json(json!({
            "token_id": "2",
            "receiver_id": token_receiver.id(),
            "memo": "transfer & call",
            "msg": "keep-it-now",
        }))?
        .deposit(1)
        .gas(parse_gas!("150 Tgas") as u64)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "2"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(
        token.get("owner_id"),
        Some(&String(token_receiver.id().to_string()))
    );

    println!("      Passed ✅ test_transfer_call_fast_keep_with_sender");
    Ok(())
}

async fn test_transfer_call_slow_keep_with_sender(
    owner: &Account,
    token_receiver: &Contract,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    owner
        .call(&worker, nft_contract.id(), "nft_mint")
        .args_json(json!({
            "token_id": "3",
            "receiver_id": owner.id(),
            "token_metadata": {
                "title": "Olympus Mons 4",
                "description": "The tallest mountain in the charted solar system",
                "copies": 1,
            }
        }))?
        .deposit(parse_gas!("6050000000000000000000"))
        .transact()
        .await?;

    owner
        .call(&worker, nft_contract.id(), "nft_transfer_call")
        .args_json(json!({
            "token_id": "3",
            "receiver_id": token_receiver.id(),
            "memo": "transfer & call",
            "msg": "keep-it-later",
        }))?
        .deposit(1)
        .gas(parse_gas!("150 Tgas") as u64)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "3"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(
        token.get("owner_id"),
        Some(&String(token_receiver.id().to_string()))
    );

    println!("      Passed ✅ test_transfer_call_slow_keep_with_sender");
    Ok(())
}

async fn test_transfer_call_receiver_panics(
    owner: &Account,
    token_receiver: &Contract,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    use serde_json::Value::String;
    owner
        .call(&worker, nft_contract.id(), "nft_mint")
        .args_json(json!({
            "token_id": "4",
            "receiver_id": owner.id(),
            "token_metadata": {
                "title": "Olympus Mons 5",
                "description": "The tallest mountain in the charted solar system",
                "copies": 1,
            }
        }))?
        .deposit(parse_gas!("6050000000000000000000"))
        .gas(parse_gas!("150 Tgas") as u64)
        .transact()
        .await?;

    owner
        .call(&worker, nft_contract.id(), "nft_transfer_call")
        .args_json(json!({
            "token_id": "4",
            "receiver_id": token_receiver.id(),
            "memo": "transfer & call",
            "msg": "incorrect message",
        }))?
        .deposit(1)
        .gas(parse_gas!("150 Tgas") as u64)
        .transact()
        .await?;

    let token: serde_json::Value = nft_contract
        .call(&worker, "nft_token")
        .args_json(json!({"token_id": "4"}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(token.get("owner_id"), Some(&String(owner.id().to_string())));

    println!("      Passed ✅ test_transfer_call_receiver_panics");
    Ok(())
}

async fn test_enum_total_supply(
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    let supply: String = nft_contract
        .call(&worker, "nft_total_supply")
        .args_json(json!({}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(supply, "5");

    println!("      Passed ✅ test_enum_total_supply");
    Ok(())
}

async fn test_enum_nft_tokens(
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    let tokens: Vec<serde_json::Value> = nft_contract
        .call(&worker, "nft_tokens")
        .args_json(json!({}))?
        .transact()
        .await?
        .json()?;

    assert_eq!(tokens.len(), 5);

    println!("      Passed ✅ test_enum_nft_tokens");
    Ok(())
}

async fn test_enum_nft_supply_for_owner(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    let owner_tokens: String = nft_contract
        .call(&worker, "nft_supply_for_owner")
        .args_json(json!({"account_id": owner.id()}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(owner_tokens, "1");

    let user_tokens: String = nft_contract
        .call(&worker, "nft_supply_for_owner")
        .args_json(json!({"account_id": user.id()}))?
        .transact()
        .await?
        .json()?;
    assert_eq!(user_tokens, "2");

    println!("      Passed ✅ test_enum_nft_supply_for_owner");
    Ok(())
}

async fn test_enum_nft_tokens_for_owner(
    owner: &Account,
    user: &Account,
    nft_contract: &Contract,
    worker: &Worker<Sandbox>,
) -> anyhow::Result<()> {
    let tokens: Vec<serde_json::Value> = nft_contract
        .call(&worker, "nft_tokens_for_owner")
        .args_json(json!({
            "account_id": user.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(tokens.len(), 2);

    let tokens: Vec<serde_json::Value> = nft_contract
        .call(&worker, "nft_tokens_for_owner")
        .args_json(json!({
            "account_id": owner.id()
        }))?
        .transact()
        .await?
        .json()?;
    assert_eq!(tokens.len(), 1);
    println!("      Passed ✅ test_enum_nft_tokens_for_owner");
    Ok(())
}

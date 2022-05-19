use near_sdk::json_types::U128;
use near_units::{parse_gas, parse_near};
use serde_json::json;
use workspaces::prelude::*;
use workspaces::result::CallExecutionDetails;
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
    let owner = worker.root_account();
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
    println!("#TODO Tests");

    Ok(())
}
use crate::common;
use near_contract_standards::non_fungible_token::Token;

use near_workspaces::{network::Sandbox, types::NearToken, Worker};

const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
const TOKEN_ID: &str = "id-0";

#[tokio::test]
async fn core() -> anyhow::Result<()> {
    let nft_wasm = near_workspaces::compile_project(".").await.unwrap();
    let token_receiver_wasm = near_workspaces::compile_project("./tests/contracts/token-receiver")
        .await
        .unwrap();

    let worker: near_workspaces::Worker<near_workspaces::network::Sandbox> =
        near_workspaces::sandbox().await?;

    let simple_transfer = test_simple_transfer(&worker, &nft_wasm);
    let transfer_call_fast_return_to_sender = test_transfer_call_fast_return_to_sender(
        &worker,
        &nft_wasm,
        &token_receiver_wasm,
    );
    let transfer_call_slow_return_to_sender = test_transfer_call_slow_return_to_sender(
        &worker,
        &nft_wasm,
        &token_receiver_wasm,
    );
    let transfer_call_fast_keep_with_sender = test_transfer_call_fast_keep_with_sender(
        &worker,
        &nft_wasm,
        &token_receiver_wasm,
    );
    let transfer_call_slow_keep_with_sender = test_transfer_call_slow_keep_with_sender(
        &worker,
        &nft_wasm,
        &token_receiver_wasm,
    );
    let transfer_call_receiver_panics = test_transfer_call_receiver_panics(
        &worker,
        &nft_wasm,
        &token_receiver_wasm,
    );
    let transfer_call_receiver_panics_and_nft_resolve_transfer_produces_no_log_if_not_enough_gas = test_transfer_call_receiver_panics_and_nft_resolve_transfer_produces_no_log_if_not_enough_gas(&worker, &nft_wasm, &token_receiver_wasm);
    let simple_transfer_no_logs_on_failure = test_simple_transfer_no_logs_on_failure(
        &worker,
        &nft_wasm,
    );

    simple_transfer.await?;
    transfer_call_fast_return_to_sender.await?;
    transfer_call_slow_return_to_sender.await?;
    transfer_call_fast_keep_with_sender.await?;
    transfer_call_slow_keep_with_sender.await?;
    transfer_call_receiver_panics.await?;
    transfer_call_receiver_panics_and_nft_resolve_transfer_produces_no_log_if_not_enough_gas
        .await?;
    simple_transfer_no_logs_on_failure.await?;

    Ok(())
}

async fn test_simple_transfer(worker: &Worker<Sandbox>, nft_wasm: &Vec<u8>) -> anyhow::Result<()> {
    let alice = worker.dev_create_account().await?;
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    common::init_nft_contract(&nft_contract).await?;

    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), nft_contract.id().to_string());

    let res = nft_contract
        .call("nft_transfer")
        .args_json((
            alice.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("simple transfer".to_string()),
        ))
        .max_gas()
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_success());

    // A single NFT transfer event should have been logged:
    assert_eq!(res.logs().len(), 1);

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), alice.id().to_string());

    Ok(())
}

async fn test_transfer_call_fast_return_to_sender(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
    token_receiver_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let token_receiver_contract = worker.dev_deploy(&token_receiver_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let res = nft_contract
        .call("nft_transfer_call")
        .args_json((
            token_receiver_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("transfer & call"),
            "return-it-now",
        ))
        .max_gas()
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_success());

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), nft_contract.id().to_string());

    Ok(())
}

async fn test_transfer_call_slow_return_to_sender(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
    token_receiver_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let token_receiver_contract = worker.dev_deploy(&token_receiver_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let res = nft_contract
        .call("nft_transfer_call")
        .args_json((
            token_receiver_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("transfer & call"),
            "return-it-later",
        ))
        .max_gas()
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_success());

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), nft_contract.id().to_string());

    Ok(())
}

async fn test_transfer_call_fast_keep_with_sender(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
    token_receiver_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let token_receiver_contract = worker.dev_deploy(&token_receiver_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let res = nft_contract
        .call("nft_transfer_call")
        .args_json((
            token_receiver_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("transfer & call"),
            "keep-it-now",
        ))
        .max_gas()
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_success());
    assert_eq!(res.logs().len(), 2);

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(
        token.owner_id.to_string(),
        token_receiver_contract.id().to_string()
    );

    Ok(())
}

async fn test_transfer_call_slow_keep_with_sender(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
    token_receiver_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let token_receiver_contract = worker.dev_deploy(&token_receiver_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let res = nft_contract
        .call("nft_transfer_call")
        .args_json((
            token_receiver_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("transfer & call"),
            "keep-it-later",
        ))
        .max_gas()
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_success());

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(
        token.owner_id.to_string(),
        token_receiver_contract.id().to_string()
    );

    Ok(())
}

async fn test_transfer_call_receiver_panics(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
    token_receiver_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let token_receiver_contract = worker.dev_deploy(&token_receiver_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let res = nft_contract
        .call("nft_transfer_call")
        .args_json((
            token_receiver_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("transfer & call"),
            "incorrect message",
        ))
        .gas(near_sdk::Gas::from_gas(35_000_000_000_000 + 1))
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_success());

    // Prints final logs
    assert_eq!(res.logs().len(), 3);

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), nft_contract.id().to_string());

    Ok(())
}

async fn test_transfer_call_receiver_panics_and_nft_resolve_transfer_produces_no_log_if_not_enough_gas(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
    token_receiver_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;
    let token_receiver_contract = worker.dev_deploy(&token_receiver_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;

    let res = nft_contract
        .call("nft_transfer_call")
        .args_json((
            token_receiver_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("transfer & call"),
            "incorrect message",
        ))
        .gas(near_sdk::Gas::from_tgas(30))
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_failure());

    // Prints no logs
    assert_eq!(res.logs().len(), 0);

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), nft_contract.id().to_string());

    Ok(())
}

async fn test_simple_transfer_no_logs_on_failure(
    worker: &Worker<Sandbox>,
    nft_wasm: &Vec<u8>,
) -> anyhow::Result<()> {
    let nft_contract = worker.dev_deploy(&nft_wasm).await?;

    common::init_nft_contract(&nft_contract).await?;
    common::mint_nft(
        nft_contract.as_account(),
        nft_contract.id(),
        TOKEN_ID.into(),
        nft_contract.id(),
    )
    .await?;


    let res = nft_contract
        .call("nft_transfer")
        // transfer to the current owner should fail and not print log
        .args_json((
            nft_contract.id(),
            TOKEN_ID,
            Option::<u64>::None,
            Some("simple transfer"),
        ))
        .gas(near_sdk::Gas::from_tgas(200))
        .deposit(ONE_YOCTO)
        .transact()
        .await?;
    assert!(res.is_failure());

    // Prints no logs
    assert_eq!(res.logs().len(), 0);

    let token = nft_contract
        .call("nft_token")
        .args_json((TOKEN_ID,))
        .view()
        .await?
        .json::<Token>()?;
    assert_eq!(token.owner_id.to_string(), nft_contract.id().to_string());

    Ok(())
}

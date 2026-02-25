use std::sync::Arc;

use near_api::{Account, Contract, NearToken, NetworkConfig, Signer};
use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
use near_contract_standards::non_fungible_token::TokenId;

use near_sandbox::Sandbox;
use near_sdk::serde_json::json;
use near_sdk::AccountId;

const INITIAL_BALANCE: NearToken = NearToken::from_near(30);

pub async fn init_sandbox() -> anyhow::Result<(Sandbox, NetworkConfig)> {
    // Initialize the sandbox
    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let sandbox_network =
        near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);

    Ok((sandbox, sandbox_network))
}

pub async fn init_contracts(
    sandbox: &Sandbox,
    sandbox_network: &NetworkConfig,
) -> anyhow::Result<(Contract, Contract, Contract, Arc<Signer>)> {
    // Create subaccounts for the contracts
    let nft_contract = create_subaccount(&sandbox, "nft-contract.sandbox")
        .await
        .unwrap()
        .as_contract();
    let token_receiver_contract = create_subaccount(&sandbox, "token-receiver-contract.sandbox")
        .await
        .unwrap()
        .as_contract();
    let approval_receiver_contract =
        create_subaccount(&sandbox, "approval-receiver-contract.sandbox")
            .await
            .unwrap()
            .as_contract();

    // Build the contracts
    let nft_wasm_path = cargo_near_build::build_with_cli(Default::default()).unwrap();
    let nft_wasm = std::fs::read(nft_wasm_path)?;
    let token_receiver_wasm_path = cargo_near_build::build_with_cli(
        cargo_near_build::BuildOpts::builder()
            .manifest_path("./tests/contracts/token-receiver/Cargo.toml")
            .build(),
    )
    .unwrap();
    let token_receiver_wasm = std::fs::read(token_receiver_wasm_path)?;
    let approval_receiver_wasm_path = cargo_near_build::build_with_cli(
        cargo_near_build::BuildOpts::builder()
            .manifest_path("./tests/contracts/approval-receiver/Cargo.toml")
            .build(),
    )
    .unwrap();
    let approval_receiver_wasm = std::fs::read(approval_receiver_wasm_path)?;

    // Initialize signer for the contract deployment
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY
            .parse()
            .unwrap(),
    )?;

    // Deploy contracts
    near_api::Contract::deploy(nft_contract.account_id().clone())
        .use_code(nft_wasm)
        .with_init_call(
            "new_default_meta",
            json!({"owner_id": nft_contract.account_id().clone()}),
        )?
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    near_api::Contract::deploy(token_receiver_contract.account_id().clone())
        .use_code(token_receiver_wasm)
        .without_init_call()
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    near_api::Contract::deploy(approval_receiver_contract.account_id().clone())
        .use_code(approval_receiver_wasm)
        .without_init_call()
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    return Ok((
        nft_contract,
        token_receiver_contract,
        approval_receiver_contract,
        signer,
    ));
}

pub async fn init_accounts(sandbox: &Sandbox) -> anyhow::Result<Account> {
    let alice = create_subaccount(&sandbox, "alice.sandbox").await.unwrap();

    return Ok(alice);
}

pub async fn mint_nft(
    minter: AccountId,
    contract: &Contract,
    token_id: TokenId,
    token_owner_id: &AccountId,
    signer: Arc<Signer>,
    sandbox_network: &NetworkConfig,
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
    contract.call_function("nft_mint", json!({"token_id": token_id, "token_owner_id": token_owner_id, "token_metadata": token_metadata}))
        .transaction()
        .deposit(NearToken::from_millinear(7))
        .max_gas()
        .with_signer(minter, signer)
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    Ok(())
}

pub async fn create_subaccount(
    sandbox: &near_sandbox::Sandbox,
    name: &str,
) -> testresult::TestResult<near_api::Account> {
    let account_id: AccountId = name.parse().unwrap();
    sandbox
        .create_account(account_id.clone())
        .initial_balance(INITIAL_BALANCE)
        .send()
        .await?;
    Ok(near_api::Account(account_id))
}

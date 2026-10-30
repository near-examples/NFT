use std::sync::{Arc, LazyLock};

use near_api::{Account, Contract, NearToken, NetworkConfig, Signer};
use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
use near_contract_standards::non_fungible_token::TokenId;

use near_sandbox::Sandbox;
use near_sdk::serde_json::json;
use near_sdk::AccountId;

const INITIAL_BALANCE: NearToken = NearToken::from_near(30);

static NFT_WASM: LazyLock<Vec<u8>> = LazyLock::new(|| build_contract("Cargo.toml"));
static TOKEN_RECEIVER_WASM: LazyLock<Vec<u8>> =
    LazyLock::new(|| build_contract("tests/contracts/token-receiver/Cargo.toml"));
static APPROVAL_RECEIVER_WASM: LazyLock<Vec<u8>> =
    LazyLock::new(|| build_contract("tests/contracts/approval-receiver/Cargo.toml"));
static SANDBOX_SLOTS: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(2);

fn build_contract(manifest: &str) -> Vec<u8> {
    let path = cargo_near_build::build_with_cli(cargo_near_build::BuildOpts {
        manifest_path: Some(manifest.into()),
        no_abi: true,
        no_embed_abi: true,
        ..Default::default()
    })
    .expect("build contract from source");
    std::fs::read(path).expect("read built Wasm")
}

pub struct TestSandbox {
    sandbox: Sandbox,
    _permit: tokio::sync::SemaphorePermit<'static>,
}
impl std::ops::Deref for TestSandbox {
    type Target = Sandbox;
    fn deref(&self) -> &Self::Target {
        &self.sandbox
    }
}

pub async fn init_sandbox() -> anyhow::Result<(TestSandbox, NetworkConfig)> {
    LazyLock::force(&NFT_WASM);
    LazyLock::force(&TOKEN_RECEIVER_WASM);
    LazyLock::force(&APPROVAL_RECEIVER_WASM);
    let permit = SANDBOX_SLOTS.acquire().await?;
    let sandbox = Sandbox::start_sandbox().await?;
    let network = NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
    Ok((
        TestSandbox {
            sandbox,
            _permit: permit,
        },
        network,
    ))
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

    // Initialize signer for the contract deployment
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY
            .parse()
            .unwrap(),
    )?;

    // Deploy contracts
    near_api::Contract::deploy(nft_contract.account_id().clone())
        .use_code(NFT_WASM.clone())
        .with_init_call(
            "new",
            json!({"owner_id": nft_contract.account_id(), "metadata": {
                "spec": "nft-1.0.0", "name": "Test Collection", "symbol": "TEST"
            }}),
        )?
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    near_api::Contract::deploy(token_receiver_contract.account_id().clone())
        .use_code(TOKEN_RECEIVER_WASM.clone())
        .without_init_call()
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();
    near_api::Contract::deploy(approval_receiver_contract.account_id().clone())
        .use_code(APPROVAL_RECEIVER_WASM.clone())
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

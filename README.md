# Non-fungible Token (NFT) Example 🖼️ 

[![](https://img.shields.io/badge/⋈%20Examples-Basics-green)](https://docs.near.org/tutorials/welcome)
[![](https://img.shields.io/badge/Contract-Rust-red)](contract-rs)

This repository contains an example implementation of a [non-fungible token] contract in Rust which uses [near-contract-standards] and workspaces-rs tests.

  [non-fungible token]: https://nomicon.io/Standards/NonFungibleToken/README.html
  [near-contract-standards]: https://github.com/near/near-sdk-rs/tree/master/near-contract-standards
  [near-workspaces-rs]: https://github.com/near/near-workspaces-rs

>**Note**: If you'd like to learn how to create an NFT contract from scratch that explores every aspect of the [NEP-171](https://github.com/near/NEPs/blob/master/neps/nep-0171.md) standard including an NFT marketplace, check out the NFT [Zero to Hero Tutorial](https://docs.near.org/tutorials/nfts/introduction).

<br />

## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near build
```

> Note: to avoid issues, be sure to update your Rust compiler with `rustup update stable`

## How to Test Locally?

```bash
cargo test
```

## How to Deploy?

To deploy manually, install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
# Create a new account
cargo near create-dev-account

# Deploy the contract on it
cargo near deploy <account-id>

# Initialize the contract
near call <account-id> new_default_meta '{"owner_id": "<account-id>"}' --accountId <account-id>
```

## Basic methods
```bash
# View metadata
near view <account-id> nft_metadata

# Mint a NFT
near call <account-id> nft_mint '{"token_id": "0", "token_owner_id": "<account-id>", "token_metadata": { "title": "Olympus Mons", "description": "Tallest mountain in charted solar system", "media": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Olympus_Mons_alt.jpg/1024px-Olympus_Mons_alt.jpg", "copies": 1}}' --accountId <account-id> --deposit 0.1

# View tokens for owner
near view <account-id> nft_tokens_for_owner '{"account_id": "<owner_id>"}'

# Transfer a NFT
near call <account-id> nft_transfer '{"token_id": "0", "receiver_id": "<receiver-id>", "memo": "transfer ownership"}' --accountId <account-id> --depositYocto 1
```

## Useful Links

- [cargo-near](https://github.com/near/cargo-near) - NEAR smart contract development toolkit for Rust
- [near CLI](https://near.cli.rs) - Iteract with NEAR blockchain from command line
- [NEAR Rust SDK Documentation](https://docs.near.org/sdk/rust/introduction)
- [NEAR Documentation](https://docs.near.org)
- [NFT Zero to Hero Tutorial](https://docs.near.org/tutorials/nfts/introduction)
- [NEAR StackOverflow](https://stackoverflow.com/questions/tagged/nearprotocol)
- [NEAR Discord](https://near.chat)
- [NEAR Telegram Developers Community Group](https://t.me/neardev)
- NEAR DevHub: [Telegram](https://t.me/neardevhub), [Twitter](https://twitter.com/neardevhub)

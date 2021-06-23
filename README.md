Non-fungible Token (NFT)
===================

This repository includes an example implementation of a [non-fungible token] contract which uses [near-contract-standards] and [simulation] tests.

  [non-fungible token]: https://nomicon.io/Standards/NonFungibleToken/README.html
  [near-contract-standards]: https://github.com/near/near-sdk-rs/tree/master/near-contract-standards
  [simulation]: https://github.com/near/near-sdk-rs/tree/master/near-sdk-sim
Rust
====
1. Prerequisites:
  * Make sure Rust is installed per the prerequisites in [`near-sdk-rs`](https://github.com/nearprotocol/near-sdk-rs).
  * Make sure you have Node.js ≥ 12 installed (https://nodejs.org),  then use it to install [yarn]: `npm install --global yarn` (or just `npm i -g yarn`)
  * Install dependencies: `yarn install` (or just `yarn`)

2. Explore this contract:

The source for this contract is in `nft/lib.rs`. It provides methods to manage access to tokens, transfer tokens, check access, and get token owner.

3. Building this contract:
```bash
./build.sh
```

4. Testing this contract:
```bash
cargo test --workspace --package non-fungible-token -- --nocapture
```

AssemblyScript
====
Currently, AssemblyScript is not supported for this example. An old version can be found in #TODO insert tag, but this is not recommended as it is out of date and does not follow the standards the SDK has set currently.

Notes
====
 - The maximum balance value is limited by U128 (2**128 - 1).
 - JSON calls should pass [U128](https://docs.rs/near-sdk/latest/near_sdk/json_types/struct.U128.html) or [U64](https://docs.rs/near-sdk/latest/near_sdk/json_types/struct.U64.html) as a base-10 string. E.g. "100".
 - The core NFT standard does not include escrow/approval functionality, as `nft_transfer_call` provides a superior approach. Please see the approval management standard if this is the desired approach.

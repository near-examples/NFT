Non-Fungible Tokens (NFTs)
==========================

[![Open in Gitpod!](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/near-examples/NFT)

<!-- MAGIC COMMENT: DO NOT DELETE! Everything above this line is hidden on NEAR Examples page -->

This repository includes NFT implementations in Rust and AssemblyScript for [NEP#4](https://github.com/nearprotocol/NEPs/pull/4)



Rust
====

1. Prerequisites:

If you are using Gitpod, you can skip this section! Your environment is already set up 🎉

  * Make sure Rust is installed per the prerequisites in [`near-sdk-rs`](https://github.com/nearprotocol/near-sdk-rs)
  * Make sure you have Node.js ≥ 12 installed,  then use it to install [yarn]: `npm install --global yarn` (or just `npm i -g yarn`)
  * Install dependencies: `yarn install` (or just `yarn`) 

2. Explore this contract

The source for this contract is in `contract/src/lib.rs`. It provides methods to manage access to tokens, transfer tokens, check access, and get token owner. The same file contains the unit tests for the contract as well.

3. Building this contract

To build the rust version of the contract:
```
    npm run build:rs
```

4. Running the tests
To run the unit tests, run this command:
```
    npm run test:unit:rs
```


AssemblyScript
==============

_Using Gitpod? You can skip these setup steps!_

To run this project locally:

1. Prerequisites: Make sure you have Node.js ≥ 12 installed, then use it to install [yarn]: `npm install --global yarn` (or just
   `npm i -g yarn`)
2. Install dependencies: `yarn install` (or just `yarn`)

Now you can run all the [AssemblyScript]-related scripts listed in `package.json`! Scripts you might want to start with:

* `yarn test:unit:as`: Runs all AssemblyScript tests with filenames ending in
  `unit.spec`
* `yarn build:as`: Compiles the AssemblyScript contracts to [Wasm] binaries

  [yarn]: https://yarnpkg.com/
  [AssemblyScript]: https://assemblyscript.org/
  [Wasm]: https://webassembly.org/

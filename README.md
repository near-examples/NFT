Non-Fungible Tokens (NFTs)
==========================

This repository includes NFT implementations in Rust and AssemblyScript for [NEP#4](https://github.com/nearprotocol/NEPs/pull/4)

Rust
====



AssemblyScript
==============

_Using Gitpod? You can skip these setup steps!_

To run this project locally:

1. Prerequisites: Make sure you have Node.js ≥ 12 installed (we like [asdf] for
   this), then use it to install [yarn]: `npm install --global yarn` (or just
   `npm i -g yarn`)
2. Install dependencies: `yarn install` (or just `yarn`)

Now you can run all the [AssemblyScript]-related scripts listed in `package.json`! Scripts you might want to start with:

* `yarn test:unit:as`: Runs all AssemblyScript tests with filenames ending in
  `unit.spec`
* `yarn build:as`: Compiles the AssemblyScript contracts to [Wasm] binaries

  [asdf]: https://github.com/asdf-vm/asdf
  [yarn]: https://yarnpkg.com/
  [AssemblyScript]: https://assemblyscript.org/
  [Wasm]: https://webassembly.org/

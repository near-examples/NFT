# Non-Fungible Tokens (NFTs)

This repository includes NFT implementations in Rust and AssemblyScript for [NEP#4](https://github.com/nearprotocol/NEPs/pull/4)

## Rust



## AssemblyScript

```text
yarn build
```

_Expected Result_

```
yarn run v1.22.4
$ yarn build:as
$ node ./contracts/assemblyscript/compile.js

compiling contract [ nep4/main.ts ] to [ out/nep4.wasm ]
I/O Read  : 8.446 ms
I/O Write : 2.368 ms
Parse     : 328.200 ms
Compile   : 366.432 ms
Emit      : 107.049 ms
Validate  : 64.315 ms
Optimize  : 3540.003 ms
Filesize  : 32.993 kb
✨  Done in 5.96s.
```

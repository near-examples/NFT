#!/bin/bash

./scripts/build.sh

cd ./test-approval-receiver
cargo build 

cd ../test-token-receiver
cargo build 

cd ../integration-tests/rs
cargo run --example integration-tests

cd ../ts
npm run test
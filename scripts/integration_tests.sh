#!/bin/bash
cd ../integration-tests
echo running Rust integration-tests
cd rs && cargo run --example integration-tests
echo running TypeScript integration-tests
cd ../ts && yarn && yarn test 
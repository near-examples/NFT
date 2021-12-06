These tests use [near-workspaces-ava](https://github.com/near/workspaces-js/tree/main/packages/ava): delightful, deterministic local testing for NEAR smart contracts.

You will need to install [NodeJS](https://nodejs.dev/). Then you can use the `scripts` defined in [package.json](./package.json):

    npm run test

If you want to run `near-workspaces-ava` or `ava` directly, you can use [npx](https://nodejs.dev/learn/the-npx-nodejs-package-runner):

    npx near-workspaces-ava --help
    npx ava --help

To run only one test file:

    npm run test "**/main*"         # matches test files starting with "main"
    npm run test "**/whatever/**/*" # matches test files in the "whatever" directory

To run only one test:

    npm run test -- -m "root sets*" # matches tests with titles starting with "root sets"
    yarn test -m "root sets*"       # same thing using yarn instead of npm, see https://yarnpkg.com/
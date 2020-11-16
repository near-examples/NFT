const dotenv = require('dotenv')
const devEnv = dotenv.parse(require('fs').readFileSync('./neardev/dev-account.env'))

module.exports = function getConfig(env) {
    switch (env) {
    case 'production':
    case 'mainnet':
        return {
            networkId: 'mainnet',
            nodeUrl: 'https://rpc.mainnet.near.org',
            walletUrl: 'https://wallet.near.org',
            helperUrl: 'https://helper.mainnet.near.org',
            primaryAccount: devEnv.CONTRACT_NAME,
        };
    case 'development':
    case 'testnet':
        return {
            networkId: 'default',
            nodeUrl: 'https://rpc.testnet.near.org',
            walletUrl: 'https://wallet.testnet.near.org',
            helperUrl: 'https://helper.testnet.near.org',
            primaryAccount: devEnv.CONTRACT_NAME,
        };
    case 'betanet':
        return {
            networkId: 'betanet',
            nodeUrl: 'https://rpc.betanet.near.org',
            walletUrl: 'https://wallet.betanet.near.org',
            helperUrl: 'https://helper.betanet.near.org',
            primaryAccount: devEnv.CONTRACT_NAME,
        };
    default:
        throw Error(`Unconfigured environment '${env}'. Can be configured in src/config.js.`);
    }
};

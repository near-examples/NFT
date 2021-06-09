const nearAPI = require("near-api-js");
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const BN = require('bn.js');

const keyStore1 = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(
  `${os.homedir()}/.near-credentials/`
);
const keyStore2 = new nearAPI.keyStores.InMemoryKeyStore();
const keyStore = new nearAPI.keyStores.MergeKeyStore([keyStore1, keyStore2]);
const contractName = fs.readFileSync('neardev/dev-account').toString();

describe('pay for listening', () => {
  it('should mint a token and get paid for listening', async () => {
    const account1kp = nearAPI.utils.KeyPairEd25519.fromRandom();
    const account2kp = nearAPI.utils.KeyPairEd25519.fromRandom();
    const signer1AccountId = Buffer.from(account1kp.publicKey.data).toString('hex');
    const signer2AccountId = Buffer.from(account2kp.publicKey.data).toString('hex');

    keyStore2.setKey('default', signer1AccountId, account1kp);
    keyStore2.setKey('default', signer2AccountId, account2kp);

    console.log(contractName, signer1AccountId, signer2AccountId);

    // Initializing connection to the NEAR node.
    const near = await nearAPI.connect({
      deps: {
        keyStore
      },
      nodeUrl: "https://rpc.testnet.near.org",
      networkId: "default"
    });

    const devAccount = await near.account(contractName);
    await devAccount.sendMoney(signer1AccountId, new BN('100000000000000000000000', 10));
    await devAccount.sendMoney(signer2AccountId, new BN('200000000000000000000000', 10));

    const account1 = await near.account(signer1AccountId);
    await account1.addKey(nearAPI.utils.KeyPairEd25519.fromRandom().publicKey, contractName);

    const account2 = await near.account(signer2AccountId);
    await account2.addKey(nearAPI.utils.KeyPairEd25519.fromRandom().publicKey, contractName);

    const contentbase64 = Buffer.from('test').toString('base64');
    let result = await account1.functionCall(contractName, 'mint_to_base64', {
      owner_id: signer1AccountId, supportmixing: true,
      contentbase64: contentbase64
    }, null, '800000000000000000000');

    const token_id = JSON.parse(Buffer.from(result.status.SuccessValue, 'base64').toString('utf-8'));
    console.log('token id is', token_id);

    await account2.functionCall(contractName, 'buy_listening_credit', {}, null, '10000000000000000000000');

    expect(await account2.viewFunction(contractName, 'view_listening_credit', { account: account2.accountId })).toBe(1);
    expect(await account1.viewFunction(contractName, 'view_listening_credit', { account: account1.accountId })).toBe(0);
    const listenRequestPassword = crypto.randomBytes(64).toString('base64');
    const listenRequestPasswordHash = crypto.createHash('sha256').update(listenRequestPassword).digest('base64');
    result = await account2.functionCall(contractName, 'request_listening', { token_id: '' + token_id, listenRequestPasswordHash: listenRequestPasswordHash });

    console.log('wait 2 secs before requesting content');
    await new Promise(r => setTimeout(() => r(), 2000));

    result = await account2.viewFunction(contractName, 'get_token_content_base64', { token_id: token_id, caller: signer2AccountId, listenRequestPassword: listenRequestPassword });
    expect(result).toBe(contentbase64);

    expect(await account2.viewFunction(contractName, 'view_listening_credit', { account: account2.accountId })).toBe(0);
    expect(await account1.viewFunction(contractName, 'view_listening_credit', { account: account1.accountId })).toBe(1);
  });
  it('should mint a token and a remix and give credits to both initial owner and remix owner', async () => {
    const account1kp = nearAPI.utils.KeyPairEd25519.fromRandom();
    const account2kp = nearAPI.utils.KeyPairEd25519.fromRandom();
    const account3kp = nearAPI.utils.KeyPairEd25519.fromRandom();
    const signer1AccountId = Buffer.from(account1kp.publicKey.data).toString('hex');
    const signer2AccountId = Buffer.from(account2kp.publicKey.data).toString('hex');
    const signer3AccountId = Buffer.from(account3kp.publicKey.data).toString('hex');

    keyStore2.setKey('default', signer1AccountId, account1kp);
    keyStore2.setKey('default', signer2AccountId, account2kp);
    keyStore2.setKey('default', signer3AccountId, account3kp);

    console.log(contractName, signer1AccountId, signer2AccountId, signer3AccountId);

    // Initializing connection to the NEAR node.
    const near = await nearAPI.connect({
      deps: {
        keyStore
      },
      nodeUrl: "https://rpc.testnet.near.org",
      networkId: "default"
    });

    const devAccount = await near.account(contractName);
    await devAccount.sendMoney(signer1AccountId, new BN('100000000000000000000000', 10));
    await devAccount.sendMoney(signer2AccountId, new BN('200000000000000000000000', 10));
    await devAccount.sendMoney(signer3AccountId, new BN('11000000000000000000000000', 10));

    const account1 = await near.account(signer1AccountId);
    await account1.addKey(nearAPI.utils.KeyPairEd25519.fromRandom().publicKey, contractName);

    const account2 = await near.account(signer2AccountId);
    await account2.addKey(nearAPI.utils.KeyPairEd25519.fromRandom().publicKey, contractName);

    const account3 = await near.account(signer3AccountId);
    await account3.addKey(nearAPI.utils.KeyPairEd25519.fromRandom().publicKey, contractName);

    const contentbase64 = Buffer.from('test').toString('base64');
    let result = await account1.functionCall(contractName, 'mint_to_base64', {
      owner_id: signer1AccountId, supportmixing: true,
      contentbase64: contentbase64
    }, null, '800000000000000000000');

    const token_id = JSON.parse(Buffer.from(result.status.SuccessValue, 'base64').toString('utf-8'));
    console.log('token id is', token_id);

    await account3.functionCall(contractName, 'publish_token_mix', { token_id: token_id.toString(), mix: [55,33,22,11] });

    let mixes = await account3.viewFunction(contractName, 'get_token_mixes', { token_id: token_id.toString() });
    const first_mix = mixes[0];

    await account3.functionCall(contractName, 'buy_mix', { original_token_id: token_id.toString(), mix: first_mix },
      null, '10000000000000000000000000');

    mixes = await account3.viewFunction(contractName, 'get_token_mixes', { token_id: token_id.toString() });

    const mix_token_id = parseInt(mixes[0].split(';')[1].split(':')[1]);

    await account2.functionCall(contractName, 'buy_listening_credit', {}, null, '20000000000000000000000');

    expect(await account2.viewFunction(contractName, 'view_listening_credit', { account: account2.accountId })).toBe(2);
    expect(await account1.viewFunction(contractName, 'view_listening_credit', { account: account1.accountId })).toBe(0);
    const listenRequestPassword = crypto.randomBytes(64).toString('base64');
    const listenRequestPasswordHash = crypto.createHash('sha256').update(listenRequestPassword).digest('base64');
    await account2.functionCall(contractName, 'request_listening', { token_id: '' + token_id, listenRequestPasswordHash: listenRequestPasswordHash,remix_token_id: `${mix_token_id}`});

    result = await account2.viewFunction(contractName, 'get_token_content_base64', { token_id: token_id, caller: signer2AccountId, listenRequestPassword: listenRequestPassword });
    expect(result).toBe(contentbase64);

    result = await account2.viewFunction(contractName, 'get_remix_token_content', { token_id: `${mix_token_id}`, caller: signer2AccountId, listenRequestPassword: listenRequestPassword });
    console.log(result);

    expect(await account2.viewFunction(contractName, 'view_listening_credit', { account: account2.accountId })).toBe(0);
    expect(await account1.viewFunction(contractName, 'view_listening_credit', { account: account1.accountId })).toBe(1);
    expect(await account3.viewFunction(contractName, 'view_listening_credit', { account: account3.accountId })).toBe(1);
  });
  it('should transfer credits to implicit account and spend', async () => {
    const account1kp = nearAPI.utils.KeyPairEd25519.fromRandom();
    const signer1AccountId = Buffer.from(account1kp.publicKey.data).toString('hex');

    const guestKeyPair = nearAPI.utils.KeyPairEd25519.fromRandom();
    const guestAccountId = Buffer.from(guestKeyPair.publicKey.data).toString('hex');
    
    keyStore2.setKey('default', signer1AccountId, account1kp);
    keyStore2.setKey('default', guestAccountId, guestKeyPair);

    console.log(contractName, signer1AccountId, guestAccountId);

    // Initializing connection to the NEAR node.
    const near = await nearAPI.connect({
      deps: {
        keyStore
      },
      nodeUrl: "https://rpc.testnet.near.org",
      networkId: "default"
    });

    const devAccount = await near.account(contractName);
    await devAccount.sendMoney(signer1AccountId, new BN('100000000000000000000000', 10));
    await devAccount.sendMoney(guestAccountId, new BN('10000000000000000000000', 10));

    const account1 = await near.account(signer1AccountId);  
    const guestAccount = await near.account(guestAccountId);
    const guestFunctionAccessKeyPair = nearAPI.utils.KeyPairEd25519.fromRandom();
    await guestAccount.addKey(guestFunctionAccessKeyPair.publicKey, contractName, ['request_listening'], '10000000000000000000000');
    await guestAccount.deleteKey(guestKeyPair.publicKey);

    keyStore2.setKey('default', guestAccountId, guestFunctionAccessKeyPair);

    await account1.functionCall(contractName, 'buy_listening_credit', {}, null, '10000000000000000000000');

    expect(await account1.viewFunction(contractName, 'view_listening_credit', { account: account1.accountId })).toBe(1);
    expect(await guestAccount.viewFunction(contractName, 'view_listening_credit', { account: guestAccount.accountId })).toBe(0);

    await account1.functionCall(contractName, 'transfer_listening_credit', {receiver_account: guestAccount.accountId, amount: 1});
    expect(await account1.viewFunction(contractName, 'view_listening_credit', { account: account1.accountId })).toBe(0);
    expect(await guestAccount.viewFunction(contractName, 'view_listening_credit', { account: guestAccount.accountId })).toBe(1);

    const contentbase64 = Buffer.from('test').toString('base64');
    let result = await account1.functionCall(contractName, 'mint_to_base64', {
      owner_id: signer1AccountId, supportmixing: true,
      contentbase64: contentbase64
    }, null, '800000000000000000000');
    const token_id = JSON.parse(Buffer.from(result.status.SuccessValue, 'base64').toString('utf-8'));

    const listenRequestPassword = crypto.randomBytes(64).toString('base64');
    const listenRequestPasswordHash = crypto.createHash('sha256').update(listenRequestPassword).digest('base64');
    await guestAccount.functionCall(contractName, 'request_listening', { token_id: '' + token_id, listenRequestPasswordHash: listenRequestPasswordHash});
    result = await guestAccount.viewFunction(contractName, 'get_token_content_base64', { token_id: token_id, caller: guestAccountId, listenRequestPassword: listenRequestPassword });
    expect(result).toBe(contentbase64);
    expect(await guestAccount.viewFunction(contractName, 'view_listening_credit', { account: guestAccount.accountId })).toBe(0);
  });
});

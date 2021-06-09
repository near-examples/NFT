import { toggleSpinner } from '../common/progress-spinner.js';
const nearconfig = {
    nodeUrl: 'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.mainnet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
    networkId: 'mainnet',
    contractName: 'psalomo.near',
    deps: {
        keyStore: null
    }
};

window.updateBalances = async () => {
    toggleSpinner(true);
    const account = walletConnection.account();
    const receiver_account = document.getElementById('receiver_account_input').value.trim();
    document.getElementById('senderaccountspan').innerHTML = account.accountId;
    document.getElementById('receiveraccountspan').innerHTML = receiver_account;
    document.getElementById('userbalance').innerHTML = await account.viewFunction(nearconfig.contractName,
        'view_listening_credit', { account: account.accountId });
    if(receiver_account) {
        document.getElementById('receiverbalance').innerHTML = await account.viewFunction(nearconfig.contractName,
            'view_listening_credit', { account: receiver_account });
        document.getElementById('receiverbalanceparagraph').style.display = 'block';
    } else {
        document.getElementById('receiverbalanceparagraph').style.display = 'none';
    }
    toggleSpinner(false);
};

window.transferCredits = async () => {    
    const receiver_account = document.getElementById('receiver_account_input').value.trim();
    if (!receiver_account) {
        alert('You must set a receiver account');
        return;
    }
    toggleSpinner(true);
    await walletConnection.account().functionCall(nearconfig.contractName, 'transfer_listening_credit', {
        receiver_account: document.getElementById('receiver_account_input').value,
        amount: parseInt(document.getElementById('amount_input').value)
    });
    toggleSpinner(false);
    await updateBalances();
}

(async () => {
    nearconfig.deps.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
    window.near = await nearApi.connect(nearconfig);
    window.walletConnection = new nearApi.WalletConnection(near);
    await updateBalances();
})();
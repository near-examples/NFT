// configure minimal network settings and key storage
const nearconfig_main = {
    nodeUrl: 'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.near.org',
    helperUrl: 'https://helper.near.org',
    networkId: 'mainnet',
    contractName: 'psalomo.near',
    deps: {
        keyStore: null
    }
};

const nearconfig_test = {
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    networkId: 'testnet',
    contractName: 'sellnft.testnet',
    deps: {
        keyStore: null
    }
};

const nearconfig = nearconfig_test;

const token_id = '2';

export let currentTokenPrice = null;

// open a connection to the NEAR platform

export async function login() {
    await walletConnection.requestSignIn(
        nearconfig.contractName,
        'wasm-music'
    );
    await loadAccountData();
}

window.login = login;

async function logout() {
    await walletConnection.signOut();
}

function toggleSpinner(state) {
    if (state) {
        document.getElementById('loadercontainer').style.display = 'flex';
    } else {
        document.getElementById('loadercontainer').style.display = 'none';
    }
}
window.toggleSpinner = toggleSpinner;

function convertNearToYocto(near) {
    const milliNear = near * 1000;
    return new BN(10, 10).pow(new BN(21, 10)).mul(new BN(milliNear, 10)).toString();
}

export async function getTokenContent() {
    const result = await walletConnection.account().functionCall(nearconfig.contractName, 'get_token_content', { token_id: token_id });
    return atob(result.status.SuccessValue);
}
export async function viewTokenPrice() {
    currentTokenPrice = await walletConnection.account().viewFunction(nearconfig.contractName, 'view_price', { token_id: token_id });
    return currentTokenPrice;
}

export async function viewTokenOwner() {
    return await walletConnection.account().viewFunction(nearconfig.contractName, 'get_token_owner', { token_id: token_id });
}

window.downloadTokenContent = async () => {
    toggleSpinner(true);
    console.log('downloading content');
    const dataurl = (await getTokenContent()).replaceAll(/\"/g, '');
    const objurl = URL.createObjectURL(await fetch(dataurl).then(r => r.blob()));
    const linkElement = document.createElement('a');
    linkElement.href = objurl;
    linkElement.download = 'nftmusic.zip';
    document.documentElement.appendChild(linkElement)
    linkElement.click();
    toggleSpinner(false);
};

export async function buy() {
    toggleSpinner(true);
    try {
        if (!walletConnection.getAccountId()) {
            login();
        }
        const deposit = currentTokenPrice;
        const result = await walletConnection.account().functionCall(nearconfig.contractName, 'buy_token', { token_id: token_id }, undefined, deposit);
        console.log('succeeded buying', result);
    } catch (e) {
        alert(e.message);
    }
    toggleSpinner(false);
}
window.buyNFT = buy;

export async function sell(price) {
    toggleSpinner(true);
    console.log('selling for', convertNearToYocto(price));
    const result = await walletConnection.account().functionCall(nearconfig.contractName, 'sell_token', { token_id: token_id, price: convertNearToYocto(price) });
    console.log('token is now for sale', result);
    alert('token is now for sale');
    toggleSpinner(false);
    location.reload();
}
window.sellNFT = sell;

export async function initNear() {
    nearconfig.deps.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
    window.near = await nearApi.connect(nearconfig);
    const walletConnection = new nearApi.WalletConnection(near);
    window.walletConnection = walletConnection;

    // Load in account data
    if (!walletConnection.getAccountId()) {
        console.log('no loggedin user');
    }
}

window.mint = async () => {
    console.log(await walletConnection.account().functionCall(nearconfig.contractName,
        'mint_to', { owner_id: 'psalomo.testnet', contentbase64: "AAECAw==" }, undefined,
        new BN(10, 10).pow(new BN(24, 10)).toString()));
};

(async () => {
    await initNear();
    if (!walletConnection.getAccountId()) {
        document.getElementById('logginbutton').style.display = 'block';
    } else {

    }
    const tokenOwner = await viewTokenOwner();
    document.getElementById('ownerspan').innerHTML = tokenOwner;

    try {
        document.getElementById('pricespan').innerHTML = (parseFloat(new BN(await viewTokenPrice(), 10).div(new BN(10, 10).pow(new BN(21, 10))).toString()) / 1000).toFixed(3);
        document.getElementById('buyarea').style.display = 'block';
    } catch (e) {
        console.error(e);
    }

    if (tokenOwner === walletConnection.getAccountId()) {
        document.getElementById('sellarea').style.display = 'block';
        document.getElementById('downloadcontentarea').style.display = 'block';
    }

})();

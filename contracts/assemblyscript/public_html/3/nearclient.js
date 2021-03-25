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

const token_id = '3';

export let currentTokenPrice = null;
export let listeningPrice = null;
export let tokenOwner = null;

export function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

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

function convertNearToYocto(near) {
    const milliNear = near * 1000;
    return new BN(10, 10).pow(new BN(21, 10)).mul(new BN(milliNear, 10)).toString();
}

export async function getTokenContent() {
    /*if (!walletConnection.getAccountId()) {
        alert('you need to log in to play the music');
        toggleSpinner(false);
        throw('not logged in');
    }*/
    try {
        const result = await walletConnection.account()
            .viewFunction(nearconfig.contractName, 'view_token_content_base64', { token_id: token_id });
        //return atob(result.status.SuccessValue);
        return result;
    } catch(e) {
        if (e.message.indexOf('requires payment') > -1) {
            await walletConnection.account().functionCall(nearconfig.contractName, 'request_listening', { token_id: token_id },undefined, listeningPrice);
        } else {
            alert(e.message);
            toggleSpinner(false);
            throw(e);
        }
    }
}
export async function viewTokenPrice() {
    currentTokenPrice = await walletConnection.account().viewFunction(nearconfig.contractName, 'view_price', { token_id: token_id });
    return currentTokenPrice;
}

export async function viewListeningPrice() {
    listeningPrice = await walletConnection.account().viewFunction(nearconfig.contractName, 'get_listening_price', { token_id: token_id });
    return listeningPrice;
}

export async function viewTokenOwner() {
    tokenOwner = await walletConnection.account().viewFunction(nearconfig.contractName, 'get_token_owner', { token_id: token_id });
    return tokenOwner;
}

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

export async function publishMix(mix) {
    toggleSpinner(true);
    await walletConnection.account().functionCall(nearconfig.contractName, 'publish_token_mix', { token_id: token_id, mix: Array.from(mix) }, 300000000000000);
    toggleSpinner(false);
    location.reload();
}

export async function upvoteMix(mix) {
    toggleSpinner(true);
    await walletConnection.account().functionCall(nearconfig.contractName, 'upvote_mix', { token_id: token_id, mix: mix }, 300000000000000);
    toggleSpinner(false);
    location.reload();
}

export async function getMixes() {
    return await walletConnection.account().viewFunction(nearconfig.contractName, 'get_token_mixes', { token_id: token_id });
}

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

export async function connectNear() {
    await initNear();
    if (!walletConnection.getAccountId()) {
        document.getElementById('logginbutton').style.display = 'block';        
    } else {
        document.querySelectorAll('.requireslogin').forEach(elm => elm.style.display = 'block');
    }
    const tokenOwner = await viewTokenOwner();
    document.getElementById('ownerspan').innerHTML = tokenOwner;
    /*try {
        await viewListeningPrice();
        if (tokenOwner !== walletConnection.getAccountId()) {
            document.getElementById('playpriceinfospan').innerHTML = `you will be prompted to transfer ${nearApi.utils.format.formatNearAmount(listeningPrice)}N everytime you reload this page`;
        }
    } catch (e) {
        console.log('not available for listening by others');
    }*/

    try {
        document.getElementById('pricespan').innerHTML = (parseFloat(new BN(await viewTokenPrice(), 10).div(new BN(10, 10).pow(new BN(21, 10))).toString()) / 1000).toFixed(3);
        document.getElementById('buyarea').style.display = 'block';
    } catch (e) {
        //console.log(e);
    }

    if (tokenOwner === walletConnection.getAccountId()) {
        document.getElementById('sellarea').style.display = 'block';
    }
};
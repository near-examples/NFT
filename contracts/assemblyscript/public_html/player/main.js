import { getAudioWorkletProcessorUrl } from './audioworkletprocessor.js';
import { getRenderWorkerUrl } from './renderworker.js';

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

const nearconfigt = {
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    networkId: 'testnet',
    contractName: 'sellnft.testnet',
    deps: {
        keyStore: null
    }
};
nearconfig.deps.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();

const timeSlider = document.getElementById('timeslider');

let wasm_bytes;
let initPromise;
let audioWorkletNode;
let playing = false;
let renderWorker;
let walletConnection;

let currentTokenId = location.search.replace(/.*id=([0-9]+).*/,"$1");

const audioContext = new AudioContext({latencyHint: 'playback'});
const endBufferNo = Math.round(audioContext.sampleRate * 169411 / (1000 * 128));
timeSlider.max = endBufferNo;

export async function byteArrayToBase64(data) {
    return await new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result.split('base64,')[1]);
        fr.readAsDataURL(new Blob([data]));
    });
}

export async function login() {
    await walletConnection.requestSignIn(
        nearconfig.contractName,
        'wasm-music'
    );
    await loadAccountData();
}

export async function viewTokenOwner(token_id) {
    return await walletConnection.account().viewFunction(nearconfig.contractName, 'get_token_owner', { token_id: token_id });
}

export async function viewTokenPrice(token_id) {
    return await walletConnection.account().viewFunction(nearconfig.contractName, 'view_price', { token_id: token_id });
}

export async function buy(token_id, price) {
    try {
        if (!walletConnection.getAccountId()) {
            login();
        }
        const deposit = price;
        const result = await walletConnection.account().functionCall(nearconfig.contractName, 'buy_token', { token_id: token_id }, undefined, deposit);
    } catch (e) {
        alert(e.message);
    }
}

export async function sell(token_id, price) {
    if (!price || price === 0 || price === '0') {
        await walletConnection.account().functionCall(nearconfig.contractName, 'remove_token_from_sale', { token_id: token_id });
    } else {
        await walletConnection.account().functionCall(nearconfig.contractName, 'sell_token', { token_id: token_id, price: nearApi.utils.format.parseNearAmount(price) });
    }
}

async function getTokenContent(token_id) {
    const account = walletConnection.account();
    return await account.viewFunction(nearconfig.contractName, 'view_token_content_base64',
        {
            token_id: `${token_id}`
        });
}

function base64ToByteArray(base64encoded) {
    return ((str) => new Uint8Array(str.length).map((v, n) => str.charCodeAt(n)))(atob(base64encoded));
}

async function loadMusic(tokenId, remimxTokenId) {
    transactionstatus.innerHTML = 'loading music NFT'
    wasm_bytes = pako.ungzip(base64ToByteArray((await getTokenContent(tokenId)).replaceAll(/\"/g, '')));
    transactionstatus.innerHTML = '';
}

async function initPlay() {
    await audioContext.audioWorklet.addModule(getAudioWorkletProcessorUrl(), {credentials: 'omit'});
    audioWorkletNode = new AudioWorkletNode(audioContext, 'render-worker-audio-worklet-processor', {
        outputChannelCount: [2]
    });
    const messageChannel = new MessageChannel();
    audioWorkletNode.port.start();
    audioWorkletNode.port.postMessage({
        messageChannelPort: messageChannel.port2,
        endBufferNo: endBufferNo
    }, [messageChannel.port2]);
    audioWorkletNode.connect(audioContext.destination);

    renderWorker = new Worker(getRenderWorkerUrl(), {credentials: 'omit'});
    renderWorker.postMessage({
        wasm: wasm_bytes,
        sampleRate: audioContext.sampleRate,
        endBufferNo: endBufferNo,
        messageChannelPort: messageChannel.port1
    }, [messageChannel.port1]);
    renderWorker.onmessage = (msg) => {
        if (msg.data.buffersRendered) {
            const buffersRendered = msg.data.buffersRendered;
            const progress = (buffersRendered / endBufferNo) * 100;
            document.getElementById('timeslidercontainer').style.background = `linear-gradient(90deg, rgba(60,60,120,0.8)0%,  rgba(60,60,120,0.8) ${progress}%, rgba(0,0,0,0.0) ${progress + 5}%)`;
        }
    };

    const messageLoop = () => {
        audioWorkletNode.port.postMessage({ getCurrentBufferNo: true });
        audioWorkletNode.port.onmessage = (msg) => {
            if (msg.data.currentBufferNo !== undefined) {
                timeSlider.value = msg.data.currentBufferNo;
            }
            requestAnimationFrame(() => messageLoop());
        };
    };
    messageLoop();

    timeSlider.addEventListener('input', () => {
        audioWorkletNode.port.postMessage({ seek: parseInt(timeSlider.value) });
    });
}

async function togglePlay() {
    if (!initPromise) {
        initPromise = new Promise(async (resolve, reject) => {
            try {
                await audioContext.resume();
                await loadMusic(currentTokenId);
                await initPlay();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    await initPromise;

    playing = !playing;
    audioWorkletNode.port.postMessage({ toggleSongPlay: playing });
}

window.togglePlay = async () => {
    togglePlayButton.innerHTML = playing ? '&#9654;' : '&#9725;';
    await togglePlay();
}

(async () => {
    nearconfig.deps.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
    walletConnection = new nearApi.WalletConnection(await nearApi.connect(nearconfig));
    const currentTokenOwner = await viewTokenOwner(currentTokenId);
    document.getElementById('tokenownerspan').innerHTML = currentTokenOwner;

    if (currentTokenOwner === walletConnection.getAccountId()) {
        const sellbutton = document.getElementById('sellbutton');
        let currentPrice = 0;
        try {
            currentPrice = await viewTokenPrice(currentTokenId);
            const ownersInfo = document.getElementById('ownersinfo');
            ownersInfo.innerHTML = `you are selling for ${nearApi.utils.format.formatNearAmount(currentPrice)} NEAR`;
        } catch (e) {}
        sellbutton.style.display = 'inline';
        sellbutton.addEventListener('click', async () => {
            sellbutton.remove();
            const price = prompt('price', nearApi.utils.format.formatNearAmount(currentPrice));
            if (price !== null) {
                await sell(currentTokenId, price);
            }
            location.reload();
        });
    } else {
        try {
            const price = await viewTokenPrice(currentTokenId);
            if (price) {
                const buybutton = document.getElementById('buybutton');
                buybutton.innerHTML = `Buy for ${nearApi.utils.format.formatNearAmount(price)} NEAR`;
                buybutton.style.display = 'inline';
                buybutton.addEventListener('click', () => buy(currentTokenId, price));
            }
        } catch(e) {
            console.log('not for sale', e);
        }
    }
})();
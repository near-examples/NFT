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

nearconfig.deps.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();

const wasmbuffersize = 128;
let wasm_bytes;

async function getTokenContent(token_id) {
    const near = await nearApi.connect(nearconfig);
    const walletConnection = new nearApi.WalletConnection(near);

    const result = await walletConnection.account()
        .viewFunction(nearconfig.contractName, 'view_token_content_base64', { token_id: token_id });
    return result;
}

function base64ToByteArray(base64encoded) {
    return ((str) => new Uint8Array(str.length).map((v, n) => str.charCodeAt(n)))(atob(base64encoded));
}

async function loadMusic(tokenId) {
    wasm_bytes = pako.ungzip(base64ToByteArray((await getTokenContent(tokenId + '')).replaceAll(/\"/g, '')));
    
}

async function playMusic(ctx, analyzer) {
    wasm = (await WebAssembly.instantiate(wasm_bytes, { environment: { SAMPLERATE: ctx.sampleRate } })).instance.exports;
    let chunkStartTime = 0.2;
    const numbuffers = 50;
    const chunkInterval = wasmbuffersize * numbuffers / ctx.sampleRate;
    while (true) {
        const processorBuffer = ctx.createBuffer(2, wasmbuffersize * numbuffers, ctx.sampleRate);
        for (let n = 0; n < numbuffers; n++) {
            wasm.playEventsAndFillSampleBuffer();
            processorBuffer.getChannelData(0).set(new Float32Array(wasm.memory.buffer,
                wasm.samplebuffer,
                wasmbuffersize), wasmbuffersize * n);
            processorBuffer.getChannelData(1).set(new Float32Array(wasm.memory.buffer,
                wasm.samplebuffer + (wasmbuffersize * 4),
                wasmbuffersize), wasmbuffersize * n);
        }
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = processorBuffer;
        bufferSource.connect(ctx.destination);
        bufferSource.start(chunkStartTime);
        analyzer.setInput(bufferSource);
        chunkStartTime += chunkInterval;
        await new Promise((r) => setTimeout(r, chunkInterval));
    }
    //return audioWorkletNode;
}

window.loadMusic = loadMusic;
window.playMusic = playMusic;

console.log('wasm music loaded');
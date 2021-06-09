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
const SERIALIZE_TIME_RESOLUTION = 8;
const COLUMNS_PER_BEAT = 8;
let bpm;
let wasm_bytes;
let eventlist;
let walletConnection;
let endBufferNo;

async function getTokenContent(token_id) {
    const near = await nearApi.connect(nearconfig);
    walletConnection = new nearApi.WalletConnection(near);

    const result = await walletConnection.account()
        .viewFunction(nearconfig.contractName, 'view_token_content_base64', { token_id: token_id });
    return result;
}

async function getRemixTokenContent(id) {
    return await walletConnection.account().viewFunction(nearconfig.contractName, 'view_remix_content', { token_id: id });
}

function base64ToByteArray(base64encoded) {
    return ((str) => new Uint8Array(str.length).map((v, n) => str.charCodeAt(n)))(atob(base64encoded));
}

async function loadMusic(tokenId, remimxTokenId, sampleRate) {
    wasm_bytes = pako.ungzip(base64ToByteArray((await getTokenContent(tokenId + '')).replaceAll(/\"/g, '')));
    eventlist = {};

    const mixtokendata = await getRemixTokenContent(remimxTokenId + '');
    const musicdata = pako.ungzip(base64ToByteArray(mixtokendata.split(';')[3]));
    const mixerdatapos = musicdata.length - 34;
    
    bpm = musicdata[mixerdatapos + 32];

    const beatposToBufferNo = (pos) => Math.round((pos * 60 / bpm) * sampleRate / wasmbuffersize);
    const addEvent = (pos, data) => {
        const bufferno = beatposToBufferNo(pos);
        if (!eventlist[bufferno]) {
            eventlist[bufferno] = [];    
        }
        eventlist[bufferno].push(data);
    };
    musicdata.slice(mixerdatapos, mixerdatapos + 32)
    .forEach((v, ndx) => {
        const channel = Math.floor(ndx / 2);
        if (ndx % 2 === 0) {
            addEvent(0,[0xb0 + channel, 7, v]);
        } else {
            addEvent(0,[0xb0 + channel, 10, v]);
        }
    });

    endBufferNo = beatposToBufferNo(musicdata[mixerdatapos + 32 + 1]);
    const pianorolldatabytes = musicdata.slice(0, mixerdatapos);
    
    let n = 0;
    while (n<pianorolldatabytes.length) {
        const channel = pianorolldatabytes[n];
        const numnotes = pianorolldatabytes[n + 1];
        const numcontrollers = pianorolldatabytes[n + 2];
        n += 3;
        const controllersndx = n + (numnotes * 4);
        const nextchannelndx = controllersndx + (numcontrollers * 3);
        while (n < controllersndx) {
            const evtstart = pianorolldatabytes[n++] / SERIALIZE_TIME_RESOLUTION;
            const duration = pianorolldatabytes[n++] / SERIALIZE_TIME_RESOLUTION;
            const noteNumber = pianorolldatabytes[n++];
            const velocityValue = pianorolldatabytes[n++];
            addEvent(evtstart,[0x90 + channel,noteNumber,velocityValue]);
            addEvent(evtstart + duration,[0x90 + channel,noteNumber,0]);
        }
        while (n < nextchannelndx) {
            const evtstart = pianorolldatabytes[n++] / SERIALIZE_TIME_RESOLUTION;
            const controllerNumber = pianorolldatabytes[n++];
            const controllerValue = pianorolldatabytes[n++];
            addEvent(evtstart,[0xb0 + channel, controllerNumber, controllerValue]);
        }
    }
    
}

async function playMusic(ctx, analyzer) {
    wasm = (await WebAssembly.instantiate(wasm_bytes, { environment: { SAMPLERATE: ctx.sampleRate } })).instance.exports;
    
    const numbuffers = 50;
    let bufferno = 0;
    const chunkInterval = wasmbuffersize * numbuffers / ctx.sampleRate;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    if (analyzer) {
        analyzer.setInput(gainNode);
    }
    let chunkStartTime = ctx.currentTime + 0.2;

    while (true) {
        const processorBuffer = ctx.createBuffer(2, wasmbuffersize * numbuffers, ctx.sampleRate);
        for (let n = 0; n < numbuffers; n++) {
            eventlist[bufferno++]?.forEach(evt => wasm.shortmessage(evt[0],evt[1],evt[2]));

            if (bufferno === endBufferNo) {
                bufferno = 0;                
            }
            wasm.fillSampleBuffer();
            processorBuffer.getChannelData(0).set(new Float32Array(wasm.memory.buffer,
                wasm.samplebuffer,
                wasmbuffersize), wasmbuffersize * n);
            processorBuffer.getChannelData(1).set(new Float32Array(wasm.memory.buffer,
                wasm.samplebuffer + (wasmbuffersize * 4),
                wasmbuffersize), wasmbuffersize * n);
        }
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = processorBuffer;
        bufferSource.connect(gainNode);
        bufferSource.start(chunkStartTime);        
        chunkStartTime += chunkInterval;

        await new Promise((r) => setTimeout(r, chunkInterval));
    }
}
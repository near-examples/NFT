exports.p58 = {
	series_name: 'Processing Music NFT',
	src: `

    

    @params
    {
        packages: ["p5-cf@1.3.1","p5.sound@1.3.1"],
        max_supply: '100',
        mint: {
            backgroundColor: {
                default: [255, 255, 255],
                type: 'color-arr',
            },
            clearSpeed: {
                default: 5,
                type: 'int',
                min: 0,
                max: 255,
            }, 
        },
        owner: {
            size: {
                default: 25,
                type: 'int',
                min: 1,
                max: 100,
            },
            noiseSpeed: {
                default: 50,
                type: 'int',
                min: 0,
                max: 100,
            },
            colorOne: {
                default: [255, 0, 0],
                type: 'color-arr',
            },
            colorTwo: {
                default: [0, 0, 255],
                type: 'color-arr',
            },
            opacity: {
                default: 100,
                type: 'int',
                min: 0,
                max: 255,
            }, 
        }
    }
    @params
    
    @css
        body { margin: 0; overflow: hidden; }
    @css
    

    @html
    <script src="https://cdn.jsdelivr.net/gh/nearprotocol/near-api-js/dist/near-api-js.js"></script>
    <script src="https://unpkg.com/pako@2.0.3/dist/pako.min.js"></script>
    @html

    @js
    
    const backgroundColor = {{ backgroundColor }}
    const size = {{ size }}
    const noiseSpeed = {{ noiseSpeed }}
    const colorOne = {{ colorOne }}
    const colorTwo = {{ colorTwo }}
    const opacity = {{ opacity }}
    const clearSpeed = {{ clearSpeed }}
    
    let mic, fft, width, height, w2, h2, clicked;
    fft = new p5.FFT();

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
    }    

    async function setup() {
        width = window.innerWidth;
        height = window.innerHeight;
        w2 = width/2
        h2 = height/2
        createCanvas(width, height);
        noStroke()
        let ctx = getAudioContext()
        ctx.suspend();
        await loadMusic(3);
        playMusic(ctx,fft);        
    }

    function draw() {
        background(...backgroundColor, clearSpeed);
        if (!clicked) {
            textAlign(CENTER, CENTER);
            text('click me', width/2, height/2)
        }
    
        let spectrum = fft.analyze();
    
        let randNoise = noise(frameCount / 40 * noiseSpeed / 100)
    
        let r = randNoise * colorOne[0] + (1 - randNoise) * colorTwo[0]
        let g = randNoise * colorOne[1] + (1 - randNoise) * colorTwo[1]
        let b = randNoise * colorOne[2] + (1 - randNoise) * colorTwo[2]
        
        fill(r, g, b, opacity)
        // second half of spectrum is repetitive
        const len = spectrum.length/2
        let x, y, rad;
        for (i = 0; i < len; i++) {
            x = i/len * Math.PI * 2
            y = map(spectrum[i], 0, 255, h2, 0)
            rad = 1/(y/height*4) * size
            if (rad > h2) rad = h2
            ellipse(
                w2 + Math.cos(x) * y,
                h2 + Math.sin(x) * y,
                rad, rad
            )
        }
    }
    function mousePressed() {
        userStartAudio();
        clicked = true;
    }
    @js
                

                
`
};

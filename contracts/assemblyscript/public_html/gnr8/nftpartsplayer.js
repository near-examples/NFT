

    @params
    {
        packages: ["p5-cf@1.3.1","p5.sound@1.3.1"],
        max_supply: '100',
        mint: {
            backgroundColor: {
                default: [0, 0, 20],
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
                default: 10,
                type: 'int',
                min: 1,
                max: 100,
            },
            noiseSpeed: {
                default: 20,
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
                default: 50,
                type: 'int',
                min: 0,
                max: 150,
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

    async function setup() {
        width = window.innerWidth;
        height = window.innerHeight;
        w2 = width/2
        h2 = height/2
        createCanvas(width, height);
        noStroke()
        let ctx = getAudioContext()
        ctx.suspend();
        await loadMusic(7,9,ctx.sampleRate);
        playMusic(ctx,fft);        
    }

    function draw() {
        background(...backgroundColor, clearSpeed);
        
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
            y = map(spectrum[i], 0, 240, h2, 0)
            rad = 1/(y/height*4) * size
            if (rad > h2) rad = h2
            ellipse(
                w2 + Math.cos(x) * y,
                h2 + Math.sin(x) * y,
                rad, rad
            )
        }
        
        textAlign(CENTER, CENTER);
        textSize(32);
        fill(255,200,200);
        
        if (!clicked) {
            text('click me', width/2, height/2)
        } else {
            t = new Date().getTime() / 1000
            
            extrax = Math.cos(t) * 10
            extray = Math.sin(t) * 10
            text('music NFT created at', width/2 - extrax, height/2- 30 - extray)
            text('psalomo.near.page', width/2 + extrax, height/2+ 30 + extray)
        }
    }
    function mousePressed() {
        userStartAudio();
        clicked = true;
    }
    @js
 
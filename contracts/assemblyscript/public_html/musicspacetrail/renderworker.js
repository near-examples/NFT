function renderWorker() {
    const SAMPLE_FRAMES = 128;

    self.onmessage = async (msg) => {
        const wasmInstance = (await WebAssembly.instantiate(msg.data.wasm,
            {
                environment: {
                    SAMPLERATE: msg.data.sampleRate
                }
            })).instance.exports;

        const leftbuffer = new Float32Array(wasmInstance.memory.buffer,
            wasmInstance.samplebuffer,
            SAMPLE_FRAMES);
        const rightbuffer = new Float32Array(wasmInstance.memory.buffer,
            wasmInstance.samplebuffer + (SAMPLE_FRAMES * 4),
            SAMPLE_FRAMES);
        const transferLeft = new Float32Array(leftbuffer.length);
        const transferRight = new Float32Array(rightbuffer.length);
            
        const eventlist = msg.data.eventlist;
        const endBufferNo = msg.data.endBufferNo;

        const messageChannelPort = msg.data.messageChannelPort;

        let lastProgressReportTime = Date.now();

        for (let bufferNo = 0; bufferNo < endBufferNo; bufferNo++) {
            const events = eventlist[bufferNo];
            if (events) {
                for (let n = 0; n < events.length; n++) {
                    const evt = events[n];
                    wasmInstance.shortmessage(evt[0], evt[1], evt[2])
                }
            }

            wasmInstance.fillSampleBuffer();

            transferLeft.set(leftbuffer);
            transferRight.set(rightbuffer);

            messageChannelPort.postMessage({
                bufferNo: bufferNo,
                left: transferLeft.buffer,
                right: transferRight.buffer
            });

            if (Date.now() - lastProgressReportTime > 100) {
                lastProgressReportTime = Date.now();
                self.postMessage({
                    buffersRendered: bufferNo
                });
            }
        }
        self.postMessage({
            buffersRendered: endBufferNo
        });
    };
}

export function getRenderWorkerUrl() {
    const functionSource = renderWorker.toString();
    const functionSourceUnwrapped = functionSource.substring(functionSource.indexOf('{') + 1, functionSource.lastIndexOf('}'));
    return URL.createObjectURL(new Blob([functionSourceUnwrapped], { type: 'text/javascript' }));
}

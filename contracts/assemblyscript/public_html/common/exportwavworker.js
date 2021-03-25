onmessage = async (msg) => {
    if (msg.data.wasm) {
        const sampleRate = msg.data.samplerate;
        const wasmInstancePromise = WebAssembly.instantiate(msg.data.wasm, 
            {
                environment: {
                    SAMPLERATE: sampleRate
                }
        });
        const wasmInstance = (await wasmInstancePromise).instance.exports;
        const patternschedule = msg.data.patternschedule;
        if (patternschedule) {
            for (let n=0;n<patternschedule.length;n++) {
                wasmInstance.setMidiPartSchedule(n,patternschedule[n].patternindex, patternschedule[n].starttime);
            }
        }
        const duration = msg.data.songduration;
        const SAMPLE_FRAMES = 128;
        const leftbuffer = new Float32Array(wasmInstance.memory.buffer,
            wasmInstance.samplebuffer,
            SAMPLE_FRAMES);
        const rightbuffer = new Float32Array(wasmInstance.memory.buffer,
            wasmInstance.samplebuffer + (SAMPLE_FRAMES * 4),
            SAMPLE_FRAMES);

        const numbuffers = 100;
        const bitDepth = 32;
        const numChannels = 2;
        
        var bytesPerSample = bitDepth / 8
        var blockAlign = numChannels * bytesPerSample

        const chunklength = numChannels * bytesPerSample * (duration * 0.001 * sampleRate + numbuffers * SAMPLE_FRAMES);

        var buffer = new ArrayBuffer(44 + chunklength);
        var view = new DataView(buffer);
        function writeString(view, offset, string) {
            for (var i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i))
            }
        }
        /* RIFF identifier */
        writeString(view, 0, 'RIFF')
        /* RIFF chunk length */
        view.setUint32(4, 36 + chunklength, true)
        /* RIFF type */
        writeString(view, 8, 'WAVE')
        /* format chunk identifier */
        writeString(view, 12, 'fmt ')
        /* format chunk length */
        view.setUint32(16, 16, true)
        /* sample format (raw) */
        view.setUint16(20, 3, true)
        /* channel count */
        view.setUint16(22, numChannels, true)
        /* sample rate */
        view.setUint32(24, sampleRate, true)
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * blockAlign, true)
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, blockAlign, true)
        /* bits per sample */
        view.setUint16(34, bitDepth, true)
        /* data chunk identifier */
        writeString(view, 36, 'data')
        /* data chunk length */
        view.setUint32(40, chunklength, true)

        let offset = 44;
        while (wasmInstance.currentTimeMillis.value < duration) {
            for (let b = 0;b<numbuffers; b++) {
                wasmInstance.playEventsAndFillSampleBuffer();
                for (let n = 0; n < SAMPLE_FRAMES; n++) {                
                    view.setFloat32(offset, leftbuffer[n], true);
                    offset += 4;
                    view.setFloat32(offset, rightbuffer[n], true);
                    offset += 4;
                }
            }
            postMessage({exportWavPosition: wasmInstance.currentTimeMillis.value,
                    progress: wasmInstance.currentTimeMillis.value / duration});
            await new Promise(r => setTimeout(r, 0));
        }
        const blob = new Blob([buffer], {
            type: "application/octet-stream"
        });

        const url = URL.createObjectURL(blob);
        postMessage({ exportWavUrl: url });
    }
};
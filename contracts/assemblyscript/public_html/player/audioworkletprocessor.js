function audioWorkletProcessor() {
    class RenderWorkerAudioWorkletProcessor extends AudioWorkletProcessor {
        constructor() {
            super();
            this.processorActive = true;
            this.playSong = true;
            this.bufferNo = 0;
            this.port.onmessage = async (msg) => {
                if (msg.data.messageChannelPort) {                
                    this.endBufferNo = msg.data.endBufferNo;
                    this.buffers = Array(this.endBufferNo);
                    msg.data.messageChannelPort.onmessage = (msg) => {
                        this.buffers[msg.data.bufferNo] = {
                            left: new Float32Array(msg.data.left),
                            right: new Float32Array(msg.data.right)
                        };
                    };
                }

                if (msg.data.getCurrentBufferNo) {
                    this.port.postMessage({
                        currentBufferNo: this.bufferNo
                    });
                }

                if (msg.data.toggleSongPlay !== undefined) {
                    if (msg.data.toggleSongPlay === false) {
                        this.playSong = false;
                    } else {
                        this.playSong = true;
                    }
                }

                if (msg.data.seek !== undefined) {
                    this.bufferNo = msg.data.seek;
                }

                if (msg.data.terminate) {
                    this.processorActive = false;
                    this.port.close();
                }
            };
        }

        process(inputs, outputs, parameters) {
            const output = outputs[0];

            if (this.playSong && this.buffers && this.buffers[this.bufferNo]) {
                output[0].set(this.buffers[this.bufferNo].left);
                output[1].set(this.buffers[this.bufferNo].right);
                this.bufferNo++;
                if (this.bufferNo === this.endBufferNo) {
                    this.bufferNo = 0;
                }
            }

            return this.processorActive;
        }
    }

    registerProcessor('render-worker-audio-worklet-processor', RenderWorkerAudioWorkletProcessor);
}

export function getAudioWorkletProcessorUrl() {
    const functionSource = audioWorkletProcessor.toString();
    const functionSourceUnwrapped = functionSource.substring(functionSource.indexOf('{') + 1, functionSource.lastIndexOf('}'));
    return URL.createObjectURL(new Blob([functionSourceUnwrapped], { type: 'text/javascript' }));
}

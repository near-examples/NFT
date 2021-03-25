const SAMPLE_FRAMES = 128;

class AssemblyScriptMidiSynthAudioWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.processorActive = true;
        this.playSong = true;

        this.port.onmessage = async (msg) => {
            if (msg.data.wasm) {
                this.wasmInstancePromise = WebAssembly.instantiate(msg.data.wasm, 
                    {
                        environment: {
                            SAMPLERATE: sampleRate || AudioWorkletGlobalScope.sampleRate
                        }
                });
                this.wasmInstance = (await this.wasmInstancePromise).instance.exports;
                this.songduration = msg.data.songduration;
                this.port.postMessage({ wasmloaded: true });
            }

            if (msg.data.patternschedule) {
                await this.wasmInstancePromise;
                const patternschedule = msg.data.patternschedule;
                this.wasmInstance.allNotesOff();
                for (let n=0;n<patternschedule.length;n++) {
                    this.wasmInstance.setMidiPartSchedule(n,patternschedule[n].patternindex, patternschedule[n].starttime);
                }
            }

            if (this.wasmInstance) {
                if (msg.data.toggleSongPlay !== undefined) {
                    if (msg.data.toggleSongPlay === false) {
                        this.wasmInstance.allNotesOff();
                        this.playSong = false;
                    } else {
                        this.playSong = true;
                    }
                }

                if (msg.data.seek !== undefined) {
                    this.wasmInstance.allNotesOff();
                    this.wasmInstance.seek(msg.data.seek);
                }

                if (msg.data.currentTime) {
                    this.port.postMessage({
                        currentTime: this.wasmInstance.currentTimeMillis.value,
                        activeVoicesStatusSnapshot: new Uint8Array(this.wasmInstance.memory.buffer,
                            this.wasmInstance.getActiveVoicesStatusSnapshot(),
                            32*3).slice(0)
                    });
                }
            }

            if (msg.data.midishortmsg) {
                (await this.wasmInstancePromise).instance.exports.shortmessage(
                    msg.data.midishortmsg[0],
                    msg.data.midishortmsg[1],
                    msg.data.midishortmsg[2]
                );
            }

            if (msg.data.songpatternindex!==undefined) {
                const wasminstance = (await this.wasmInstancePromise).instance.exports;
                if (msg.data.starttime < wasminstance.currentTimeMillis.value) {
                    this.wasmInstance.allNotesOff();
                }
                wasminstance.setMidiPartSchedule(msg.data.songpatternindex, msg.data.patternindex, msg.data.starttime);
            }   

            if (msg.data.terminate) {
                this.processorActive = false;
                this.port.close();
            }
        };
        this.port.start();
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];

        if (this.wasmInstance) {
            if (this.playSong) {
                this.wasmInstance.playEventsAndFillSampleBuffer();
            } else {
                this.wasmInstance.fillSampleBuffer();
            }

            if (this.wasmInstance.currentTimeMillis >= this.songduration) {
                this.wasmInstance.seek(0);
            }
            output[0].set(new Float32Array(this.wasmInstance.memory.buffer,
                this.wasmInstance.samplebuffer,
                SAMPLE_FRAMES));
            output[1].set(new Float32Array(this.wasmInstance.memory.buffer,
                this.wasmInstance.samplebuffer + (SAMPLE_FRAMES * 4),
                SAMPLE_FRAMES));
        }

        return this.processorActive;
    }
}

registerProcessor('asc-midisynth-audio-worklet-processor', AssemblyScriptMidiSynthAudioWorkletProcessor);

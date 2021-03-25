import { } from './midimixer.component.js';
import { initVisualizer, visualizeNoteOn, clearVisualization } from './visualizer.js';
import { connectNear, publishMix as publishMixNear, getMixes, upvoteMix, getTokenContent, _base64ToArrayBuffer } from './nearclient.js';

let audioWorkletNode;
const channels = ['piano','strings','drums','guitar','bass','flute'];
const songlength = 10;
const songdata = new Uint8Array(channels.length * songlength).fill(0);
const bpm = 90;
const beatsperpart = 16;
const partduration = 1000 * 60 * beatsperpart / bpm;
const songduration = partduration * songlength;
const channelpatternmap =  {"0":[0,1,6,13],"1":[0,2,7,17],"2":[0,5,9,12],"3":[0,4,8,15],"4":[0,3,11,14],"5":[0,10,16]};
const patternentrycolors = ['#000','#f80','#08f','#f8f','#8f8','#ff8','#8ff','#88f','#f88'];

document.querySelector("#timeindicator").max = songduration;

async function getWasmBytes() {
    return pako.ungzip(_base64ToArrayBuffer((await getTokenContent()).replaceAll(/\"/g, '')));
}
async function startAudioWorklet() {
    const context = new AudioContext();
    context.resume();
    toggleSpinner(true);
    
    const wasm_synth_bytes = await getWasmBytes();
    await context.audioWorklet.addModule('./wasmmidimoduleplayeraudioworkletprocessor.js?t='+new Date().getTime());

    audioWorkletNode = new AudioWorkletNode(context, 'asc-midisynth-audio-worklet-processor', {
        outputChannelCount: [2]
    });
    audioWorkletNode.port.start();
    audioWorkletNode.port.postMessage({ wasm: wasm_synth_bytes, samplerate: context.sampleRate, songduration: songduration});
    postPatternSchedule();
    audioWorkletNode.connect(context.destination);
    
    document.querySelector('midi-mixer').getState().forEach((v, ch) => {
        audioWorkletNode.port.postMessage({
            midishortmsg: [
                0xb0 + ch, 7, v.volume
            ]
        });
        audioWorkletNode.port.postMessage({
            midishortmsg: [
                0xb0 + ch, 10, v.pan
            ]
        });
    });
    updateSong();
    toggleSpinner(false);
}

window.exportWav = async () => {
    const worker = new Worker('../common/exportwavworker.js?t='+(new Date().getTime()));
    toggleSpinner(true);
    const loaderProgressElement = document.querySelector('#loaderprogress');
    const url = await new Promise(async resolve => {
        worker.postMessage({wasm: await getWasmBytes(), samplerate: 44100,
                    songduration: songduration,
                    patternschedule: getPatternSchedule()});
        worker.onmessage = msg => {
            if (msg.data.exportWavUrl) {
                resolve(msg.data.exportWavUrl);
            } else {
                loaderProgressElement.style.display = 'block';
                loaderProgressElement.innerHTML = (msg.data.progress*100).toFixed(2) + '%';
            }            
        }
    });
    loaderProgressElement.style.display = 'none';
    toggleSpinner(false);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = "petersalomonsen_webassemblymusic.wav";
    a.click();
    window.URL.revokeObjectURL(url);
};

function mixerchange(evt) {
    if (!audioWorkletNode) {
        return;
    }
    audioWorkletNode.port.postMessage({
        midishortmsg: [
            0xb0 + evt.detail.channel, evt.detail.controller, evt.detail.value
        ]
    });
}
window.mixerchange = mixerchange;

function updateMixerState(mixerdata) {
    const midimixerelement = document.querySelector('midi-mixer');
    mixerdata.forEach((v, ndx) => {
        const channel = Math.floor(ndx / 2);
        if(ndx % 2 === 0) {
            midimixerelement.setVolume(channel, v);
        } else {
            midimixerelement.setPan(channel, v);
        }
    });
}

function getPatternSchedule() {
    return Array.from(songdata).map((patternIndex,sdp) => (
            {
                patternindex: channelpatternmap[Math.floor(sdp / songlength)][patternIndex],
                starttime: (sdp % songlength) * partduration
            }
    )).sort((a,b) => a.starttime - b.starttime);
}

function postPatternSchedule() {
    if (!audioWorkletNode) {
        return;
    }
    audioWorkletNode.port.postMessage({
        patternschedule: getPatternSchedule()});
}

async function updateSong() {
    function padNumber(num, len) {
        const ret = '0000' + num;
        return ret.substr(ret.length - len);
    }

    function updateTimeIndicator() {
        requestAnimationFrame(() => {
            audioWorkletNode.port.postMessage({ currentTime: true });
            audioWorkletNode.port.onmessage = (msg) => {
                const currentTime = msg.data.currentTime;

                if (currentTime) {
                    document.querySelector("#timeindicator").value = Math.round(currentTime);
                    document.querySelector("#timespan").innerHTML =
                        Math.floor(currentTime / (60 * 1000)) + ':' +
                        padNumber(Math.floor(currentTime / (1000)) % 60, 2) + ':' +
                        padNumber(Math.floor(currentTime % (1000)), 3);
                    
                    const songpos = Math.floor(currentTime / partduration);

                    const playingColumnElement = document.getElementById('playingcolumn').style;
                    playingColumnElement.gridColumnStart = songpos + 2;
                    playingColumnElement.gridColumnEnd = songpos + 2;

                    const voiceStatusArr = msg.data.activeVoicesStatusSnapshot;
                    clearVisualization();
                    for (let n=0;n<voiceStatusArr.length;n+=3) {
                        if (voiceStatusArr[n+2]>0) {
                            visualizeNoteOn(voiceStatusArr[n+1],voiceStatusArr[n+2]);
                        }
                    }
                }
                updateTimeIndicator();            
            }
        });
    }
    updateTimeIndicator();
    document.querySelector('#pausebutton').style.display = 'block';
}

async function clearGrid() {
    const patternElements = document.querySelectorAll('.patternelement');
    for (let n=0;n<songdata.length;n++) {
        const v = 0;
        songdata[n] = v;        
        patternElements[n].style.backgroundColor = patternentrycolors[v];
    }
    postPatternSchedule();
}
window.clearGrid = clearGrid;

async function togglePlay(val) {
    if (!audioWorkletNode) {
        await startAudioWorklet();
    }
    audioWorkletNode.port.postMessage({ toggleSongPlay: val });
    if (val) {
        document.querySelector('#playbutton').style.display = 'none';
        document.querySelector('#pausebutton').style.display = 'block';
    } else {
        document.querySelector('#playbutton').style.display = 'block';
        document.querySelector('#pausebutton').style.display = 'none';
    }
}
window.togglePlay = togglePlay;

function seek(val) {
    audioWorkletNode.port.postMessage({ seek: val });
}
window.seek = seek;

function toggleSpinner(state) {
    if (state) {
        document.getElementById('loadercontainer').style.display = 'flex';
    } else {
        document.getElementById('loadercontainer').style.display = 'none';
    }
}

window.toggleSpinner = toggleSpinner;

window.publishMix = () => {
    const mixerdata = document.querySelector('midi-mixer').getState();
    const publishData = Array.from(songdata);
    mixerdata.forEach(v => {
        publishData.push(v.volume);
        publishData.push(v.pan);
    });

    publishMixNear(Uint8Array.from(publishData));
};

const grid = document.getElementById('songpatternsgrid');
const rowlength = songlength + 1;
const numcells = rowlength * channels.length;
grid.style.gridTemplateColumns = new Array(songlength + 1).fill('').map(r => 'auto').join(' ');
let songdatapos = 0;
let ch = 0;
for (let n=0;n<numcells;n++) {
    const elm = document.createElement('div');
    if (n % rowlength === 0) {
        elm.innerHTML = channels[ch++];
    } else {     
        let sdp = songdatapos;  
        const ch = Math.floor(sdp / songlength);
        
        elm.classList.add('patternelement');
        let patternIndex = songdata[sdp];
        elm.style.backgroundColor = patternentrycolors[patternIndex];

        elm.addEventListener('click', () => {
            patternIndex++;

            patternIndex %= channelpatternmap[ch].length;
            songdata[sdp] = patternIndex;

            elm.style.backgroundColor = patternentrycolors[patternIndex];

            if(audioWorkletNode) {
                audioWorkletNode.port.postMessage({
                    songpatternindex: (sdp % songlength) * channels.length + ch,
                    patternindex: channelpatternmap[ch][patternIndex],
                    starttime: (sdp % songlength) * partduration
                });
            }
        });
        songdatapos++;
    }
    const column = (n % rowlength) + 1;
    elm.style.gridColumn = `${column} / ${column}`;
    const row = Math.floor(n / rowlength) + 2;
    elm.style.gridRow = `${row} / ${row}`;
    grid.appendChild(elm);
}
document.getElementById('timeindicatorgridcell').style.gridColumn = 'span '+songlength;
const playingcolumn = document.getElementById('playingcolumn');
playingcolumn.style.gridRowStart = 2;
playingcolumn.style.gridRowEnd = channels.length + 2;
playingcolumn.style.height = '100%'

initVisualizer(document);
visualizeNoteOn(64,1);

(async () => {
    toggleSpinner(true);
    await connectNear();
    const mixes = (await getMixes());
    if (mixes.length > 0) {
        const patternElements = document.querySelectorAll('.patternelement');
        const latestmix = mixes[0].split(';');
        document.getElementById('latestmixinfo').innerHTML = `
            <p>
            latest mix by <span class="highlightedtext">${latestmix[0]}</span> on ${new Date(parseInt(latestmix[1])/1000000).toLocaleString()}
            </p>
        `;
        const latestmixdata = latestmix[2].split(',').map(v => parseInt(v));
        for (let n=0;n<songdata.length;n++) {
            const v = latestmixdata[n];
            songdata[n] = v;        
            patternElements[n].style.backgroundColor = patternentrycolors[v];
        };
        updateMixerState(latestmixdata.slice(songdata.length));
        const latest20element = document.getElementById('latest20mixes');
        let currentMixElement;
        mixes.forEach((mix, n) => {
            const listitemcontainer = document.createElement('div');    
            listitemcontainer.style.display = 'grid';
            listitemcontainer.style.gridTemplateColumns = 'auto auto';  
            const elm = document.createElement('div');
            elm.classList.add('mixlistitem');
            if (n===0) {
                currentMixElement = elm;
                elm.classList.add('currentmix');
            }
            const mixdata = mix.split(';')[2].split(',').map(v => parseInt(v));
            elm.onclick = () => {                                
                for (let n=0;n<songdata.length;n++) {
                    const v = mixdata[n];
                    songdata[n] = v;        
                    patternElements[n].style.backgroundColor = patternentrycolors[v];
                }
                postPatternSchedule();
                updateMixerState(mixdata.slice(songdata.length));
                currentMixElement.classList.remove('currentmix');
                currentMixElement = elm;
                elm.classList.add('currentmix');
            };
            const mixinfo = mix.split(';');
            elm.innerHTML = `${mixinfo[0]}<br />
                    <span class="mixlistdate">${new Date(parseInt(mixinfo[1])/1000000).toLocaleString()}</span>`;
            listitemcontainer.appendChild(elm);
            if (n>0) {
                const upvotebutton = document.createElement('button');
                upvotebutton.innerHTML = '&uarr;';
                upvotebutton.title = 'upvote';
                upvotebutton.classList.add('upvotebutton');
                upvotebutton.onclick = () => upvoteMix(mix);
                listitemcontainer.appendChild(upvotebutton);
            }
            latest20element.appendChild(listitemcontainer);
        });
        toggleSpinner(false);
    }
})();

import * as THREE from 'https://cdn.skypack.dev/three@0.130.1';

let camera, scene, renderer;
let geometry, material;
let cameratime = 0;

init();

function init() {
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.z = 0;
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    renderer.domElement.style.bottom = 0;
    renderer.domElement.style.margin = 0;
    renderer.domElement.style.zIndex = -1000;
    renderer.domElement.style.width = '100%';
    document.body.appendChild( renderer.domElement );
}

export function insertVisualizationObjects(visualizationObjects) {
    visualizationObjects.forEach((visualizationObject) => {
        geometry = new THREE.BoxGeometry( 0.01, visualizationObject.velocityValue / 127 * 0.01, visualizationObject.duration);
        material = new THREE.MeshNormalMaterial();
        const mesh = new THREE.Mesh( geometry, material );
        mesh.position.z = -visualizationObject.time - visualizationObject.duration / 2;
        mesh.position.x = ((visualizationObject.channel + 1) / 16) * ( (visualizationObject.channel % 2) ? -1 : 1);
        mesh.position.y = visualizationObject.noteNumber / 127 - 0.5;
        scene.add( mesh );
    });
}

export function setVisualizationTime(time) {
    camera.position.x = Math.cos(cameratime) * 0.1;
    camera.position.y = Math.sin(cameratime * 1.5) * 0.08;
    cameratime += 0.003;
    camera.position.z = -time + 0.7;
    renderer.render( scene, camera );
}

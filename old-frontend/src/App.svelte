<script lang="ts">
  import {
    AmbientLight,
    Canvas,
    DirectionalLight,
    Group,
    HemisphereLight,
    Mesh,
    OrbitControls,
    PerspectiveCamera,
  } from "threlte";

  import { lines, parameters, scene } from "./store";
  import { getContext, onMount } from "svelte";
  import Controls from "./Controls.svelte";
  import type { PosType } from "./interfaces";
  import { calcChangeInPosVec } from "./math/position";

  let screenWidth = window.screen.width;
  let screenHeight = window.screen.height;
  let aspect = screenWidth / screenHeight;

  console.log("sdfadsflsdfjksf");

  const setCanvasDim = () => {
    screenWidth = window.screen.width;
    screenHeight = window.screen.height;
  };

  let pichRotateRad: number = 0;
  let tmpRotateRad: number = 0;
  let YawRotateRad: number = 0;
  let pos: PosType = [0, 0, 0];
  let running = true;

  // let cubeGeometry = new BoxBufferGeometry(1, 1, 1, 1, 1, 1);
  // let cubeMaterial = new MeshStandardMaterial();
  // let lineMaterial = new LineBasicMaterial({ color: 0x0000ff });

  // let scenecomp: Scene;

  // const start = async (initSleep = true) => {
  //   if (initSleep) await new Promise((res, rej) => setTimeout(res, 1000));
  //   while (running) {
  //     // TODO: get iterator and do movement
  //     // TODO: remove control panel
  //     const [deltaX, deltaY, deltaZ] = calcChangeInPosVec($parameters);
  //     await new Promise((res, rej) => setTimeout(res, $parameters.sleepTimeMs));

  //     const newPos = [
  //       pos[0] + deltaX,
  //       pos[1] + deltaY,
  //       pos[2] + deltaZ,
  //     ] as PosType;
  //     const points = [new Vector3(...pos), new Vector3(...newPos)];
  //     const lineGeomertry = new BufferGeometry().setFromPoints(points);
  //     const l = new Line(lineGeomertry, lineMaterial);
  //     $scene.add(l);
  //     $lines = [...$lines, l];

  //     pos = newPos;
  //   }
  //   console.log("DONE");
  // };
  // parameters.subscribe((newParams) => {
  //   running = false;
  //   if ($scene) $scene.remove(...$lines);
  //   pos = [0, 0, 0];
  //   $lines = [];
  //   pichRotateRad = 0;
  //   YawRotateRad = 0;
  //   setTimeout(() => {
  //     running = true;
  //     start();
  //   }, 400);
  // });

  // onMount(() => {
  //   scene.set(scenecomp.getScene() as Scene);
  // });
</script>

<svelte:window on:resize={setCanvasDim} />
<main>
  <div class="options">
    <Controls />
  </div>
  <!-- <Canvas
    let:sti
    style="width: 100%; height: 100%"
    w={screenWidth}
    h={screenHeight}
  >
    <Scene
      {sti}
      bind:this={scenecomp}
      let:scene
      id="scene1"
      props={{ background: 0xedf2f7 }}
    >
      <PerspectiveCamera
        {scene}
        {aspect}
        id="cam1"
        pos={[0, 100, 100]}
        lookAt={[0, 0, 0]}
      />
      <AmbientLight {scene} intensity={1.25} />
      <DirectionalLight
        {scene}
        pos={[1, 2, 1]}
        intensity={0.8}
        shadowMapSize={512 * 8}
        castShadow
      />

      <Mesh
        {scene}
        geometry={cubeGeometry}
        material={cubeMaterial}
        mat={{ roughness: 0.5, metalness: 0.5, color: 0xff3e00 }}
        {pos}
        rot={[0, pichRotateRad, YawRotateRad]}
        castShadow
        receiveShadow
      />
      <OrbitControls {scene} enableDamping />
    </Scene>

    <WebGLRenderer
      {sti}
      sceneId="scene1"
      camId="cam1"
      config={{ antialias: true, alpha: true }}
      enableShadowMap
      shadowMapType={PCFSoftShadowMap}
    />
  </Canvas> -->
</main>

<style>
  .options {
    position: absolute;
    z-index: 100;
    top: 15px;
    left: 15px;
    padding: 1rem;
  }
</style>

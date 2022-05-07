<!-- <script land="ts">
  import { onDestroy } from "svelte";
  import { spring } from "svelte/motion";
  import {
    CircleBufferGeometry,
    MeshStandardMaterial,
    SphereBufferGeometry,
    Color,
    DoubleSide,
  } from "three";
  import {
    Canvas,
    DirectionalLight,
    HemisphereLight,
    Mesh,
    OrbitControls,
    PerspectiveCamera,
  } from "threlte";

  let posY = 0;
  let handle;
  const tick = () => {
    posY = Math.sin(Date.now() / 1000) + 1;
    // handle = window.requestAnimationFrame(tick);
  };
  tick();
  onDestroy(() => {
    if (handle) cancelAnimationFrame(handle);
  });

  const defaultColor = new Color("#ddd");
  const hoverColor = new Color("red");
  const sphereMaterial = new MeshStandardMaterial({ color: defaultColor });
  const sphereScale = spring(1);
  const onPointerEnter = () => {
    sphereMaterial.color = hoverColor;
    $sphereScale = 1.5;
  };
  const onPointerLeave = () => {
    sphereMaterial.color = defaultColor;
    $sphereScale = 1;
  };
</script>

<div>
  <Canvas>
    <PerspectiveCamera position={{ x: 10, y: 10, z: 10 }}>
      <OrbitControls enableDamping />
    </PerspectiveCamera>

    <DirectionalLight
      shadow
      color={"#EDBD9C"}
      position={{ x: -15, y: 45, z: 20 }}
    />

    <HemisphereLight
      skyColor={0x4c8eac}
      groundColor={0xac844c}
      intensity={0.6}
    />

    <Mesh
      castShadow
      interactive
      on:pointerenter={onPointerEnter}
      on:pointerleave={onPointerLeave}
      position={{ y: posY }}
      scale={$sphereScale}
      geometry={new SphereBufferGeometry(1, 40, 40)}
      material={sphereMaterial}
    />

    <Mesh
      receiveShadow
      position={{ y: -1.5 }}
      rotation={{ x: -90 * (Math.PI / 180) }}
      geometry={new CircleBufferGeometry(3, 72)}
      material={new MeshStandardMaterial({ color: "white", side: DoubleSide })}
    />
  </Canvas>
</div>

<style>
  div {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style> -->
<script lang="ts">
  import {
    CircleBufferGeometry,
    MeshStandardMaterial,
    SphereBufferGeometry,
    Color,
    DoubleSide,
  } from "three";
  import {
    Canvas,
    DirectionalLight,
    HemisphereLight,
    Mesh,
    OrbitControls,
    PerspectiveCamera,
  } from "threlte";
</script>

<div>hellow world</div>

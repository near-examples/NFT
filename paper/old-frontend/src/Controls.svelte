<script lang="ts">
  import { getContext } from "svelte";
  import Camera from "svelthree/src/components/Camera.svelte";
  import OptionsPopup from "./OptionsPopup.svelte";

  const { open } = getContext("simple-modal");
  const showOptions = () => open(OptionsPopup, {});

  export let cameraPos = [0, 0, 0];
  let oldCameraPos = cameraPos;
  const updateCameraPos = (n: [number, number, number]) => {
    oldCameraPos = cameraPos;
    cameraPos = n;
  };
</script>

<button on:click={showOptions}> Controls </button>

<div class="views">
  <button on:click={() => updateCameraPos([0, 0, 0])}>Top</button>
  <button on:click={() => updateCameraPos([0, 0, 0])}>Left</button>
  <button on:click={() => updateCameraPos([0, 0, 0])}>Right</button>
  <button on:click={() => updateCameraPos([0, 0, 0])}>Front</button>
  <button on:click={() => updateCameraPos([0, 0, 0])}>Back</button>
  <button on:click={() => updateCameraPos([0, 0, 0])}>Bottom</button>
  <button on:click={() => updateCameraPos([0, 0, 0])}>Old</button>
</div>

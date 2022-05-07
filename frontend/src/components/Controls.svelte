<script lang="ts">
	import { getContext } from 'svelte';
	// import Camera from "svelthree/src/components/Camera.svelte";
	// import OptionsPopup from "./OptionsPopup.svelte";

	// const { open } = getContext("simple-modal");
	// const showOptions = () => open(OptionsPopup, {});

	// export let cameraPos = [0, 0, 0];
	// let oldCameraPos = cameraPos;
	// const updateCameraPos = (n: [number, number, number]) => {
	//   oldCameraPos = cameraPos;
	//   cameraPos = n;
	// };
</script>

<button on:click={() => {}}> Controls </button>

<div class="views">
	<button
		on:click={() => {
			console.log('top');
		}}>Top</button
	>
	<button
		on:click={() => {
			console.log('lef');
		}}>Left</button
	>
	<button
		on:click={() => {
			console.log('right');
		}}>Right</button
	>
	<button
		on:click={() => {
			console.log('front');
		}}>Front</button
	>
	<button
		on:click={() => {
			console.log('back');
		}}>Back</button
	>
	<button
		on:click={() => {
			console.log('bootm');
		}}>Bottom</button
	>
	<button
		on:click={() => {
			console.log('old');
		}}>Old</button
	>
</div>

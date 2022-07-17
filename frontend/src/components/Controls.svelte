<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import {
		default_angle_1,
		default_angle_2,
		default_distance,
		generateParams,
		parameters,
		controlParams
	} from '../store';
	import RationalButtonGroup from './RationalButtonGroup.svelte';

	const dispatch = createEventDispatcher();

	// link to paper icon
	const toggleRunning = () => {
		$controlParams.running = !$controlParams.running;
	};

	const togglePreview = () => {
		$controlParams.displayPreview = !$controlParams.displayPreview;
	};

	const updateParams = () => {
		$parameters = generateParams(yaw, pitch, distance);
		$controlParams.running = false;
		dispatch('paramchange', {});
	};

	let yaw = default_angle_1;
	let pitch = default_angle_2;
	let distance = default_distance;
</script>

<section>
	<button on:click={updateParams}>Reset</button>
	<button on:click={toggleRunning}>{$controlParams.running ? 'Pause' : 'Play'}</button>
	<button on:click={togglePreview}
		>{$controlParams.displayPreview ? 'show preview' : 'hide preview'}</button
	>
	<input type="range" bind:value={$controlParams.pathWidth} min="0.01" max="10" step=".01" />

	<!-- TODO: control this from URL param -->
	{#if $controlParams.allowControls}
		<RationalButtonGroup name="Yaw" bind:rational={yaw} on:paramchange={updateParams} />
		<RationalButtonGroup name="Pitch" bind:rational={pitch} on:paramchange={updateParams} />
		<!-- <RationalButtonGroup name="Distance" bind:rational={distance} on:paramchange={updateParams} /> -->
	{/if}
</section>

<style>
	button {
		border: none;
		margin: none;
	}

	section {
		position: absolute;
		display: grid;
		width: 10px;
		margin: 20px;
		gap: 5px;
	}
</style>

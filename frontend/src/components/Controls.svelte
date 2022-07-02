<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import {
		default_angle_1,
		default_angle_2,
		default_distance,
		generateParams,
		parameters
	} from '../store';
	import RationalButtonGroup from './RationalButtonGroup.svelte';

	const dispatch = createEventDispatcher();

	// TODO: connect to store
	// group into edit controls + view controls
	// + mechanism to toggle

	// link to paper icon

	const toggle = () => {
		$parameters.running = !$parameters.running;
	};

	const updateParams = () => {
		$parameters = generateParams(yaw, pitch, distance);
		console.log($parameters);
		dispatch('paramchange', {});
	};

	let yaw = default_angle_1;
	let pitch = default_angle_2;
	let distance = default_distance;
</script>

<section>
	<button on:click={updateParams}>Reset</button>
	<button on:click={toggle}>{$parameters.running ? 'Pause' : 'Play'}</button>

	<RationalButtonGroup name="Yaw" bind:rational={yaw} on:paramchange={updateParams} />
	<RationalButtonGroup name="Pitch" bind:rational={pitch} on:paramchange={updateParams} />
	<!-- <RationalButtonGroup name="Distance" bind:rational={distance} on:paramchange={updateParams} /> -->
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

<script lang="ts">
	import type { OrthographicView } from 'src/interfaces';

	import { default_angle_1, default_angle_2, default_distance, parameters } from '../store';
	import RationalButtonGroup from './RationalButtonGroup.svelte';

	// TODO: connect to store
	// group into edit controls + view controls
	// + mechanism to toggle

	// link to paper icon

	// TODO
	const toggle = () => {
		// $parameters.
	};

	// TODO
	const reset = () => {};

	// TODO
	const updateView = (view: OrthographicView) => {};

	// TODO
	const updateStore = (field: string) => {};

	let yaw = default_angle_1;
	let pitch = default_angle_2;
	let distance = default_distance;
</script>

<section>
	<button on:click={reset}>Reset</button>
	<button on:click={toggle}>{true ? 'Play' : 'Pause'}</button>

	<div class="button-group">
		<button on:click={() => updateView('TOP')}>{'TOP'}</button>
		<button on:click={() => updateView('BOTTOM')}>{'BOTTOM'}</button>
	</div>
	<div class="button-group">
		<button on:click={() => updateView('FRONT')}>{'FRONT'}</button>
		<button on:click={() => updateView('BACK')}>{'BACK'}</button>
	</div>
	<div class="button-group">
		<button on:click={() => updateView('LEFT')}>{'LEFT'}</button>
		<button on:click={() => updateView('RIGHT')}>{'RIGHT'}</button>
	</div>

	<RationalButtonGroup name="Yaw" rational={yaw} />

	<RationalButtonGroup name="Pitch" rational={pitch} />

	<RationalButtonGroup name="Distance" rational={distance} />

	<!-- <div class="button-group">
		<button
			class={pitch_dim == 'X' ? 'selected' : ''}
			on:click={() => {
				pitch_dim = 'X';
			}}>X</button
		>
		<button
			class={pitch_dim == 'Y' ? 'selected' : ''}
			on:click={() => {
				pitch_dim = 'Y';
			}}>Y</button
		>
		<button
			class={pitch_dim == 'Z' ? 'selected' : ''}
			on:click={() => {
				pitch_dim = 'Z';
			}}>Z</button
		>
	</div> -->
</section>

<style>
	button {
		border: none;
		margin: none;
	}

	button.selected {
		background-color: rgb(158, 158, 158);
	}

	.button-group {
		display: grid;
		gap: 5px;
		grid-template-columns: repeat(auto-fit, minmax(10px, 1fr));
	}

	section {
		position: absolute;
		display: grid;
		width: 10px;
		margin: 20px;
		gap: 5px;
	}
</style>

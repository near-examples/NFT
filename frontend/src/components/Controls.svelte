<script lang="ts">
	import type { AngleFN, Dimension } from 'src/interfaces';

	import { parameters } from '../store';

	let play = false;
	const toggle = () => {
		play = !play;
	};

	let yaw_num = 7;
	let yaw_den = 213;
	let yaw_base = 4;
	let yaw_fn: AngleFN = 'sin';
	let yaw_dim: Dimension = 'X';

	let pitch_num = 0;
	let pitch_den = 1;
	let pitch_base = 4;
	let pitch_fn: AngleFN = 'sin';
	let pitch_dim: Dimension = 'X';
</script>

<section>
	<button
		on:click={() => {
			console.log('Reset');
		}}>Reset</button
	>
	<button on:click={toggle}>{play ? 'Play' : 'Pause'}</button>

	<h4>Yaw</h4>
	<label>
		num:
		<input bind:value={yaw_num} type="number" step="1" min="0" max={yaw_den} />
	</label>
	<label>
		den:
		<input bind:value={yaw_den} type="number" step="1" min="1" />
	</label>
	<label>
		base:
		<input bind:value={yaw_base} type="number" step="1" min="2" />
	</label>

	<div class="button-group">
		<button
			class={yaw_fn == 'sin' ? 'selected' : ''}
			on:click={() => {
				yaw_fn = 'sin';
			}}>sin</button
		>
		<button
			class={yaw_fn == 'cos' ? 'selected' : ''}
			on:click={() => {
				yaw_fn = 'cos';
			}}>cos</button
		>
	</div>

	<div class="button-group">
		<button
			class={yaw_dim == 'X' ? 'selected' : ''}
			on:click={() => {
				yaw_dim = 'X';
			}}>X</button
		>
		<button
			class={yaw_dim == 'Y' ? 'selected' : ''}
			on:click={() => {
				yaw_dim = 'Y';
			}}>Y</button
		>
		<button
			class={yaw_dim == 'Z' ? 'selected' : ''}
			on:click={() => {
				yaw_dim = 'Z';
			}}>Z</button
		>
	</div>

	<p>{yaw_num / yaw_den}</p>

	<h4>Pitch</h4>
	<label>
		num:
		<input bind:value={pitch_num} type="number" step="1" min="0" max={pitch_den} />
	</label>
	<label>
		den:
		<input bind:value={pitch_den} type="number" step="1" min="1" />
	</label>
	<label>
		base:
		<input bind:value={pitch_base} type="number" step="1" min="2" />
	</label>

	<div class="button-group">
		<button
			class={pitch_fn == 'sin' ? 'selected' : ''}
			on:click={() => {
				pitch_fn = 'sin';
			}}>sin</button
		>
		<button
			class={pitch_fn == 'cos' ? 'selected' : ''}
			on:click={() => {
				pitch_fn = 'cos';
			}}>cos</button
		>
	</div>

	<div class="button-group">
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
	</div>

	<p>{pitch_num / pitch_den}</p>
</section>

<style>
	h4,
	p {
		margin-bottom: 0;
	}

	label {
		display: grid;
		grid-template-columns: 50px 100px;
	}

	input {
		border: none;
		background-color: aliceblue;
	}

	button {
		border: none;
		margin: none;
	}

	button.selected {
		background-color: rgb(158, 158, 158);
	}

	.button-group {
		display: grid;
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

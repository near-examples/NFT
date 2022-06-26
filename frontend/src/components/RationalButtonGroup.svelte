<script lang="ts">
	import type { Rational } from '../interfaces';

	export let name: string;
	export let rational: Rational;
</script>

<h4>{name}</h4>
<label>
	num:
	<input bind:value={rational.n} type="number" step="1" min="0" max={rational.d} />
</label>
<label>
	den:
	<input bind:value={rational.d} type="number" step="1" min="1" />
</label>
<label>
	base:
	<input bind:value={rational.b} type="number" step="1" min="2" />
</label>

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
</style>

<script lang="ts">
	import { parameters } from '../store';
</script>

<div>
	<button
		on:click={() => {
			console.log('top');
		}}>Top</button
	>
	<input type="range" />
</div>

<style>
	div {
		position: fixed;
		top: 0;
		left: 0;
		display: grid;
		width: 10px;
		margin: 5px;
		gap: 5px;
	}
</style>

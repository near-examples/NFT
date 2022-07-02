<script lang="ts">
	import { parameters } from '../store';
	import {
		defaultBounds,
		defaultPath,
		MAX_STEPS,
		previewPath,
		type Bounds,
		type PosType,
		type Rational,
		type TurtlePath
	} from '../interfaces';
	import { calcChangeInPosVec, generatePreviewPoints, resetPath } from '../math/position';
	import { computeCylinders, getCentroid, recomputeCylinders, updateBounds } from '../turtle_utils';

	import Controls from '../components/Controls.svelte';

	import { SphereGeometry, CylinderGeometry, Vector3, MeshStandardMaterial } from 'three';
	import {
		Canvas,
		DirectionalLight,
		HemisphereLight,
		Instance,
		InstancedMesh,
		Mesh,
		OrbitControls,
		OrthographicCamera,
		type Position,
		Group
	} from 'threlte';
	import { afterUpdate, beforeUpdate } from 'svelte';
	import TurtlePathMesh from '../components/TurtlePathMesh.svelte';

	const sphereGeometry = new SphereGeometry(1);
	const cylinderGeometry = new CylinderGeometry(1, 1, 1, 10, 1, true);

	let path: TurtlePath = defaultPath;
	// $: path.points = resetPath($parameters);
	// $: path.cylinders = recomputeCylinders(path);

	let preview: TurtlePath = previewPath;
	$: preview.points = generatePreviewPoints($parameters);
	$: preview.cylinders = computeCylinders(preview);

	let cameraPos: Position = { x: 1, y: 1, z: 1 };
	let bounds: Bounds = defaultBounds;
	let pos: PosType = [0, 0, 0];
	let steps: number = 0;

	const step = () => {
		if ($parameters.running && steps < MAX_STEPS) {
			const [deltaX, deltaY, deltaZ] = calcChangeInPosVec($parameters);

			const newPos = [pos[0] + deltaX, pos[1] + deltaY, pos[2] + deltaZ] as PosType;
			path.points = [...path.points, new Vector3(...newPos)];
			path.cylinders = recomputeCylinders(path);
			bounds = updateBounds(new Vector3(...newPos), bounds);

			pos = newPos;
			steps += 1;
		}
	};

	let timer_id: NodeJS.Timer;
	parameters.subscribe((newParams) => {
		clearInterval(timer_id);
		timer_id = setInterval(step, $parameters.sleepTimeMs);
		console.log('DONE');
	});
	// beforeUpdate(() => {
	// 	console.log('before update');
	// });

	// afterUpdate(() => {
	// 	console.log('after update');
	// });

	// called to reset entire state
	// called on parameter update from Controls.svelte
	const reset = () => {
		// clearInterval(timer_id);

		console.log('reset called');

		// path = defaultPath;
		bounds = defaultBounds;

		pos = [0, 0, 0];
		steps = 0;

		// parameters.subscribe((newParams) => {
		// 	setTimeout(() => {
		// 		start();
		// 	}, 400);
		// });
	};
</script>

<div class="container">
	<button on:click={reset}>test</button>
	<!-- <input type="range" bind:value={path.width} min="0.01" max="10" step=".01" /> -->
	<Controls on:paramchange={reset} />
	<Canvas>
		<TurtlePathMesh turtle={preview} />
		<TurtlePathMesh turtle={path} />

		<OrthographicCamera far={1000000000000} position={cameraPos}>
			<OrbitControls enableDamping autoRotate autoRotateSpeed={0.5} target={getCentroid(bounds)} />
		</OrthographicCamera>

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />
		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		<!-- origin -->
		<Mesh geometry={sphereGeometry} material={new MeshStandardMaterial({ color: 'black' })} />

		<!-- turtle head -->
		<Mesh
			geometry={sphereGeometry}
			position={new Vector3(...pos)}
			material={new MeshStandardMaterial({ color: 'green' })}
		/>
	</Canvas>
</div>

<style>
	.container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>

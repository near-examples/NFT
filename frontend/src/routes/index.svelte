<script lang="ts">
	import { parameters, controlParams } from '../store';
	import {
		defaultBounds,
		defaultPath,
		MAX_STEPS,
		previewPath,
		type PosType,
		type TurtlePath
	} from '../interfaces';
	import { calcChangeInPosVec, generatePreviewPoints, resetPath } from '../math/position';
	import { computeCylinders, getCentroid, recomputeCylinders, updateBounds } from '../turtle_utils';

	import { SphereGeometry, Vector3, MeshStandardMaterial } from 'three';
	import {
		Canvas,
		DirectionalLight,
		HemisphereLight,
		Mesh,
		OrbitControls,
		OrthographicCamera,
		type Position
	} from 'threlte';

	import Controls from '../components/Controls.svelte';
	import TurtlePathMesh from '../components/TurtlePathMesh.svelte';

	const sphereGeometry = new SphereGeometry(1);

	//////////////// ControlParams

	let displayPreview: boolean;
	let running: boolean;

	//////////////// TurtlePaths

	let path: TurtlePath = defaultPath;
	$: path.points = resetPath($parameters);
	$: path.cylinders = recomputeCylinders(path);

	let preview: TurtlePath = previewPath;
	$: preview.points = generatePreviewPoints($parameters);
	$: preview.cylinders = computeCylinders(preview);

	//////////////// Three js scene stuff

	let cameraPos: Position = { x: 1, y: 1, z: 1 };
	let pos: PosType = [0, 0, 0];
	let steps: number = 0;

	const step = () => {
		if (steps < MAX_STEPS) {
			const [deltaX, deltaY, deltaZ] = calcChangeInPosVec($parameters);

			const newPos = [pos[0] + deltaX, pos[1] + deltaY, pos[2] + deltaZ] as PosType;
			path.points = [...path.points, new Vector3(...newPos)];
			path.cylinders = recomputeCylinders(path);
			path.bounds = updateBounds(new Vector3(...newPos), path.bounds);

			pos = newPos;
			steps += 1;
		}
	};

	let timer_id: NodeJS.Timer;
	controlParams.subscribe((newParams) => {
		running = newParams.running;
		displayPreview = newParams.displayPreview;
		path.width = newParams.pathWidth;

		clearInterval(timer_id);
		if (running) {
			timer_id = setInterval(step, $parameters.sleepTimeMs);
		}
	});

	// called to reset entire state
	// called on parameter update from Controls.svelte
	const reset = () => {
		clearInterval(timer_id);
		pos = [0, 0, 0];
		steps = 0;
		path.bounds = {
			minX: 0,
			maxX: 0,
			minY: 0,
			maxY: 0,
			minZ: 0,
			maxZ: 0
		};
	};
</script>

<div class="container">
	<Controls on:paramchange={reset} />
	<Canvas>
		<OrthographicCamera far={1000000000000} position={cameraPos}>
			<OrbitControls
				enableDamping
				autoRotate
				autoRotateSpeed={0.5}
				target={getCentroid(path.bounds)}
			/>
		</OrthographicCamera>

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />
		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		<TurtlePathMesh turtle={path} />
		{#if displayPreview}
			<TurtlePathMesh turtle={preview} />
		{/if}

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

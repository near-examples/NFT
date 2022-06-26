<script lang="ts">
	import { generateParams, parameters } from '../store';
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
	import { calcChangeInPosVec, generatePreviewPoints } from '../math/position';
	import { computeCylinders, getCentroid, recomputeCylinders, updateBounds } from '../turtle_utils';

	import Controls from '../components/Controls.svelte';

	// Functional TODO:
	// orthographic views (top, bottom, left, right)

	import {
		SphereGeometry,
		CylinderGeometry,
		DoubleSide,
		Vector3,
		MeshStandardMaterial
	} from 'three';
	import {
		Canvas,
		DirectionalLight,
		Group,
		HemisphereLight,
		Instance,
		InstancedMesh,
		Mesh,
		OrbitControls,
		OrthographicCamera
	} from 'threlte';

	const sphereGeometry = new SphereGeometry(1);
	const cylinderGeometry = new CylinderGeometry(1, 1, 1);

	let path: TurtlePath = defaultPath;
	let preview: TurtlePath = previewPath;
	preview.points = generatePreviewPoints($parameters);
	computeCylinders(preview);

	let cameraPos = { x: 1, y: 1, z: 1 };
	let bounds: Bounds = defaultBounds;

	let pos: PosType = [0, 0, 0];
	let steps = 0;
	const start = async () => {
		while ($parameters.running && steps < MAX_STEPS) {
			const [deltaX, deltaY, deltaZ] = calcChangeInPosVec($parameters);
			await new Promise((res, rej) => setTimeout(res, $parameters.sleepTimeMs));

			const newPos = [pos[0] + deltaX, pos[1] + deltaY, pos[2] + deltaZ] as PosType;
			path.points = [...path.points, new Vector3(...newPos)];
			path.cylinders = recomputeCylinders(path);
			bounds = updateBounds(new Vector3(...newPos), bounds);

			pos = newPos;
			steps += 1;
		}
		console.log('DONE');
	};

	parameters.subscribe((newParams) => {
		setTimeout(() => {
			start();
		}, 400);
	});

	// called to reset entire state
	// called on parameter update from Controls.svelte
	const reset = () => {
		console.log('reset called');
		path = defaultPath;
		preview = previewPath;
		preview.points = generatePreviewPoints($parameters);
		computeCylinders(preview);

		cameraPos = { x: 1, y: 1, z: 1 };
		bounds = defaultBounds;

		pos = [0, 0, 0];
		steps = 0;

		setTimeout(() => {
			start();
		}, 400);
	};
</script>

<div class="container">
	<Controls on:paramchange={(e) => reset()} />
	<Canvas>
		<OrthographicCamera far={1000000000000} position={cameraPos}>
			<OrbitControls enableDamping autoRotate autoRotateSpeed={0.5} target={getCentroid(bounds)} />
		</OrthographicCamera>

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />
		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		{#each [path, preview] as turtle}
			<Group>
				<!-- spheres -->
				<InstancedMesh castShadow receiveShadow geometry={sphereGeometry} material={turtle.mat}>
					{#each turtle.points as p}
						<Instance position={p} scale={{ x: turtle.width, y: turtle.width, z: turtle.width }} />
					{/each}
				</InstancedMesh>

				<!-- cylinders -->
				<InstancedMesh castShadow receiveShadow geometry={cylinderGeometry} material={turtle.mat}>
					{#each turtle.cylinders as c}
						<Instance
							position={c.position}
							rotation={c.rotation}
							scale={{ x: turtle.width, y: c.scale.y, z: turtle.width }}
						/>
					{/each}
				</InstancedMesh>
			</Group>
		{/each}

		<!-- origin -->
		<Mesh
			geometry={sphereGeometry}
			scale={2}
			material={new MeshStandardMaterial({ color: 'white' })}
		/>

		<!-- centroid -->
		<Mesh
			geometry={sphereGeometry}
			position={getCentroid(bounds)}
			material={new MeshStandardMaterial({ color: 'white' })}
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

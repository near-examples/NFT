<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { spring, tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { parameters } from '../store';
	import type { PosType } from '../interfaces';
	import { calcChangeInPosVec } from '../math/position';
	import Controls from '../components/Controls.svelte';

	import {
		SphereGeometry,
		CircleBufferGeometry,
		CylinderGeometry,
		DoubleSide,
		Vector3,
		Euler,
		Quaternion,
		MeshStandardMaterial,
		MeshLambertMaterial,
		MeshNormalMaterial
	} from 'three';
	import {
		Canvas,
		DirectionalLight,
		HemisphereLight,
		Instance,
		InstancedMesh,
		Mesh,
		OrbitControls,
		PerspectiveCamera
	} from 'threlte';

	let width = 0.1;

	// 10000 step clear preview
	const MAX_STEPS = 1000000;
	const MAX_PREVIEW_STEPS = 10000;

	const normalMaterial = new MeshNormalMaterial();
	const clearMaterial = new MeshLambertMaterial({ color: 'red' });
	const defaultMaterial = new MeshStandardMaterial({ color: 'red' });
	const sphereGeometry = new SphereGeometry(1);
	const cylinderGeometry = new CylinderGeometry(1, 1, 1);

	let points: Vector3[] = [new Vector3()];
	let cylinders: any[] = [];

	const axis = new Vector3(0, 1, 0);

	const calculateCylinder = (p1: Vector3, p2: Vector3) => {
		let length = p2.clone().sub(p1).length();

		let diff = p1.clone().sub(p2);
		let q = new Quaternion().setFromUnitVectors(axis, diff.normalize());
		let rot = new Euler().setFromQuaternion(q);

		return {
			position: p1.clone().add(p2).multiplyScalar(0.5),
			scale: { y: length },
			rotation: rot
		};
	};

	// TODO: revisit
	const recomputeCylinders = () => {
		// cylinders = [];
		// for (let i = 1; i < points.length; i++)
		// 	cylinders.push(calculateCylinder(points[i - 1], points[i]));

		let new_cylinder = calculateCylinder(points[points.length - 2], points[points.length - 1]);
		cylinders = [...cylinders, new_cylinder];
	};

	let preview_points: Vector3[] = [];
	let preview_cylinders: any[] = [];

	const generatePreview = () => {
		let steps = 0;
		while (steps < MAX_PREVIEW_STEPS) {
			const [deltaX, deltaY, deltaZ] = calcChangeInPosVec($parameters);
			const newPos = [pos[0] + deltaX, pos[1] + deltaY, pos[2] + deltaZ] as PosType;
			points = [...points, new Vector3(...newPos)];
			recomputeCylinders();
			pos = newPos;
		}
		console.log('DONE');
	};

	let pichRotateRad: number = 0;
	let tmpRotateRad: number = 0;
	let YawRotateRad: number = 0;
	let pos: PosType = [0, 0, 0];
	let running = true;

	const start = async (initSleep = true) => {
		if (initSleep) await new Promise((res, rej) => setTimeout(res, 1000));
		while (running) {
			const [deltaX, deltaY, deltaZ] = calcChangeInPosVec($parameters);
			await new Promise((res, rej) => setTimeout(res, $parameters.sleepTimeMs));

			const newPos = [pos[0] + deltaX, pos[1] + deltaY, pos[2] + deltaZ] as PosType;
			points = [...points, new Vector3(...newPos)];
			recomputeCylinders();
			pos = newPos;
		}
		console.log('DONE');
	};

	parameters.subscribe((newParams) => {
		running = false;
		pos = [0, 0, 0];
		pichRotateRad = 0;
		YawRotateRad = 0;
		setTimeout(() => {
			running = true;
			start();
		}, 400);
	});
</script>

<div class="container">
	<Controls />
	<Canvas>
		<PerspectiveCamera position={{ x: 10, y: 10, z: 10 }}>
			<OrbitControls enableDamping autoRotate autoRotateSpeed={0.5} />
		</PerspectiveCamera>

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />
		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		<!-- spheres -->
		<InstancedMesh castShadow receiveShadow geometry={sphereGeometry} material={defaultMaterial}>
			{#each points as p}
				<Instance position={p} scale={{ x: width, y: width, z: width }} />
			{/each}
		</InstancedMesh>

		<!-- cylinders -->
		<InstancedMesh castShadow receiveShadow geometry={cylinderGeometry} material={defaultMaterial}>
			{#each cylinders as c}
				<Instance
					position={c.position}
					rotation={c.rotation}
					scale={{ x: width, y: c.scale.y, z: width }}
				/>
			{/each}
		</InstancedMesh>

		<!-- base plane -->
		<Mesh
			receiveShadow
			position={{ y: -1.5 }}
			rotation={{ x: -90 * (Math.PI / 180) }}
			geometry={new CircleBufferGeometry(3, 72)}
			material={new MeshStandardMaterial({ color: 'white', side: DoubleSide })}
			interactive
			on:click={() => {
				points = [];
				pos = [0, 0, 0];
			}}
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

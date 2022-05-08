<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import Controls from '../components/Controls.svelte';
	import type { PosType } from '../interfaces';
	import { calcChangeInPosVec } from '../math/position';
	// import { lines, parameters, scene } from '../store';

	import {
		MeshStandardMaterial,
		LineBasicMaterial,
		SphereGeometry,
		CircleBufferGeometry,
		CylinderGeometry,
		BufferGeometry,
		Color,
		DoubleSide,
		Vector3,
		Euler,
		Quaternion,
		MathUtils
	} from 'three';
	import {
		Canvas,
		DirectionalLight,
		FogExp2,
		HemisphereLight,
		Mesh,
		OrbitControls,
		PerspectiveCamera
	} from 'threlte';

	let w1 = 0.01;
	let w2 = w1 * 2;

	const defaultMaterial = new MeshStandardMaterial({ color: 'red' });
	const sphereGeometry = new SphereGeometry(w1);

	let points: Vector3[] = [];

	for (let i = 0; i < 100; i++) {
		let s = (0.5 - Math.random()) * 100;
		let v = new Vector3().random().setLength(s);
		console.log(s, v);
		points.push(new Vector3().random());
	}

	const axis = new Vector3(0, 1, 0);

	const calculateCylinder = (p1: Vector3, p2: Vector3) => {
		let length = p2.clone().sub(p1).length();

		let diff = p1.clone().sub(p2);
		let q = new Quaternion().setFromUnitVectors(axis, diff.normalize());
		let rot = new Euler().setFromQuaternion(q);

		return {
			geometry: new CylinderGeometry(w1, w1, length),
			position: p1.clone().add(p2).multiplyScalar(0.5),
			rotation: rot
		};
	};

	let cylinders: any[] = [];

	for (let i = 1; i < points.length; i++) {
		let v1 = points[i - 1];
		let v2 = points[i];

		cylinders.push(calculateCylinder(v1, v2));
	}
</script>

<div class="container">
	<div>
		<Controls />
	</div>
	<Canvas>
		<PerspectiveCamera position={{ x: 10, y: 10, z: 10 }}>
			<OrbitControls enableDamping />
		</PerspectiveCamera>

		<!-- <FogExp2 color={'#dddddd'} density={0.05} /> -->

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />

		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		<!-- spheres -->
		{#each points as p}
			<Mesh castShadow position={p} geometry={sphereGeometry} material={defaultMaterial} />
		{/each}

		<!-- cylinders -->
		{#each cylinders as m}
			<Mesh
				castShadow
				position={m.position}
				rotation={m.rotation}
				geometry={m.geometry}
				material={defaultMaterial}
			/>
		{/each}

		<Mesh
			receiveShadow
			position={{ y: -1.5 }}
			rotation={{ x: -90 * (Math.PI / 180) }}
			geometry={new CircleBufferGeometry(3, 72)}
			material={new MeshStandardMaterial({ color: 'white', side: DoubleSide })}
		/>
	</Canvas>
</div>

<style>
	div.container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>

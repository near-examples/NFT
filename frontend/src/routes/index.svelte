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

	const defaultColor = new Color('#ddd');
	const hoverColor = new Color('red');
	// const lineMaterial = new LineBasicMaterial({ color: hoverColor, side: DoubleSide });
	const defaultMaterial = new MeshStandardMaterial({ color: hoverColor, side: DoubleSide });

	let w1 = 0.01;
	let w2 = w1 * 2;

	let points = [new Vector3(1, 1, 0), new Vector3(-1, 2, 1)];

	let cylinderpos = points[0].clone().add(points[1]).multiplyScalar(0.5);

	let diff = points[0].clone().sub(points[1]);
	let q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), diff.normalize());
	let rot = new Euler().setFromQuaternion(q);

	console.log(q, rot);

	// let rot = { x: 0, y: 0, z: 0 };
	let length = points[1].clone().sub(points[0]).length();

	let meshes = [
		{
			geometry: new SphereGeometry(w1),
			material: new MeshStandardMaterial({ color: hoverColor, side: DoubleSide }),
			position: points[0],
			rotation: { x: 0, y: 0, z: 0 }
		},
		{
			geometry: new CylinderGeometry(w1, w2, length),
			material: new MeshStandardMaterial({ color: hoverColor, side: DoubleSide }),
			position: cylinderpos,
			rotation: rot
		},
		{
			geometry: new SphereGeometry(w2),
			material: new MeshStandardMaterial({ color: hoverColor, side: DoubleSide }),
			position: points[1],
			rotation: { x: 0, y: 0, z: 0 }
		}
	];
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

		{#each meshes as m}
			<Mesh
				castShadow
				position={m.position}
				rotation={m.rotation}
				geometry={m.geometry}
				material={m.material}
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

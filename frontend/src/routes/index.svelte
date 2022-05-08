<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import Controls from '../components/Controls.svelte';
	import type { PosType } from '../interfaces';
	import { calcChangeInPosVec } from '../math/position';
	// import { lines, parameters, scene } from '../store';

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

	let width = 0.02;

	const normalMaterial = new MeshNormalMaterial();
	const clearMaterial = new MeshLambertMaterial({ color: 'red' });
	const defaultMaterial = new MeshStandardMaterial({ color: 'red' });
	const sphereGeometry = new SphereGeometry(width);
	const cylinderGeometry = new CylinderGeometry(width, width, 1);

	let points: Vector3[] = [];
	let cylinders: any[] = [];

	const axis = new Vector3(0, 1, 0);

	const calculateCylinder = (p1: Vector3, p2: Vector3) => {
		let length = p2.clone().sub(p1).length();

		let diff = p1.clone().sub(p2);
		let q = new Quaternion().setFromUnitVectors(axis, diff.normalize());
		let rot = new Euler().setFromQuaternion(q);

		return {
			position: p1.clone().add(p2).multiplyScalar(0.5),
			scale: { x: 1, y: length, z: 1 },
			rotation: rot
		};
	};

	const recomputeCylinders = () => {
		cylinders = [];
		for (let i = 1; i < points.length; i++) {
			let v1 = points[i - 1];
			let v2 = points[i];

			cylinders.push(calculateCylinder(v1, v2));
		}
	};

	// testing random points
	const recomputePoints = () => {
		points = [];
		for (let i = 0; i < 100; i++) {
			let s = Math.random() * 2;
			points.push(new Vector3().randomDirection().setLength(s));
		}
		recomputeCylinders();
	};

	recomputePoints();
</script>

<div class="container">
	<div>
		<Controls />
	</div>
	<Canvas>
		<PerspectiveCamera position={{ x: 10, y: 10, z: 10 }}>
			<OrbitControls enableDamping autoRotate />
		</PerspectiveCamera>

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />
		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		<!-- spheres -->
		<InstancedMesh castShadow geometry={sphereGeometry} material={normalMaterial}>
			{#each points as p}
				<Instance position={p} />
			{/each}
		</InstancedMesh>

		<!-- cylinders -->
		<InstancedMesh castShadow geometry={cylinderGeometry} material={normalMaterial}>
			{#each cylinders as c}
				<Instance position={c.position} rotation={c.rotation} scale={c.scale} />
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
			on:click={recomputePoints}
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

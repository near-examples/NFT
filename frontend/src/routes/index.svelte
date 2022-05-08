<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import Controls from '../components/Controls.svelte';
	import type { PosType } from '../interfaces';
	import { calcChangeInPosVec } from '../math/position';
	// import { lines, parameters, scene } from '../store';

	import {
		Line,
		MeshStandardMaterial,
		LineBasicMaterial,
		SphereBufferGeometry,
		PlaneGeometry,
		CircleBufferGeometry,
		BufferGeometry,
		Color,
		DoubleSide,
		Vector3
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
	const lineMaterial = new MeshStandardMaterial({ color: hoverColor, side: DoubleSide });

	let delta = 1;
	let path: Vector3[] = [
		new Vector3(0, 0, 0),
		new Vector3(1, 1, 1),
		// new Vector3(0 + delta, 0 + delta, 0 + delta),
		new Vector3(1 + delta, 1 + delta, 11 + delta)
	];
	$: lineGeometry = new PlaneGeometry(0.1, 10);
	// = new BufferGeometry().setFromPoints(path);
	// $: line = new Line(lineGeometry, lineMaterial);

	// FOR REFERENCE - delete later
	// path.geometry.attributes.position.array[index++] = tmp.x;
	// path.geometry.attributes.position.array[index++] = tmp.y;
	// path.geometry.attributes.position.array[index++] = tmp.z;
	// drawCount++;
	// path.geometry.setDrawRange(0, drawCount);

	// onMount(() => {
	// 	// console.log(scene);
	// 	// scene.add(line);
	// });

	let camera: any;
</script>

<div class="container">
	<div>
		<Controls />
	</div>
	<Canvas>
		<PerspectiveCamera bind:camera position={{ x: 10, y: 10, z: 10 }}>
			<OrbitControls enableDamping autoRotate />
		</PerspectiveCamera>

		<!-- <FogExp2 color={'#dddddd'} density={0.05} /> -->

		<DirectionalLight shadow color={'#EDBD9C'} position={{ x: -15, y: 45, z: 20 }} />

		<HemisphereLight skyColor={0x4c8eac} groundColor={0xac844c} intensity={0.6} />

		<Mesh
			castShadow
			position={{ y: 1 }}
			rotation={{ x: 20, y: 20 }}
			geometry={lineGeometry}
			material={lineMaterial}
			lookAt={camera}
		/>

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

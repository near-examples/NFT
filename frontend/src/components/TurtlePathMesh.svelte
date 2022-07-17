<script lang="ts">
	import type { TurtlePath } from 'src/interfaces';
	import { CylinderGeometry, SphereGeometry } from 'three';
	import { Group, Instance, InstancedMesh } from 'threlte';

	export let turtle: TurtlePath;

	const sphereGeometry = new SphereGeometry(1);
	const cylinderGeometry = new CylinderGeometry(1, 1, 1, 20, 1, true);
</script>

<Group>
	<!-- spheres -->
	<InstancedMesh castShadow receiveShadow geometry={sphereGeometry} material={turtle.mat}>
		{#each turtle.points as p}
			<Instance position={p} scale={turtle.width} />
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

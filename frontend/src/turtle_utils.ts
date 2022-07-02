import { Euler, Quaternion, Vector3 } from 'three';
import type { Bounds, TurtlePath } from './interfaces';

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

// computes all cylinders
export const computeCylinders = (path: TurtlePath) => {
	let cylinders: any[] = [];
	for (let i = 1; i < path.points.length; i++) {
		let new_cylinder = calculateCylinder(path.points[i - 1], path.points[i]);
		cylinders = [...cylinders, new_cylinder];
	}
	return cylinders;
};

// only computes cylinder for last point
export const recomputeCylinders = (path: TurtlePath) => {
	if (path.points.length == 1) return [];

	let new_cylinder = calculateCylinder(
		path.points[path.points.length - 2],
		path.points[path.points.length - 1]
	);
	// path.cylinders = [...path.cylinders, new_cylinder];
	return [...path.cylinders, new_cylinder];
};

export const updateBounds = (v: Vector3, b: Bounds): Bounds => {
	b.minX = Math.min(v.x, b.minX);
	b.maxX = Math.max(v.x, b.maxX);
	b.minY = Math.min(v.y, b.minY);
	b.maxY = Math.max(v.y, b.maxY);
	b.minZ = Math.min(v.z, b.minZ);
	b.maxZ = Math.max(v.z, b.maxZ);
	return b;
};

export const getCentroid = (b: Bounds): Vector3 => {
	let v = new Vector3();
	v.x = (b.minX + b.maxX) / 2;
	v.y = (b.minY + b.maxY) / 2;
	v.z = (b.minZ + b.maxZ) / 2;
	return v;
};

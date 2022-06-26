import { Euler, Quaternion, Vector3 } from 'three';
import type { TurtlePath } from './interfaces';

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
	for (let i = 1; i < path.points.length; i++) {
		let new_cylinder = calculateCylinder(path.points[i - 1], path.points[i]);
		path.cylinders = [...path.cylinders, new_cylinder];
	}
};

// only computes cylinder for last point
export const recomputeCylinders = (path: TurtlePath) => {
	let new_cylinder = calculateCylinder(
		path.points[path.points.length - 2],
		path.points[path.points.length - 1]
	);
	path.cylinders = [...path.cylinders, new_cylinder];
	// return [...path.cylinders, new_cylinder];
};

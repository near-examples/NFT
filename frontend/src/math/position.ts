import {
	defaultBounds,
	defaultPath,
	MAX_PREVIEW_STEPS,
	type AngleFN,
	type Bounds,
	type PosType,
	type TurtlePath
} from '../interfaces';
import type { StoredParameters } from '../store';
import { Vector3 } from 'three';

const MOVE_UNITS = 10;

const angleAmountToChangeVal = (amount: number, base: number, fn: AngleFN): number => {
	if (fn === 'cos') {
		return Math.cos(((2 * Math.PI) / base) * amount);
	} else {
		return Math.sin(((2 * Math.PI) / base) * amount);
	}
};

export const calcChangeInPosVec = (params: StoredParameters, preview = false): PosType => {
	const moveAmount = params.distance.next().value;
	let deltaX = moveAmount;
	let deltaY = moveAmount;
	let deltaZ = moveAmount;
	params.angles.forEach((angle) => {
		const amount = angle.iterator.next().value;
		angle.usage.forEach((u) => {
			let multiplier = angleAmountToChangeVal(amount, angle.base, u.angleFn);
			if (u.dimension === 'X') {
				deltaX *= multiplier;
			} else if (u.dimension === 'Y') {
				deltaY *= multiplier;
			} else if (u.dimension === 'Z') {
				deltaZ *= multiplier;
			}
		});
	});

	return [deltaX, deltaY, deltaZ];
};

// copies the stored parameters
// precomputes a path of MAX_PREVIEW_STEPS length
export const generatePreviewPoints = (params: StoredParameters): Vector3[] => {
	let pos = new Vector3();
	let previewPoints: Vector3[] = [pos];

	for (let i = 0; i < MAX_PREVIEW_STEPS; i++) {
		const moveAmount = params.distance_preview[i];
		let deltaX = moveAmount;
		let deltaY = moveAmount;
		let deltaZ = moveAmount;
		params.angles.forEach((angle) => {
			const amount = angle.preview[i];
			angle.usage.forEach((u) => {
				let multiplier = angleAmountToChangeVal(amount, angle.base, u.angleFn);
				if (u.dimension === 'X') {
					deltaX *= multiplier;
				} else if (u.dimension === 'Y') {
					deltaY *= multiplier;
				} else if (u.dimension === 'Z') {
					deltaZ *= multiplier;
				}
			});
		});

		let newPos = new Vector3(deltaX, deltaY, deltaZ);
		previewPoints = [...previewPoints, newPos.add(pos)];
		pos = newPos;
	}

	return previewPoints;
};

export const resetPath = (params: StoredParameters): Vector3[] => {
	return [new Vector3()];
};

import { type AngleFN, type PosType, MAX_PREVIEW_STEPS } from '../interfaces';
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

/**
 * Deep copy function for TypeScript.
 * @param T Generic type of target/copied value.
 * @param target Target value to be copied.
 * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
 * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
 */
export const deepCopy = <T>(target: T): T => {
	if (target === null) {
		return target;
	}
	if (target instanceof Date) {
		return new Date(target.getTime()) as any;
	}
	if (target instanceof Array) {
		const cp = [] as any[];
		(target as any[]).forEach((v) => {
			cp.push(v);
		});
		return cp.map((n: any) => deepCopy<any>(n)) as any;
	}
	if (typeof target === 'object' && target !== {}) {
		const cp = { ...(target as { [key: string]: any }) } as { [key: string]: any };
		Object.keys(cp).forEach((k) => {
			cp[k] = deepCopy<any>(cp[k]);
		});
		return cp as T;
	}
	return target;
};

// copies the stored parameters
// precomputes a path of MAX_PREVIEW_STEPS length
export const generatePreviewPoints = (params: StoredParameters): Vector3[] => {
	let params_cpy: StoredParameters = deepCopy(params);
	console.log(params);
	console.log(params_cpy);
	let previewPath: Vector3[] = [];

	for (let i = 0; i < MAX_PREVIEW_STEPS; i++) {
		const moveAmount = params_cpy.distance.next().value;
		let deltaX = moveAmount;
		let deltaY = moveAmount;
		let deltaZ = moveAmount;
		params_cpy.angles.forEach((angle) => {
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

		let pos = [deltaX, deltaY, deltaZ];
		previewPath = [...previewPath, new Vector3(...pos)];
	}

	return previewPath;
};

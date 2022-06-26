import {
	Material,
	MeshLambertMaterial,
	MeshNormalMaterial,
	MeshStandardMaterial,
	Vector3
} from 'three';

export const MAX_STEPS = 1000000;
export const MAX_PREVIEW_STEPS = 200;

export type PosType = [number, number, number];

export type Dimension = 'X' | 'Y' | 'Z';
export type AngleFN = 'cos' | 'sin';

/**
 * @param n - numerator (natural number (including 0))
 * @param d - denominator (natural number (not including 0))
 * @param b - base (natural number (not including 0 or 1))
 */
export type Rational = {
	n: number;
	d: number;
	b: number;
};

export type AngleUsageIndicator = {
	dimension: Dimension;
	angleFn: AngleFN;
};

/**
 * @param iterator - an iterator where one can call .next() in order to get the next rotation
 * @param base - the smallest fraction of a circle that can be turned around
 * @param usage - indicates which dimensions to use the angle in and how
 */
export type Angle = {
	iterator: IterableIterator<number>;
	base: number;
	usage: AngleUsageIndicator[];
};

export type TurtlePath = {
	points: Vector3[];
	cylinders: {
		position: any;
		rotation: any;
		scale?: any;
	}[];
	mat: Material;
};

const normalMaterial = new MeshNormalMaterial();
const clearMaterial = new MeshLambertMaterial({
	color: 'black',
	transparent: true,
	opacity: 0.15
});
const defaultMaterial = new MeshStandardMaterial({ color: 'red' });

export const defaultPath: TurtlePath = {
	points: [new Vector3()],
	cylinders: [],
	mat: defaultMaterial
};

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

export type Bounds = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	minZ: number;
	maxZ: number;
};

export const defaultBounds: Bounds = {
	minX: 0,
	maxX: 0,
	minY: 0,
	maxY: 0,
	minZ: 0,
	maxZ: 0
};

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
	preview: number[];
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
	width: number;
	bounds: Bounds;
};

const normalMaterial = new MeshNormalMaterial();
const clearMaterial = new MeshLambertMaterial({
	color: 'black'
	// transparent: true,
	// opacity: 0.1
});
const defaultMaterial = new MeshStandardMaterial({ color: 'red' });

export const defaultPath: TurtlePath = {
	points: [new Vector3()],
	cylinders: [],
	// mat: defaultMaterial,
	mat: normalMaterial,
	width: 0.5,
	bounds: defaultBounds
};

export const previewPath: TurtlePath = {
	points: [new Vector3()],
	cylinders: [],
	mat: clearMaterial,
	width: 0.1,
	bounds: defaultBounds
};

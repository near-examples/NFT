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

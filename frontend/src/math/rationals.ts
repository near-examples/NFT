import { MAX_PREVIEW_STEPS, type Rational } from '../interfaces';

/**
 * Get the rotation amount for the next angle.
 * It accumulates the angle amount
 */
export function* getRationalAngleIterator(rational: Rational): IterableIterator<number> {
	let curr = 0;
	let remainder = rational.n;
	for (;;) {
		let digit = Math.floor((remainder * rational.b) / rational.d);
		remainder = (remainder * rational.b) % rational.d;
		curr += digit;
		yield curr;
	}
}

// baked version of getRationalAngleIterator
// runs for MAX_PREVIEW_STEPS
export function precomputeRationalAngles(rational: Rational): number[] {
	let angles: number[] = [];
	let curr = 0;
	let remainder = rational.n;
	for (let i = 0; i < MAX_PREVIEW_STEPS; i++) {
		let digit = Math.floor((remainder * rational.b) / rational.d);
		remainder = (remainder * rational.b) % rational.d;
		curr += digit;
		angles = [...angles, curr];
	}

	return angles;
}

/**
 * Get the rotation amount for the next angle.
 * It accumulates the angle amount
 */
export function* getRationalDistanceIterator(rational: Rational): IterableIterator<number> {
	let remainder = rational.n;
	for (;;) {
		let digit = Math.floor((remainder * rational.b) / rational.d);
		remainder = (remainder * rational.b) % rational.d;
		yield digit;
	}
}

// baked version of getRationalDistanceIterator
// runs for MAX_PREVIEW_STEPS
export function precomputeRationalDistances(rational: Rational): number[] {
	let distances: number[] = [];
	let remainder = rational.n;
	for (let i = 0; i < MAX_PREVIEW_STEPS; i++) {
		let digit = Math.floor((remainder * rational.b) / rational.d);
		remainder = (remainder * rational.b) % rational.d;
		distances = [...distances, digit];
	}
	return distances;
}

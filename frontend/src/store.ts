import { writable, type Writable } from 'svelte/store';
import type { Angle, Rational } from './interfaces';
import {
	getRationalAngleIterator,
	getRationalDistanceIterator,
	precomputeRationalAngles,
	precomputeRationalDistances
} from './math/rationals';

export type StoredParameters = {
	angles: Angle[];
	distance: IterableIterator<number>;
	distance_preview: number[];
	sleepTimeMs: number;
};

export const default_angle_1: Rational = { n: 7, d: 213, b: 4 };
export const default_angle_2: Rational = { n: 21, d: 11, b: 9 };
export const default_distance: Rational = { n: 8, d: 9, b: 10 };

export const generateParams = (a1: Rational, a2: Rational, d: Rational): any => {
	return {
		angles: [
			{
				iterator: getRationalAngleIterator({
					n: a1.n,
					d: a1.d,
					b: a1.b
				}),
				preview: precomputeRationalAngles({
					n: a1.n,
					d: a1.d,
					b: a1.b
				}),
				base: a1.b,
				usage: [
					{
						dimension: 'X',
						angleFn: 'cos'
					},
					{
						dimension: 'Y',
						angleFn: 'sin'
					},
					{
						dimension: 'Z',
						angleFn: 'sin'
					}
				]
			},
			// The below is an example of what adding in a 3rd angle looks like
			{
				iterator: getRationalAngleIterator({
					n: a2.n,
					d: a2.d,
					b: a2.b
				}),
				preview: precomputeRationalAngles({
					n: a2.n,
					d: a2.d,
					b: a2.b
				}),

				base: a2.b,
				usage: [
					{
						dimension: 'X',
						angleFn: 'sin'
					},
					{
						dimension: 'Z',
						angleFn: 'sin'
					}
				]
			}
		] as Angle[],
		distance: getRationalDistanceIterator({
			n: d.n,
			d: d.d,
			b: d.b
		}),
		distance_preview: precomputeRationalDistances({
			n: d.n,
			d: d.d,
			b: d.b
		}),
		sleepTimeMs: 10
	};
};

export let parameters: Writable<StoredParameters> = writable(
	generateParams(default_angle_1, default_angle_2, default_distance)
);

export type ControlParameters = {
	running: boolean;
	pathWidth: number;
	displayPreview: boolean;
	allowControls: boolean;
};

export let controlParams: Writable<ControlParameters> = writable({
	running: false,
	pathWidth: 0.5,
	displayPreview: true,
	allowControls: true
});

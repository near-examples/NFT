import { writable, type Writable } from 'svelte/store';
import type { Angle } from './interfaces';
import { getRationalAngleIterator, getRationalDistanceIterator } from './math/rationals';

export type StoredParameters = {
	angles: Angle[];
	distance: IterableIterator<number>;
	sleepTimeMs: number;
};

export const parameters: Writable<StoredParameters> = writable({
	angles: [
		// {
		//   iterator: getRationalAngleIterator({
		//     n: 14,
		//     d: 613,
		//     b: 4,
		//   }),
		//   base: 4,
		//   usage: [
		//     {
		//       dimension: "X",
		//       angleFn: "sin",
		//     },
		//     {
		//       dimension: "Y",
		//       angleFn: "cos",
		//     },
		//   ],
		// },
		{
			iterator: getRationalAngleIterator({
				n: 7,
				d: 213,
				b: 4
			}),
			base: 4,
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
				n: 21,
				d: 11,
				b: 9
			}),
			base: 9,
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
		n: 8,
		d: 9,
		b: 10
	}),
	sleepTimeMs: 10
});

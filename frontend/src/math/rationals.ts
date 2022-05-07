import type { Rational } from "../interfaces";

/**
 * Get the rotation amount for the next angle.
 * It accumulates the angle amount
 */
export function* getRationalAngleIterator(
  rational: Rational
): IterableIterator<number> {
  let curr = 0;
  let remainder = rational.n;
  for (;;) {
    let digit = Math.floor((remainder * rational.b) / rational.d);
    remainder = (remainder * rational.b) % rational.d;
    curr += digit;
    yield curr;
  }
}

/**
 * Get the rotation amount for the next angle.
 * It accumulates the angle amount
 */
export function* getRationalDistanceIterator(
  rational: Rational
): IterableIterator<number> {
  let remainder = rational.n;
  for (;;) {
    let digit = Math.floor((remainder * rational.b) / rational.d);
    remainder = (remainder * rational.b) % rational.d;
    yield digit;
  }
}

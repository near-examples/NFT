import type { AngleFN, PosType } from "../interfaces";
import type { StoredParameters } from "../store";

const MOVE_UNITS = 10;

const angleAmountToChangeVal = (
  amount: number,
  base: number,
  fn: AngleFN
): number => {
  if (fn === "cos") {
    return Math.cos(((2 * Math.PI) / base) * amount);
  } else {
    return Math.sin(((2 * Math.PI) / base) * amount);
  }
};

export const calcChangeInPosVec = (params: StoredParameters): PosType => {
  const moveAmount = params.distance.next().value;
  let deltaX = moveAmount;
  let deltaY = moveAmount;
  let deltaZ = moveAmount;
  params.angles.forEach((angle) => {
    const amount = angle.iterator.next().value;
    angle.usage.forEach((u) => {
      let multiplier = angleAmountToChangeVal(amount, angle.base, u.angleFn);
      if (u.dimension === "X") {
        deltaX *= multiplier;
      } else if (u.dimension === "Y") {
        deltaY *= multiplier;
      } else if (u.dimension === "Z") {
        deltaZ *= multiplier;
      }
    });
  });

  return [deltaX, deltaY, deltaZ];
};

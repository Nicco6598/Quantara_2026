import type { Money } from "@quantara/shared-types";

export const EUR = "EUR";

export function eur(amount: number): Money {
  return { amount: roundCurrency(amount), currency: EUR };
}

export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return { amount: roundCurrency(left.amount + right.amount), currency: left.currency };
}

export function multiplyMoney(value: Money, multiplier: number): Money {
  return { amount: roundCurrency(value.amount * multiplier), currency: value.currency };
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} vs ${right.currency}`);
  }
}

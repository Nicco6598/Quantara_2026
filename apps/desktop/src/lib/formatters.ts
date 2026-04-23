import type { Money } from "@quantara/shared-types";

export function formatMoney(value: Money): string {
  return new Intl.NumberFormat("it-IT", {
    currency: value.currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value.amount);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    style: "percent",
  }).format(value / 100);
}

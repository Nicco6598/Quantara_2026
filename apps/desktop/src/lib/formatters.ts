import type { Money } from "@quantara/shared-types";

const itNumberFormat = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const itPercentFormat = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  style: "percent",
});

const itCurrencyFormat = new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

export function formatMoney(value: Money): string {
  return itCurrencyFormat.format(value.amount);
}

export function formatEuro(value: number): string {
  return itCurrencyFormat.format(value);
}

export function formatNumber(value: number): string {
  return itNumberFormat.format(value);
}

export function formatPercent(value: number): string {
  return itPercentFormat.format(value / 100);
}

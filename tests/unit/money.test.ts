import {
  addMoney,
  eur,
  formatEuroDisplay,
  multiplyMoney,
  parseEuroAmount,
  roundCurrency,
} from "@quantara/domain-utils";
import { describe, expect, it } from "vitest";

describe("money utilities", () => {
  it("rounds currency values to cents", () => {
    expect(roundCurrency(10.005)).toBe(10.01);
    expect(roundCurrency(10.004)).toBe(10.0);
    expect(roundCurrency(-1.23)).toBe(-1.23);
    expect(roundCurrency(Number.NaN)).toBe(NaN);
    expect(roundCurrency(Infinity)).toBe(Infinity);
    expect(eur(12.349)).toEqual({ amount: 12.35, currency: "EUR" });
  });

  it("parses Italian euro display strings", () => {
    expect(parseEuroAmount("€ 1.234,56")).toBe(1234.56);
    expect(parseEuroAmount("€1.000,00")).toBe(1000);
    expect(parseEuroAmount("€ 0,50")).toBe(0.5);
    expect(parseEuroAmount("1.234,56")).toBe(1234.56);
    expect(parseEuroAmount("non numerico")).toBe(0);
    expect(parseEuroAmount("")).toBe(0);
    expect(parseEuroAmount("€ 100")).toBe(100);
  });

  it("formats values for Italian euro display", () => {
    expect(formatEuroDisplay(1234.5)).toBe("€ 1234,50");
    expect(formatEuroDisplay(0)).toBe("€ 0,00");
    expect(formatEuroDisplay(1000000)).toBe("€ 1.000.000,00");
  });

  it("adds and multiplies money using cent rounding", () => {
    expect(addMoney(eur(10.1), eur(0.205))).toEqual({ amount: 10.31, currency: "EUR" });
    expect(multiplyMoney(eur(10), 1.255)).toEqual({ amount: 12.55, currency: "EUR" });
    expect(multiplyMoney(eur(0), 100)).toEqual({ amount: 0, currency: "EUR" });
    expect(multiplyMoney(eur(100), 0)).toEqual({ amount: 0, currency: "EUR" });
  });

  it("throws when adding different currencies", () => {
    expect(() => addMoney(eur(1), { amount: 1, currency: "USD" })).toThrow(
      "Currency mismatch: EUR vs USD",
    );
  });

  it("handles chained money operations", () => {
    const result = multiplyMoney(addMoney(eur(100), eur(50)), 0.9);
    expect(result.amount).toBe(135);
    expect(result.currency).toBe("EUR");
  });
});

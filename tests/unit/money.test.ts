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
    expect(eur(12.349)).toEqual({ amount: 12.35, currency: "EUR" });
  });

  it("parses Italian euro display strings", () => {
    expect(parseEuroAmount("€ 1.234,56")).toBe(1234.56);
    expect(parseEuroAmount("non numerico")).toBe(0);
  });

  it("formats values for Italian euro display", () => {
    expect(formatEuroDisplay(1234.5)).toBe("€ 1234,50");
  });

  it("adds and multiplies money using cent rounding", () => {
    expect(addMoney(eur(10.1), eur(0.205))).toEqual({ amount: 10.31, currency: "EUR" });
    expect(multiplyMoney(eur(10), 1.255)).toEqual({ amount: 12.55, currency: "EUR" });
  });

  it("throws when adding different currencies", () => {
    expect(() => addMoney(eur(1), { amount: 1, currency: "USD" })).toThrow(
      "Currency mismatch: EUR vs USD",
    );
  });
});

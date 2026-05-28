import { describe, expect, it } from "vitest";
import {
  parseLocalizedDecimal,
  parseLocalizedMoney,
  sanitizeDecimalInput,
  sanitizeMoneyInput,
} from "../localized-number-input";

describe("localized-number-input", () => {
  it("keeps trailing comma while typing decimals", () => {
    expect(sanitizeDecimalInput("18,")).toBe("18,");
    expect(sanitizeMoneyInput("26150000,")).toBe("26150000,");
  });

  it("parses italian decimal and money strings", () => {
    expect(parseLocalizedDecimal("18,25")).toBe(18.25);
    expect(parseLocalizedMoney("26.150.000,50")).toBe(26150000.5);
  });

  it("allows partial percent input", () => {
    expect(sanitizeDecimalInput("0,")).toBe("0,");
    expect(parseLocalizedDecimal("0,")).toBe(0);
  });
});

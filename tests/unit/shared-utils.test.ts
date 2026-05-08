import { describe, expect, it } from "vitest";
import {
  createDesktopVoiceKey,
  normalizeContractorName,
} from "../../apps/desktop/src/lib/shared-utils";

describe("shared-utils", () => {
  describe("normalizeContractorName", () => {
    it("recognizes known contractor names", () => {
      expect(normalizeContractorName("RFI S.p.A.")).toBe("RFI");
      expect(normalizeContractorName("ANAS")).toBe("ANAS");
      expect(normalizeContractorName("Regione Lombardia")).toBe("Regione Lombardia");
      expect(normalizeContractorName("Regione Marche")).toBe("Regione Marche");
    });

    it("falls back to trimmed input for unknown names", () => {
      expect(normalizeContractorName("  Impresa Edile  ")).toBe("Impresa Edile");
      expect(normalizeContractorName("")).toBe("Appaltatore da assegnare");
    });
  });

  describe("createDesktopVoiceKey", () => {
    it("creates composite key from tariff book and voice IDs", () => {
      expect(createDesktopVoiceKey("book_1", "voice_1")).toBe("book_1::voice_1");
    });
  });
});

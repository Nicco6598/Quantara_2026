import { describe, expect, it } from "vitest";
import { isSafetyVoice } from "../../apps/desktop/src/features/sal/domain/sal-safety";

describe("safety voice detection - regression tests", () => {
  it("detects OS code prefix patterns", () => {
    expect(isSafetyVoice({ category: "OS", code: "", description: "" })).toBe(true);
    expect(isSafetyVoice({ code: "OS.001", category: "", description: "" })).toBe(true);
    expect(isSafetyVoice({ code: "OS-001", category: "", description: "" })).toBe(true);
    expect(isSafetyVoice({ code: "OS_001", category: "", description: "" })).toBe(true);
    expect(isSafetyVoice({ code: "OS/001", category: "", description: "" })).toBe(true);
    expect(isSafetyVoice({ code: "OS 001", category: "", description: "" })).toBe(true);
  });

  it("detects safety in description text", () => {
    expect(isSafetyVoice({ category: "", code: "", description: "Oneri per la sicurezza" })).toBe(
      true,
    );
    expect(isSafetyVoice({ category: "", code: "", description: "Costi della sicurezza" })).toBe(
      true,
    );
    expect(
      isSafetyVoice({
        category: "",
        code: "",
        description: "Oneri speciali per la sicurezza",
      }),
    ).toBe(true);
  });

  it("does not flag generic oneri text", () => {
    expect(isSafetyVoice({ category: "", code: "", description: "Oneri di trasporto" })).toBe(
      false,
    );
    expect(
      isSafetyVoice({ category: "", code: "", description: "Oneri fiscali e previdenziali" }),
    ).toBe(false);
    expect(isSafetyVoice({ category: "Opere", code: "01.A01", description: "Scavo" })).toBe(false);
  });

  it("handles null and undefined inputs gracefully", () => {
    expect(isSafetyVoice({})).toBe(false);
    expect(isSafetyVoice({ category: null, code: null, description: null })).toBe(false);
    expect(isSafetyVoice({ category: "OS", code: undefined, description: undefined })).toBe(true);
  });

  it("detects sicurezza phrase in long descriptions", () => {
    expect(
      isSafetyVoice({
        category: "Opere civili",
        code: "NP.OS.001",
        description:
          "Fornitura in opera di dispositivi di sicurezza e segnaletica per la protezione del cantiere",
      }),
    ).toBe(true);
  });
});

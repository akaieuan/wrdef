import { describe, it, expect } from "vitest";
import { pickBlanks } from "@/lib/keywordBlanker";

describe("pickBlanks", () => {
  it("drops words whose candidates are below minimum", () => {
    const result = pickBlanks("To go.", "leave");
    expect(result.ok).toBe(false);
  });

  it("returns blanks for a standard definition", () => {
    const text =
      "A small burrowing mammal with soft fur and a pointed snout.";
    const result = pickBlanks(text, "mouse");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blanks.length).toBeGreaterThanOrEqual(2);
      expect(result.blanks.length).toBeLessThanOrEqual(6);
    }
  });

  it("skips stopwords and short words", () => {
    const text = "A thing which is a very small and tiny cog.";
    // "thing" is in stopwords; "very/small/tiny" may be filtered
    const result = pickBlanks(text, "widget");
    // May or may not pass depending on candidates; just ensure it doesn't pick a stopword.
    if (result.ok) {
      const stopwordish = result.blanks.map((b) => b.answer.toLowerCase());
      expect(stopwordish).not.toContain("thing");
      expect(stopwordish).not.toContain("the");
    }
  });

  it("does not pick words containing the target", () => {
    const text = "A houseboat is a small boat used as a house by people.";
    const result = pickBlanks(text, "house");
    if (result.ok) {
      for (const b of result.blanks) {
        expect(b.answer.toLowerCase()).not.toContain("house");
      }
    }
  });

  it("blanks are sorted by index ascending", () => {
    const text =
      "The ancient building contained numerous valuable ornate relics.";
    const result = pickBlanks(text, "abbey");
    if (result.ok) {
      for (let i = 1; i < result.blanks.length; i++) {
        expect(result.blanks[i].index).toBeGreaterThan(result.blanks[i - 1].index);
      }
    }
  });

  it("blank length matches answer length", () => {
    const text =
      "A tall building with several wide flat rooms and painted ceilings.";
    const result = pickBlanks(text, "tower");
    if (result.ok) {
      for (const b of result.blanks) {
        expect(b.length).toBe(b.answer.length);
      }
    }
  });
});

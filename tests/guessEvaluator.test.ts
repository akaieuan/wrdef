import { describe, it, expect } from "vitest";
import { computeKeyStates, evaluateGuess } from "@/lib/guessEvaluator";

describe("evaluateGuess", () => {
  it("marks exact match all correct", () => {
    expect(evaluateGuess("crane", "crane")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ]);
  });
  it("marks absent letters", () => {
    expect(evaluateGuess("xyzpq", "crane")).toEqual([
      "absent", "absent", "absent", "absent", "absent",
    ]);
  });
  it("marks present for wrong-position letters, correct for shared positions", () => {
    // target crane, guess enarc:
    // pos 0: e (target has e at 4) -> present
    // pos 1: n (target has n at 3) -> present
    // pos 2: a == a -> correct
    // pos 3: r (target has r at 1) -> present
    // pos 4: c (target has c at 0) -> present
    expect(evaluateGuess("enarc", "crane")).toEqual([
      "present", "present", "correct", "present", "present",
    ]);
  });
  it("double-letter edge case: guess 'ALPHA' against 'ALLOW'", () => {
    // target: A L L O W
    // guess:  A L P H A
    // pos 0: A=A correct
    // pos 1: L=L correct
    // pos 2: P in remaining [_,_,L,O,W]? no -> absent
    // pos 3: H? no -> absent
    // pos 4: A? already consumed at pos 0 -> absent
    expect(evaluateGuess("alpha", "allow")).toEqual([
      "correct", "correct", "absent", "absent", "absent",
    ]);
  });
  it("double-letter edge case: guess 'SASSY' against 'GRASS'", () => {
    // target: G R A S S
    // guess:  S A S S Y
    // pos 0: S != G. remaining has 'S' at 3,4. Save present-candidate later.
    // pos 1: A != R. remaining has 'A' at 2.
    // pos 2: S != A. remaining has 'S' at 3,4.
    // pos 3: S == S correct. remove remaining[3].
    // pos 4: Y != S. absent.
    // Second pass (non-correct):
    //   pos 0 S: remaining still has S at 4 -> present, remove.
    //   pos 1 A: remaining has A at 2 -> present.
    //   pos 2 S: remaining S at 4 was just removed -> absent.
    //   pos 4 Y: absent.
    expect(evaluateGuess("sassy", "grass")).toEqual([
      "present", "present", "absent", "correct", "absent",
    ]);
  });
});

describe("computeKeyStates", () => {
  it("empty input", () => {
    expect(computeKeyStates([], [])).toEqual({});
  });
  it("never downgrades a letter's state", () => {
    // Guess 1 sees "S" as absent, guess 2 sees "S" as correct.
    const states = computeKeyStates(
      ["spark", "swish"],
      [
        ["absent", "absent", "absent", "absent", "absent"],
        ["correct", "absent", "absent", "absent", "absent"],
      ],
    );
    expect(states.s).toBe("correct");
  });
  it("upgrades present -> correct", () => {
    const states = computeKeyStates(
      ["trace", "crate"],
      [
        ["absent", "absent", "present", "absent", "absent"],
        ["correct", "absent", "absent", "absent", "absent"],
      ],
    );
    expect(states.c).toBe("correct");
  });
});

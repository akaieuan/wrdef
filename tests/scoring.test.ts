import { describe, it, expect } from "vitest";
import {
  computeScore,
  solvePoints,
  timeBonus,
  bonusKeywordPoints,
} from "@/lib/scoring";

describe("solvePoints", () => {
  it("awards 500 for solving in 1 guess", () => {
    expect(solvePoints(1)).toBe(500);
  });
  it("awards 400/300/200/100 for guesses 2–5", () => {
    expect(solvePoints(2)).toBe(400);
    expect(solvePoints(3)).toBe(300);
    expect(solvePoints(4)).toBe(200);
    expect(solvePoints(5)).toBe(100);
  });
  it("awards 50 for solving on the last guess", () => {
    expect(solvePoints(6)).toBe(50);
  });
  it("clamps out-of-range values", () => {
    expect(solvePoints(0)).toBe(500);
    expect(solvePoints(99)).toBe(50);
  });
});

describe("timeBonus", () => {
  it("gives 60 pts for an instant solve", () => {
    expect(timeBonus(0)).toBe(60);
  });
  it("decreases 1 per second", () => {
    expect(timeBonus(10)).toBe(50);
    expect(timeBonus(30)).toBe(30);
  });
  it("floors at zero", () => {
    expect(timeBonus(60)).toBe(0);
    expect(timeBonus(999)).toBe(0);
  });
});

describe("bonusKeywordPoints", () => {
  it("awards 100 per correct keyword", () => {
    expect(bonusKeywordPoints(0)).toBe(0);
    expect(bonusKeywordPoints(2)).toBe(200);
    expect(bonusKeywordPoints(4)).toBe(400);
  });
});

describe("computeScore", () => {
  it("perfect run (1-guess, instant, all bonus, no hints)", () => {
    const s = computeScore({ guessCount: 1, seconds: 0, bonusCorrect: 4 });
    expect(s).toEqual({ solve: 500, time: 60, bonus: 400, hints: 0, total: 960 });
  });
  it("typical middle-of-the-road round", () => {
    const s = computeScore({ guessCount: 3, seconds: 45, bonusCorrect: 2 });
    expect(s).toEqual({ solve: 300, time: 15, bonus: 200, hints: 0, total: 515 });
  });
  it("hint penalty subtracts from total", () => {
    const s = computeScore({ guessCount: 2, seconds: 30, bonusCorrect: 2, hintCount: 2 });
    // 400 solve + 30 time + 200 bonus - 100 hints = 530
    expect(s.solve).toBe(400);
    expect(s.hints).toBe(100);
    expect(s.total).toBe(530);
  });
  it("total never goes negative", () => {
    const s = computeScore({ guessCount: 6, seconds: 60, bonusCorrect: 0, hintCount: 10 });
    // 50 + 0 + 0 - 500 = -450 → clamped to 0
    expect(s.total).toBe(0);
  });
});

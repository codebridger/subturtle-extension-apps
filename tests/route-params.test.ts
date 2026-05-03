import { describe, it, expect } from "vitest";
import {
  encodeRouteParams,
  decodeRouteParams,
} from "../src/console-crane/route-params";

// Regression test for the documented `btoa` / Latin1-only crash. Anything that
// can appear inside a translation card (Persian, CJK, emoji, accented Latin)
// must round-trip cleanly without InvalidCharacterError. See the comment at
// the top of src/console-crane/route-params.ts for the original incident.
describe("route-params encode/decode round-trip", () => {
  const cases: Array<[string, any]> = [
    ["ASCII", { word: "hello", context: "world" }],
    ["accented Latin", { word: "café", context: "déjà vu" }],
    ["Persian", { word: "سلام", context: "این یک متن است" }],
    [
      "Chinese",
      { word: "你好", context: "这是一段上下文" },
    ],
    ["Japanese", { word: "こんにちは", context: "テスト" }],
    ["emoji", { word: "🐢", context: "👋🏽 hi" }],
    ["mixed", { word: "café 🐢 سلام 你好", context: "mixed" }],
  ];

  it.each(cases)("round-trips %s", (_label, value) => {
    const encoded = encodeRouteParams(value);
    expect(typeof encoded).toBe("string");
    expect(decodeRouteParams(encoded)).toEqual(value);
  });

  it("never throws InvalidCharacterError on non-Latin1 input", () => {
    expect(() =>
      encodeRouteParams({ word: "آزمون", context: "💯 测试" })
    ).not.toThrow();
  });
});

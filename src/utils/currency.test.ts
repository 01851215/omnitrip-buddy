import { describe, it, expect } from "vitest";
import { convertToUSD, SUPPORTED_CURRENCIES } from "./currency";

describe("convertToUSD", () => {
  it("returns the same amount for USD", () => {
    expect(convertToUSD(100, "USD")).toBe(100);
  });

  it("converts EUR to USD using the static rate", () => {
    const result = convertToUSD(100, "EUR");
    expect(result).toBe(108);
  });

  it("converts JPY to USD", () => {
    const result = convertToUSD(10000, "JPY");
    expect(result).toBe(67);
  });

  it("returns the original amount for unknown currencies", () => {
    expect(convertToUSD(50, "XYZ")).toBe(50);
  });

  it("is case-insensitive", () => {
    expect(convertToUSD(100, "eur")).toBe(convertToUSD(100, "EUR"));
  });
});

describe("SUPPORTED_CURRENCIES", () => {
  it("includes common currencies", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
    expect(SUPPORTED_CURRENCIES).toContain("EUR");
    expect(SUPPORTED_CURRENCIES).toContain("GBP");
    expect(SUPPORTED_CURRENCIES).toContain("JPY");
  });
});

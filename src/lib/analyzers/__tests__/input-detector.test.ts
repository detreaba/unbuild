import { describe, it, expect } from "vitest";
import { detectInputType } from "../input-detector";

describe("detectInputType", () => {
  it("detects GitHub repo from URL", () => {
    expect(detectInputType("https://github.com/vercel/next.js")).toBe("github-repo");
  });

  it("detects GitHub repo from owner/repo format", () => {
    expect(detectInputType("vercel/next.js")).toBe("github-repo");
  });

  it("detects website from URL", () => {
    expect(detectInputType("https://stripe.com")).toBe("website");
  });

  it("detects website from domain", () => {
    expect(detectInputType("stripe.com")).toBe("website");
  });

  it("detects product from Amazon URL", () => {
    expect(detectInputType("https://amazon.com/dp/B08N5WRWNW")).toBe("product");
  });

  it("detects product from eBay URL", () => {
    expect(detectInputType("https://ebay.com/itm/123456")).toBe("product");
  });

  it("detects product from product path", () => {
    expect(detectInputType("https://example.com/products/drone-x1")).toBe("product");
  });

  it("detects API spec from swagger URL", () => {
    expect(detectInputType("https://petstore.swagger.io/v2/swagger.json")).toBe("api-spec");
  });

  it("detects API spec from openapi URL", () => {
    expect(detectInputType("https://api.example.com/openapi.yaml")).toBe("api-spec");
  });

  it("detects text from long input", () => {
    const longText = "I want to reverse engineer a drone that has 4 propellers, a flight controller based on STM32, GPS module, and FPV camera system with 5.8GHz transmission.";
    expect(detectInputType(longText)).toBe("text");
  });

  it("returns unknown for short ambiguous input", () => {
    expect(detectInputType("hello")).toBe("unknown");
  });

  it("handles empty input", () => {
    expect(detectInputType("")).toBe("unknown");
  });
});

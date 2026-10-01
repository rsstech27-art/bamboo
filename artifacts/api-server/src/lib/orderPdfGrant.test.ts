import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueOrderPdfGrant, verifyOrderPdfGrant } from "./orderPdfGrant";

describe("order PDF grants", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "vitest-only-order-pdf-secret-not-a-real-credential");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("issues a creation capability scoped to one order", () => {
    const grant = issueOrderPdfGrant(42);
    expect(verifyOrderPdfGrant(grant, 42)).toBe(true);
    expect(verifyOrderPdfGrant(grant, 43)).toBe(false);
    expect(verifyOrderPdfGrant(grant, 42, "/objects/uploads/123")).toBe(false);
  });

  it("binds upload capabilities to both order and exact object path", () => {
    const grant = issueOrderPdfGrant(42, "/objects/uploads/abc");
    expect(verifyOrderPdfGrant(grant, 42, "/objects/uploads/abc")).toBe(true);
    expect(verifyOrderPdfGrant(grant, 43, "/objects/uploads/abc")).toBe(false);
    expect(verifyOrderPdfGrant(grant, 42, "/objects/uploads/other")).toBe(false);
    expect(verifyOrderPdfGrant(grant, 42)).toBe(false);
  });

  it("rejects malformed and tampered signatures", () => {
    const grant = issueOrderPdfGrant(42);
    const [payload, signature] = grant.split(".");
    const tampered = `${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    expect(verifyOrderPdfGrant(undefined, 42)).toBe(false);
    expect(verifyOrderPdfGrant("not-a-token", 42)).toBe(false);
    expect(verifyOrderPdfGrant("x".repeat(2049), 42)).toBe(false);
    expect(verifyOrderPdfGrant(tampered, 42)).toBe(false);
  });

  it("rejects grants after their 30-minute lifetime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2035-01-01T00:00:00.000Z"));
    const grant = issueOrderPdfGrant(42);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(verifyOrderPdfGrant(grant, 42)).toBe(false);
  });
});
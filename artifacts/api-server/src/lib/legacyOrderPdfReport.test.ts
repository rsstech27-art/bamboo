import { describe, expect, it } from "vitest";
import {
  buildLegacyOrderPdfReport,
  parseReferenceSnapshots,
  REFERENCE_TABLES,
  renderLegacyOrderPdfReport,
  type LegacyUploadInventory,
  type ReferenceSnapshot,
} from "./legacyOrderPdfReport";

const now = Date.parse("2025-02-20T12:00:00.000Z");
const uuidA = "12345678-1234-1234-1234-123456789abc";
const uuidB = "87654321-4321-4321-4321-cba987654321";
const pathA = `/objects/uploads/${uuidA}`;
const pathB = `/objects/uploads/${uuidB}`;

function snapshots(
  overrides: Partial<Record<"development" | "production", Partial<ReferenceSnapshot>>> = {},
): ReferenceSnapshot[] {
  return (["development", "production"] as const).map((environment) => ({
    environment,
    capturedAt: new Date(now - 5 * 60 * 1000).toISOString(),
    complete: true,
    scannedTables: [...REFERENCE_TABLES],
    objectPaths: [],
    ...overrides[environment],
  }));
}

function inventory(objectPath = pathA, overrides: Partial<LegacyUploadInventory> = {}): LegacyUploadInventory {
  return {
    objectPath,
    generation: "generation-1",
    sizeBytes: 256,
    timeCreated: "2022-01-01T00:00:00.000Z",
    updated: "2022-01-02T00:00:00.000Z",
    contentType: "application/pdf",
    hasCustomMetadata: true,
    ...overrides,
  };
}

describe("legacy order PDF report", () => {
  it("does not infer ownership from MIME, age, or custom metadata", () => {
    const oldPdfWithCustomMetadata = inventory(pathA);
    const recentWithoutMimeOrCustomMetadata = inventory(pathB, {
      timeCreated: new Date(now - 60_000).toISOString(),
      updated: new Date(now - 30_000).toISOString(),
      contentType: undefined,
      hasCustomMetadata: false,
    });
    const report = buildLegacyOrderPdfReport(
      [oldPdfWithCustomMetadata, recentWithoutMimeOrCustomMetadata],
      snapshots(),
      now,
    );

    expect(report.objects[0]).toMatchObject({
      olderThanRetentionWindow: true,
      contentType: "application/pdf",
      hasCustomMetadata: true,
      ownership: "unverified",
      permissionExpiry: "unverified",
      deletionEligible: false,
    });
    expect(report.objects[1]).toMatchObject({
      olderThanRetentionWindow: false,
      contentType: undefined,
      hasCustomMetadata: false,
      ownership: "unverified",
      permissionExpiry: "unverified",
      deletionEligible: false,
    });
  });

  it("keeps unreferenced uploads unverified and never deletion eligible", () => {
    const report = buildLegacyOrderPdfReport([inventory()], snapshots(), now);

    expect(report.objects[0]).toMatchObject({
      referencedIn: [],
      status: "retain-provenance-unverified",
      ownership: "unverified",
      permissionExpiry: "unverified",
      deletionEligible: false,
    });
    expect(report.summary).toMatchObject({
      unreferencedButUnverified: 1,
      confirmedTemporaryPdfs: 0,
      deletionEligible: 0,
      deleted: 0,
    });
    expect(report.confirmedCandidatePaths).toEqual([]);
    expect(report.deletionPerformed).toBe(false);
  });

  it.each(["development", "production"] as const)(
    "protects a path referenced in %s",
    (environment) => {
      const report = buildLegacyOrderPdfReport(
        [inventory()],
        snapshots({ [environment]: { objectPaths: [pathA] } }),
        now,
      );

      expect(report.objects[0]).toMatchObject({
        referencedIn: [environment],
        status: "retain-referenced",
        ownership: "unverified",
        deletionEligible: false,
      });
      expect(report.summary.referenced).toBe(1);
    },
  );

  it("reports referenced paths that are absent from the storage inventory", () => {
    const report = buildLegacyOrderPdfReport(
      [inventory(pathA)],
      snapshots({ production: { objectPaths: [pathB] } }),
      now,
    );

    expect(report.missingReferencedPaths).toEqual([pathB]);
  });

  it("rejects missing and duplicate-environment snapshots", () => {
    expect(() => parseReferenceSnapshots([])).toThrow(/Both development and production/);
    expect(() => parseReferenceSnapshots(snapshots().slice(0, 1)))
      .toThrow(/Both development and production/);
    expect(() => parseReferenceSnapshots([
      snapshots()[0],
      { ...snapshots()[1], environment: "development" },
    ])).toThrow(/Invalid or incomplete reference snapshot/);
  });

  it("rejects incomplete snapshots and snapshots without all reference tables", () => {
    const valid = snapshots();
    expect(() => parseReferenceSnapshots([
      { ...valid[0], complete: false },
      valid[1],
    ])).toThrow(/Invalid or incomplete reference snapshot/);

    expect(() => parseReferenceSnapshots([
      { ...valid[0], scannedTables: ["orders", "products"] },
      valid[1],
    ])).toThrow(/Invalid or incomplete reference snapshot/);
  });

  it.each([
    ["stale", now - 60 * 60 * 1000 - 1],
    ["future", now + 1],
  ])("rejects %s reference snapshots", (_label, capturedAt) => {
    const captured = snapshots({
      development: { capturedAt: new Date(capturedAt).toISOString() },
    });
    expect(() => buildLegacyOrderPdfReport([], captured, now))
      .toThrow(/Reference snapshots must be less than one hour old/);
  });

  it("strips unrecognized fields from reference snapshot input", () => {
    const input = snapshots().map((snapshot) => ({
      ...snapshot,
      orderDetails: "private customer data",
      signedUrl: "https://storage.example/private?token=secret",
    }));

    const parsed = parseReferenceSnapshots(input);

    expect(parsed).toEqual(snapshots());
    expect(JSON.stringify(parsed)).not.toContain("private customer data");
    expect(JSON.stringify(parsed)).not.toContain("signedUrl");
  });

  it("HTML-escapes malicious metadata values", () => {
    const report = buildLegacyOrderPdfReport([inventory(pathA, {
      updated: `"><img src=x onerror="alert('updated')">`,
      generation: `"><script>alert("generation")</script>`,
      contentType: `<svg onload="alert('mime')">`,
    })], snapshots(), now);

    const html = renderLegacyOrderPdfReport(report);
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(&#39;updated&#39;)&quot;&gt;");
    expect(html).toContain("&lt;script&gt;alert(&quot;generation&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;svg onload=&quot;alert(&#39;mime&#39;)&quot;&gt;");
    expect(html).not.toContain("<script>alert(");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<svg onload=");
  });
});
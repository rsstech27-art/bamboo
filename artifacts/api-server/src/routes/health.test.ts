import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("GET /api/healthz", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("responds 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });

  it("responds 404 outside /api prefix", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(404);
  });

  it("handles JSON bodies without crashing (parser wired)", async () => {
    const res = await request(app)
      .post("/api/healthz")
      .send({ ping: true })
      .set("Content-Type", "application/json");
    // No POST route registered — should be 404, not 500
    expect(res.status).toBe(404);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Request } from "express";
import request from "supertest";

const mocks = vi.hoisted(() => {
  type Row = Record<string, any>;
  const rows = new Map<string, Row>();
  const columns = {
    kind: "profileCatalog.kind",
    article: "profileCatalog.article",
    name: "profileCatalog.name",
    colors: "profileCatalog.colors",
  };

  const clone = (row: Row): Row => ({
    ...row,
    colors: [...row.colors],
    panelThicknessesMm: [...row.panelThicknessesMm],
  });
  const duplicateArticleError = () => {
    const postgresError = Object.assign(new Error("duplicate article"), {
      code: "23505",
      constraint: "profile_catalog_article_unique",
    });
    const drizzleQueryError = Object.assign(new Error("Drizzle query failed"), {
      cause: postgresError,
    });
    return Object.assign(new Error("Database operation failed"), {
      cause: drizzleQueryError,
    });
  };
  const assertArticleAvailable = (kind: string, article: string) => {
    if ([...rows.values()].some((row) => row.kind !== kind && row.article === article)) {
      throw duplicateArticleError();
    }
  };

  const makeDb = () => {
    const insert = () => ({
      values: (values: Row) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (rows.has(values.kind)) return [];
            assertArticleAvailable(values.kind, values.article);
            const now = new Date();
            const row: Row = {
              lengthMm: 3000,
              panelThicknessesMm: [5, 8],
              createdAt: now,
              updatedAt: now,
              ...values,
            };
            rows.set(row.kind, row);
            return [{ kind: row.kind }];
          },
        }),
      }),
    });
    const db = {
      select: () => ({
        from: () => ({
          orderBy: async () => [...rows.values()].map(clone),
        }),
      }),
      update: () => ({
        set: (values: Row) => ({
          where: (condition: any) => ({
            returning: async () => {
              const kind = condition.value as string;
              const existing = rows.get(kind);
              if (!existing) return [];
              assertArticleAvailable(kind, values.article);
              Object.assign(existing, values);
              return [clone(existing)];
            },
          }),
        }),
      }),
      insert,
      transaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
        const before = new Map([...rows.entries()].map(([kind, row]) => [kind, clone(row)]));
        try {
          return await callback(db);
        } catch (error) {
          rows.clear();
          for (const [kind, row] of before) rows.set(kind, row);
          throw error;
        }
      },
    };
    return db;
  };

  return {
    rows,
    columns,
    makeDb,
    reset: () => rows.clear(),
    seed: (row: Row) => rows.set(row.kind, {
      lengthMm: 3000,
      panelThicknessesMm: [5, 8],
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      ...row,
    }),
  };
});

vi.mock("@workspace/db", () => ({ db: mocks.makeDb() }));
vi.mock("@workspace/db/schema", () => ({
  profileCatalogTable: mocks.columns,
}));
vi.mock("drizzle-orm", () => ({
  asc: (column: unknown) => ({ kind: "asc", column }),
  eq: (column: unknown, value: unknown) => ({ kind: "eq", column, value }),
}));

import router from "./profileCatalog";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const access = req.get("x-manager");
    if (access === "read-only") {
      req.session = {
        isManager: true,
        isAdmin: false,
        managerPerms: { products: { canRead: true, canEdit: false, canDelete: false } },
      } as unknown as Request["session"];
    } else if (access === "editor") {
      req.session = {
        isManager: true,
        isAdmin: false,
        managerPerms: { products: { canRead: true, canEdit: true, canDelete: false } },
      } as unknown as Request["session"];
    } else {
      req.session = (access ? { isManager: true, isAdmin: true } : {}) as Request["session"];
    }
    next();
  });
  app.use("/api", router);
  return app;
}

const app = makeApp();
const validUpdate = {
  article: " MC-06 ",
  name: " Соединительный профиль ",
  colors: ["black", "gold"],
};
const row = (kind: string, article: string, name = "Profile") => ({
  kind,
  article,
  name,
  colors: ["black"],
});

describe("profile catalog API", () => {
  beforeEach(() => mocks.reset());

  it("serves the current catalog publicly as an array", async () => {
    mocks.seed(row("light", "DL-01"));
    mocks.seed(row("connector", "MC-06"));

    const response = await request(app).get("/api/profile-catalog");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((profile: { kind: string }) => profile.kind)).toEqual(["connector", "light"]);
    expect(response.body[0]).toMatchObject({
      article: "MC-06",
      lengthMm: 3000,
      panelThicknessesMm: [5, 8],
    });
  });

  it("requires a manager session for edits and official imports", async () => {
    const update = await request(app).put("/api/profile-catalog/connector").send(validUpdate);
    const officialImport = await request(app).post("/api/profile-catalog/import-official");

    expect(update.status).toBe(401);
    expect(officialImport.status).toBe(401);
    expect(mocks.rows.size).toBe(0);
  });

  it("denies read-only managers both profile catalog mutations", async () => {
    const update = await request(app)
      .put("/api/profile-catalog/connector")
      .set("x-manager", "read-only")
      .send(validUpdate);
    const officialImport = await request(app)
      .post("/api/profile-catalog/import-official")
      .set("x-manager", "read-only");

    expect(update.status).toBe(403);
    expect(officialImport.status).toBe(403);
    expect(mocks.rows.size).toBe(0);
  });

  it.each(["admin", "editor"])("%s can update and import profile metadata", async (access) => {
    mocks.seed(row("connector", "MC-06"));

    const update = await request(app)
      .put("/api/profile-catalog/connector")
      .set("x-manager", access)
      .send(validUpdate);
    const officialImport = await request(app)
      .post("/api/profile-catalog/import-official")
      .set("x-manager", access);

    expect(update.status).toBe(200);
    expect(officialImport.status).toBe(200);
    expect(officialImport.body.profiles).toHaveLength(3);
  });

  it("trims and updates editable fields while keeping fixed dimensions", async () => {
    mocks.seed(row("connector", "MC-06"));

    const response = await request(app)
      .put("/api/profile-catalog/connector")
      .set("x-manager", "yes")
      .send(validUpdate);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      article: "MC-06",
      name: "Соединительный профиль",
      colors: ["black", "gold"],
      lengthMm: 3000,
      panelThicknessesMm: [5, 8],
    });
  });

  it.each([
    ["blank article", { ...validUpdate, article: "   " }],
    ["overlong article", { ...validUpdate, article: "a".repeat(101) }],
    ["blank name", { ...validUpdate, name: "  " }],
    ["overlong name", { ...validUpdate, name: "n".repeat(201) }],
    ["empty colors", { ...validUpdate, colors: [] }],
    ["duplicate colors", { ...validUpdate, colors: ["black", "black"] }],
    ["unknown color", { ...validUpdate, colors: ["white"] }],
    ["unsupported light color", { ...validUpdate, colors: ["black", "gold"] }, "light"],
    ["changed length", { ...validUpdate, lengthMm: 2500 }],
    ["changed thicknesses", { ...validUpdate, panelThicknessesMm: [8] }],
    ["attempted price metadata", { ...validUpdate, price: 123 }],
    ["attempted kind change", { ...validUpdate, kind: "gap" }],
  ])("rejects invalid metadata: %s", async (_description, body, kind = "connector") => {
    mocks.seed(row(kind, "MC-06"));

    const response = await request(app)
      .put(`/api/profile-catalog/${kind}`)
      .set("x-manager", "yes")
      .send(body);

    expect(response.status).toBe(400);
    expect(mocks.rows.get(kind)?.article).toBe("MC-06");
  });

  it("returns 409 for a wrapped PostgreSQL article conflict during manager update", async () => {
    mocks.seed(row("connector", "MC-06"));
    mocks.seed(row("gap", "MC-07"));

    const response = await request(app)
      .put("/api/profile-catalog/gap")
      .set("x-manager", "yes")
      .send({ ...validUpdate, article: "MC-06" });

    expect(response.status).toBe(409);
    expect(mocks.rows.get("gap")?.article).toBe("MC-07");
  });

  it("imports missing official rows without overwriting manager metadata", async () => {
    mocks.seed({
      kind: "connector",
      article: "CUSTOM-ARTICLE",
      name: "Manager's connector label",
      colors: ["black", "bronze"],
    });

    const response = await request(app)
      .post("/api/profile-catalog/import-official")
      .set("x-manager", "yes");

    expect(response.status).toBe(200);
    expect(response.body.imported).toBe(2);
    expect(response.body.profiles).toHaveLength(3);
    expect(response.body.profiles[0]).toMatchObject({
      kind: "connector",
      article: "CUSTOM-ARTICLE",
      name: "Manager's connector label",
      colors: ["black", "bronze"],
    });
    expect(response.body.profiles.find((profile: { kind: string }) => profile.kind === "light")).toMatchObject({
      article: "DL-01",
      name: "Соединительный профиль с подсветкой",
      colors: ["black"],
      lengthMm: 3000,
      panelThicknessesMm: [5, 8],
    });
  });

  it("returns 409 and rolls back an import on a wrapped PostgreSQL article conflict", async () => {
    mocks.seed({
      kind: "connector",
      article: "MC-07",
      name: "Existing manager profile",
      colors: ["black"],
    });

    const response = await request(app)
      .post("/api/profile-catalog/import-official")
      .set("x-manager", "yes");

    expect(response.status).toBe(409);
    expect(mocks.rows.size).toBe(1);
    expect(mocks.rows.get("connector")?.article).toBe("MC-07");
  });
});
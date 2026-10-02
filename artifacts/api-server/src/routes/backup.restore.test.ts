import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Request } from "express";
import request from "supertest";
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import unzipper from "unzipper";
import { asc, eq, sql } from "drizzle-orm";
import { productsTable, managerSettingsTable, profileCatalogTable } from "@workspace/db/schema";

const isolation = vi.hoisted(() => ({
  schema: `backup_restore_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
}));

// All route queries use a dedicated PostgreSQL pool whose connections have this
// test schema as their entire search_path; application catalog tables are invisible.
vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const [{ drizzle }, schema] = await Promise.all([
    import("drizzle-orm/node-postgres"),
    import("@workspace/db/schema"),
  ]);
  const Pool = actual.pool.constructor as new (config: {
    connectionString: string;
    options: string;
  }) => typeof actual.pool;
  const isolatedPool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    options: `-c search_path=${isolation.schema}`,
  });
  const isolatedDb = drizzle(isolatedPool, { schema });
  const db = new Proxy(isolatedDb, {
    get(target, property) {
      if (property === "transaction") {
        return (callback: any, ...args: any[]) =>
          target.transaction(async (tx) => {
            await tx.execute(sql`SET LOCAL search_path TO ${sql.identifier(isolation.schema)}`);
            return callback(tx);
          }, ...args);
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { ...actual, db, pool: isolatedPool };
});

import { db, pool } from "@workspace/db";
import profileCatalogRouter from "./profileCatalog";
import backupRouter from "./backup";

type Kind = "connector" | "gap" | "light";
type Profile = {
  kind: Kind;
  article: string;
  name: string;
  colors: string[];
  lengthMm: 3000;
  panelThicknessesMm: [5, 8];
};

const profile = (kind: Kind, article: string, name = `${kind} profile`, colors = ["black"]): Profile => ({
  kind, article, name, colors, lengthMm: 3000, panelThicknessesMm: [5, 8],
});

const initialProfiles = [
  profile("connector", "C-OLD", "Old connector", ["black", "gold"]),
  profile("gap", "G-OLD", "Old gap", ["black", "bronze"]),
  profile("light", "L-OLD", "Old light"),
];

const initialProduct = {
  name: "Oak panel",
  article: "WOOD-1",
  collection: "All Wall",
  series: "Oak",
  cost: 1200,
  photoFile: null,
  photoUrl: null,
  scaleDown: false,
  noMetallicProfile: true,
  kpName: null,
  panelWidthMm: null,
  panelHeightMm: null,
};

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = (req.get("x-manager")
      ? { isManager: true, isAdmin: true }
      : {}) as Request["session"];
    next();
  });
  app.use("/api", profileCatalogRouter, backupRouter);
  return app;
}

const app = makeApp();

async function buildZip(manifest: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on("data", (chunk: Buffer) => chunks.push(chunk));
    sink.on("end", () => resolve(Buffer.concat(chunks)));
    sink.on("error", reject);
    const archive = new ZipArchive({ zlib: { level: 1 } });
    archive.on("error", reject);
    archive.pipe(sink as unknown as NodeJS.WritableStream);
    archive.append(JSON.stringify(manifest), { name: "manifest.json" });
    archive.finalize().catch(reject);
  });
}

async function exportedManifest(zip: Buffer): Promise<Record<string, any>> {
  const directory = await unzipper.Open.buffer(zip);
  const entry = directory.files.find((file) => file.path === "manifest.json");
  if (!entry) throw new Error("Export archive has no manifest.json");
  const chunks: Buffer[] = [];
  for await (const chunk of entry.stream()) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, any>;
}

async function exportZip(): Promise<Buffer> {
  const response = await request(app)
    .get("/api/backup/export")
    .set("x-manager", "yes")
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
  expect(response.status).toBe(200);
  expect(response.headers["content-type"]).toMatch(/application\/zip/);
  return response.body as Buffer;
}

async function importZip(manifest: Record<string, unknown>) {
  const zip = await buildZip(manifest);
  return request(app)
    .post("/api/backup/import")
    .set("x-manager", "yes")
    .set("Content-Type", "application/zip")
    .send(zip);
}

async function readState() {
  const [profiles, products, settings] = await Promise.all([
    db.select().from(profileCatalogTable).orderBy(asc(profileCatalogTable.kind)),
    db.select().from(productsTable).orderBy(asc(productsTable.article)),
    db.select().from(managerSettingsTable).orderBy(asc(managerSettingsTable.key)),
  ]);
  return { profiles, products, settings };
}

async function putProfile(kind: Kind, article: string, name: string, colors: string[]) {
  return request(app)
    .put(`/api/profile-catalog/${kind}`)
    .set("x-manager", "yes")
    .send({ article, name, colors });
}

const emptyManifest = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  products: [],
  settings: {},
  ...overrides,
});

describe("profile catalog backup restore over real PostgreSQL", () => {
  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA "${isolation.schema}"`);
    await pool.query(`
      CREATE TABLE "${isolation.schema}".profile_catalog (
        kind text PRIMARY KEY,
        article text NOT NULL,
        name text NOT NULL,
        colors text[] NOT NULL,
        length_mm integer NOT NULL DEFAULT 3000 CHECK (length_mm = 3000),
        panel_thicknesses_mm integer[] NOT NULL DEFAULT ARRAY[5, 8] CHECK (panel_thicknesses_mm = ARRAY[5, 8]),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT profile_catalog_article_unique UNIQUE (article),
        CONSTRAINT profile_catalog_kind_check CHECK (kind IN ('connector', 'gap', 'light'))
      );
      CREATE TABLE "${isolation.schema}".products (
        id serial PRIMARY KEY,
        category text NOT NULL DEFAULT 'panel',
        name text NOT NULL,
        article text NOT NULL UNIQUE,
        collection text,
        series text,
        cost integer NOT NULL DEFAULT 0,
        photo_url text,
        scale_down boolean NOT NULL DEFAULT false,
        no_metallic_profile boolean NOT NULL DEFAULT true,
        kp_name text,
        panel_width_mm integer,
        panel_height_mm integer,
        color text,
        size text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "${isolation.schema}".manager_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });

  beforeEach(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(productsTable);
      await tx.delete(managerSettingsTable);
      await tx.delete(profileCatalogTable);
      await tx.insert(profileCatalogTable).values(initialProfiles);
      await tx.insert(productsTable).values({
        name: "Oak panel", article: "WOOD-1", collection: "All Wall", series: "Oak", cost: 1200,
      });
      await tx.insert(managerSettingsTable).values([
        { key: "molding_prices", value: { moldingA: 45 } },
        { key: "panel_prices", value: { oak: 300 } },
      ]);
    });
  });

  afterAll(async () => {
    try {
      await pool.query(`DROP SCHEMA IF EXISTS "${isolation.schema}" CASCADE`);
    } finally {
      await pool.end();
    }
  });

  it("exports and restores manager-corrected profile metadata through the authenticated routes", async () => {
    const corrected = {
      article: "C-MANAGER",
      name: "Manager's connector",
      colors: ["black", "gold", "metallic"],
    };
    const update = await putProfile("connector", corrected.article, corrected.name, corrected.colors);
    expect(update.status).toBe(200);

    const zip = await exportZip();
    const manifest = await exportedManifest(zip);
    expect(manifest.version).toBe(1);
    expect(manifest.profileCatalog).toEqual({
      version: 1,
      profiles: [
        { ...initialProfiles[0], ...corrected },
        initialProfiles[1],
        initialProfiles[2],
      ],
    });

    const drift = await putProfile("connector", "C-DRIFT", "Drifted connector", ["black"]);
    expect(drift.status).toBe(200);
    await db.transaction(async (tx) => {
      await tx.update(productsTable).set({ name: "Changed panel", cost: 9999 });
      await tx.update(managerSettingsTable).set({ value: { moldingA: 999 } })
        .where(eq(managerSettingsTable.key, "molding_prices"));
    });

    const restored = await request(app)
      .post("/api/backup/import")
      .set("x-manager", "yes")
      .set("Content-Type", "application/zip")
      .send(zip);
    expect(restored.status).toBe(200);

    const state = await readState();
    expect(state.profiles[0]).toMatchObject(corrected);
    expect(state.profiles[0].lengthMm).toBe(3000);
    expect(state.profiles[0].panelThicknessesMm).toEqual([5, 8]);
    expect(state.products[0]).toMatchObject({ article: "WOOD-1", name: "Oak panel", cost: 1200 });
    expect(state.settings.find((row) => row.key === "molding_prices")?.value).toEqual({ moldingA: 45 });
  });

  it("keeps profiles untouched for a legacy v1 archive without profileCatalog", async () => {
    const before = await readState();
    const response = await importZip(emptyManifest());
    expect(response.status).toBe(200);
    expect((await readState()).profiles).toEqual(before.profiles);
  });

  it("leaves the catalog untouched for an explicit empty profile section", async () => {
    const before = await readState();
    const response = await importZip(emptyManifest({
      profileCatalog: { version: 1, profiles: [] },
    }));
    expect(response.status).toBe(200);
    expect(await readState()).toEqual(before);
  });

  it("restores exported profiles into an empty profile catalog without changing prices", async () => {
    const zip = await exportZip();
    await db.transaction((tx) => tx.delete(profileCatalogTable));
    const before = await readState();
    const response = await request(app)
      .post("/api/backup/import")
      .set("x-manager", "yes")
      .set("Content-Type", "application/zip")
      .send(zip);
    expect(response.status).toBe(200);
    const after = await readState();
    expect(after.profiles).toHaveLength(3);
    after.profiles.forEach((row, index) => expect(row).toMatchObject(initialProfiles[index]!));
    expect(after.products[0].cost).toBe(before.products[0].cost);
    expect(after.settings.map(({ key, value }) => ({ key, value }))).toEqual(
      before.settings.map(({ key, value }) => ({ key, value })),
    );
  });

  it("applies metadata-only imports without changing prices, costs, or omitted profile kinds", async () => {
    const before = await readState();
    const response = await importZip(emptyManifest({
      profileCatalog: {
        version: 1,
        profiles: [profile("connector", "C-METADATA", "Metadata-only connector", ["black", "bronze"])],
      },
    }));
    expect(response.status).toBe(200);
    const after = await readState();
    expect(after.products).toEqual(before.products);
    expect(after.settings).toEqual(before.settings);
    expect(after.profiles.find((row) => row.kind === "connector")).toMatchObject({
      article: "C-METADATA", name: "Metadata-only connector", colors: ["black", "bronze"],
    });
    expect(after.profiles.filter((row) => row.kind !== "connector")).toEqual(
      before.profiles.filter((row) => row.kind !== "connector"),
    );
  });

  it("allows article swaps when every affected profile kind is included", async () => {
    const response = await importZip(emptyManifest({
      profileCatalog: {
        version: 1,
        profiles: [
          profile("connector", "G-OLD", "Swapped connector"),
          profile("gap", "C-OLD", "Swapped gap"),
        ],
      },
    }));
    expect(response.status).toBe(200);
    const profiles = (await readState()).profiles;
    expect(profiles.find((row) => row.kind === "connector")?.article).toBe("G-OLD");
    expect(profiles.find((row) => row.kind === "gap")?.article).toBe("C-OLD");
  });

  it("rejects duplicate profile articles before writing products, settings, or profiles", async () => {
    const before = await readState();
    const response = await importZip(emptyManifest({
      products: [{ ...initialProduct, name: "Must not be written", cost: 8765 }],
      settings: { panel_prices: { oak: 9999 } },
      profileCatalog: {
        version: 1,
        profiles: [
          profile("connector", "DUPLICATE", "Duplicate connector"),
          profile("gap", "DUPLICATE", "Duplicate gap"),
        ],
      },
    }));
    expect(response.status).toBe(400);
    expect(await readState()).toEqual(before);
  });

  it("returns 409 for an article owned by an omitted live kind without any changes", async () => {
    const before = await readState();
    const response = await importZip(emptyManifest({
      products: [{ ...initialProduct, name: "Must not be written", cost: 8765 }],
      settings: { panel_prices: { oak: 9999 } },
      profileCatalog: {
        version: 1,
        profiles: [profile("connector", "G-OLD", "Conflicting connector")],
      },
    }));
    expect(response.status).toBe(409);
    expect(await readState()).toEqual(before);
  });

  it("rolls back earlier catalog writes and profile deletion after a real PostgreSQL failure", async () => {
    await pool.query(`
      CREATE FUNCTION "${isolation.schema}".fail_profile_restore() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.article = 'FAIL-RESTORE' THEN
          RAISE EXCEPTION 'forced profile restore failure';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER fail_profile_restore BEFORE INSERT ON "${isolation.schema}".profile_catalog
      FOR EACH ROW EXECUTE FUNCTION "${isolation.schema}".fail_profile_restore();
    `);
    const before = await readState();

    try {
      const response = await importZip(emptyManifest({
        products: [{ ...initialProduct, name: "Would otherwise update", cost: 5432 }],
        settings: { molding_prices: { moldingA: 1234 } },
        profileCatalog: {
          version: 1,
          profiles: [profile("connector", "FAIL-RESTORE", "Trigger failure")],
        },
      }));
      expect(response.status).toBe(500);
      expect(await readState()).toEqual(before);
    } finally {
      await pool.query(`
        DROP TRIGGER IF EXISTS fail_profile_restore ON "${isolation.schema}".profile_catalog;
        DROP FUNCTION IF EXISTS "${isolation.schema}".fail_profile_restore();
      `);
    }
  });
});
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  buildLegacyOrderPdfReport, parseReferenceSnapshots, renderLegacyOrderPdfReport,
  type LegacyUploadInventory,
} from "../lib/legacyOrderPdfReport";

// No delete flag or delete API exists in this entrypoint. Never import the
// cleanup worker: running this script must not start a reclamation sweep.
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--references" || args[2] !== "--output") {
  throw new Error("Usage: pnpm report:legacy-pdfs --references snapshots.json --output report.html (read-only)");
}
const callerDir = process.env.INIT_CWD ?? process.cwd();
const snapshots = parseReferenceSnapshots(JSON.parse(await readFile(resolve(callerDir, args[1]), "utf8")));
const inventory: LegacyUploadInventory[] = [];
const storage = new ObjectStorageService();
for await (const file of storage.listLegacyUploadInventory()) inventory.push(file);
inventory.sort((a, b) => a.objectPath.localeCompare(b.objectPath));
const report = buildLegacyOrderPdfReport(inventory, snapshots);
const output = resolve(callerDir, args[3]);
if (!output.endsWith(".html")) throw new Error("Output must end in .html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, renderLegacyOrderPdfReport(report));
await writeFile(output.replace(/\.html$/, ".json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report.summary)}\nRead-only report: ${output}\n`);
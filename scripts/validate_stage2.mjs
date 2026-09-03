import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const packageRoot = path.resolve(process.argv[2] ?? ".");
const outputRoot = path.join(packageRoot, "mock_data", "output");
const schemaRoot = path.join(packageRoot, "schemas", "bigquery");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  return rows;
}

const manifest = JSON.parse(await fs.readFile(path.join(outputRoot, "manifest.json"), "utf8"));
const anomalies = JSON.parse(await fs.readFile(path.join(outputRoot, "expected_anomalies.json"), "utf8"));
const tables = {};
const checks = [];

for (const file of manifest.files) {
  const filePath = path.join(outputRoot, ...file.relative_path.split("/"));
  const text = await fs.readFile(filePath, "utf8");
  const parsed = parseCsv(text);
  const [header, ...data] = parsed;
  const schema = JSON.parse(await fs.readFile(path.join(schemaRoot, `${file.entity}.schema.json`), "utf8"));
  const expectedHeader = schema.map((field) => field.name);
  const hash = createHash("sha256").update(text).digest("hex");
  checks.push({ check: `manifest:${file.relative_path}`, passed: data.length === file.row_count && hash === file.sha256 });
  checks.push({ check: `schema:${file.relative_path}`, passed: JSON.stringify(header) === JSON.stringify(expectedHeader) });
  tables[file.entity] ??= [];
  for (const values of data) {
    tables[file.entity].push(Object.fromEntries(header.map((column, index) => [column, values[index] === "NULL" ? null : values[index]])));
  }
}

const byKey = (entity, key, value) => tables[entity].filter((row) => row[key] === value);
const countBy = (entity, key, value) => byKey(entity, key, value).length;
const businessChecks = [
  ["A01", byKey("customers", "customer_id", "CUST-000007").some((row) => row.email === null)],
  ["A02", tables.customers.filter((row) => row.document_id === "SYN-DOC-000042").length === 2],
  ["A03", countBy("customers", "customer_id", "CUST-000010") === 2],
  ["A04", byKey("customers", "customer_id", "CUST-000015").some((row) => row.status === "CHURNED")],
  ["A05", byKey("plants", "plant_id", "PLANT-008").some((row) => Number(row.installed_capacity_kw) < 0)],
  ["A06", byKey("plants", "plant_id", "PLANT-005").some((row) => row.status === "MAINTENANCE")],
  ["A07", byKey("contracts", "contract_id", "CONTRACT-ERR-ORPHAN").some((row) => row.customer_id === "CUST-999999")],
  ["A08", byKey("contracts", "contract_id", "CONTRACT-ERR-DISCOUNT").some((row) => Number(row.discount_rate) > 1)],
  ["A09", byKey("contracts", "contract_id", "CONTRACT-ERR-DATES").some((row) => row.end_date < row.start_date)],
  ["A10", byKey("contracts", "contract_id", "CONTRACT-000010").some((row) => row.status === "CANCELLED")],
  ["A11", countBy("invoices", "invoice_id", "INV-000005") === 2],
  ["A12", countBy("invoices", "invoice_id", "INV-LATE-001") === 1],
  ["A13", byKey("invoices", "invoice_id", "INV-ERR-AMOUNT").some((row) => Math.abs(Number(row.net_amount_brl) - (Number(row.gross_amount_brl) - Number(row.discount_amount_brl))) > 0.01)],
  ["A14", byKey("invoices", "invoice_id", "INV-ERR-PAID").some((row) => row.status === "PAID" && row.paid_at === null)],
  ["A15", countBy("invoices", "invoice_id", anomalies.find((row) => row.anomaly_id === "A15").record_key) === 2],
  ["A16", byKey("generation", "generation_id", "GEN-PLANT-003-2026-08-12").some((row) => Number(row.generated_energy_kwh) < 0)],
  ["A17", byKey("generation", "generation_id", "GEN-PLANT-004-2026-08-17").some((row) => Number(row.availability_rate) > 1)],
  ["A18", countBy("generation", "generation_id", "GEN-PLANT-002-2026-07-20") === 1],
  ["A19", countBy("generation", "generation_id", "GEN-PLANT-001-2026-07-15") === 2],
];

for (const [id, passed] of businessChecks) checks.push({ check: `anomaly:${id}`, passed });

const report = {
  validated_at: new Date().toISOString(),
  files_checked: manifest.files.length,
  rows_checked: Object.values(tables).flat().length,
  anomaly_scenarios_checked: businessChecks.length,
  passed: checks.every((check) => check.passed),
  failures: checks.filter((check) => !check.passed),
};

await fs.writeFile(path.join(outputRoot, "validation_report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;


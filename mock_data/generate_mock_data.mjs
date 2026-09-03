import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || true];
  }),
);

const seed = Number(args.seed ?? 20260903);
const outputRoot = path.resolve(String(args.output ?? "mock_data/output"));
if (outputRoot === path.parse(outputRoot).root || path.basename(outputRoot).toLowerCase() !== "output") {
  throw new Error("Por segurança, --output deve apontar para uma pasta cujo nome final seja 'output'.");
}

function mulberry32(initialSeed) {
  let value = initialSeed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(seed);
const pick = (items) => items[Math.floor(random() * items.length)];
const round = (value, decimals = 2) => Number(value.toFixed(decimals));
const pad = (value, length = 6) => String(value).padStart(length, "0");
const isoDate = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

const batches = {
  initial: {
    id: "batch-20260801-001",
    date: "2026-08-01",
    extractedAt: "2026-08-01T10:00:00Z",
  },
  delta: {
    id: "batch-20260901-001",
    date: "2026-09-01",
    extractedAt: "2026-09-01T10:00:00Z",
  },
};

const headers = {
  customers: [
    "customer_id", "full_name", "document_id", "email", "phone", "city", "state_code",
    "customer_segment", "signup_date", "status", "source_updated_at", "extracted_at", "batch_id",
  ],
  plants: [
    "plant_id", "partner_id", "plant_name", "energy_source", "distributor_code", "city", "state_code",
    "installed_capacity_kw", "commercial_operation_date", "status", "source_updated_at", "extracted_at", "batch_id",
  ],
  contracts: [
    "contract_id", "customer_id", "plant_id", "consumer_unit_id", "distributor_code", "start_date", "end_date",
    "contracted_energy_kwh_month", "discount_rate", "status", "source_updated_at", "extracted_at", "batch_id",
  ],
  invoices: [
    "invoice_id", "contract_id", "reference_month", "issue_date", "due_date", "energy_consumed_kwh",
    "energy_compensated_kwh", "gross_amount_brl", "discount_amount_brl", "net_amount_brl", "status", "paid_at",
    "source_updated_at", "extracted_at", "batch_id",
  ],
  generation: [
    "generation_id", "plant_id", "generation_date", "generated_energy_kwh", "expected_energy_kwh",
    "availability_rate", "measurement_status", "source_updated_at", "extracted_at", "batch_id",
  ],
};

const cities = [
  ["Campinas", "SP", "CPFL"], ["Ribeirao Preto", "SP", "CPFL"], ["Uberlandia", "MG", "CEMIG"],
  ["Belo Horizonte", "MG", "CEMIG"], ["Curitiba", "PR", "COPEL"], ["Londrina", "PR", "COPEL"],
  ["Goiania", "GO", "EQUATORIAL_GO"], ["Campo Grande", "MS", "ENERGISA_MS"],
];
const firstNames = ["Ana", "Bruno", "Camila", "Diego", "Elisa", "Fabio", "Giovana", "Henrique", "Isabela", "Joao"];
const lastNames = ["Almeida", "Barbosa", "Costa", "Dias", "Esteves", "Freitas", "Gomes", "Lima", "Moraes", "Nunes"];

function withMetadata(row, batch, sourceUpdatedAt) {
  return {
    ...row,
    source_updated_at: sourceUpdatedAt,
    extracted_at: batch.extractedAt,
    batch_id: batch.id,
  };
}

const customersInitial = [];
for (let index = 1; index <= 120; index += 1) {
  const [city, state] = cities[(index - 1) % cities.length];
  const documentId = index === 43 ? "SYN-DOC-000042" : `SYN-DOC-${pad(index)}`;
  customersInitial.push(withMetadata({
    customer_id: `CUST-${pad(index)}`,
    full_name: `${pick(firstNames)} ${pick(lastNames)} Mock ${pad(index, 3)}`,
    document_id: documentId,
    email: index === 7 ? null : `cliente${pad(index, 3)}@example.com`,
    phone: index % 19 === 0 ? null : `+55${11 + (index % 78)}9${pad(10000000 + index, 8)}`,
    city,
    state_code: state,
    customer_segment: index % 5 === 0 ? "SMB" : "RESIDENTIAL",
    signup_date: isoDate(addDays(new Date("2025-06-01T00:00:00Z"), index * 2)),
    status: index % 23 === 0 ? "SUSPENDED" : "ACTIVE",
  }, batches.initial, `2026-07-${String(1 + (index % 28)).padStart(2, "0")}T12:00:00Z`));
}

const customersDelta = [
  withMetadata({ ...customersInitial[14], status: "CHURNED" }, batches.delta, "2026-08-18T14:30:00Z"),
  withMetadata({ ...customersInitial[9] }, batches.delta, customersInitial[9].source_updated_at),
  withMetadata({
    customer_id: "CUST-000121", full_name: "Nina Oliveira Mock 121", document_id: "SYN-DOC-000121",
    email: "cliente121@example.com", phone: "+5511990012121", city: "Sao Paulo", state_code: "SP",
    customer_segment: "RESIDENTIAL", signup_date: "2026-07-11", status: "ACTIVE",
  }, batches.delta, "2026-07-11T09:15:00Z"),
];

const plantBlueprints = [
  ["PLANT-001", "PARTNER-001", "Fazenda Aurora", "SOLAR", "CPFL", "Campinas", "SP", 1450, "2023-03-15"],
  ["PLANT-002", "PARTNER-001", "Sitio Horizonte", "SOLAR", "CEMIG", "Uberlandia", "MG", 2100, "2022-11-01"],
  ["PLANT-003", "PARTNER-002", "Parque Ipe", "SOLAR", "COPEL", "Londrina", "PR", 980, "2024-01-20"],
  ["PLANT-004", "PARTNER-003", "Bioenergia Vale", "BIOGAS", "CEMIG", "Belo Horizonte", "MG", 1750, "2023-08-10"],
  ["PLANT-005", "PARTNER-004", "Usina Cerrado", "BIOMASS", "EQUATORIAL_GO", "Goiania", "GO", 3200, "2022-05-05"],
  ["PLANT-006", "PARTNER-005", "Solar Araucaria", "SOLAR", "COPEL", "Curitiba", "PR", 1260, "2024-04-01"],
  ["PLANT-007", "PARTNER-006", "Campo Claro", "SOLAR", "ENERGISA_MS", "Campo Grande", "MS", 1880, "2023-12-12"],
  ["PLANT-008", "PARTNER-007", "Unidade Teste Capacidade", "SOLAR", "CPFL", "Ribeirao Preto", "SP", -500, "2025-02-10"],
];

const plantsInitial = plantBlueprints.map((plant, index) => withMetadata({
  plant_id: plant[0], partner_id: plant[1], plant_name: plant[2], energy_source: plant[3],
  distributor_code: plant[4], city: plant[5], state_code: plant[6], installed_capacity_kw: plant[7],
  commercial_operation_date: plant[8], status: "OPERATING",
}, batches.initial, `2026-07-${String(10 + index).padStart(2, "0")}T08:00:00Z`));

const plantsDelta = [
  withMetadata({ ...plantsInitial[4], status: "MAINTENANCE" }, batches.delta, "2026-08-22T16:00:00Z"),
];

const contractsInitial = [];
for (let index = 1; index <= 150; index += 1) {
  const customerNumber = ((index - 1) % 120) + 1;
  const plantNumber = ((index - 1) % 8) + 1;
  const [, , distributorCode] = cities[(customerNumber - 1) % cities.length];
  contractsInitial.push(withMetadata({
    contract_id: `CONTRACT-${pad(index)}`,
    customer_id: `CUST-${pad(customerNumber)}`,
    plant_id: `PLANT-${String(plantNumber).padStart(3, "0")}`,
    consumer_unit_id: `UC-${distributorCode}-${pad(500000 + index)}`,
    distributor_code: distributorCode,
    start_date: isoDate(addDays(new Date("2025-07-01T00:00:00Z"), index % 180)),
    end_date: null,
    contracted_energy_kwh_month: round(220 + random() * 980, 2),
    discount_rate: round(0.10 + random() * 0.10, 4),
    status: index % 29 === 0 ? "SUSPENDED" : "ACTIVE",
  }, batches.initial, `2026-07-${String(1 + (index % 28)).padStart(2, "0")}T15:00:00Z`));
}

const contractsDelta = [
  withMetadata({ ...contractsInitial[9], status: "CANCELLED", end_date: "2026-08-20" }, batches.delta, "2026-08-20T10:00:00Z"),
  withMetadata({
    contract_id: "CONTRACT-000151", customer_id: "CUST-000121", plant_id: "PLANT-001",
    consumer_unit_id: "UC-CPFL-500151", distributor_code: "CPFL", start_date: "2026-07-12", end_date: null,
    contracted_energy_kwh_month: 420, discount_rate: 0.15, status: "ACTIVE",
  }, batches.delta, "2026-07-12T12:00:00Z"),
  withMetadata({
    contract_id: "CONTRACT-ERR-ORPHAN", customer_id: "CUST-999999", plant_id: "PLANT-002",
    consumer_unit_id: "UC-CEMIG-999901", distributor_code: "CEMIG", start_date: "2026-08-01", end_date: null,
    contracted_energy_kwh_month: 510, discount_rate: 0.14, status: "ACTIVE",
  }, batches.delta, "2026-08-01T11:00:00Z"),
  withMetadata({
    contract_id: "CONTRACT-ERR-DISCOUNT", customer_id: "CUST-000020", plant_id: "PLANT-003",
    consumer_unit_id: "UC-COPEL-999902", distributor_code: "COPEL", start_date: "2026-08-01", end_date: null,
    contracted_energy_kwh_month: 380, discount_rate: 1.2, status: "ACTIVE",
  }, batches.delta, "2026-08-01T11:05:00Z"),
  withMetadata({
    contract_id: "CONTRACT-ERR-DATES", customer_id: "CUST-000021", plant_id: "PLANT-004",
    consumer_unit_id: "UC-CEMIG-999903", distributor_code: "CEMIG", start_date: "2026-08-20", end_date: "2026-08-10",
    contracted_energy_kwh_month: 600, discount_rate: 0.16, status: "CANCELLED",
  }, batches.delta, "2026-08-20T11:10:00Z"),
];

const invoicesInitial = [];
const invoiceById = new Map();
let invoiceSequence = 1;
for (const month of ["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01"]) {
  for (const contract of contractsInitial) {
    const consumed = round(contract.contracted_energy_kwh_month * (0.82 + random() * 0.36), 2);
    const compensated = round(Math.min(consumed, contract.contracted_energy_kwh_month * (0.72 + random() * 0.2)), 2);
    const gross = round(55 + consumed * 0.94, 2);
    const discount = round(gross * contract.discount_rate, 2);
    const status = random() < 0.88 ? "PAID" : "OPEN";
    const invoiceId = `INV-${pad(invoiceSequence)}`;
    const row = withMetadata({
      invoice_id: invoiceId,
      contract_id: contract.contract_id,
      reference_month: month,
      issue_date: isoDate(addDays(new Date(`${month}T00:00:00Z`), 32)),
      due_date: isoDate(addDays(new Date(`${month}T00:00:00Z`), 42)),
      energy_consumed_kwh: consumed,
      energy_compensated_kwh: compensated,
      gross_amount_brl: gross,
      discount_amount_brl: discount,
      net_amount_brl: round(gross - discount, 2),
      status,
      paid_at: status === "PAID" ? `${isoDate(addDays(new Date(`${month}T00:00:00Z`), 39))}T13:00:00Z` : null,
    }, batches.initial, `${isoDate(addDays(new Date(`${month}T00:00:00Z`), 35))}T10:00:00Z`);
    invoicesInitial.push(row);
    invoiceById.set(invoiceId, row);
    invoiceSequence += 1;
  }
}

const invoicesDelta = [];
for (const contract of contractsInitial.filter((row) => row.status === "ACTIVE")) {
  const consumed = round(contract.contracted_energy_kwh_month * (0.82 + random() * 0.36), 2);
  const compensated = round(Math.min(consumed, contract.contracted_energy_kwh_month * (0.72 + random() * 0.2)), 2);
  const gross = round(55 + consumed * 0.94, 2);
  const discount = round(gross * contract.discount_rate, 2);
  const status = random() < 0.55 ? "PAID" : "OPEN";
  invoicesDelta.push(withMetadata({
    invoice_id: `INV-${pad(invoiceSequence)}`,
    contract_id: contract.contract_id,
    reference_month: "2026-08-01",
    issue_date: "2026-09-01",
    due_date: "2026-09-10",
    energy_consumed_kwh: consumed,
    energy_compensated_kwh: compensated,
    gross_amount_brl: gross,
    discount_amount_brl: discount,
    net_amount_brl: round(gross - discount, 2),
    status,
    paid_at: status === "PAID" ? "2026-09-08T13:00:00Z" : null,
  }, batches.delta, "2026-09-01T08:00:00Z"));
  invoiceSequence += 1;
}

const correctedInvoice = invoiceById.get("INV-000005");
invoicesDelta.push(withMetadata({
  ...correctedInvoice,
  energy_consumed_kwh: round(correctedInvoice.energy_consumed_kwh + 18.5, 2),
  gross_amount_brl: round(correctedInvoice.gross_amount_brl + 17.39, 2),
  discount_amount_brl: round((correctedInvoice.gross_amount_brl + 17.39) * 0.15, 2),
  net_amount_brl: round((correctedInvoice.gross_amount_brl + 17.39) * 0.85, 2),
}, batches.delta, "2026-08-29T17:45:00Z"));

invoicesDelta.push(withMetadata({
  invoice_id: "INV-LATE-001", contract_id: "CONTRACT-000151", reference_month: "2026-07-01",
  issue_date: "2026-08-02", due_date: "2026-08-12", energy_consumed_kwh: 410,
  energy_compensated_kwh: 350, gross_amount_brl: 440.4, discount_amount_brl: 66.06,
  net_amount_brl: 374.34, status: "PAID", paid_at: "2026-08-10T14:00:00Z",
}, batches.delta, "2026-08-31T19:00:00Z"));

invoicesDelta.push(withMetadata({
  invoice_id: "INV-ERR-AMOUNT", contract_id: "CONTRACT-000020", reference_month: "2026-08-01",
  issue_date: "2026-09-01", due_date: "2026-09-10", energy_consumed_kwh: 520,
  energy_compensated_kwh: 450, gross_amount_brl: 543.8, discount_amount_brl: 81.57,
  net_amount_brl: 499.99, status: "OPEN", paid_at: null,
}, batches.delta, "2026-09-01T08:05:00Z"));

invoicesDelta.push(withMetadata({
  invoice_id: "INV-ERR-PAID", contract_id: "CONTRACT-000021", reference_month: "2026-08-01",
  issue_date: "2026-09-01", due_date: "2026-09-10", energy_consumed_kwh: 610,
  energy_compensated_kwh: 530, gross_amount_brl: 628.4, discount_amount_brl: 94.26,
  net_amount_brl: 534.14, status: "PAID", paid_at: null,
}, batches.delta, "2026-09-01T08:10:00Z"));

invoicesDelta.push({ ...invoicesDelta[0] });

const generationInitial = [];
const generationById = new Map();
for (let cursor = new Date("2026-03-01T00:00:00Z"); cursor <= new Date("2026-07-31T00:00:00Z"); cursor = addDays(cursor, 1)) {
  for (const plant of plantsInitial) {
    const generationId = `GEN-${plant.plant_id}-${isoDate(cursor)}`;
    if (generationId === "GEN-PLANT-002-2026-07-20") continue;
    const capacity = Math.abs(plant.installed_capacity_kw);
    const expected = round(capacity * (plant.energy_source === "SOLAR" ? 4.4 : 6.2), 2);
    const availability = round(0.91 + random() * 0.085, 4);
    const generated = round(expected * availability * (0.88 + random() * 0.18), 2);
    const row = withMetadata({
      generation_id: generationId,
      plant_id: plant.plant_id,
      generation_date: isoDate(cursor),
      generated_energy_kwh: generated,
      expected_energy_kwh: expected,
      availability_rate: availability,
      measurement_status: "FINAL",
    }, batches.initial, `${isoDate(addDays(cursor, 1))}T06:00:00Z`);
    generationInitial.push(row);
    generationById.set(generationId, row);
  }
}

const generationDelta = [];
for (let cursor = new Date("2026-08-01T00:00:00Z"); cursor <= new Date("2026-08-31T00:00:00Z"); cursor = addDays(cursor, 1)) {
  for (const plant of plantsInitial) {
    const capacity = Math.abs(plant.installed_capacity_kw);
    const expected = round(capacity * (plant.energy_source === "SOLAR" ? 4.4 : 6.2), 2);
    const availability = round(0.91 + random() * 0.085, 4);
    let generated = round(expected * availability * (0.88 + random() * 0.18), 2);
    let adjustedAvailability = availability;
    const generationId = `GEN-${plant.plant_id}-${isoDate(cursor)}`;
    if (generationId === "GEN-PLANT-003-2026-08-12") generated = -125.5;
    if (generationId === "GEN-PLANT-004-2026-08-17") adjustedAvailability = 1.15;
    generationDelta.push(withMetadata({
      generation_id: generationId,
      plant_id: plant.plant_id,
      generation_date: isoDate(cursor),
      generated_energy_kwh: generated,
      expected_energy_kwh: expected,
      availability_rate: adjustedAvailability,
      measurement_status: "FINAL",
    }, batches.delta, `${isoDate(addDays(cursor, 1))}T06:00:00Z`));
  }
}

generationDelta.push(withMetadata({
  generation_id: "GEN-PLANT-002-2026-07-20", plant_id: "PLANT-002", generation_date: "2026-07-20",
  generated_energy_kwh: 8421.75, expected_energy_kwh: 9240, availability_rate: 0.976,
  measurement_status: "FINAL",
}, batches.delta, "2026-08-31T23:30:00Z"));

const correctedGeneration = generationById.get("GEN-PLANT-001-2026-07-15");
generationDelta.push(withMetadata({
  ...correctedGeneration,
  generated_energy_kwh: round(correctedGeneration.generated_energy_kwh * 1.04, 2),
  measurement_status: "CORRECTED",
}, batches.delta, "2026-08-30T21:00:00Z"));

const datasets = [
  ["customers", batches.initial, customersInitial], ["customers", batches.delta, customersDelta],
  ["plants", batches.initial, plantsInitial], ["plants", batches.delta, plantsDelta],
  ["contracts", batches.initial, contractsInitial], ["contracts", batches.delta, contractsDelta],
  ["invoices", batches.initial, invoicesInitial], ["invoices", batches.delta, invoicesDelta],
  ["generation", batches.initial, generationInitial], ["generation", batches.delta, generationDelta],
];

const anomalyCatalog = [
  { anomaly_id: "A01", entity: "customers", record_key: "CUST-000007", anomaly_type: "NULL_BUSINESS_FIELD", severity: "WARN", expected_detection: "email IS NULL", expected_action: "Preservar na Raw e sinalizar na Silver", batch_id: batches.initial.id },
  { anomaly_id: "A02", entity: "customers", record_key: "CUST-000043", anomaly_type: "DUPLICATE_NATURAL_KEY", severity: "ERROR", expected_detection: "document_id duplicado com CUST-000042", expected_action: "Quarentena da versão conflitante", batch_id: batches.initial.id },
  { anomaly_id: "A03", entity: "customers", record_key: "CUST-000010", anomaly_type: "EXACT_DUPLICATE_ACROSS_BATCH", severity: "INFO", expected_detection: "mesma PK e source_updated_at", expected_action: "Deduplicar por PK e metadados", batch_id: batches.delta.id },
  { anomaly_id: "A04", entity: "customers", record_key: "CUST-000015", anomaly_type: "STATUS_CHANGE", severity: "INFO", expected_detection: "ACTIVE para CHURNED", expected_action: "Manter versão mais recente", batch_id: batches.delta.id },
  { anomaly_id: "A05", entity: "plants", record_key: "PLANT-008", anomaly_type: "INVALID_NEGATIVE_CAPACITY", severity: "ERROR", expected_detection: "installed_capacity_kw <= 0", expected_action: "Quarentena", batch_id: batches.initial.id },
  { anomaly_id: "A06", entity: "plants", record_key: "PLANT-005", anomaly_type: "STATUS_CHANGE", severity: "INFO", expected_detection: "OPERATING para MAINTENANCE", expected_action: "Manter versão mais recente", batch_id: batches.delta.id },
  { anomaly_id: "A07", entity: "contracts", record_key: "CONTRACT-ERR-ORPHAN", anomaly_type: "ORPHAN_FOREIGN_KEY", severity: "ERROR", expected_detection: "customer_id inexistente", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A08", entity: "contracts", record_key: "CONTRACT-ERR-DISCOUNT", anomaly_type: "OUT_OF_RANGE", severity: "ERROR", expected_detection: "discount_rate fora de 0 a 1", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A09", entity: "contracts", record_key: "CONTRACT-ERR-DATES", anomaly_type: "INVALID_DATE_ORDER", severity: "ERROR", expected_detection: "end_date anterior a start_date", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A10", entity: "contracts", record_key: "CONTRACT-000010", anomaly_type: "STATUS_CHANGE", severity: "INFO", expected_detection: "ACTIVE para CANCELLED", expected_action: "Manter versão mais recente", batch_id: batches.delta.id },
  { anomaly_id: "A11", entity: "invoices", record_key: "INV-000005", anomaly_type: "LATE_CORRECTION", severity: "INFO", expected_detection: "PK repetida com source_updated_at mais novo", expected_action: "Deduplicar por source_updated_at DESC", batch_id: batches.delta.id },
  { anomaly_id: "A12", entity: "invoices", record_key: "INV-LATE-001", anomaly_type: "LATE_ARRIVING", severity: "INFO", expected_detection: "reference_month anterior ao batch", expected_action: "Reprocessar partição afetada", batch_id: batches.delta.id },
  { anomaly_id: "A13", entity: "invoices", record_key: "INV-ERR-AMOUNT", anomaly_type: "ARITHMETIC_MISMATCH", severity: "ERROR", expected_detection: "net != gross - discount", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A14", entity: "invoices", record_key: "INV-ERR-PAID", anomaly_type: "CONDITIONAL_NULL", severity: "ERROR", expected_detection: "status PAID sem paid_at", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A15", entity: "invoices", record_key: invoicesDelta[0].invoice_id, anomaly_type: "EXACT_DUPLICATE_SAME_BATCH", severity: "INFO", expected_detection: "linha identica repetida", expected_action: "Deduplicar", batch_id: batches.delta.id },
  { anomaly_id: "A16", entity: "generation", record_key: "GEN-PLANT-003-2026-08-12", anomaly_type: "NEGATIVE_MEASUREMENT", severity: "ERROR", expected_detection: "generated_energy_kwh < 0", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A17", entity: "generation", record_key: "GEN-PLANT-004-2026-08-17", anomaly_type: "OUT_OF_RANGE", severity: "ERROR", expected_detection: "availability_rate > 1", expected_action: "Quarentena", batch_id: batches.delta.id },
  { anomaly_id: "A18", entity: "generation", record_key: "GEN-PLANT-002-2026-07-20", anomaly_type: "LATE_ARRIVING", severity: "INFO", expected_detection: "generation_date 42 dias antes da extracao", expected_action: "Reprocessar partição afetada", batch_id: batches.delta.id },
  { anomaly_id: "A19", entity: "generation", record_key: "GEN-PLANT-001-2026-07-15", anomaly_type: "LATE_CORRECTION", severity: "INFO", expected_detection: "PK repetida com source_updated_at mais novo", expected_action: "Deduplicar por source_updated_at DESC", batch_id: batches.delta.id },
];

function csvEscape(value) {
  if (value === null || value === undefined) return "NULL";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(columns, rows) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });

const manifestFiles = [];
for (const [entity, batch, rows] of datasets) {
  const relativePath = `${entity}/batch_date=${batch.date}/${entity}_${batch.id}.csv`;
  const filePath = path.join(outputRoot, ...relativePath.split("/"));
  const csv = toCsv(headers[entity], rows);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, csv, "utf8");
  manifestFiles.push({
    entity,
    batch_id: batch.id,
    batch_date: batch.date,
    relative_path: relativePath,
    row_count: rows.length,
    sha256: createHash("sha256").update(csv).digest("hex"),
  });
}

await writeJson(path.join(outputRoot, "manifest.json"), {
  dataset: "energy_analytics_synthetic",
  generated_at: "2026-09-03T12:00:00Z",
  seed,
  null_marker: "NULL",
  files: manifestFiles,
});
await writeJson(path.join(outputRoot, "expected_anomalies.json"), anomalyCatalog);
await writeJson(path.join(outputRoot, "generation_summary.json"), {
  seed,
  batches,
  total_files: manifestFiles.length,
  total_rows: manifestFiles.reduce((sum, file) => sum + file.row_count, 0),
  anomaly_count: anomalyCatalog.length,
  note: "Synthetic data only. Names, identifiers and contacts are fictitious.",
});

console.log(JSON.stringify({ outputRoot, files: manifestFiles.length, rows: manifestFiles.reduce((sum, file) => sum + file.row_count, 0), anomalies: anomalyCatalog.length }, null, 2));

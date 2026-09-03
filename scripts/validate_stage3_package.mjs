import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

const requiredFiles = [
  "definitions/silver/intermediate/int_customers_classified.sqlx",
  "definitions/silver/intermediate/int_plants_classified.sqlx",
  "definitions/silver/intermediate/int_contracts_classified.sqlx",
  "definitions/silver/intermediate/int_invoices_classified.sqlx",
  "definitions/silver/intermediate/int_generation_classified.sqlx",
  "definitions/silver/curated/silver_customers.sqlx",
  "definitions/silver/curated/silver_plants.sqlx",
  "definitions/silver/curated/silver_contracts.sqlx",
  "definitions/silver/curated/silver_invoices.sqlx",
  "definitions/silver/curated/silver_generation.sqlx",
  "definitions/silver/quarantine/quarantine_customers.sqlx",
  "definitions/silver/quarantine/quarantine_plants.sqlx",
  "definitions/silver/quarantine/quarantine_contracts.sqlx",
  "definitions/silver/quarantine/quarantine_invoices.sqlx",
  "definitions/silver/quarantine/quarantine_generation.sqlx",
  "definitions/assertions/assert_silver_contracts_customer_fk.sqlx",
  "definitions/assertions/assert_silver_contracts_plant_fk.sqlx",
  "definitions/assertions/assert_silver_invoices_contract_fk.sqlx",
  "definitions/assertions/assert_silver_generation_plant_fk.sqlx",
  "definitions/assertions/assert_expected_controlled_errors.sqlx",
  "scripts/validate_stage3_package.mjs",
  "validation/expected_counts.json",
  "validation/01_validate_counts.sql",
  "validation/02_validate_dedup_and_updates.sql",
  "validation/03_inspect_quarantine.sql",
  "ETAPA_3.md",
  "README_STAGE3.md",
  "stage3_manifest.json"
];

const knownActions = new Set([
  "customers",
  "plants",
  "contracts",
  "invoices",
  "generation",
  "int_customers_classified",
  "int_plants_classified",
  "int_contracts_classified",
  "int_invoices_classified",
  "int_generation_classified",
  "silver_customers",
  "silver_plants",
  "silver_contracts",
  "silver_invoices",
  "silver_generation",
  "quarantine_customers",
  "quarantine_plants",
  "quarantine_contracts",
  "quarantine_invoices",
  "quarantine_generation"
]);

const failures = [];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Arquivo ausente: ${relativePath}`);
  }
}

const sqlxFiles = requiredFiles.filter((file) => file.endsWith(".sqlx"));
for (const relativePath of sqlxFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;

  const content = fs.readFileSync(absolutePath, "utf8");
  if (!content.includes("config {")) {
    failures.push(`Bloco config ausente: ${relativePath}`);
  }
  if (content.includes("__PROJECT_ID__") || content.includes("TODO")) {
    failures.push(`Placeholder não resolvido: ${relativePath}`);
  }

  const refs = [...content.matchAll(/\$\{ref\("([^"]+)"\)\}/g)].map((match) => match[1]);
  for (const refName of refs) {
    if (!knownActions.has(refName)) {
      failures.push(`Referência desconhecida ${refName} em ${relativePath}`);
    }
  }

  const openingBraces = (content.match(/{/g) || []).length;
  const closingBraces = (content.match(/}/g) || []).length;
  const openingParentheses = (content.match(/\(/g) || []).length;
  const closingParentheses = (content.match(/\)/g) || []).length;
  if (openingBraces !== closingBraces) {
    failures.push(`Chaves desbalanceadas: ${relativePath}`);
  }
  if (openingParentheses !== closingParentheses) {
    failures.push(`Parênteses desbalanceados: ${relativePath}`);
  }
}

const expectedCountsPath = path.join(root, "validation", "expected_counts.json");
if (fs.existsSync(expectedCountsPath)) {
  try {
    JSON.parse(fs.readFileSync(expectedCountsPath, "utf8"));
  } catch (error) {
    failures.push(`JSON inválido em validation/expected_counts.json: ${error.message}`);
  }
}

const manifestPath = path.join(root, "stage3_manifest.json");
if (fs.existsSync(manifestPath)) {
  try {
    JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    failures.push(`JSON inválido em stage3_manifest.json: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error("Falha na validação estrutural da Etapa 3:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Validação estrutural da Etapa 3 concluída.");
console.log(`Arquivos obrigatórios: ${requiredFiles.length}`);
console.log(`Ações SQLX verificadas: ${sqlxFiles.length}`);
console.log("Referências Dataform: válidas.");
console.log("Placeholders pendentes: nenhum.");

SELECT
  "customers" AS entity,
  customer_id AS record_key,
  ARRAY_TO_STRING(quality_error_codes, ", ") AS rejection_reasons
FROM `energy-analytics-lemon-lab.energy_silver.quarantine_customers`
UNION ALL
SELECT
  "plants",
  plant_id,
  ARRAY_TO_STRING(quality_error_codes, ", ")
FROM `energy-analytics-lemon-lab.energy_silver.quarantine_plants`
UNION ALL
SELECT
  "contracts",
  contract_id,
  ARRAY_TO_STRING(quality_error_codes, ", ")
FROM `energy-analytics-lemon-lab.energy_silver.quarantine_contracts`
UNION ALL
SELECT
  "invoices",
  invoice_id,
  ARRAY_TO_STRING(quality_error_codes, ", ")
FROM `energy-analytics-lemon-lab.energy_silver.quarantine_invoices`
UNION ALL
SELECT
  "generation",
  generation_id,
  ARRAY_TO_STRING(quality_error_codes, ", ")
FROM `energy-analytics-lemon-lab.energy_silver.quarantine_generation`
ORDER BY entity, record_key

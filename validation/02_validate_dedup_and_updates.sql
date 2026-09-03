WITH checks AS (
  SELECT
    "customer_exact_duplicate_removed" AS check_name,
    CAST((SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_customers` WHERE customer_id = "CUST-000010") AS STRING) AS actual_value,
    "1" AS expected_value
  UNION ALL
  SELECT
    "customer_status_change_kept",
    (SELECT status FROM `energy-analytics-lemon-lab.energy_silver.silver_customers` WHERE customer_id = "CUST-000015"),
    "CHURNED"
  UNION ALL
  SELECT
    "plant_status_change_kept",
    (SELECT status FROM `energy-analytics-lemon-lab.energy_silver.silver_plants` WHERE plant_id = "PLANT-005"),
    "MAINTENANCE"
  UNION ALL
  SELECT
    "contract_status_change_kept",
    (SELECT status FROM `energy-analytics-lemon-lab.energy_silver.silver_contracts` WHERE contract_id = "CONTRACT-000010"),
    "CANCELLED"
  UNION ALL
  SELECT
    "invoice_late_correction_kept",
    CAST((SELECT net_amount_brl FROM `energy-analytics-lemon-lab.energy_silver.silver_invoices` WHERE invoice_id = "INV-000005") AS STRING),
    "511.33"
  UNION ALL
  SELECT
    "invoice_exact_duplicate_removed",
    CAST((SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_invoices` WHERE invoice_id = "INV-000751") AS STRING),
    "1"
  UNION ALL
  SELECT
    "late_invoice_preserved",
    CAST((SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_invoices` WHERE invoice_id = "INV-LATE-001") AS STRING),
    "1"
  UNION ALL
  SELECT
    "generation_late_correction_kept",
    CAST((SELECT generated_energy_kwh FROM `energy-analytics-lemon-lab.energy_silver.silver_generation` WHERE generation_id = "GEN-PLANT-001-2026-07-15") AS STRING),
    "5614.12"
  UNION ALL
  SELECT
    "late_generation_preserved",
    CAST((SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_generation` WHERE generation_id = "GEN-PLANT-002-2026-07-20") AS STRING),
    "1"
  UNION ALL
  SELECT
    "customer_warning_preserved",
    CAST((SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_customers` WHERE customer_id = "CUST-000007" AND "EMAIL_MISSING" IN UNNEST(quality_warning_codes)) AS STRING),
    "1"
)

SELECT
  check_name,
  expected_value,
  actual_value,
  actual_value = expected_value AS passed
FROM checks
ORDER BY check_name

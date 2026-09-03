WITH checks AS (
  SELECT "silver_customers" AS object_name, 120 AS expected_rows,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_customers`) AS actual_rows
  UNION ALL
  SELECT "silver_plants", 7,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_plants`)
  UNION ALL
  SELECT "silver_contracts", 132,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_contracts`)
  UNION ALL
  SELECT "silver_invoices", 782,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_invoices`)
  UNION ALL
  SELECT "silver_generation", 1286,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.silver_generation`)
  UNION ALL
  SELECT "quarantine_customers", 1,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.quarantine_customers`)
  UNION ALL
  SELECT "quarantine_plants", 1,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.quarantine_plants`)
  UNION ALL
  SELECT "quarantine_contracts", 22,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.quarantine_contracts`)
  UNION ALL
  SELECT "quarantine_invoices", 116,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.quarantine_invoices`)
  UNION ALL
  SELECT "quarantine_generation", 186,
    (SELECT COUNT(*) FROM `energy-analytics-lemon-lab.energy_silver.quarantine_generation`)
)

SELECT
  object_name,
  expected_rows,
  actual_rows,
  actual_rows = expected_rows AS passed
FROM checks
ORDER BY object_name

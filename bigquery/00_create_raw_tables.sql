-- Substitua __PROJECT_ID__ pelo ID real do projeto antes de executar no BigQuery.
-- A camada Raw é append-only: duplicatas e correções são preservadas para tratamento na Silver.

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.energy_raw.customers` (
  customer_id STRING, full_name STRING, document_id STRING, email STRING, phone STRING,
  city STRING, state_code STRING, customer_segment STRING, signup_date DATE, status STRING,
  source_updated_at TIMESTAMP, extracted_at TIMESTAMP, batch_id STRING
)
PARTITION BY DATE(extracted_at)
CLUSTER BY customer_id, status
OPTIONS(description = 'Raw append-only de clientes sintéticos.');

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.energy_raw.plants` (
  plant_id STRING, partner_id STRING, plant_name STRING, energy_source STRING, distributor_code STRING,
  city STRING, state_code STRING, installed_capacity_kw NUMERIC, commercial_operation_date DATE, status STRING,
  source_updated_at TIMESTAMP, extracted_at TIMESTAMP, batch_id STRING
)
PARTITION BY DATE(extracted_at)
CLUSTER BY plant_id, status
OPTIONS(description = 'Raw append-only de usinas parceiras sintéticas.');

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.energy_raw.contracts` (
  contract_id STRING, customer_id STRING, plant_id STRING, consumer_unit_id STRING, distributor_code STRING,
  start_date DATE, end_date DATE, contracted_energy_kwh_month NUMERIC, discount_rate NUMERIC, status STRING,
  source_updated_at TIMESTAMP, extracted_at TIMESTAMP, batch_id STRING
)
PARTITION BY DATE(extracted_at)
CLUSTER BY contract_id, customer_id, plant_id
OPTIONS(description = 'Raw append-only de contratos sintéticos.');

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.energy_raw.invoices` (
  invoice_id STRING, contract_id STRING, reference_month DATE, issue_date DATE, due_date DATE,
  energy_consumed_kwh NUMERIC, energy_compensated_kwh NUMERIC, gross_amount_brl NUMERIC,
  discount_amount_brl NUMERIC, net_amount_brl NUMERIC, status STRING, paid_at TIMESTAMP,
  source_updated_at TIMESTAMP, extracted_at TIMESTAMP, batch_id STRING
)
PARTITION BY reference_month
CLUSTER BY contract_id, status
OPTIONS(description = 'Raw append-only de faturas sintéticas.');

CREATE TABLE IF NOT EXISTS `__PROJECT_ID__.energy_raw.generation` (
  generation_id STRING, plant_id STRING, generation_date DATE, generated_energy_kwh NUMERIC,
  expected_energy_kwh NUMERIC, availability_rate NUMERIC, measurement_status STRING,
  source_updated_at TIMESTAMP, extracted_at TIMESTAMP, batch_id STRING
)
PARTITION BY generation_date
CLUSTER BY plant_id, measurement_status
OPTIONS(description = 'Raw append-only de geração diária sintética.');


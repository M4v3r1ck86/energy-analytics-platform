param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$BucketName,

  [string]$Location = "southamerica-east1",
  [string]$Dataset = "energy_raw"
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $packageRoot "mock_data\output"
$schemaRoot = Join-Path $packageRoot "schemas\bigquery"

if (-not (Test-Path $dataRoot)) {
  throw "Dados não encontrados em $dataRoot. Execute antes: node mock_data/generate_mock_data.mjs"
}

$entities = @(
  @{ Name = "customers"; Partition = "extracted_at"; Cluster = "customer_id,status" },
  @{ Name = "plants"; Partition = "extracted_at"; Cluster = "plant_id,status" },
  @{ Name = "contracts"; Partition = "extracted_at"; Cluster = "contract_id,customer_id,plant_id" },
  @{ Name = "invoices"; Partition = "reference_month"; Cluster = "contract_id,status" },
  @{ Name = "generation"; Partition = "generation_date"; Cluster = "plant_id,measurement_status" }
)

Write-Host "Enviando arquivos para gs://$BucketName/landing/"
foreach ($entity in $entities) {
  $entityPath = Join-Path $dataRoot $entity.Name
  gcloud storage cp --recursive $entityPath "gs://$BucketName/landing/"
  if ($LASTEXITCODE -ne 0) { throw "Falha no upload de $($entity.Name) para o GCS." }
}
gcloud storage cp `
  (Join-Path $dataRoot "manifest.json") `
  (Join-Path $dataRoot "expected_anomalies.json") `
  (Join-Path $dataRoot "validation_report.json") `
  "gs://$BucketName/landing/_metadata/"
if ($LASTEXITCODE -ne 0) { throw "Falha no upload dos metadados para o GCS." }

foreach ($entity in $entities) {
  $name = $entity.Name
  $table = "${ProjectId}:${Dataset}.${name}"
  $schema = Join-Path $schemaRoot "$name.schema.json"

  bq --location=$Location show $table *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Criando $table"
    bq --location=$Location mk --table `
      --time_partitioning_type=DAY `
      --time_partitioning_field=$($entity.Partition) `
      --clustering_fields=$($entity.Cluster) `
      $table $schema
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar $table." }
  }

  Write-Host "Carregando $name"
  bq --location=$Location load `
    --noreplace `
    --source_format=CSV `
    --skip_leading_rows=1 `
    --null_marker=NULL `
    $table `
    "gs://$BucketName/landing/$name/*.csv"
  if ($LASTEXITCODE -ne 0) { throw "Falha ao carregar $name." }
}

Write-Host "Carga concluída. Não execute novamente sobre as mesmas tabelas: a Raw é append-only e a recarga duplicaria os lotes."

#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: bash scripts/upload_and_load.sh PROJECT_ID BUCKET_NAME [LOCATION] [DATASET]"
  exit 1
fi

PROJECT_ID="$1"
BUCKET_NAME="$2"
LOCATION="${3:-southamerica-east1}"
DATASET="${4:-energy_raw}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_ROOT="$PACKAGE_ROOT/mock_data/output"
SCHEMA_ROOT="$PACKAGE_ROOT/schemas/bigquery"

if [[ ! -d "$DATA_ROOT" ]]; then
  echo "Dados não encontrados em $DATA_ROOT."
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null

if ! gcloud storage buckets describe "gs://$BUCKET_NAME" >/dev/null 2>&1; then
  echo "Criando bucket gs://$BUCKET_NAME em $LOCATION"
  gcloud storage buckets create "gs://$BUCKET_NAME" \
    --location="$LOCATION" \
    --uniform-bucket-level-access
fi

entities=(customers plants contracts invoices generation)
for entity in "${entities[@]}"; do
  echo "Enviando $entity para o Cloud Storage"
  gcloud storage cp --recursive "$DATA_ROOT/$entity" "gs://$BUCKET_NAME/landing/"
done

gcloud storage cp \
  "$DATA_ROOT/manifest.json" \
  "$DATA_ROOT/expected_anomalies.json" \
  "$DATA_ROOT/validation_report.json" \
  "gs://$BUCKET_NAME/landing/_metadata/"

declare -A partitions=(
  [customers]="extracted_at"
  [plants]="extracted_at"
  [contracts]="extracted_at"
  [invoices]="reference_month"
  [generation]="generation_date"
)

declare -A clusters=(
  [customers]="customer_id,status"
  [plants]="plant_id,status"
  [contracts]="contract_id,customer_id,plant_id"
  [invoices]="contract_id,status"
  [generation]="plant_id,measurement_status"
)

for entity in "${entities[@]}"; do
  table="$PROJECT_ID:$DATASET.$entity"

  if ! bq --location="$LOCATION" show "$table" >/dev/null 2>&1; then
    echo "Criando $table"
    bq --location="$LOCATION" mk --table \
      --time_partitioning_type=DAY \
      --time_partitioning_field="${partitions[$entity]}" \
      --clustering_fields="${clusters[$entity]}" \
      "$table" "$SCHEMA_ROOT/$entity.schema.json"
  fi

  echo "Carregando $entity"
  bq --location="$LOCATION" load \
    --noreplace \
    --source_format=CSV \
    --skip_leading_rows=1 \
    --null_marker=NULL \
    "$table" \
    "gs://$BUCKET_NAME/landing/$entity/batch_date=*/${entity}_*.csv"
done

echo "Carga concluída. Não rode o script novamente sobre as mesmas tabelas."

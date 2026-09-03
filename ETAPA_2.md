# Etapa 2 — domínio, contratos e dados sintéticos

Este pacote fecha a segunda etapa do **Energy Analytics Platform**. Ele modela um domínio inspirado no negócio de geração distribuída, sem reproduzir dados reais da Lemon, e prepara duas cargas para a camada `energy_raw`.

## Resultado esperado

Ao terminar, o repositório terá cinco fontes declaradas no Dataform e cinco tabelas Raw no BigQuery:

```text
customers ──< contracts >── plants
                  │             │
                  ▼             ▼
              invoices      generation
```

Grãos:

- `customers`: uma versão por `customer_id` e `source_updated_at`;
- `plants`: uma versão por `plant_id` e `source_updated_at`;
- `contracts`: uma versão por `contract_id` e `source_updated_at`;
- `invoices`: uma versão por `invoice_id` e `source_updated_at`;
- `generation`: uma versão por `generation_id` e `source_updated_at`.

A Raw é **append-only**. Ela preserva duplicatas, correções e estados antigos. A deduplicação e a quarentena serão implementadas na Etapa 3, na camada Silver.

## Estrutura do pacote

```text
contracts/sources/       contratos versionados em YAML
schemas/bigquery/        schemas físicos explícitos para o BigQuery
mock_data/               gerador determinístico e arquivos CSV
definitions/sources/     declarations SQLX para o Dataform
bigquery/                DDL alternativo para criação pelo console
scripts/                 validação local e carga GCS → BigQuery
data_catalog.xlsx        catálogo legível para revisão e entrevista
```

## Cenários controlados

Os dados contêm 19 cenários conhecidos. Entre eles:

- `NULL` de e-mail;
- chave natural de cliente duplicada;
- duplicata exata no mesmo lote e entre lotes;
- correções com `source_updated_at` mais novo;
- mudanças de status;
- contrato com cliente órfão;
- desconto fora da faixa de 0 a 1;
- intervalo de datas inválido;
- reconciliação financeira incorreta;
- fatura paga sem `paid_at`;
- geração negativa;
- disponibilidade acima de 100%;
- fatura e telemetria que chegam atrasadas.

O catálogo exato fica em `mock_data/output/expected_anomalies.json` e na aba **Anomalias** do workbook.

## Passo a passo

### 1. Crie a branch da etapa

```text
feat/stage-2-mock-source-contracts
```

Copie o conteúdo deste pacote para a raiz do repositório `energy-analytics-platform`. Se já existir uma pasta `definitions`, apenas acrescente `definitions/sources`.

### 2. Gere novamente os dados, se quiser provar reprodutibilidade

Na raiz do repositório:

```powershell
node mock_data/generate_mock_data.mjs --seed=20260903
node scripts/validate_stage2.mjs .
```

O segundo comando deve encerrar com `"passed": true`. O gerador apaga e recria somente `mock_data/output`.

### 3. Crie um bucket de landing

Use um nome globalmente único, por exemplo `SEU_PROJECT_ID-energy-landing`, na mesma região dos datasets:

```powershell
gcloud storage buckets create gs://SEU_PROJECT_ID-energy-landing --location=southamerica-east1 --uniform-bucket-level-access
```

### 4. Faça upload e carga

No Cloud Shell do Google Cloud, use o script `.sh`:

```bash
bash scripts/upload_and_load.sh "SEU_PROJECT_ID" "SEU_PROJECT_ID-energy-landing"
```

No Windows com Google Cloud CLI instalado, a alternativa é:

```powershell
.\scripts\upload_and_load.ps1 `
  -ProjectId "SEU_PROJECT_ID" `
  -BucketName "SEU_PROJECT_ID-energy-landing"
```

O script:

1. envia `mock_data/output` para `gs://.../landing/`;
2. cria as tabelas particionadas e clusterizadas caso não existam;
3. carrega todos os CSVs com schema explícito;
4. interpreta o texto `NULL` como `NULL` SQL.

Execute a carga apenas uma vez para estes lotes. Repetir o comando sobre as mesmas tabelas duplica a Raw, porque a idempotência por objeto/lote será implementada junto da ingestão serverless.

### 5. Copie as declarations para o Dataform

No workspace da feature, confirme que os arquivos em `definitions/sources` compilam. Eles usam `dataform.projectConfig.defaultDatabase`, portanto apontam para o `defaultProject` já configurado em `workflow_settings.yaml`.

### 6. Valide no BigQuery

Substitua `SEU_PROJECT_ID` e execute:

```sql
SELECT 'customers' AS entity, COUNT(*) AS rows FROM `SEU_PROJECT_ID.energy_raw.customers`
UNION ALL SELECT 'plants', COUNT(*) FROM `SEU_PROJECT_ID.energy_raw.plants`
UNION ALL SELECT 'contracts', COUNT(*) FROM `SEU_PROJECT_ID.energy_raw.contracts`
UNION ALL SELECT 'invoices', COUNT(*) FROM `SEU_PROJECT_ID.energy_raw.invoices`
UNION ALL SELECT 'generation', COUNT(*) FROM `SEU_PROJECT_ID.energy_raw.generation`;
```

Depois confirme três cenários:

```sql
-- Correção tardia de fatura: duas versões, a mais nova deve vencer na Silver.
SELECT invoice_id, source_updated_at, net_amount_brl, batch_id
FROM `SEU_PROJECT_ID.energy_raw.invoices`
WHERE invoice_id = 'INV-000005'
ORDER BY source_updated_at;

-- Regra financeira inválida.
SELECT invoice_id, gross_amount_brl, discount_amount_brl, net_amount_brl
FROM `SEU_PROJECT_ID.energy_raw.invoices`
WHERE ABS(net_amount_brl - (gross_amount_brl - discount_amount_brl)) > 0.01;

-- Telemetria atrasada e corrigida.
SELECT generation_id, generation_date, source_updated_at, measurement_status, batch_id
FROM `SEU_PROJECT_ID.energy_raw.generation`
WHERE generation_id IN ('GEN-PLANT-002-2026-07-20', 'GEN-PLANT-001-2026-07-15')
ORDER BY generation_id, source_updated_at;
```

### 7. Commit e Pull Request

Mensagem sugerida:

```text
feat: add source contracts and controlled mock energy data
```

Título da PR:

```text
feat: model source domain and add controlled mock data
```

Checklist da PR:

- contratos YAML revisados;
- schemas BigQuery compatíveis com os CSVs;
- `validation_report.json` com `passed: true`;
- declarations Dataform compilando;
- tabelas Raw carregadas;
- contagens conferidas;
- revisão e aprovação antes do merge em `main`.

## Decisões para explicar na entrevista

- **Schema explícito em vez de autodetect:** evita inferência instável e torna mudanças revisáveis.
- **Raw append-only:** mantém auditabilidade e permite recomputar a Silver.
- **`source_updated_at`, `extracted_at` e `batch_id`:** separam tempo do negócio, tempo da origem e tempo da ingestão.
- **Anomalias sem erro de parsing:** o arquivo carrega; as regras de negócio são observáveis e testáveis no Dataform.
- **Dois lotes:** permitem demonstrar `ROW_NUMBER`, deduplicação, late-arriving data e reprocessamento de partições.
- **Dados inteiramente sintéticos:** documentos e contatos não representam pessoas reais.

## Referências oficiais

- BigQuery, carga de CSV do Cloud Storage: https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-csv
- Cloud Storage, upload de objetos: https://cloud.google.com/storage/docs/uploading-objects
- Dataform, declaração de fontes: https://cloud.google.com/dataform/docs/declare-source

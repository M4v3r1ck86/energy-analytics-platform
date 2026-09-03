# Energy Analytics Platform — Etapa 3

Este pacote implementa a camada **Silver** do projeto.

O objetivo é transformar as tabelas da `energy_raw` em dados deduplicados e confiáveis, sem apagar os registros problemáticos. Registros válidos vão para tabelas `silver_*`; registros inválidos vão para tabelas `quarantine_*` com o motivo da rejeição.

## O que está incluído

- 5 views intermediárias de classificação;
- 5 tabelas Silver curadas;
- 5 tabelas de quarentena;
- 5 testes de qualidade e integridade referencial;
- 3 consultas de validação manual;
- 1 arquivo com as contagens esperadas;
- 1 validador estrutural do pacote;
- 1 guia completo de execução.

Não estão incluídos novos CSVs, novos dados mockados nem uma nova carga da Raw. A Etapa 3 usa os dados já carregados na Etapa 2.

## Por onde começar

Abra e siga, na ordem, o arquivo `ETAPA_3.md`.

O roteiro usa GitHub Desktop e o Explorador de Arquivos do Windows. Não é necessário usar o Cloud Shell. O pacote já foi submetido ao validador estrutural antes de ser entregue; a validação definitiva acontecerá na compilação e na execução do Dataform.

## Resultado final esperado

```text
energy_raw
  customers / plants / contracts / invoices / generation
                         |
                         v
energy_silver
  int_*_classified       (deduplicação e classificação)
        |          |
        | válido   | inválido
        v          v
  silver_*        quarantine_*
        |
        v
  assertions de qualidade
```

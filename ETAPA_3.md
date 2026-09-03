# Etapa 3 — camada Silver usando GitHub Desktop

Este roteiro foi escrito para ser seguido sem experiência prévia com Git. Você usará o **GitHub Desktop** e o **Explorador de Arquivos do Windows**. O Cloud Shell não será necessário nesta etapa.

Faça uma seção por vez. Quando o roteiro mandar parar diante de um erro, não continue tentando opções aleatórias: guarde um print completo da tela.

---

## 1. O que construiremos

Na Etapa 2, os CSVs foram carregados nestas tabelas:

```text
energy_raw.customers
energy_raw.plants
energy_raw.contracts
energy_raw.invoices
energy_raw.generation
```

A Raw preserva exatamente o que chegou da origem. Por isso, ela contém versões antigas, atualizações, duplicatas e anomalias controladas.

Na Etapa 3, o Dataform vai:

1. localizar a versão mais recente de cada registro;
2. aplicar regras de qualidade;
3. publicar registros válidos em tabelas Silver;
4. guardar registros inválidos em tabelas de quarentena;
5. executar testes automáticos de qualidade e relacionamento.

O fluxo ficará assim:

```text
energy_raw.*
     |
     v
int_*_classified          deduplica e explica a classificação
     |             |
     | válido      | inválido
     v             v
silver_*       quarantine_*
     |
     v
assertions                 testes automáticos
```

### Por que existe uma área intermediária?

As views `int_*_classified` deixam visível a decisão tomada para cada linha. Elas calculam:

- `quality_error_codes`: erros que impedem a entrada na Silver;
- `quality_warning_codes`: avisos que não impedem a publicação;
- `is_valid`: informa se a linha é válida.

### Por que existe quarentena?

Porque dados ruins não devem simplesmente desaparecer. A quarentena preserva o registro e informa por que ele foi rejeitado.

---

## 2. O que o pacote cria

**Sim, a Etapa 3 precisa de arquivos novos.** As transformações do Dataform são definidas em arquivos `.sqlx`. Todo o código já está pronto no pacote; você não precisa escrevê-lo.

| Grupo | Quantidade | Função |
|---|---:|---|
| `definitions/silver/intermediate` | 5 | Deduplicar e classificar |
| `definitions/silver/curated` | 5 | Criar tabelas `silver_*` |
| `definitions/silver/quarantine` | 5 | Guardar registros inválidos |
| `definitions/assertions` | 5 | Testar qualidade e relacionamentos |
| `validation` | 4 | Conferir resultados manualmente |
| `scripts` | 1 | Validação estrutural opcional |
| documentação e manifesto | 3 | Explicar e inventariar a entrega |

Total: **28 arquivos**, incluindo **20 ações SQLX**.

### O que não faremos

- não gerar novos CSVs;
- não executar novamente a carga da Etapa 2;
- não criar outro bucket;
- não criar novamente as tabelas Raw;
- não criar outro projeto GCP;
- não criar outro repositório;
- não criar outro workspace no Dataform;
- não usar o Cloud Shell;
- não extrair novamente o ZIP da Etapa 2.

Continuaremos usando:

```text
Projeto GCP:       energy-analytics-lemon-lab
Workspace:         jonathan-dev
Branch de trabalho: jonathan-dev
Branch principal:  main
Origem:            energy_raw
Destino:           energy_silver
```

---

## 3. Ordem correta do processo

A ordem segura é:

```text
1. Atualizar a cópia local no GitHub Desktop
2. Copiar os arquivos da Etapa 3 para a pasta local do repositório
3. Commit na branch jonathan-dev
4. Push da branch jonathan-dev para o GitHub
5. Pull da branch jonathan-dev no Dataform
6. Compilar, executar e validar
7. Abrir e fazer o merge do Pull Request na main
8. Atualizar o Dataform com a main após o merge
```

### Por que o merge vem depois dos testes?

O push para `jonathan-dev` disponibiliza o código no GitHub sem alterar a `main`. Assim conseguimos puxá-lo para o Dataform e verificar se compila e executa.

Se fizermos o merge antes de testar, um possível erro já estará na branch principal. Portanto:

```text
commit e push antes do teste: SIM
merge na main antes do teste: NÃO
merge na main depois do teste: SIM
```

---

## 4. Antes do GitHub Desktop: sincronizar o workspace

Este passo garante que uma alteração existente apenas no Dataform não seja esquecida.

1. Abra o Google Cloud.
2. Entre em **BigQuery > Dataform**.
3. Abra o repositório do projeto.
4. Abra o workspace **`jonathan-dev`**.
5. Aguarde aparecer **Compilado** em verde.
6. Clique nos três pontos do painel de arquivos.
7. Procure **Enviar para ramificação remota `jonathan-dev`**.

Se essa opção disser que o workspace possui commits à frente, clique nela e confirme.

Se estiver desativada ou não houver commits à frente, não há nada para enviar.

**Não clique em “Enviar para ramificação padrão `main`”.** A `main` será atualizada apenas pelo Pull Request.

Depois disso, pode fechar a tela do Dataform temporariamente.

---

## 5. Abrir o repositório correto no GitHub Desktop

1. Abra o aplicativo **GitHub Desktop** no Windows.
2. No canto superior esquerdo, encontre **Current repository** ou **Repositório atual**.
3. Confira se o nome é:

```text
energy-analytics-platform
```

Se aparecer outro repositório:

1. clique em **Current repository**;
2. procure `energy-analytics-platform`;
3. clique nesse nome.

Você não precisa clonar novamente. O GitHub Desktop usará a cópia que já está no seu computador.

### Se o repositório ainda não estiver listado

Somente nesse caso:

1. clique em **File > Add local repository**;
2. clique em **Choose**;
3. selecione a pasta local que já contém `energy-analytics-platform`;
4. clique em **Add repository**.

Isso apenas apresenta ao GitHub Desktop uma pasta já existente. Não cria outro clone.

---

## 6. Entrar na branch `jonathan-dev`

Na barra superior do GitHub Desktop existe o campo **Current branch**.

1. Clique em **Current branch**.
2. Na busca, escreva:

```text
jonathan-dev
```

3. Clique na branch `jonathan-dev`.
4. Olhe novamente para a barra superior e confirme que está escrito `jonathan-dev`.

Se estiver escrito `main`, não copie nenhum arquivo. Volte e selecione `jonathan-dev`.

### Atualizar a branch com o GitHub

1. Clique em **Fetch origin**.
2. Aguarde a consulta terminar.
3. Se o botão mudar para **Pull origin**, clique nele.
4. Aguarde terminar.

`Fetch origin` pergunta ao GitHub se existem novidades. `Pull origin` baixa essas novidades para a pasta do computador.

### Trazer também o estado atual da `main`

Com `jonathan-dev` ainda selecionada:

1. abra o menu **Branch** na parte superior;
2. clique em **Update from default branch** ou **Atualizar a partir da branch padrão**;
3. confirme, se o GitHub Desktop pedir confirmação;
4. se aparecer **Push origin**, clique nele.

Se a opção estiver desativada ou o programa disser que já está atualizado, está tudo certo.

Se aparecer um conflito, não copie o pacote ainda. Tire um print da janela inteira.

---

## 7. Encontrar a pasta local do repositório

Não tente adivinhar onde a pasta está.

1. No GitHub Desktop, abra o menu **Repository**.
2. Clique em **Show in Explorer** ou **Mostrar no Explorador**.
3. O Windows abrirá a pasta local correta.

Essa é a **raiz do repositório**.

Confirme que dentro dela aparecem itens como:

```text
definitions
mock_data
scripts
workflow_settings.yaml
README.md
```

É nessa pasta que os arquivos da Etapa 3 serão colocados.

Deixe essa janela aberta.

---

## 8. Extrair o ZIP da Etapa 3 no Windows

Localize o arquivo baixado desta conversa:

```text
energy-analytics-stage-3.zip
```

Ele provavelmente estará na pasta **Downloads**.

1. Clique com o botão direito no ZIP.
2. Clique em **Extrair Tudo...**.
3. Aceite a pasta sugerida pelo Windows.
4. Clique em **Extrair**.

O Windows abrirá a pasta extraída. Dentro dela precisam aparecer exatamente estes itens no primeiro nível:

```text
definitions
scripts
validation
ETAPA_3.md
README_STAGE3.md
stage3_manifest.json
```

### Atenção à diferença entre pasta e conteúdo

Você deve copiar os **seis itens que estão dentro** da pasta extraída.

Não copie a pasta externa `energy-analytics-stage-3` inteira para dentro do repositório. Se fizer isso, os arquivos ficarão um nível abaixo e o Dataform não encontrará `definitions` no local certo.

O caminho correto será parecido com:

```text
energy-analytics-platform\definitions\silver\...
```

O caminho incorreto seria:

```text
energy-analytics-platform\energy-analytics-stage-3\definitions\silver\...
```

---

## 9. Copiar o conteúdo para a raiz do repositório

Agora você terá duas janelas do Explorador:

- uma com o conteúdo extraído da Etapa 3;
- outra com a raiz de `energy-analytics-platform`, aberta pelo GitHub Desktop.

Na pasta extraída:

1. pressione `Ctrl + A` para selecionar os seis itens;
2. pressione `Ctrl + C` para copiar;
3. vá para a janela da raiz de `energy-analytics-platform`;
4. pressione `Ctrl + V` para colar.

O Windows pode avisar que já existem pastas chamadas `definitions` e `scripts`. Isso é esperado.

Escolha **mesclar/combinar as pastas** ou confirme a cópia. O Windows adicionará os arquivos novos dentro das pastas existentes.

Não exclua as pastas antigas. Não substitua a pasta inteira do repositório pela pasta do pacote.

### Conferência visual

Abra estas pastas no Explorador e confirme que os arquivos existem:

```text
definitions\silver\intermediate\int_customers_classified.sqlx
definitions\silver\curated\silver_customers.sqlx
definitions\silver\quarantine\quarantine_customers.sqlx
definitions\assertions\assert_expected_controlled_errors.sqlx
validation\01_validate_counts.sql
scripts\validate_stage3_package.mjs
```

Se esses caminhos existirem, a cópia foi feita no lugar certo.

---

## 10. Revisar os arquivos no GitHub Desktop

Volte ao GitHub Desktop. Ele detectará automaticamente os arquivos copiados.

1. Abra a aba **Changes** ou **Alterações**.
2. No topo da lista, deve aparecer algo próximo de **28 changed files**.
3. Os arquivos novos normalmente aparecem com um símbolo verde de adição.
4. Confirme novamente que **Current branch** é `jonathan-dev`.

Confira se aparecem caminhos começando por:

```text
definitions/silver/
definitions/assertions/
validation/
scripts/validate_stage3_package.mjs
```

### O que não deve aparecer

- milhares de arquivos alterados;
- arquivos pessoais;
- o ZIP dentro do repositório;
- uma pasta `energy-analytics-stage-3/definitions`;
- exclusão das pastas da Etapa 2;
- alteração inesperada dos CSVs em `mock_data`.

Se algo dessa lista aparecer, não faça o commit.

---

## 11. Criar o commit no GitHub Desktop

Na parte inferior esquerda do GitHub Desktop há dois campos.

No campo **Summary**, coloque:

```text
feat: implementa camada silver com qualidade e quarentena
```

No campo **Description**, pode colocar:

```text
Adiciona deduplicação, regras de qualidade, tabelas Silver, quarentena, assertions e consultas de validação da Etapa 3.
```

Agora olhe o texto do botão abaixo.

Ele precisa dizer:

```text
Commit to jonathan-dev
```

Se disser `Commit to main`, não clique. Volte para a seção 6 e selecione a branch correta.

Se disser `Commit to jonathan-dev`:

1. mantenha marcados os arquivos da Etapa 3;
2. clique em **Commit to jonathan-dev**;
3. aguarde o commit terminar.

O commit é um ponto no histórico local. Ele registra exatamente quais arquivos foram adicionados e a descrição da mudança.

---

## 12. Enviar a branch ao GitHub

Depois do commit, o botão superior deverá mudar para **Push origin**.

1. Clique em **Push origin**.
2. Aguarde o envio terminar.

O push envia o commit do seu computador para a branch remota `jonathan-dev` no GitHub. Ele ainda não altera a `main`.

Quando terminar, o GitHub Desktop normalmente mostrará **No local changes**.

Se aparecer uma solicitação para buscar mudanças antes do push:

1. clique em **Fetch**;
2. depois clique em **Pull origin**, se aparecer;
3. se não houver conflito, clique novamente em **Push origin**.

---

## 13. Puxar a branch `jonathan-dev` para o Dataform

Agora o código está no GitHub e já pode ser testado sem mergear na `main`.

1. Volte para **BigQuery > Dataform**.
2. Abra o workspace **`jonathan-dev`**.
3. Clique nos três pontos do painel de arquivos.
4. Clique em **Extrair da ramificação remota `jonathan-dev`**.
5. Confirme.
6. Aguarde a atualização e a compilação.

Depois do pull, confira se apareceram:

```text
definitions
  assertions
  silver
    curated
    intermediate
    quarantine
```

No canto superior direito, o status precisa ficar **Compilado** em verde.

Se ficar vermelho, não execute e não faça o merge. Abra a mensagem e tire um print com o nome do arquivo e o número da linha.

---

## 14. Conferir o gráfico compilado

1. Clique em **Compiled graph** ou **Gráfico compilado**.
2. Procure o filtro de tags.
3. Use a tag:

```text
stage3
```

Você deve encontrar 20 ações definidas pelo pacote:

- 5 `int_*_classified`;
- 5 `silver_*`;
- 5 `quarantine_*`;
- 5 `assert_*`.

O Dataform cria testes adicionais a partir dos blocos `assertions` das tabelas. Por isso, o gráfico pode mostrar mais nós de teste do que os cinco arquivos manuais.

---

## 15. Executar a Etapa 3

1. Clique em **Iniciar execução**.
2. Escolha selecionar ações por **tag**.
3. Informe `stage3`.
4. Ative **Incluir dependências**.
5. Ative **Incluir dependentes**.
6. Confira o projeto `energy-analytics-lemon-lab`.
7. Confira a localização `southamerica-east1`.
8. Inicie a execução.

As dependências fazem o Dataform executar as tabelas na ordem certa. Os dependentes incluem os testes relacionados.

Não é necessário escolher atualização incremental ou full refresh. Nesta etapa, as tabelas Silver são recriadas por completo.

Abra a aba **Executions** e acompanhe. Todas as ações precisam ficar verdes.

Se alguma ficar vermelha:

1. clique nela;
2. abra os detalhes;
3. tire um print da mensagem completa;
4. não faça o merge na `main`.

---

## 16. Conferir as tabelas no BigQuery

1. Abra o BigQuery Studio.
2. No Explorer, expanda `energy-analytics-lemon-lab`.
3. Atualize o dataset `energy_silver`.
4. Expanda o dataset.

Devem aparecer:

### Views intermediárias

```text
int_customers_classified
int_plants_classified
int_contracts_classified
int_invoices_classified
int_generation_classified
```

### Tabelas Silver

```text
silver_customers
silver_plants
silver_contracts
silver_invoices
silver_generation
```

### Tabelas de quarentena

```text
quarantine_customers
quarantine_plants
quarantine_contracts
quarantine_invoices
quarantine_generation
```

A tabela antiga `hello_dataform` pode continuar existindo. Ela não interfere na Etapa 3.

---

## 17. Executar as três validações no BigQuery

Os arquivos da pasta `validation` são consultas manuais. Eles não são executados automaticamente pelo Dataform.

Você pode abrir cada arquivo no repositório do GitHub ou na pasta local, copiar seu conteúdo e colar em uma nova consulta do BigQuery.

### 17.1 Contagens

Use:

```text
validation/01_validate_counts.sql
```

Execute no BigQuery. Todas as linhas da coluna `passed` precisam ser `true`.

| Objeto | Linhas esperadas |
|---|---:|
| `silver_customers` | 120 |
| `silver_plants` | 7 |
| `silver_contracts` | 132 |
| `silver_invoices` | 782 |
| `silver_generation` | 1286 |
| `quarantine_customers` | 1 |
| `quarantine_plants` | 1 |
| `quarantine_contracts` | 22 |
| `quarantine_invoices` | 116 |
| `quarantine_generation` | 186 |

As quarentenas de contratos, faturas e geração possuem mais registros por causa da integridade referencial:

- `PLANT-008` é inválida; seus contratos e medições também ficam de fora da Silver;
- `CUST-000043` duplica o documento de outro cliente; seus contratos e faturas dependentes também vão para quarentena.

### 17.2 Deduplicação e atualizações

Use:

```text
validation/02_validate_dedup_and_updates.sql
```

Execute no BigQuery. Todas as linhas de `passed` precisam ser `true`.

Essa consulta verifica, entre outros casos:

- `INV-000005` ficou com o valor corrigido `511.33`;
- duplicatas exatas aparecem uma única vez;
- versões mais recentes de status foram mantidas;
- dados atrasados válidos foram preservados;
- o cliente sem e-mail entrou na Silver com um aviso.

### 17.3 Quarentena

Use:

```text
validation/03_inspect_quarantine.sql
```

Execute no BigQuery. Entre os resultados precisam aparecer:

```text
CUST-000043
PLANT-008
CONTRACT-ERR-ORPHAN
CONTRACT-ERR-DISCOUNT
CONTRACT-ERR-DATES
INV-ERR-AMOUNT
INV-ERR-PAID
GEN-PLANT-003-2026-08-12
GEN-PLANT-004-2026-08-17
```

---

## 18. Criar o Pull Request pelo GitHub Desktop

Só avance se:

- o Dataform compilou em verde;
- a execução terminou em verde;
- todas as contagens retornaram `passed = true`;
- todas as validações de atualização retornaram `passed = true`.

No GitHub Desktop, com `jonathan-dev` selecionada:

1. clique em **Preview Pull Request**;
2. confira que a branch base é `main`;
3. confira que a branch de comparação é `jonathan-dev`;
4. revise a lista de alterações;
5. clique em **Create Pull Request**.

O GitHub Desktop abrirá o navegador.

Título:

```text
feat: implementa camada Silver com qualidade e quarentena
```

Descrição:

```text
## Objetivo

Implementar a camada Silver do Energy Analytics Platform sobre as fontes Raw da Etapa 2.

## Entrega

- deduplicação pela versão mais recente;
- tabelas Silver para clientes, usinas, contratos, faturas e geração;
- quarentena com motivos de rejeição;
- integridade referencial entre as entidades;
- assertions de qualidade;
- consultas de validação e contagens esperadas.

## Validação

- compilação Dataform concluída;
- execução da tag stage3 concluída;
- contagens e cenários controlados aprovados no BigQuery.
```

1. Clique em **Create pull request** no navegador.
2. Revise as alterações.
3. Aprove o Pull Request conforme o fluxo do projeto.
4. Clique em **Merge pull request**.
5. Confirme o merge.

Agora, e somente agora, a Etapa 3 entra na `main`.

---

## 19. Atualizar o Dataform depois do merge

O workspace já possui o código testado, mas precisa registrar que a `main` recebeu o merge.

1. Volte ao workspace `jonathan-dev` no Dataform.
2. Clique nos três pontos.
3. Escolha **Extrair da ramificação padrão `main`**.
4. Aguarde o status **Compilado** em verde.
5. Se aparecer que o workspace está à frente da branch remota `jonathan-dev`, clique em **Enviar para ramificação remota `jonathan-dev`**.

Você continua usando o mesmo workspace. Não perde arquivos e não precisa criar outro.

### Atualizar também o GitHub Desktop

No GitHub Desktop:

1. confirme que `jonathan-dev` está selecionada;
2. clique em **Fetch origin**;
3. abra **Branch > Update from default branch**;
4. se aparecer **Push origin**, clique nele.

Assim, o computador, o GitHub e o Dataform ficam alinhados com a `main`.

---

## 20. Quando a Etapa 3 estará concluída

- [ ] O repositório correto foi aberto no GitHub Desktop.
- [ ] A branch selecionada antes da cópia era `jonathan-dev`.
- [ ] O conteúdo do ZIP foi copiado para a raiz correta.
- [ ] Os 28 arquivos apareceram no GitHub Desktop.
- [ ] O commit foi criado em `jonathan-dev`.
- [ ] O push foi enviado para `origin/jonathan-dev`.
- [ ] O Dataform extraiu a branch remota `jonathan-dev`.
- [ ] A compilação ficou verde.
- [ ] A execução da tag `stage3` ficou verde.
- [ ] Existem 5 views intermediárias.
- [ ] Existem 5 tabelas Silver.
- [ ] Existem 5 tabelas de quarentena.
- [ ] As contagens esperadas passaram.
- [ ] Os cenários de deduplicação e atualização passaram.
- [ ] As anomalias controladas aparecem na quarentena.
- [ ] O Pull Request foi mergeado na `main` somente depois dos testes.
- [ ] O Dataform e o GitHub Desktop foram sincronizados depois do merge.

Quando todos estiverem marcados, a Etapa 3 está concluída.

---

## 21. O que virá depois

A próxima etapa será a camada Gold: métricas de negócio, indicadores mensais e modelos prontos para análise ou dashboard. Não comece a Gold antes de a Silver passar por todas as validações.

---

## 22. Referências oficiais

- Sincronizar branches no GitHub Desktop: https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/syncing-your-branch-in-github-desktop
- Criar commits no GitHub Desktop: https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop
- Fazer push pelo GitHub Desktop: https://docs.github.com/en/desktop/making-changes-in-a-branch/pushing-changes-to-github-from-github-desktop
- Criar Pull Request pelo GitHub Desktop: https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/creating-an-issue-or-pull-request-from-github-desktop
- Dependências e `ref` no Dataform: https://cloud.google.com/dataform/docs/dependencies
- Tabelas e configurações do Dataform: https://cloud.google.com/dataform/docs/create-tables
- Assertions do Dataform: https://cloud.google.com/dataform/docs/reference/dataform-core-reference
- Execuções por tag: https://cloud.google.com/dataform/docs/trigger-execution

# ExCenter Front — Backlog

Itens aprovados mas ainda não feitos (ou feitos por paliativo, com a solução definitiva pendente).
Status: ⬜ pendente · 🔄 em andamento · ✅ concluído.

---

## ⬜ Parser de faixa de referência não entende o conector "até" (só "a")

**Descoberto em 2026-08-13.** Escrito para ser executado sem redescobrir nada: sintoma, causa,
evidência medida, ponto de código e a correção.

### Sintoma

No gráfico de tendência (`TrendChart`), um ponto **fora** da faixa de referência às vezes aparece
**verde** em vez de vermelho. Caso real que motivou: Monócitos, faixa 2 a 10 %, primeiro ponto do
histórico = **11** (acima do máximo 10) — e a bolinha ficou verde. A legenda no topo do gráfico
dizia corretamente "Faixa de referência: 2 a 10 %", o que tornava a incoerência óbvia na tela.

### Causa raiz

A cor de cada ponto vinha de `isOutOfRange(p.value, p.referenceValue)`, que chama
`parseReferenceRange` sobre o texto livre da faixa **daquele exame**. O parser
(`src/lib/reference-range.ts`) reconhece os conectores `X a Y`, `entre X e Y`, `inferior a X`,
`superior a X` — mas **não reconhece `X até Y`**. Laboratórios brasileiros escrevem a faixa das
duas formas, inclusive dentro do mesmo analito ao longo do tempo (labs/datas diferentes).

Quando o texto usa "até", `parseReferenceRange` cai na regra de segurança (`totalClauses !== 1` →
`null`), `isOutOfRange` devolve `false`, e o ponto **nunca** é marcado como fora da faixa —
silenciosamente. Nada estoura; a cor só mente.

### Evidência (medida no fiber do React, 2026-08-13, tela de exame individual)

Série de Monócitos, 17 pontos:

| ponto | valor | `referenceValue` gravado | parseia? |
|---|---|---|---|
| primeiro (01/02/18) | **11** | `"de 2,0 até 10,0 %"` | ❌ vira `null` → verde (BUG) |
| último (27/07/26) | 8,3 | `"2,0 a 10,0"` | ✅ `{min:2, max:10}` → é daí que sai a legenda do topo |

Contagem na mesma série: **9 dos 17 pontos usam o formato "até"** e 8 usam "a". Ou seja, mais da
metade dos pontos daquele gráfico não podia ser avaliada. O formato "de X até Y" também aparece em
outros analitos medidos no mesmo exame: Neutrófilos (`"de 1.600 até 7.700 /μL"`), Hemoglobina
(`"de 13,5 até 17,5 g/dL"`). É comum, não exceção.

### Ponto de código

- `src/lib/reference-range.ts` — o regex de faixa (por volta da linha 39):
  ```
  new RegExp(`(${LAB_NUMBER_PATTERN})\\s*a\\s*(${LAB_NUMBER_PATTERN})`, 'gi')
  ```
  O conector é o literal `a`. Ampliar para `(?:até|a)` (ordenar "até" primeiro para o alternador
  preferir o casamento mais longo). "até" é inequívoco (significa "até o valor"), então não traz o
  risco de falso positivo que o "a" solto traria em prosa — a ressalva que já existe no arquivo vale
  só para o "a".
- Considerar também travessão/hífen como conector (`X – Y`), se aparecer em laudos — medir antes.
- Consumidores da cor: `src/components/trend-chart.tsx` (bolinhas do gráfico) e o badge
  "Fora da faixa" de `src/components/exam-detail-view.tsx` (esse vem do back — ver ressalva abaixo).

### Ressalva importante — o back provavelmente tem o MESMO buraco

O comentário de `reference-range.ts` diz que este parser é **espelho de `ReferenceRangeEvaluator`
no back**. Se for fiel, o back também não entende "até", e o `IsAbnormal` que ele calcula e grava
(`ExamDetailResult.isAbnormal`, `BloodTestResultQueryResponse`) está errado para esses laudos —
não só a cor do gráfico. A correção completa precisa arrumar os DOIS parsers em conjunto, senão
front e back divergem. Fora do escopo do front; registrar para tratar junto.

### Teste a adicionar

Caso em `reference-range` com `"de 2,0 até 10,0 %"` → `{min:2, max:10}`, e `isOutOfRange(11, "de 2,0 até 10,0 %")` → `true`. Mais um com `"de 1.600 até 7.700 /μL"` para o separador de milhar.

### Paliativo já aplicado (2026-08-13) — NÃO é a solução definitiva

Enquanto o parser não entende "até", a bolinha passou a ser colorida pela **faixa exibida no
gráfico** (a banda verde, que vem da faixa do exame mais recente que parseou), e não mais pela
faixa de cada ponto. Assim "tudo que está fora da banda verde fica vermelho" — coerente com o que
o usuário vê. Limitações que a solução definitiva resolve: (a) se o exame **mais recente** usar
"até", a banda nem aparece e ninguém fica vermelho; (b) assume que a faixa do analito é estável no
tempo — julga pontos antigos pela faixa do laudo mais novo. Para o caso comum (faixa estável +
exame recente em formato "a") funciona; para o geral, só o conserto do parser.

### Como reproduzir

Abrir um exame com histórico, expandir "Histórico" de um analito cujo laudo mais antigo use "até"
(ex.: Monócitos). Ler os pontos pelo fiber: pegar o `<svg>` do gráfico, subir `__reactFiber$…`
até um `memoizedProps.points`, e inspecionar `points[i].referenceValue`.

---

## ⬜ Marcar no gráfico QUAL ponto é o do exame que está aberto

**Registrado em 2026-08-25**, a partir de observação do dono usando o sistema.

### A dor

Ao abrir um exame em `/resultados/{testId}` e expandir o histórico de um parâmetro, o `TrendChart`
mostra a série INTEIRA daquele analito — inclusive exames **posteriores** ao que está aberto. Isso
está certo e é proposital (o valor do produto é justamente o histórico), mas fica ambíguo: o
usuário vê N bolinhas e nenhuma delas diz "esta aqui é a do laudo que você abriu". Num exame de
2020 com 12 pontos, 11 são de outras datas e nada distingue a que pertence à tela.

### O que fazer

Um **anel em volta da bolinha** do ponto que veio deste exame — um `<circle>` extra, sem
preenchimento, raio maior que o do ponto, na cor da marca. Marcação permanente (não é hover), para
que a leitura "é este o dado desta tela" esteja disponível de relance.

### Pontos de código

- `src/components/trend-chart.tsx`
  - `interface TrendPoint` (linha 19) — hoje carrega `date`, `value`, `referenceValue`,
    `referenceMin/Max`, `laboratoryName`, `requestingDoctor`. **Não carrega identidade de exame.**
  - O `points.map` que desenha as bolinhas (por volta da linha 440, `r={5}`) é onde o anel entra.
    O bloco `hovered` logo abaixo (linha ~485) já faz um `<circle>` de raio maior — é o modelo de
    como sobrepor sem quebrar o layout, mas o anel novo **não** pode ser o mesmo desenho: hover é
    estado transitório, isto é marcação fixa. Convém que os dois coexistam sem virar borrão quando
    o cursor está justamente sobre o ponto marcado.
- `src/components/exam-detail-view.tsx` (linhas 116-124) — monta os `points` a partir de
  `result.history`. É aqui que a informação de "qual ponto é o desta tela" precisa chegar.

### Como identificar o ponto — decidir ao implementar

Duas saídas, e a segunda é melhor:

1. **Por data.** A tela já conhece o `examDate` do exame aberto; marcar o ponto cuja `date` bate.
   Custo zero, sem mexer no back. Falha quando o usuário tem **dois laudos na mesma data** — que é
   um caso real (ver o item de eGFR Afro/Não-Afro no backlog do back, dois valores no mesmo dia).
2. **Por `testId` no ponto.** Expor `testId` em `ExamHistoryPoint` (`src/types/api.ts:176`) e no DTO
   correspondente do back, e comparar com o `testId` da rota. Exato, sem ambiguidade.

**A opção 2 é o mesmo pré-requisito do item "Tooltip do gráfico: abrir o exame original"** logo
abaixo, que também precisa do `testId` por ponto. Vale fazer os dois na mesma passada — o custo do
DTO se paga uma vez só.

### Cuidado

O `TrendChart` é usado em DUAS telas: o detalhe do exame (onde existe "o exame atual") e o
histórico geral (`/resultados/geral`, via `history-view.tsx`), onde **não existe** — a série cruza
todos os laudos e nenhum é o "de agora". A marcação tem de ser opcional: sem o ponto indicado, o
gráfico desenha exatamente como hoje. O `laudo-sparkline.tsx` (laudo de impressão) merece a mesma
pergunta — lá o exame atual É o último ponto, então talvez não precise.

---

## ⬜ Tooltip do gráfico: abrir o exame original que gerou aquele ponto

**Registrado em 2026-08-13.** Só o registro — não implementar agora.

### Ideia

No `TrendChart`, cada ponto do gráfico veio de UM exame específico. Ao passar o mouse num ponto,
abre um tooltip com valor, data e procedência (laboratório + médico). Seria ótimo esse tooltip
oferecer uma **ação para abrir o exame original** que gerou aquele ponto — levar o usuário direto
ao laudo daquela data, em vez de ele ter que caçar na lista de exames.

### O que precisa (esboço, confirmar ao implementar)

- **Ligação ponto → exame.** Cada `TrendPoint` precisa carregar o identificador do exame de origem
  (`testId`). Hoje o ponto tem `value`, `date`, `referenceValue`, `laboratoryName`,
  `requestingDoctor` (ver `src/components/trend-chart.tsx`), mas **não** o `testId`. Conferir a
  montagem dos pontos nas duas telas que usam o gráfico: `src/components/exam-detail-view.tsx`
  (histórico por parâmetro dentro de um exame) e a análise do histórico geral
  (`src/lib/history-analysis.ts` / `src/components/history-view.tsx`) — e ver se o `testId` já vem
  do back nos DTOs (`ExamHistoryPoint`, `BloodTestResultQueryResponse`) ou se falta expor.
- **Interação.** O tooltip hoje é `pointer-events-none` de propósito (é acessório, não rouba o
  cursor). Para ter um link clicável, repensar isso: ou o tooltip vira interativo (cuidado para não
  atrapalhar o hover/scroll que já foram ajustados), ou a ação vai para um clique no próprio ponto
  (`<circle>`), navegando para `/resultados/{testId}`. Avaliar as duas no mobile (sem hover).
- **Caso do ponto sob o cursor.** O valor do ponto ativo já some quando o tooltip abre; a navegação
  precisa saber qual ponto está ativo (`hoverIndex`).

### Cuidado

O gráfico do histórico geral cruza VÁRIOS exames; cada ponto abre um exame diferente. Já a mesma
tela de destino (`/resultados/{testId}`) precisa existir e receber o `testId` — confirmar que a
rota de detalhe aceita o id do ponto. Não regredir os ajustes finos de hover/tooltip/anti-colisão
de rótulos que já foram feitos no `TrendChart`.

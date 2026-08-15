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

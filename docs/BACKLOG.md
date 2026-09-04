# ExCenter Front — Backlog

Itens aprovados mas ainda não feitos (ou feitos por paliativo, com a solução definitiva pendente).
Status: ⬜ pendente · 🔄 em andamento · ✅ concluído.

---

## ✅ Parser de faixa de referência não entende o conector "até" (só "a") — RESOLVIDO 03/09/2026

**Descoberto em 2026-08-13.** O diagnóstico abaixo fica registrado porque explica um erro de
regex que é fácil de reintroduzir. O que mudou na correção:

- **`RANGE_CONNECTOR` em `reference-range.ts`** — `a` e `até`, definido UMA vez e usado tanto pela
  faixa quanto pelo descarte de rótulo etário, que tinham o mesmo furo.
- **A causa real do fracasso de um regex copiado do back:** `\baté\b` **nunca casa em JavaScript**.
  Sem a flag `u`, `\b` usa `[A-Za-z0-9_]`, então `é` não é caractere de palavra e `é` seguido de
  espaço são dois não-palavra, sem transição. No .NET do back o `\b` é Unicode-aware e o mesmo
  padrão funciona. O fecho aqui é `(?![a-zà-ÿ])`. **Ninguém tinha percebido porque o teste que
  cobria o caso afirmava o comportamento errado como esperado.**
- **`history-view.tsx`** — o badge "Fora da faixa" da lista passou a usar
  `resolveReferenceRange(referenceMin, referenceMax, referenceValue)`, igual ao gráfico logo acima
  no mesmo arquivo. Era ali que o bug estava vivo: a lista parseava só texto e ignorava a faixa
  estruturada que chegava no mesmo objeto.
- 10 testes novos; suíte em 350 verdes.

**Fica em aberto, e é divergência conhecida com o back** (registrada em teste, não esquecida): o
front lê `X até Y` mas não `até N` sozinho (só teto), nem faixa com hífen (`13.5-17.5`), nem os
comparadores `<`/`>`/`≤`/`≥` — todos lidos pelo `ReferenceRangeEvaluator`. Fechar isso exige portar
a **máscara** de trechos já reconhecidos que o back tem, senão `de 65 até 175` conta como faixa E
como teto e cai na regra das múltiplas cláusulas. **Prioridade baixa por um motivo concreto:** com
`referenceMin`/`referenceMax` da extração estruturada (14/08) preferidos em todos os consumidores,
o parse textual só atende linha gravada antes disso.

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

### ~~Ressalva — o back provavelmente tem o MESMO buraco~~ — FALSO, verificado em 03/09/2026

Esta ressalva ficou 20 dias no backlog dizendo que a correção seria "de par", front **e** back.
**Não era.** O `ReferenceRangeEvaluator` do back lê `\baté\b` desde sempre, nas duas formas (faixa
e teto), e o `IsAbnormal` gravado no banco estava correto o tempo todo. Era um "provavelmente"
nunca conferido que virou fato no papel e dobrou o tamanho aparente do item.

**A lição, que vale mais que o item:** o comentário de `reference-range.ts` diz que ele é espelho
do back — e a semelhança do código escondeu que os dois divergiam justamente porque `\b` significa
coisas diferentes em .NET e em JavaScript. Espelho declarado não é espelho verificado.

### Testes — FEITOS

`reference-range.test.ts` ganhou o describe do conector "até" (`de 2,0 até 10,0 %`,
`de 1.600 até 7.700 /μL` com separador de milhar, `de 13,5 até 17,5 g/dL`, `65 até 175` sem o "de",
o fim-a-fim do ponto que ficava verde, e a equivalência das duas grafias) e o do rótulo etário
escrito com "até". `history-view.test.tsx` ganhou 3 testes do badge da lista.

### Paliativo aplicado em 2026-08-13 — SUPERADO pela correção acima

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

---

# Alcance e credibilidade (levantado pelo dono em 03/09/2026)

Bloco criado a partir da preparação de um encontro de leads da área de saúde. Objetivo dos quatro
itens abaixo: **ser encontrado** (busca tradicional e resposta de IA), **saber como o site é
usado** e **dar segurança a quem está avaliando uma compra**. Diagnóstico do estado atual medido
no repositório em 03/09/2026 — nada aqui é suposição.

## ⬜ SEO técnico — hoje é literalmente zero

### O que existe (medido em 03/09/2026)

`src/app/layout.tsx` tem `title: 'ExCenter'` e `description: 'Seu histórico. Seu controle.'`.
Só isso. **Não existe** `app/robots.ts`, `app/sitemap.ts`, `manifest`, `opengraph-image`, favicon
próprio, `metadataBase`, canonical, Twitter card, nem JSON-LD em lugar nenhum. Compartilhar o link
no WhatsApp hoje não mostra imagem, título nem descrição.

### Pré-requisito que muda a ordem: o domínio vem PRIMEIRO

O front está em `excenter.vercel.app` (ver `ExCenter-back/BACKLOG_PRE_PRODUCAO.md` §1). **Fazer
SEO antes de trocar de domínio é jogar autoridade fora:** o que o Google indexar e os links que
apontarem vão para o domínio velho, e a migração depois exige 301 em tudo e recomeça boa parte da
construção de autoridade. O domínio custa ~R$40–60/ano e é o item mais barato do backlog inteiro.
**Não começar este item antes dele.**

### O que fazer

- **Metadata completa** no `layout.tsx`: `metadataBase`, `title` com template, description de
  verdade (a atual tem 4 palavras e não contém nenhum termo que alguém buscaria), `alternates.canonical`,
  `openGraph`, `twitter`, `robots`.
- **`app/opengraph-image.tsx`** — o card do link compartilhado. É o ativo com melhor retorno por
  hora de trabalho de tudo desta lista: cada link colado num grupo de WhatsApp vira um anúncio.
- **`app/robots.ts` e `app/sitemap.ts`** — hoje inexistentes. Bloquear `/(app)` e `/(auth)`; a
  landing e as páginas públicas novas (quem somos, termos, privacidade) entram no sitemap.
- **Favicon e manifest** — `public/` só tem `pdf.worker.min.mjs`.
- **JSON-LD**: `Organization`, `SoftwareApplication` (com `offers` — os planos já estão na
  landing) e **`FAQPage`**, que o FAQ existente já preenche sem escrever conteúdo novo.
- **Google Search Console + Bing Webmaster** cadastrados (o Bing alimenta o ChatGPT Search).

> **Antes de escrever qualquer um desses arquivos:** o front subiu para o **Next 16** em 19/07/2026
> e o `AGENTS.md` da raiz avisa que as convenções podem divergir do que se conhece de versões
> anteriores. `metadata`, `robots.ts`, `sitemap.ts` e `opengraph-image` são exatamente APIs de
> convenção de arquivo — **ler `node_modules/next/dist/docs/` da versão instalada** em vez de
> escrever de memória.

### O limite honesto deste item

Tag não traz tráfego; **conteúdo traz**. "ExCenter" não é termo buscado por ninguém. Quem tem o
problema busca *"como juntar exames de laboratórios diferentes"*, *"acompanhar hemoglobina
glicada ao longo do tempo"*, *"gráfico de exames de sangue"*. Uma página só, por melhor marcada
que esteja, compete por nada. O item técnico acima é condição necessária e não suficiente — a
parte que de fato traz gente é conteúdo, e isso é trabalho recorrente, não uma tarefa. Registrar
essa expectativa agora evita a decepção de "fiz SEO e não veio ninguém".

---

## ⬜ Aparecer nas respostas de IA (ChatGPT, Perplexity, Google AI Overviews)

Coisa **diferente** de SEO, e o dono pediu as duas. Buscador indexa e ranqueia; IA de busca lê,
resume e **cita**. O que faz ser citado é conteúdo que responde a pergunta de forma direta, em
HTML limpo, com estrutura clara.

- **Decisão que precisa ser do dono, no `robots.ts`:** bloquear crawler de **treino** e liberar
  crawler de **busca** são escolhas diferentes, e tratar tudo como uma coisa só tira o produto das
  respostas de IA sem ganho nenhum. Grosso modo: os bots de treino (tipo `GPTBot`,
  `Google-Extended`, `ClaudeBot`) alimentam modelo; os de busca (tipo `OAI-SearchBot`,
  `PerplexityBot`) alimentam a resposta com citação e link. **Confirmar a lista e os nomes exatos
  na documentação de cada fornecedor na hora de implementar** — essa lista muda com frequência e
  não vale copiar deste arquivo meses depois.
- **A landing inteira é `'use client'`.** O Google executa JS; boa parte dos crawlers de IA não —
  eles leem o HTML que veio do servidor. Renderizar o **texto** (hero, "como funciona", segurança,
  FAQ) em Server Component e deixar client só o que tem estado (seletor de planos, modal de
  checkout, acordeão) é o que efetivamente muda o resultado aqui. **Isto é refactor de componente,
  não configuração** — é o item mais caro do bloco, e o único que exige cuidado para não regredir
  os 6 testes da landing.
- **`public/llms.txt`** — convenção emergente, um arquivo de texto descrevendo o produto. Custo
  quase zero, benefício incerto; entra junto porque é barato.
- Perguntas frequentes escritas como **pergunta + resposta direta** são o formato que essas
  ferramentas citam. O FAQ da landing já tem a forma certa; vale revisar as respostas para que
  cada uma faça sentido lida fora do contexto da página.

---

## ⬜ Mapa de calor e uso — e por que a landing e o app NÃO podem levar a mesma solução

O dono pediu "track de calor (uso) na landing page e no sistema em si". São dois problemas com
níveis de risco opostos, e essa é a decisão principal deste item. Hoje **não há analytics nenhum**
(nenhuma lib no `package.json`, verificado em 03/09/2026).

### Na landing (público, sem dado de saúde) — tranquilo

Mapa de calor e gravação de sessão aqui não têm nada de sensível: é uma página de marketing.
Serve exatamente pro que ele quer — ver até onde as pessoas rolam, onde clicam, onde desistem.
Candidatos: **Microsoft Clarity** (grátis, mapa de calor + replay de verdade), **PostHog**, ou
**Vercel Analytics** (já estamos na Vercel, cookieless, zero configuração — mas dá números, não
mapa de calor).

### Dentro do app — gravação de sessão FILMA laudo

A tela do sistema mostra nome do paciente, nome do laboratório, valores de exame e faixas de
referência. **Session replay ali manda tudo isso para um terceiro.** É o mesmo raciocínio que
gerou o `SentryPhiScrubber` no back (feito 24/08) — e ali só vazava um corpo de request, não a
tela inteira.

Se for usar, duas regras, e nenhuma é opcional:
1. **Masking por padrão em tudo**, liberando seletivamente o que é seguro — nunca o contrário. A
   lista de exceções erra pra menos com o tempo; a lista de liberações erra pra mais uma vez só.
2. **Declarado na Política de Privacidade** com o fornecedor nomeado. Sem isso é tratamento de
   dado sensível não informado.

**Alternativa que provavelmente já resolve, sem nada disso:** eventos próprios sem conteúdo —
"upload iniciado / concluído / falhou", "exame aberto", "gráfico visualizado", "exportou laudo".
Responde *o que as pessoas usam e onde travam*, que é a pergunta real, sem filmar laudo de
ninguém. Mapa de calor dentro do app é muito custo de risco para responder uma pergunta que
evento resolve.

### Banner de cookies

Decorre da escolha: ferramenta **cookieless** (Vercel Analytics, Plausible) não exige banner;
qualquer coisa com cookie ou fingerprint exige, e aí a landing ganha um banner. Escolher a
ferramenta é escolher se o banner existe.

---

## ⬜ "Quem somos" e o que dá segurança numa venda

### O que a landing tem hoje (medido em 03/09/2026)

Hero, o problema, como funciona (3 passos), exemplo de mapeamento, recursos, segurança, preços
(dois sets, pessoal e equipes), FAQ, CTA final e rodapé. O rodapé tem quatro âncoras internas
(Recursos, Preços, Segurança, Entrar) e o aviso "Não substitui avaliação médica".

**Não existe:** quem está por trás, página de contato, Termos de Uso, Política de Privacidade,
nem qualquer prova. O único contato do site inteiro é um `mailto:contato@doutorgrowth.com.br`
escondido dentro do plano Instituição.

### A pergunta silenciosa do lead de saúde

"Quem é você, e por que eu confiaria o dado do meu paciente a você?" A seção de segurança da
landing responde com quatro promessas — *"só você vê seus exames"*, *"nunca vendemos seus
dados"* — e hoje **não há um único documento por trás de nenhuma delas**. Quem trabalha com saúde
vai procurar esse documento; não achar é pior do que a seção não existir.

### O que dá segurança, em ordem de peso real

1. **Termos de Uso e Política de Privacidade publicados.** Espec em
   `ExCenter-back/BACKLOG_PRE_PRODUCAO.md` §2. É o item de maior peso do bloco e não é trabalho de
   front — é decisão de negócio escrita. Sem ele, os outros quatro não sustentam.
2. **Dizer onde o dado mora e quem toca nele.** Banco no Neon, arquivos no R2, extração por IA de
   terceiro. **O laudo passa por um provedor de IA** — isso precisa estar escrito, e escrever
   antes de perguntarem é o que transmite seriedade. Esconder e ser descoberto custa a venda.
3. **Contato humano visível.** E-mail no rodapé e uma página de contato. Um produto de saúde sem
   endereço de reclamação parece um site que some.
4. **"Quem somos".** Curto e honesto: quem é, o que faz, e o problema real que originou o produto
   (o histórico da própria família espalhado em PDFs de labs diferentes). É a origem do ExCenter e
   é a melhor coisa que ele tem para contar — vale mais que qualquer texto institucional genérico.
5. **Aviso médico com peso.** Existe, em letra miúda no rodapé. Para um lead da área de saúde,
   afirmar com clareza *"isto organiza e mostra o seu histórico; não diagnostica e não substitui
   o médico"* é sinal de seriedade, não de fraqueza — e é a fronteira que um profissional de saúde
   testa primeiro.
6. **Prova, sem inventar prova.** Não há cliente, então não existe depoimento nem logo. O que
   existe e é verdade: laudos reais de anos e labs diferentes processados ponta a ponta, e um
   dicionário de **25.047 analitos / 104.009 nomes de busca** com busca semântica. Isso é
   substância técnica verificável — vale mais que um depoimento fabricado e não cria passivo.

### Não fazer

Selo de "LGPD compliant", "conformidade HIPAA" ou qualquer certificação: **nenhuma auditoria
existe**, e num público de saúde essa é exatamente a afirmação que alguém sabe checar. Alegação de
conformidade sem lastro é o caminho mais rápido de perder a única credibilidade que o produto tem.

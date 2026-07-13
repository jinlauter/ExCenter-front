// =============================================================================
// Tela "Histórico de exames" — PLACEHOLDER
// =============================================================================
// Fora do escopo desta entrega. Endpoint que parece atender:
//   - POST /api/bloodtests/results/query     (filtros + dados pra séries temporais)
// Próximos passos sugeridos: listar parâmetros, permitir seleção, plotar
// gráfico de linhas com faixa de referência.
// =============================================================================

export default function HistoryPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-medium">Histórico de exames</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualize a evolução dos seus parâmetros ao longo do tempo.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <h2 className="text-base font-medium">Em construção</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Em breve, gráficos com a evolução dos seus parâmetros ao longo do tempo. A base de dados
          (POST /api/bloodtests/results/query) já está disponível no back — falta o desenho da UX
          de comparação.
        </p>
      </div>
    </div>
  );
}

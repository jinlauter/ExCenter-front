// =============================================================================
// Tela "Exames enviados" — PLACEHOLDER
// =============================================================================
// Fora do escopo desta entrega. Quando entrar em desenvolvimento, considerar:
//   - GET /api/bloodtests/batch/{batchId}     (status de um upload específico)
//   - POST /api/bloodtests/results/query      (lista resultados — filtros disponíveis)
// Falta no back: endpoint listando TODOS os batches do usuário autenticado
// (sugestão: GET /api/bloodtests/batches).
// =============================================================================

export default function SentExamsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-medium">Exames enviados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o processamento dos PDFs que você enviou.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <h2 className="text-base font-medium">Em construção</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Esta tela ainda não foi implementada. Quando o contrato com o back for confirmado
          (endpoint para listar batches do usuário), exibiremos aqui os envios recentes com o
          status de cada arquivo.
        </p>
      </div>
    </div>
  );
}

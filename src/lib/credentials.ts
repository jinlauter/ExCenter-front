// =============================================================================
// Credential Management API — salvar credenciais no gerenciador de senhas
// =============================================================================
// Login e cadastro aqui são fetch + navegação SPA (router.replace), não um POST
// de <form> com navegação de página real. A heurística do Chrome de "salvar
// senha?" depende dessa navegação real, então não dispara nesses fluxos — foi
// por isso que o cadastro não ofereceu salvar user/senha no wallet do Chrome.
//
// A Credential Management API resolve isso pedindo EXPLICITAMENTE pro browser
// salvar, independente de navegação. É progressive enhancement: só age onde a
// API existe (Chromium, em contexto seguro/HTTPS — produção na Vercel);
// Firefox/Safari ignoram sem erro. Nunca pode quebrar o fluxo de auth.
// =============================================================================

// PasswordCredential não está na lib DOM padrão do TS (foi removida) — tipamos
// o mínimo que usamos.
type PasswordCredentialCtor = new (data: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

export async function storePasswordCredential(
  id: string,
  password: string,
  name?: string,
): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor })
      .PasswordCredential;
    if (!ctor || !navigator.credentials?.store) return;

    const credential = new ctor({ id, password, name });
    await navigator.credentials.store(credential);
  } catch {
    // Best-effort: salvar credencial nunca deve impedir login/cadastro de concluir.
  }
}

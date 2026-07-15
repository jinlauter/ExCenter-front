// Detecta SO mobile (Android/iOS) via user agent — usado só pra decidir a estratégia de
// visualização de PDF: navegadores desktop têm visualizador de PDF nativo dentro de <iframe>,
// mas Chrome/Safari mobile não (mostram "conteúdo bloqueado" em vez do PDF).
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

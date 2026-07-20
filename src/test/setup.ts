import '@testing-library/jest-dom/vitest';

// jsdom não implementa AnimationEvent — o React detecta isso na inicialização e desativa de
// vez onAnimationStart/onAnimationEnd nesse ambiente. Sem esse polyfill, nenhum teste que
// dependa desses handlers (ex.: detecção de autofill via CSS) consegue disparar o evento.
if (typeof window !== 'undefined' && typeof window.AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    animationName: string;
    elapsedTime: number;
    pseudoElement: string;

    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }
  window.AnimationEvent = AnimationEventPolyfill;
}

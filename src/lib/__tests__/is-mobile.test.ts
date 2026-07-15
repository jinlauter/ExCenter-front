import { describe, expect, it, afterEach } from 'vitest';
import { isMobileDevice } from '@/lib/is-mobile';

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
}

const ORIGINAL_UA = window.navigator.userAgent;

describe('isMobileDevice', () => {
  afterEach(() => {
    setUserAgent(ORIGINAL_UA);
  });

  it('retorna false para user agent de desktop', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
    expect(isMobileDevice()).toBe(false);
  });

  it('retorna true para Android', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36');
    expect(isMobileDevice()).toBe(true);
  });

  it('retorna true para iPhone', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1');
    expect(isMobileDevice()).toBe(true);
  });

  it('retorna true para iPad', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1');
    expect(isMobileDevice()).toBe(true);
  });
});

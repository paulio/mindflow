declare const __BUILD_VERSION__: string;

const FALLBACK_VERSION = 'dev';

export const BUILD_VERSION = typeof __BUILD_VERSION__ === 'string' && __BUILD_VERSION__.length > 0
  ? __BUILD_VERSION__
  : FALLBACK_VERSION;

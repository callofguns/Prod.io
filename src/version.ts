declare const __APP_VERSION__: string;

/** Display version, derived from package.json at build time (e.g. "v1-beta"). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

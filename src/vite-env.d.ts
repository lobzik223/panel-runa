/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Пусто в dev = прокси Vite на :3000. В production: https://api.runa.finance */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

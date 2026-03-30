/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Пусто в dev = прокси Vite на :4000. В production build задайте URL бэкенда. */
  readonly VITE_API_URL?: string;
  /** Dev / legacy без 2FA на бэкенде — совпадает с ADMIN_PANEL_SECRET. При 2FA не нужен (вход через JWT). */
  readonly VITE_ADMIN_API_KEY?: string;
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

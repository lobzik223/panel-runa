/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Пусто в dev = прокси Vite на :4000. В production build задайте URL бэкенда. */
  readonly VITE_API_URL?: string;
  /** Dev: совпадает с ADMIN_PANEL_SECRET, заголовок X-Admin-Key без JWT. */
  readonly VITE_ADMIN_API_KEY?: string;
  /** Тот же секрет, что ADMIN_PANEL_CLIENT_SECRET на бэкенде (заголовок X-Seepromnt-Panel-Key). Виден в сборке. */
  readonly VITE_ADMIN_PANEL_CLIENT_SECRET?: string;
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

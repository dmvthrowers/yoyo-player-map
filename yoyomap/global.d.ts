declare module '*.css';

// Vite-specific ImportMeta augmentation so that legacy src/lib and src/pages
// files that use import.meta.env remain type-safe when scanned by the Next.js
// TypeScript checker.
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_API_URL?: string;
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

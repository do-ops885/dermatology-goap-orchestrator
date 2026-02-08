interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Public — safe to expose. Used to build ImageKit delivery URLs. */
  readonly VITE_IMAGEKIT_URL_ENDPOINT?: string;
  readonly VITE_IMAGEKIT_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

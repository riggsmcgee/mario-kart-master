/// <reference types="vite/client" />

/**
 * Declaring the env vars we actually use. Without this, `import.meta.env.ANYTHING` is `any`
 * via Vite's index signature — so a typo in a variable name would sail through the compiler
 * and surface as an unconfigured client at runtime.
 *
 * Optional on purpose: a fresh clone has no `.env.local`, and the site is required to work
 * without a backend.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

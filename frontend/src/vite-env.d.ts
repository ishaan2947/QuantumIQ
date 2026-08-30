/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute origin of the FastAPI backend as the *browser* should reach it,
   * e.g. https://quantumiq-api.onrender.com
   *
   * Left empty in local development, where vite.config.ts proxies /api to
   * localhost:8000 instead. Vercel has no such proxy, so the deployed frontend
   * needs the full origin — set this in the Vercel project's env vars.
   *
   * Distinct from VITE_API_URL, which docker-compose sets to the Docker-network
   * hostname used by the dev server's proxy and which the browser cannot reach.
   */
  readonly VITE_PUBLIC_API_URL?: string;

  /** Shown to visitors who hit the demo message limit. */
  readonly VITE_GITHUB_REPO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

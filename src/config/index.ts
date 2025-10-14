import { environmentSchema } from "./schemas.js";

export interface Config {
  gitlab: {
    url: string;
    token: string;
  };
  filters: {
    includeMembershipOnly: boolean;
    includeNamespaces: string[];
  };
  readOnly: boolean;
}

let cachedConfig: Config | null = null;

export function loadConfig(force = false): Config {
  if (!force && cachedConfig) {
    return cachedConfig;
  }

  const rawUrl = process.env.GITLAB_URL;
  const rawToken = process.env.GITLAB_TOKEN;
  const envParsed = environmentSchema.safeParse({ url: rawUrl, token: rawToken });

  if (!envParsed.success) {
    const errorMessage = `Invalid GitLab environment configuration. Ensure GITLAB_URL and GITLAB_TOKEN are set correctly: ${envParsed.error.message}`;

    throw new Error(errorMessage);
  }

  // Read read-only mode flag (default: true for safety)
  const readOnly = process.env.GITLAB_READ_ONLY !== "false";
  const config = {
    gitlab: {
      url: envParsed.data.url,
      token: envParsed.data.token,
    },
    filters: {
      includeMembershipOnly: false,
      includeNamespaces: [],
    },
    readOnly,
  } satisfies Config;

  cachedConfig = config;

  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}

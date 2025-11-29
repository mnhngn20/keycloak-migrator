import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { RawKeycloakMigratorConfig, ResolvedKeycloakMigratorConfig } from './types';

const DEFAULT_CONFIG_FILE = 'keycloak-migrator.config.json';

export function loadConfig(explicitPath?: string): ResolvedKeycloakMigratorConfig {
  const providedPath = explicitPath || process.env.KEYCLOAK_MIGRATOR_CONFIG || DEFAULT_CONFIG_FILE;
  const resolvedPath = path.isAbsolute(providedPath)
    ? providedPath
    : path.resolve(process.cwd(), providedPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Cannot find config file at ${resolvedPath}. Create ${DEFAULT_CONFIG_FILE} in your project root or pass --config <path>.`);
  }

  const fileContent = readFileSync(resolvedPath, 'utf-8');
  let rawConfig: RawKeycloakMigratorConfig;

  try {
    rawConfig = resolveEnvPlaceholders(JSON.parse(fileContent));
  } catch (err) {
    throw new Error(`Failed to parse config file ${resolvedPath}: ${(err as Error).message}`);
  }

  validateConfig(rawConfig, resolvedPath);

  const configDir = path.dirname(resolvedPath);
  const migrationDir = path.resolve(configDir, rawConfig.migrationDir);
  const seedDir = rawConfig.seedDir
    ? path.resolve(configDir, rawConfig.seedDir)
    : path.join(migrationDir, 'seeds');

  return {
    filePath: resolvedPath,
    migrationDir,
    seedDir,
    keycloak: {
      baseUrl: rawConfig.keycloak.baseUrl,
      realm: rawConfig.keycloak.realm,
      adminUsername: rawConfig.keycloak.adminUsername,
      adminPassword: rawConfig.keycloak.adminPassword,
    },
    bootstrap: rawConfig.bootstrap
      ? {
          createRealm: !!rawConfig.bootstrap.createRealm,
          client: rawConfig.bootstrap.client,
        }
      : undefined,
  };
}

function validateConfig(config: RawKeycloakMigratorConfig, filePath: string) {
  if (!config.migrationDir) {
    throw new Error(`"migrationDir" is missing in ${filePath}`);
  }

  if (!config.keycloak) {
    throw new Error(`"keycloak" section is missing in ${filePath}`);
  }

  const requiredKeycloakFields: Array<keyof RawKeycloakMigratorConfig['keycloak']> = [
    'baseUrl',
    'realm',
    'adminUsername',
    'adminPassword',
  ];

  for (const field of requiredKeycloakFields) {
    if (!config.keycloak[field]) {
      throw new Error(`"keycloak.${field}" is required in ${filePath}`);
    }
  }

  if (config.bootstrap?.client && typeof config.bootstrap.client.clientId !== 'string') {
    throw new Error(
      `"bootstrap.client.clientId" (string) is required in ${filePath} when bootstrap.client is configured`,
    );
  }
}

const ENV_PLACEHOLDER = /^\$env\.([A-Z0-9_]+)$/i;

function resolveEnvPlaceholders<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => resolveEnvPlaceholders(item)) as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = resolveEnvPlaceholders(val);
    }
    return result as T;
  }

  if (typeof value === 'string') {
    const match = value.match(ENV_PLACEHOLDER);
    if (match) {
      const envVar = match[1];
      const envValue = process.env[envVar];
      if (envValue === undefined) {
        throw new Error(`Environment variable ${envVar} referenced in config is not defined`);
      }
      return envValue as T;
    }
  }

  return value;
}

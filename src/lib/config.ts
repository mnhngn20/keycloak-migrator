import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { ensureTsNode } from './ts-node';
import { RawKeycloakMigratorConfig, ResolvedKeycloakMigratorConfig } from './types';

const DEFAULT_CONFIG_FILES = [
  'keycloak-migrator.config.js',
  'keycloak-migrator.config.cjs',
  'keycloak-migrator.config.ts',
  'keycloak-migrator.config.json',
];

const SUPPORTED_EXTENSIONS = ['.js', '.cjs', '.ts', '.mjs', '.json'];

export async function loadConfig(explicitPath?: string): Promise<ResolvedKeycloakMigratorConfig> {
  const resolvedPath = resolveConfigPath(explicitPath);
  const rawConfig = await loadRawConfig(resolvedPath);

  validateConfig(rawConfig, resolvedPath);

  const configDir = path.dirname(resolvedPath);
  const migrationDir = path.resolve(configDir, rawConfig.migrationDir);
  const seedDir = rawConfig.seedDir ? path.resolve(configDir, rawConfig.seedDir) : path.join(migrationDir, 'seeds');
  const tsconfigPath = resolveTsconfigPath(configDir, rawConfig.tsconfigPath);

  return {
    filePath: resolvedPath,
    migrationDir,
    seedDir,
    tsconfigPath,
    keycloak: {
      baseUrl: rawConfig.keycloak.baseUrl,
      realm: rawConfig.keycloak.realm,
      adminUsername: rawConfig.keycloak.adminUsername,
      adminPassword: rawConfig.keycloak.adminPassword,
    },
    bootstrap: rawConfig.bootstrap
      ? {
          ensureClient: !!rawConfig.bootstrap.ensureClient,
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

  if (config.bootstrap?.ensureClient && !config.bootstrap.client) {
    throw new Error(`"bootstrap.client" must be provided in ${filePath} when bootstrap.ensureClient is true`);
  }
}

function resolveConfigPath(explicitPath?: string): string {
  const providedPath = explicitPath || process.env.KEYCLOAK_MIGRATOR_CONFIG;
  if (providedPath) {
    const normalized = path.isAbsolute(providedPath) ? providedPath : path.resolve(process.cwd(), providedPath);
    if (existsSync(normalized)) {
      return normalized;
    }
    if (!path.extname(normalized)) {
      for (const ext of SUPPORTED_EXTENSIONS) {
        const candidate = `${normalized}${ext}`;
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    }
    throw new Error(`Cannot find config file at ${normalized}`);
  }

  for (const fileName of DEFAULT_CONFIG_FILES) {
    const candidate = path.resolve(process.cwd(), fileName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Cannot find config file. Create one of the default files (${DEFAULT_CONFIG_FILES.join(
      ', ',
    )}) or pass --config <path>.`,
  );
}

async function loadRawConfig(configPath: string): Promise<RawKeycloakMigratorConfig> {
  const ext = path.extname(configPath).toLowerCase();

  if (ext === '.json') {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as RawKeycloakMigratorConfig;
  }

  if (ext === '.js' || ext === '.cjs') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const mod = require(configPath);
    return (mod.default ?? mod) as RawKeycloakMigratorConfig;
  }

  if (ext === '.ts') {
    ensureTsNode();
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const mod = require(configPath);
    return (mod.default ?? mod) as RawKeycloakMigratorConfig;
  }

  if (ext === '.mjs') {
    const mod = await import(pathToFileURL(configPath).href);
    return (mod.default ?? mod) as RawKeycloakMigratorConfig;
  }

  throw new Error(`Unsupported config file extension "${ext}" at ${configPath}`);
}

function resolveTsconfigPath(configDir: string, provided?: string): string | undefined {
  if (provided) {
    const candidate = path.isAbsolute(provided) ? provided : path.resolve(configDir, provided);
    return existsSync(candidate) ? candidate : undefined;
  }

  const defaultPath = path.resolve(configDir, 'tsconfig.json');
  return existsSync(defaultPath) ? defaultPath : undefined;
}

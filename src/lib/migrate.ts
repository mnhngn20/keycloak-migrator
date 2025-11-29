import { existsSync, readdirSync } from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { ensureTsNode } from "./ts-node";
import { KeycloakMigration, ResolvedKeycloakMigratorConfig } from "./types";

export interface MigrateOptions {
  seed?: boolean;
}

export async function migrate(
  config: ResolvedKeycloakMigratorConfig,
  options: MigrateOptions = {}
) {
  const targetDir = options.seed ? config.seedDir : config.migrationDir;
  const fileType = options.seed ? "seed" : "migration";

  if (!existsSync(targetDir)) {
    throw new Error(
      `Directory ${targetDir} does not exist. Update migrationDir/seedDir in ${config.filePath}.`
    );
  }

  const migrationFiles = readdirSync(targetDir)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
    .sort();

  if (migrationFiles.length === 0) {
    console.log(`🤷 No ${fileType}s found in ${targetDir}`);
    return;
  }

  const kc = await authenticate(config);

  await ensureRealm(kc, config);
  if (config.bootstrap?.client) {
    await ensureClient(kc, config);
  }

  const applied = await getAppliedMigrations(kc, config.keycloak.realm);
  console.log(
    `🚀 Already applied ${fileType}s: ${
      applied.length ? applied.join(", ") : "none"
    }`
  );

  for (const file of migrationFiles) {
    const filePath = path.resolve(targetDir, file);
    const migration = await loadMigration(filePath);

    if (applied.includes(migration.id)) {
      continue;
    }

    try {
      await migration.run(kc, config.keycloak.realm);
      applied.push(migration.id);
      await saveAppliedMigrations(kc, config.keycloak.realm, applied);
      console.log(`✅ Applied ${fileType} ${migration.id}`);
    } catch (error) {
      console.error(
        `❌ ${fileType} ${migration.id} failed: ${(error as Error).message}`
      );
      throw error;
    }
  }

  console.log(`🎉 All ${fileType}s applied`);
}

async function authenticate(config: ResolvedKeycloakMigratorConfig) {
  const kc = new KeycloakAdminClient({
    baseUrl: config.keycloak.baseUrl,
  });

  await kc.auth({
    username: config.keycloak.adminUsername,
    password: config.keycloak.adminPassword,
    grantType: "password",
    clientId: "admin-cli",
  });

  return kc;
}

async function ensureRealm(
  kc: KeycloakAdminClient,
  config: ResolvedKeycloakMigratorConfig
) {
  const realmName = config.keycloak.realm;
  const realm = await kc.realms.findOne({
    realm: realmName,
  });

  if (realm) {
    return realm;
  }

  if (!config.bootstrap?.createRealm) {
    throw new Error(
      `Realm "${realmName}" does not exist. Enable bootstrap.createRealm in ${config.filePath} to create it automatically.`
    );
  }

  await kc.realms.create({
    realm: realmName,
    enabled: true,
  });

  console.log(`🌍 Created realm ${realmName}`);
  return (
    (await kc.realms.findOne({
      realm: realmName,
    })) || undefined
  );
}

async function ensureClient(
  kc: KeycloakAdminClient,
  config: ResolvedKeycloakMigratorConfig
) {
  const realmName = config.keycloak.realm;
  const clientConfig = config.bootstrap?.client;
  if (!clientConfig) {
    return;
  }

  const { clientId, name, ...clientPayload } = clientConfig;

  const clients = await kc.clients.find({
    realm: realmName,
  });

  if (clients.some((client) => client.clientId === clientId)) {
    return;
  }

  await kc.clients.create({
    realm: realmName,
    clientId,
    enabled: true,
    alwaysDisplayInConsole: true,
    name: typeof name === "string" ? name : clientId,
    ...clientPayload,
  });

  console.log(`🌍 Created client ${clientId} in realm ${realmName}`);
}

async function getAppliedMigrations(
  kc: KeycloakAdminClient,
  realmName: string
): Promise<string[]> {
  const realm = await kc.realms.findOne({ realm: realmName });
  const attr = realm?.attributes?.applied_migrations;
  if (!attr) {
    return [];
  }

  try {
    const parsed = JSON.parse(attr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(
      "⚠️ Unable to parse applied migrations, starting from scratch."
    );
    return [];
  }
}

async function saveAppliedMigrations(
  kc: KeycloakAdminClient,
  realmName: string,
  applied: string[]
) {
  const realm = await kc.realms.findOne({ realm: realmName });
  await kc.realms.update(
    { realm: realmName },
    {
      attributes: {
        ...(realm?.attributes || {}),
        applied_migrations: JSON.stringify(applied),
      },
    }
  );
}

async function loadMigration(filePath: string): Promise<KeycloakMigration> {
  if (filePath.endsWith(".ts")) {
    ensureTsNode();
  }

  const moduleUrl = pathToFileURL(filePath).href;
  const mod = await import(moduleUrl);
  const migration: KeycloakMigration | undefined = mod.default ?? mod.migration;

  if (
    !migration ||
    typeof migration.id !== "string" ||
    typeof migration.run !== "function"
  ) {
    throw new Error(`Invalid migration definition in ${filePath}`);
  }

  return migration;
}

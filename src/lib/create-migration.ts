import { existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { ResolvedKeycloakMigratorConfig } from './types';

export interface CreateMigrationOptions {
  seed?: boolean;
}

export function createMigration(
  config: ResolvedKeycloakMigratorConfig,
  name: string | undefined,
  options: CreateMigrationOptions = {},
) {
  if (!name) {
    throw new Error('Migration name is required. Usage: keycloak-migrator create <name> [--seed]');
  }

  const sanitizedName = name.replace(/\s+/g, '_');
  const targetDir = options.seed ? config.seedDir : config.migrationDir;
  const fileType = options.seed ? 'seed' : 'migration';

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = generateTimestamp();
  const migrationId = `${timestamp}_${sanitizedName}`;
  const fileName = `${migrationId}.ts`;
  const filePath = path.join(targetDir, fileName);

  if (existsSync(filePath)) {
    throw new Error(`File ${fileName} already exists in ${targetDir}`);
  }

  const template = generateTemplate(migrationId, name);
  writeFileSync(filePath, template, 'utf-8');

  console.log(`✅ Created ${fileType}: ${filePath}`);
  console.log('   Next steps: edit the file and run `yarn keycloak-migrator migrate`.');
}

function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}`;
}

function generateTemplate(id: string, description: string) {
  return `import { KeycloakMigration } from "keycloak-migrator";

const migration: KeycloakMigration = {
  id: "${id}",
  description: "${description}",
  run: async (kc, realm) => {
    // TODO: Implement your migration logic here
    // await kc.clients.create({
    //   realm,
    //   clientId: "my-client",
    //   enabled: true,
    // });
  },
};

export default migration;
`;
}

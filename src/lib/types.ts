import type KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation';

export interface KeycloakMigration {
  id: string;
  description?: string;
  run: (kc: KeycloakAdminClient, realmName: string) => Promise<void>;
}

export type BootstrapClientConfig = ClientRepresentation & { clientId: string };

export interface RawKeycloakMigratorConfig {
  migrationDir: string;
  seedDir?: string;
  tsconfigPath?: string;
  keycloak: {
    baseUrl: string;
    realm: string;
    adminUsername: string;
    adminPassword: string;
  };
  bootstrap?: {
    ensureClient?: boolean;
    client?: BootstrapClientConfig;
  };
}

export interface ResolvedKeycloakMigratorConfig {
  filePath: string;
  migrationDir: string;
  seedDir: string;
  tsconfigPath?: string;
  keycloak: {
    baseUrl: string;
    realm: string;
    adminUsername: string;
    adminPassword: string;
  };
  bootstrap?: {
    ensureClient: boolean;
    client?: BootstrapClientConfig;
  };
}

export type KeycloakMigratorConfig = RawKeycloakMigratorConfig;

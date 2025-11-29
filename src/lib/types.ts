import type KeycloakAdminClient from '@keycloak/keycloak-admin-client';

export interface KeycloakMigration {
  id: string;
  description?: string;
  run: (kc: KeycloakAdminClient, realmName: string) => Promise<void>;
}

export interface BootstrapClientConfig {
  clientId: string;
  name?: string;
  [key: string]: unknown;
}

export interface RawKeycloakMigratorConfig {
  migrationDir: string;
  seedDir?: string;
  keycloak: {
    baseUrl: string;
    realm: string;
    adminUsername: string;
    adminPassword: string;
  };
  bootstrap?: {
    createRealm?: boolean;
    client?: BootstrapClientConfig;
  };
}

export interface ResolvedKeycloakMigratorConfig {
  filePath: string;
  migrationDir: string;
  seedDir: string;
  keycloak: {
    baseUrl: string;
    realm: string;
    adminUsername: string;
    adminPassword: string;
  };
  bootstrap?: {
    createRealm: boolean;
    client?: BootstrapClientConfig;
  };
}

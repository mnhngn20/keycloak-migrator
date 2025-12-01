import {
  ClientRepresentation,
  type KeycloakAdminClient,
} from "@s3pweb/keycloak-admin-client-cjs";

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

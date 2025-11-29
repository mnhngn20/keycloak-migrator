# keycloak-migrator

Lightweight CLI to author and run repeatable Keycloak migrations (and optional seed files) directly from any Node.js project.

## Installation

```bash
yarn add --dev keycloak-migrator
# or
npm install --save-dev keycloak-migrator
```

Expose the CLI through your package scripts (this makes `yarn keycloak-migrator <command>` work):

```json
{
  "scripts": {
    "keycloak-migrator": "keycloak-migrator"
  }
}
```

## Quick start

1. Copy `keycloak-migrator.config.json` to your project root and edit it.
2. Run `yarn keycloak-migrator create addClients` to scaffold a migration.
3. Open the generated file in `migrationDir`, add your Keycloak Admin Client calls, and export the `KeycloakMigration`.
4. Execute `yarn keycloak-migrator migrate` (or `--seed`) to apply the files. Applied IDs are stored on the realm so runs are idempotent.

## Configuration reference

`keycloak-migrator.config.json` (example):

```json
{
  "migrationDir": "./keycloak/migrations",
  "seedDir": "./keycloak/seeds",
  "keycloak": {
    "baseUrl": "$env.KEYCLOAK_BASE_URL",
    "realm": "example-realm",
    "adminUsername": "$env.KEYCLOAK_ADMIN_USER",
    "adminPassword": "$env.KEYCLOAK_ADMIN_PASSWORD"
  },
  "bootstrap": {
    "createRealm": true,
    "client": {
      "clientId": "example-api",
      "name": "Example API",
      "publicClient": false,
      "redirectUris": ["*"],
      "webOrigins": ["+"],
      "directAccessGrantsEnabled": true,
      "serviceAccountsEnabled": true,
      "rootUrl": "https://example.com",
      "baseUrl": "/callback"
    }
  }
}
```

- `migrationDir`: path to your migration files. Point it at `src/...` if you author in TypeScript or `dist/...` if you only want compiled JavaScript to run. Paths are resolved relative to the config file.
- `seedDir`: optional directory for seed files. Defaults to `<migrationDir>/seeds`.
- `keycloak`: host + credentials for the admin user. These values are passed to `@keycloak/keycloak-admin-client`.
- `bootstrap.createRealm`: when true, the realm is created automatically if it does not exist.
- `bootstrap.client`: optional. When provided, we will create the client (if missing) using the exact JSON you supply. Every property (beyond `clientId`) is forwarded to `kc.clients.create`, so you can configure advanced Keycloak features without waiting for this package to expose new flags.

You may keep several config files and pass a different one with `--config path/to/config.json`.

### Environment variables in config

Any string written as `$env.MY_VAR` is replaced with `process.env.MY_VAR` while loading the config. This is handy for secrets or host names:

```json
{
  "keycloak": {
    "baseUrl": "$env.KEYCLOAK_BASE_URL",
    "adminUsername": "$env.KEYCLOAK_ADMIN_USER",
    "adminPassword": "$env.KEYCLOAK_ADMIN_PASSWORD"
  }
}
```

If the referenced environment variable is missing the CLI exits with an error, so you never run migrations with blank credentials by accident.

## CLI commands

```bash
yarn keycloak-migrator create <name> [--seed] [--config path]
yarn keycloak-migrator migrate [--seed] [--config path]
```

- `create` generates `timestamp_name.ts` inside `migrationDir` (or `seedDir` when `--seed`). The file imports `KeycloakMigration` from this package and includes a stubbed `run` function.
- `migrate` executes every `.ts`/`.js` file in the target directory in lexical order. TypeScript files are compiled at runtime via `ts-node`, so you can run them without building if you prefer.

## Writing migrations

```ts
import { KeycloakMigration } from "keycloak-migrator";

const migration: KeycloakMigration = {
  id: "202402091530_addRolesToClient",
  description: "Seed initial roles",
  run: async (kc, realm) => {
    const client = await kc.clients.find({ realm, clientId: "example-api" });
    // implement your Keycloak Admin Client logic here
  },
};

export default migration;
```

- `kc` is an authenticated `KeycloakAdminClient`.
- `realm` is the realm from the config file.
- Throwing aborts the run and stops subsequent migrations.

## Bootstrapping behavior

- Realm bootstrap: when `bootstrap.createRealm` is true, the CLI ensures the realm exists before running migrations.
- Client bootstrap: specifying `bootstrap.client` makes the CLI ensure a client with the same `clientId` exists. All provided fields (redirect URIs, flows, service account options, etc.) are forwarded to `kc.clients.create`, with only `realm`, `clientId`, and sensible defaults (`enabled`, `alwaysDisplayInConsole`) added automatically. This keeps the bootstrap layer flexible for future Keycloak versions.

## Tips

- Track migrations in Git. CI can run `yarn keycloak-migrator migrate` to guarantee target Keycloak realms are up to date.
- For production deployments, consider pointing `migrationDir` to built JavaScript output and running `yarn keycloak-migrator migrate --config keycloak-migrator.prod.json`.
- If you see TypeScript errors about Node globals, install `@types/node` (or keep the lightweight shims included in this repo).

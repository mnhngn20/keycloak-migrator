# keycloak-migrator

Keycloak instances differ across environments, and manually recreating the same realms, clients, and restricted data (roles, users, etc.) is brittle. `keycloak-migrator` provides a repeatable, code-first workflow to define those changes once and apply them everywhere—local dev boxes, staging, production—using the Keycloak Admin API. Treat your Keycloak configuration like any other migration: check it into Git, run it in CI, and keep every environment in sync without pointing and clicking.

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

1. Copy `keycloak-migrator.config.js` to your project root and edit it (TypeScript and JSON are supported too, but JS makes it easy to reference `process.env`).
2. Run `yarn keycloak-migrator create addClients` to scaffold a migration.
3. Open the generated file in `migrationDir`, add your Keycloak Admin Client calls, and export the `KeycloakMigration`.
4. Execute `yarn keycloak-migrator migrate` (or `--seed`) to apply the files. Applied IDs are stored on the realm so runs are idempotent.

## Configuration reference

`keycloak-migrator.config.js` (example):

```js
/** @type {import("keycloak-migrator").KeycloakMigratorConfig} */
const config = {
  migrationDir: "./keycloak/migrations",
  seedDir: "./keycloak/seeds",
  tsconfigPath: "./tsconfig.json",
  keycloak: {
    baseUrl: process.env.KEYCLOAK_BASE_URL ?? "http://localhost:8080",
    realm: process.env.KEYCLOAK_REALM ?? "example-realm",
    adminUsername: process.env.KEYCLOAK_ADMIN_USER ?? "admin",
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
  },
  bootstrap: {
    ensureClient: true,
    client: {
      clientId: "example-api",
      name: "Example API",
      publicClient: false,
      redirectUris: ["*"],
      webOrigins: ["+"],
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
      rootUrl: "https://example.com",
      baseUrl: "/callback",
    },
  },
};

module.exports = config;
```

Prefer TypeScript? Use `keycloak-migrator.config.ts` with the exported type:

```ts
import type { KeycloakMigratorConfig } from "keycloak-migrator";

const config: KeycloakMigratorConfig = {
  migrationDir: "./keycloak/migrations",
  // ...
};

export default config;
```

- `migrationDir` — Where migration files live. Point it at `src/...` when authoring TypeScript files or `dist/...` for compiled JavaScript. Relative paths resolve from the config file location.
- `seedDir` — Optional directory for seed files. Defaults to `<migrationDir>/seeds`.
- `tsconfigPath` — Optional path to the `tsconfig.json` that defines your path aliases. If omitted we look for a `tsconfig.json` next to the config file.
- `keycloak.baseUrl` — Keycloak base URL (e.g. `http://localhost:8080`).
- `keycloak.realm` — Target realm. The CLI automatically creates it if it does not exist.
- `keycloak.adminUsername` / `keycloak.adminPassword` — Admin credentials used for the `admin-cli` login.
- `bootstrap.ensureClient` — Set to `true` to ensure the client supplied in `bootstrap.client` exists (created automatically if missing).
- `bootstrap.client` — Optional client payload passed straight to `kc.clients.create`. Because we use the official `ClientRepresentation` type, any Keycloak client property (redirect URIs, flows, secrets, etc.) is supported.

You may keep several config files (JS, TS, or JSON) and pass a different one with `--config path/to/config.js`.

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

- Realm bootstrap: the CLI always verifies the target realm exists before running migrations. Missing realms are created automatically.
- Client bootstrap: enable `bootstrap.ensureClient` to ensure a client with the same `clientId` as `bootstrap.client` exists. All provided fields (redirect URIs, flows, service account options, etc.) are forwarded to `kc.clients.create`, with only `realm`, `clientId`, and sensible defaults (`enabled`, `alwaysDisplayInConsole`) added automatically. This keeps the bootstrap layer flexible for future Keycloak versions.

## Tips

- Track migrations in Git. CI can run `yarn keycloak-migrator migrate` to guarantee target Keycloak realms are up to date.
- For production deployments, consider pointing `migrationDir` to built JavaScript output and running `yarn keycloak-migrator migrate --config keycloak-migrator.prod.json`.
- If you see TypeScript errors about Node globals, install `@types/node` (or keep the lightweight shims included in this repo).

module.exports = {
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
      redirectUris: ["*"],
      webOrigins: ["+"],
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
      rootUrl: "https://example.com",
      baseUrl: "/callback",
    },
  },
};

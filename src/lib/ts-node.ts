let registered = false;

export function ensureTsNode() {
  if (registered) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
      },
    });
    registered = true;
  } catch (err) {
    throw new Error(
      'ts-node is required to run TypeScript migrations. Install ts-node or compile your migrations to JavaScript before running keycloak-migrator.',
    );
  }
}

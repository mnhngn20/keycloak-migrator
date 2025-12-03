#!/usr/bin/env node
import minimist from 'minimist';
import { createMigration } from './lib/create-migration';
import { loadConfig } from './lib/config';
import { migrate } from './lib/migrate';

async function main() {
  const args = minimist(process.argv.slice(2));
  const command = args._[0];

  if (!command || args.help || command === 'help') {
    printHelp();
    return;
  }

  try {
    const config = await loadConfig(args.config as string | undefined);

    if (command === 'create') {
      const name = (args._[1] as string | undefined) ?? (args.name as string | undefined);
      createMigration(config, name, { seed: Boolean(args.seed) });
      return;
    }

    if (command === 'migrate') {
      await migrate(config, { seed: Boolean(args.seed) });
      process.exitCode = 0;
      setTimeout(() => process.exit(), 100);
      return;
    }

    console.error(`Unknown command "${command}".`);
    printHelp();
    process.exitCode = 1;
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

function printHelp() {
  console.log(`keycloak-migrator

Usage:
  keycloak-migrator create <name> [--seed] [--config <path>]
  keycloak-migrator migrate [--seed] [--config <path>]

Options:
  --seed            Create or run seed files instead of migrations
  --config <path>   Path to config file (defaults to keycloak-migrator.config.js)
  --help            Show this message
`);
}

main();

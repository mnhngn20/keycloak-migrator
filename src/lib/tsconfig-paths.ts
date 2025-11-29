import { existsSync } from 'fs';
import * as path from 'path';

let unregister: (() => void) | undefined;
let registeredPath: string | undefined;

export function registerTsconfigPaths(tsconfigPath?: string) {
  const candidate = resolveTsconfigPath(tsconfigPath);

  if (!candidate || candidate === registeredPath) {
    return;
  }

  const tsconfigPaths = require('tsconfig-paths');
  const configResult = tsconfigPaths.loadConfig(candidate);

  if (configResult.resultType === 'failed') {
    throw new Error(`Failed to load tsconfig at ${candidate}: ${configResult.message}`);
  }

  unregister?.();
  unregister = tsconfigPaths.register({
    baseUrl: configResult.absoluteBaseUrl,
    paths: configResult.paths,
  });
  registeredPath = candidate;
}

function resolveTsconfigPath(provided?: string): string | undefined {
  const baseDir = process.cwd();
  const normalized = provided
    ? path.isAbsolute(provided)
      ? provided
      : path.resolve(baseDir, provided)
    : path.resolve(baseDir, 'tsconfig.json');

  return existsSync(normalized) ? normalized : undefined;
}

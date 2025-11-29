declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string | number, options?: any): string;
  export function writeFileSync(path: string | number, data: any, options?: any): void;
  export function mkdirSync(path: string, options?: any): void;
  export function readdirSync(path: string): string[];
}

declare module 'path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(p: string): string;
  export function isAbsolute(p: string): boolean;
}

declare module 'url' {
  export function pathToFileURL(path: string): { href: string };
}

declare const process: {
  cwd(): string;
  exit(code?: number): never;
  exitCode?: number;
  env: Record<string, string | undefined>;
};

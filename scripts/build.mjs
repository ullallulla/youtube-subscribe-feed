import { cp, mkdir } from 'node:fs/promises';
import { build, context } from 'esbuild';

await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });

const options = {
  entryPoints: ['src/content/index.ts'],
  outfile: 'dist/content.js',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  sourcemap: true,
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const builder = await context(options);
  await builder.watch();
  console.log('Watching source files. Restart for public/ changes; reload the extension and YouTube after rebuilding.');
} else {
  await build(options);
}

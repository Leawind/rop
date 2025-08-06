import dts from 'bun-plugin-dts';

await Promise.all([
	Bun.build({
		entrypoints: ['./src/index.ts'],
		outdir: './dist',
		plugins: [dts()],
		format: 'esm',
		naming: '[dir]/[name].js',
	}),
]);

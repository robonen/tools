import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports } from '@robonen/oxlint';

export default defineConfig(
	compose(base, typescript, imports, {
		overrides: [
			{
				files: ['src/multi/global/index.ts'],
				rules: {
					'unicorn/prefer-global-this': 'off',
				},
			},
		],
	}),
);

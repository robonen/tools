#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { defineCommand, runMain } from 'citty';
import { resolve } from 'node:path';
import { splitByCase } from 'scule';

async function getLatestPackageVersion(packageName: string) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.warn(`Failed to fetch latest version for ${packageName}, using fallback`);
      return null;
    }
    
    const latestVersion = data['dist-tags']?.latest as string | undefined;

    if (!latestVersion)
        return null;

    return {
      version: latestVersion,
      versionRange: `^${latestVersion}`,
    };
  } catch (error) {
    console.warn(`Error fetching version for ${packageName}: ${error.message}`);
    return null;
  }
}

const PACKAGE_MANAGER_DEFAULT = 'pnpm@10.10.0';
const NODE_VERSION = '>=22.15.0';
const VITE_VERSION_DEFAULT = '^5.4.8';
const VITE_DTS_VERSION_DEFAULT = '^4.2.2';
const PATHE_VERSION_DEFAULT = '^1.1.2';
const DEFAULT_DIR = 'packages';

const generatePackageJson = async (name: string, path: string, hasVite: boolean) => {
    const [
        packageManagerVersion,
        viteVersion,
        viteDtsVersion,
        patheVersion,
    ] = await Promise.all([
      getLatestPackageVersion('pnpm').then(v => v?.version || PACKAGE_MANAGER_DEFAULT),
      hasVite ? getLatestPackageVersion('vite').then(v => v?.versionRange || VITE_VERSION_DEFAULT) : VITE_VERSION_DEFAULT,
      hasVite ? getLatestPackageVersion('vite-plugin-dts').then(v => v?.versionRange || VITE_DTS_VERSION_DEFAULT) : VITE_DTS_VERSION_DEFAULT,
      hasVite ? getLatestPackageVersion('pathe').then(v => v?.versionRange || PATHE_VERSION_DEFAULT) : PATHE_VERSION_DEFAULT,
    ]);

    const data = {
        name,
        private: true,
        version: '0.0.0',
        license: 'UNLICENSED',
        description: '',
        keywords: [],
        author: 'Robonen Andrew <robonenandrew@gmail.com>',
        repository: {
            type: 'git',
            url: 'git+https://github.com/robonen/tools.git',
            directory: path,
        },
        packageManager: `pnpm@${packageManagerVersion}`,
        engines: {
            node: NODE_VERSION,
        },
        type: 'module',
        files: ['dist'],
        exports: {
            '.': {
                types: './dist/index.d.ts',
                import: './dist/index.js',
                require: './dist/index.umd.js',
            },
        },
        scripts: {
            test: 'echo \"Error: no test specified\" && exit 1',
            ...(hasVite && {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview',
            }),
        },
        devDependencies: {
            '@robonen/tsconfig': 'workspace:*',
            ...(hasVite && {
              vite: viteVersion,
              'vite-plugin-dts': viteDtsVersion,
               pathe: patheVersion,
            }),
        },
    };

    return JSON.stringify(data, null, 2);
};

const generateJsrJson = (name: string) => {
    const data = {
        name,
        version: '0.0.0',
        exports: './src/index.ts',
    };

    return JSON.stringify(data, null, 2);
};

const generateViteConfig = () => `import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'pathe';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: '**/*.test.ts',
    }),
  ],
});
`;

const generateTsConfig = () => {
    const data = {
        extends: '@robonen/tsconfig/tsconfig.json',
    };

    return JSON.stringify(data, null, 2);
};

const generateReadme = (name: string) => `# ${name}`;

const createCommand = defineCommand({
    meta: {
        name: "create",
        version: "1.0.0",
        description: "Command to create a new project",
    },
    args: {
        name: {
            type: 'positional',
            description: "Name of the project",
            required: true,
        },
        path: {
            type: 'positional',
            description: "Relative path to the project folder",
            required: false,
        },
        vite: {
            type: 'boolean',
            description: "Add Vite to the project",
            required: false,
        },
    },
    async run({ args }) {
        const path = args.path ?? `./${DEFAULT_DIR}/${splitByCase(args.name).at(-1)}`;
        const resolvedPath = resolve(path);
        const hasVite = args.vite ?? false;

        console.log(`Creating project in ${resolvedPath}`);

        await mkdir(resolvedPath, { recursive: true });
        
        const packageJson = await generatePackageJson(args.name, path, hasVite);
        await writeFile(`${resolvedPath}/package.json`, packageJson);
        await writeFile(`${resolvedPath}/jsr.json`, generateJsrJson(args.name));
        await writeFile(`${resolvedPath}/tsconfig.json`, generateTsConfig());
        await writeFile(`${resolvedPath}/README.md`, generateReadme(args.name));

        if (hasVite) {
            await mkdir(`${resolvedPath}/src`, { recursive: true });
            await writeFile(`${resolvedPath}/vite.config.ts`, generateViteConfig());
        }

        console.log(`Project created successfully`);
    },
});

runMain(createCommand);

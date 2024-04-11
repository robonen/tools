import { mkdir, writeFile } from 'node:fs/promises';
import { defineCommand, runMain } from 'citty';
import { resolve } from 'pathe';
import { splitByCase } from 'scule';

const PACKAGE_MANAGER = 'pnpm@8.15.6';
const NODE_VERSION = '>=18.0.0';
const VITE_VERSION = '^5.2.8';
const VITE_DTS_VERSION = '^3.8.1';
const PATHE_VERSION = '^1.1.2'
const DEFAULT_DIR = 'packages';

const generatePackageJson = (name: string, path: string, hasVite: boolean) => {
    const data = {
        name,
        private: true,
        version: '1.0.0',
        license: 'UNLICENSED',
        description: '',
        keywords: [],
        author: 'Robonen Andrew <robonenandrew@gmail.com>',
        repository: {
            type: 'git',
            url: 'git+https://github.com/robonen/tools.git',
            directory: path,
        },
        packageManager: PACKAGE_MANAGER,
        engines: {
            node: NODE_VERSION,
        },
        type: 'module',
        files: ['dist'],
        main: './dist/index.umd.js',
        module: './dist/index.js',
        types: './dist/index.d.ts',
        exports: {
            '.': {
                import: './dist/index.js',
                require: './dist/index.umd.js',
                types: './dist/index.d.ts',
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
              vite: VITE_VERSION,
              'vite-plugin-dts': VITE_DTS_VERSION,
               pathe: PATHE_VERSION,
            }),
        },
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
    dts({ insertTypesEntry: true }),
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
        
        writeFile(`${resolvedPath}/package.json`, generatePackageJson(args.name, path, hasVite));
        writeFile(`${resolvedPath}/tsconfig.json`, generateTsConfig());
        writeFile(`${resolvedPath}/README.md`, generateReadme(args.name));

        if (hasVite) {
            mkdir(`${resolvedPath}/src`, { recursive: true });
            writeFile(`${resolvedPath}/vite.config.ts`, generateViteConfig());
        }

        console.log(`Project created successfully`);
    },
});

runMain(createCommand);

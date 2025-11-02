// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
type StorybookConfig = any;

const config: StorybookConfig = {
  // Monorepo-level Storybook config; point stories to the plugin package
  stories: ['../packages/plugin/src/**/*.stories.@(ts|tsx|mdx)'],

  addons: [getAbsolutePath("@storybook/addon-docs")],

  framework: {
    name: getAbsolutePath("@storybook/react-webpack5"),
    options: {},
  },

  babel: async (options: any) => ({
    ...options,
    presets: [...(options.presets || []), require.resolve('@babel/preset-typescript')],
  }),

  webpackFinal: async (config: any) => {
    // Ensure TS/TSX stories are transpiled (strip types) before CSF plugin
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            require.resolve('@babel/preset-typescript'),
            require.resolve('@babel/preset-react'),
          ],
        },
      },
    });
    // Resolve fallbacks for Node core modules used in tests/dev-only code that might leak into stories
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      tty: require.resolve('tty-browserify'),
    };
    // Alias heavy Node-centric package to a lightweight browser mock for Storybook
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Map both legacy 'node:' scheme and plain ids
      'node:fs': false,
      'node:path': require('path').resolve(require.resolve('path-browserify')),
      fs: false,
      path: require('path').resolve(require.resolve('path-browserify')),
      '@costscope/contracts': require('path').resolve(
        __dirname,
        '../packages/plugin/src/testing/contractsStorybookMock.ts',
      ),
    };

    // Suppress benign dynamic require warnings from third-party packages scanned by react-docgen
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      (warning: any) =>
        typeof warning?.message === 'string' &&
        warning.message.includes('Critical dependency: the request of a dependency is an expression'),
    ];
    return config;
  }
};
export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

// vite.config.mjs
import { resolve } from "path";
import fs from "fs/promises";
import { defineConfig } from "file:///Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/apps/portal/node_modules/vitest/dist/config.js";
import cssInjectedByJsPlugin from "file:///Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/node_modules/vite-plugin-css-injected-by-js/dist/esm/index.js";
import reactPlugin from "file:///Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/node_modules/@vitejs/plugin-react/dist/index.js";
import svgrPlugin from "file:///Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/node_modules/vite-plugin-svgr/dist/index.js";

// package.json
var package_default = {
  name: "@tryghost/portal",
  version: "2.64.2",
  license: "MIT",
  repository: "https://github.com/TryGhost/Ghost",
  author: "Ghost Foundation",
  files: [
    "umd/",
    "LICENSE",
    "README.md"
  ],
  publishConfig: {
    access: "public",
    registry: "https://registry.npmjs.org/"
  },
  scripts: {
    dev: 'concurrently "yarn preview -l silent" "yarn build:watch"',
    build: "vite build",
    "build:watch": "vite build --watch",
    preview: "vite preview",
    test: "vitest run",
    "test:watch": "vitest",
    "test:ci": "yarn test --coverage",
    "test:unit": "yarn test:ci",
    "lint:code": "eslint src test --ext .js,.ts --cache",
    "lint:types": "tsc --noEmit",
    lint: "yarn lint:code && yarn lint:types",
    preship: "yarn lint",
    ship: "node ../../.github/scripts/release-apps.js",
    prepublishOnly: "yarn build"
  },
  eslintConfig: {
    env: {
      browser: true
    },
    globals: {
      vi: "readonly",
      describe: "readonly",
      it: "readonly",
      test: "readonly",
      expect: "readonly",
      beforeEach: "readonly",
      afterEach: "readonly",
      beforeAll: "readonly",
      afterAll: "readonly",
      require: "readonly"
    },
    parserOptions: {
      sourceType: "module",
      ecmaVersion: 2022
    },
    extends: [
      "plugin:ghost/browser",
      "plugin:i18next/recommended",
      "plugin:react/recommended",
      "plugin:react/jsx-runtime"
    ],
    plugins: [
      "ghost",
      "i18next"
    ],
    rules: {
      "react/prop-types": "off",
      "ghost/filenames/match-regex": [
        "error",
        "^[a-z0-9.-]+$",
        false
      ]
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    overrides: [
      {
        files: [
          "*.ts",
          "*.tsx"
        ],
        parser: "@typescript-eslint/parser",
        parserOptions: {
          sourceType: "module",
          ecmaVersion: 2022,
          ecmaFeatures: {
            jsx: true
          },
          project: "./tsconfig.json"
        },
        extends: [
          "plugin:@typescript-eslint/recommended"
        ],
        plugins: [
          "@typescript-eslint"
        ]
      }
    ]
  },
  browserslist: {
    production: [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    development: [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  devDependencies: {
    "@babel/eslint-parser": "7.28.4",
    dompurify: "3.3.1",
    "@doist/react-interpolate": "2.2.1",
    "@sentry/react": "7.120.4",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "12.1.5",
    "@tryghost/i18n": "0.0.0",
    "@vitejs/plugin-react": "4.7.0",
    "@vitest/coverage-v8": "3.2.4",
    "@vitest/ui": "3.2.4",
    concurrently: "8.2.2",
    "cross-fetch": "4.1.0",
    "eslint-plugin-i18next": "6.1.3",
    jsdom: "24.1.3",
    react: "17.0.2",
    "react-dom": "17.0.2",
    vite: "5.4.20",
    "vite-plugin-css-injected-by-js": "3.5.2",
    "vite-plugin-svgr": "3.3.0",
    vitest: "3.2.4"
  }
};

// vite.config.mjs
import { SUPPORTED_LOCALES } from "file:///Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/ghost/i18n/index.js";
var __vite_injected_original_dirname = "/Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/apps/portal";
var vite_config_default = defineConfig((config) => {
  const outputFileName = package_default.name[0] === "@" ? package_default.name.slice(package_default.name.indexOf("/") + 1) : package_default.name;
  return {
    logLevel: process.env.CI ? "info" : "warn",
    clearScreen: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify(config.mode),
      REACT_APP_VERSION: JSON.stringify(process.env.npm_package_version)
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: true,
      // allows domain-name proxies to the preview server
      port: 4175,
      cors: true
    },
    server: {
      port: 5368
    },
    plugins: [
      cssInjectedByJsPlugin(),
      reactPlugin(),
      svgrPlugin()
    ],
    esbuild: {
      loader: "tsx",
      include: [/src\/.*\.[jt]sx?$/, /__mocks__\/.*\.[jt]sx?$/, /test\/.*\.[jt]sx?$/],
      exclude: []
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [
          {
            name: "load-js-files-as-jsx",
            setup(build) {
              build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
                loader: "jsx",
                contents: await fs.readFile(args.path, "utf8")
              }));
            }
          }
        ]
      }
    },
    build: {
      outDir: resolve(__vite_injected_original_dirname, "umd"),
      emptyOutDir: true,
      reportCompressedSize: false,
      minify: true,
      sourcemap: true,
      cssCodeSplit: false,
      lib: {
        entry: resolve(__vite_injected_original_dirname, "src/index.js"),
        formats: ["umd"],
        name: package_default.name,
        fileName: (format) => `${outputFileName}.min.js`
      },
      rollupOptions: {
        output: {
          manualChunks: false
        }
      },
      commonjsOptions: {
        include: [/ghost/, /node_modules/],
        dynamicRequireRoot: "../../",
        dynamicRequireTargets: SUPPORTED_LOCALES.map((locale) => `../../ghost/i18n/locales/${locale}/portal.json`)
      }
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./test/setup-tests.js",
      testTimeout: 1e4,
      coverage: {
        reporter: ["cobertura", "text-summary", "html"]
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIiwgInBhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9vd2Vuci9Eb2N1bWVudHMvR2l0SHViL2dob3N0LWF0bGFzLXdoaXRlbGFiZWwvYXBwcy9wb3J0YWxcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9vd2Vuci9Eb2N1bWVudHMvR2l0SHViL2dob3N0LWF0bGFzLXdoaXRlbGFiZWwvYXBwcy9wb3J0YWwvdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9vd2Vuci9Eb2N1bWVudHMvR2l0SHViL2dob3N0LWF0bGFzLXdoaXRlbGFiZWwvYXBwcy9wb3J0YWwvdml0ZS5jb25maWcubWpzXCI7LyogZXNsaW50LWVudiBub2RlICovXG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzL3Byb21pc2VzJztcblxuaW1wb3J0IHtkZWZpbmVDb25maWd9IGZyb20gJ3ZpdGVzdC9jb25maWcnO1xuaW1wb3J0IGNzc0luamVjdGVkQnlKc1BsdWdpbiBmcm9tICd2aXRlLXBsdWdpbi1jc3MtaW5qZWN0ZWQtYnktanMnO1xuaW1wb3J0IHJlYWN0UGx1Z2luIGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBzdmdyUGx1Z2luIGZyb20gJ3ZpdGUtcGx1Z2luLXN2Z3InO1xuXG5pbXBvcnQgcGtnIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuaW1wb3J0IHtTVVBQT1JURURfTE9DQUxFU30gZnJvbSAnQHRyeWdob3N0L2kxOG4nO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKGNvbmZpZykgPT4ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVOYW1lID0gcGtnLm5hbWVbMF0gPT09ICdAJyA/IHBrZy5uYW1lLnNsaWNlKHBrZy5uYW1lLmluZGV4T2YoJy8nKSArIDEpIDogcGtnLm5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBsb2dMZXZlbDogcHJvY2Vzcy5lbnYuQ0kgPyAnaW5mbycgOiAnd2FybicsXG4gICAgICAgIGNsZWFyU2NyZWVuOiBmYWxzZSxcbiAgICAgICAgZGVmaW5lOiB7XG4gICAgICAgICAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShjb25maWcubW9kZSksXG4gICAgICAgICAgICBSRUFDVF9BUFBfVkVSU0lPTjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbilcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlldzoge1xuICAgICAgICAgICAgaG9zdDogJzAuMC4wLjAnLFxuICAgICAgICAgICAgYWxsb3dlZEhvc3RzOiB0cnVlLCAvLyBhbGxvd3MgZG9tYWluLW5hbWUgcHJveGllcyB0byB0aGUgcHJldmlldyBzZXJ2ZXJcbiAgICAgICAgICAgIHBvcnQ6IDQxNzUsXG4gICAgICAgICAgICBjb3JzOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlcjoge1xuICAgICAgICAgICAgcG9ydDogNTM2OFxuICAgICAgICB9LFxuICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICBjc3NJbmplY3RlZEJ5SnNQbHVnaW4oKSxcbiAgICAgICAgICAgIHJlYWN0UGx1Z2luKCksXG4gICAgICAgICAgICBzdmdyUGx1Z2luKClcbiAgICAgICAgXSxcbiAgICAgICAgZXNidWlsZDoge1xuICAgICAgICAgICAgbG9hZGVyOiAndHN4JyxcbiAgICAgICAgICAgIGluY2x1ZGU6IFsvc3JjXFwvLipcXC5banRdc3g/JC8sIC9fX21vY2tzX19cXC8uKlxcLltqdF1zeD8kLywgL3Rlc3RcXC8uKlxcLltqdF1zeD8kL10sXG4gICAgICAgICAgICBleGNsdWRlOiBbXVxuICAgICAgICB9LFxuICAgICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbG9hZC1qcy1maWxlcy1hcy1qc3gnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dXAoYnVpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWlsZC5vbkxvYWQoe2ZpbHRlcjogL3NyY1xcLy4qXFwuanMkL30sIGFzeW5jIGFyZ3MgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVyOiAnanN4JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHM6IGF3YWl0IGZzLnJlYWRGaWxlKGFyZ3MucGF0aCwgJ3V0ZjgnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcjogcmVzb2x2ZShfX2Rpcm5hbWUsICd1bWQnKSxcbiAgICAgICAgICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgICAgICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxuICAgICAgICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgICAgICAgc291cmNlbWFwOiB0cnVlLFxuICAgICAgICAgICAgY3NzQ29kZVNwbGl0OiBmYWxzZSxcbiAgICAgICAgICAgIGxpYjoge1xuICAgICAgICAgICAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC5qcycpLFxuICAgICAgICAgICAgICAgIGZvcm1hdHM6IFsndW1kJ10sXG4gICAgICAgICAgICAgICAgbmFtZTogcGtnLm5hbWUsXG4gICAgICAgICAgICAgICAgZmlsZU5hbWU6IGZvcm1hdCA9PiBgJHtvdXRwdXRGaWxlTmFtZX0ubWluLmpzYFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlOiBbL2dob3N0LywgL25vZGVfbW9kdWxlcy9dLFxuICAgICAgICAgICAgICAgIGR5bmFtaWNSZXF1aXJlUm9vdDogJy4uLy4uLycsXG4gICAgICAgICAgICAgICAgZHluYW1pY1JlcXVpcmVUYXJnZXRzOiBTVVBQT1JURURfTE9DQUxFUy5tYXAobG9jYWxlID0+IGAuLi8uLi9naG9zdC9pMThuL2xvY2FsZXMvJHtsb2NhbGV9L3BvcnRhbC5qc29uYClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgICAgZ2xvYmFsczogdHJ1ZSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgICAgICAgICAgc2V0dXBGaWxlczogJy4vdGVzdC9zZXR1cC10ZXN0cy5qcycsXG4gICAgICAgICAgICB0ZXN0VGltZW91dDogMTAwMDAsXG4gICAgICAgICAgICBjb3ZlcmFnZToge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBbJ2NvYmVydHVyYScsICd0ZXh0LXN1bW1hcnknLCAnaHRtbCddXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCAie1xuICBcIm5hbWVcIjogXCJAdHJ5Z2hvc3QvcG9ydGFsXCIsXG4gIFwidmVyc2lvblwiOiBcIjIuNjQuMlwiLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJyZXBvc2l0b3J5XCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1RyeUdob3N0L0dob3N0XCIsXG4gIFwiYXV0aG9yXCI6IFwiR2hvc3QgRm91bmRhdGlvblwiLFxuICBcImZpbGVzXCI6IFtcbiAgICBcInVtZC9cIixcbiAgICBcIkxJQ0VOU0VcIixcbiAgICBcIlJFQURNRS5tZFwiXG4gIF0sXG4gIFwicHVibGlzaENvbmZpZ1wiOiB7XG4gICAgXCJhY2Nlc3NcIjogXCJwdWJsaWNcIixcbiAgICBcInJlZ2lzdHJ5XCI6IFwiaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcvXCJcbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImRldlwiOiBcImNvbmN1cnJlbnRseSBcXFwieWFybiBwcmV2aWV3IC1sIHNpbGVudFxcXCIgXFxcInlhcm4gYnVpbGQ6d2F0Y2hcXFwiXCIsXG4gICAgXCJidWlsZFwiOiBcInZpdGUgYnVpbGRcIixcbiAgICBcImJ1aWxkOndhdGNoXCI6IFwidml0ZSBidWlsZCAtLXdhdGNoXCIsXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3XCIsXG4gICAgXCJ0ZXN0XCI6IFwidml0ZXN0IHJ1blwiLFxuICAgIFwidGVzdDp3YXRjaFwiOiBcInZpdGVzdFwiLFxuICAgIFwidGVzdDpjaVwiOiBcInlhcm4gdGVzdCAtLWNvdmVyYWdlXCIsXG4gICAgXCJ0ZXN0OnVuaXRcIjogXCJ5YXJuIHRlc3Q6Y2lcIixcbiAgICBcImxpbnQ6Y29kZVwiOiBcImVzbGludCBzcmMgdGVzdCAtLWV4dCAuanMsLnRzIC0tY2FjaGVcIixcbiAgICBcImxpbnQ6dHlwZXNcIjogXCJ0c2MgLS1ub0VtaXRcIixcbiAgICBcImxpbnRcIjogXCJ5YXJuIGxpbnQ6Y29kZSAmJiB5YXJuIGxpbnQ6dHlwZXNcIixcbiAgICBcInByZXNoaXBcIjogXCJ5YXJuIGxpbnRcIixcbiAgICBcInNoaXBcIjogXCJub2RlIC4uLy4uLy5naXRodWIvc2NyaXB0cy9yZWxlYXNlLWFwcHMuanNcIixcbiAgICBcInByZXB1Ymxpc2hPbmx5XCI6IFwieWFybiBidWlsZFwiXG4gIH0sXG4gIFwiZXNsaW50Q29uZmlnXCI6IHtcbiAgICBcImVudlwiOiB7XG4gICAgICBcImJyb3dzZXJcIjogdHJ1ZVxuICAgIH0sXG4gICAgXCJnbG9iYWxzXCI6IHtcbiAgICAgIFwidmlcIjogXCJyZWFkb25seVwiLFxuICAgICAgXCJkZXNjcmliZVwiOiBcInJlYWRvbmx5XCIsXG4gICAgICBcIml0XCI6IFwicmVhZG9ubHlcIixcbiAgICAgIFwidGVzdFwiOiBcInJlYWRvbmx5XCIsXG4gICAgICBcImV4cGVjdFwiOiBcInJlYWRvbmx5XCIsXG4gICAgICBcImJlZm9yZUVhY2hcIjogXCJyZWFkb25seVwiLFxuICAgICAgXCJhZnRlckVhY2hcIjogXCJyZWFkb25seVwiLFxuICAgICAgXCJiZWZvcmVBbGxcIjogXCJyZWFkb25seVwiLFxuICAgICAgXCJhZnRlckFsbFwiOiBcInJlYWRvbmx5XCIsXG4gICAgICBcInJlcXVpcmVcIjogXCJyZWFkb25seVwiXG4gICAgfSxcbiAgICBcInBhcnNlck9wdGlvbnNcIjoge1xuICAgICAgXCJzb3VyY2VUeXBlXCI6IFwibW9kdWxlXCIsXG4gICAgICBcImVjbWFWZXJzaW9uXCI6IDIwMjJcbiAgICB9LFxuICAgIFwiZXh0ZW5kc1wiOiBbXG4gICAgICBcInBsdWdpbjpnaG9zdC9icm93c2VyXCIsXG4gICAgICBcInBsdWdpbjppMThuZXh0L3JlY29tbWVuZGVkXCIsXG4gICAgICBcInBsdWdpbjpyZWFjdC9yZWNvbW1lbmRlZFwiLFxuICAgICAgXCJwbHVnaW46cmVhY3QvanN4LXJ1bnRpbWVcIlxuICAgIF0sXG4gICAgXCJwbHVnaW5zXCI6IFtcbiAgICAgIFwiZ2hvc3RcIixcbiAgICAgIFwiaTE4bmV4dFwiXG4gICAgXSxcbiAgICBcInJ1bGVzXCI6IHtcbiAgICAgIFwicmVhY3QvcHJvcC10eXBlc1wiOiBcIm9mZlwiLFxuICAgICAgXCJnaG9zdC9maWxlbmFtZXMvbWF0Y2gtcmVnZXhcIjogW1xuICAgICAgICBcImVycm9yXCIsXG4gICAgICAgIFwiXlthLXowLTkuLV0rJFwiLFxuICAgICAgICBmYWxzZVxuICAgICAgXVxuICAgIH0sXG4gICAgXCJzZXR0aW5nc1wiOiB7XG4gICAgICBcInJlYWN0XCI6IHtcbiAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiZGV0ZWN0XCJcbiAgICAgIH1cbiAgICB9LFxuICAgIFwib3ZlcnJpZGVzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJmaWxlc1wiOiBbXG4gICAgICAgICAgXCIqLnRzXCIsXG4gICAgICAgICAgXCIqLnRzeFwiXG4gICAgICAgIF0sXG4gICAgICAgIFwicGFyc2VyXCI6IFwiQHR5cGVzY3JpcHQtZXNsaW50L3BhcnNlclwiLFxuICAgICAgICBcInBhcnNlck9wdGlvbnNcIjoge1xuICAgICAgICAgIFwic291cmNlVHlwZVwiOiBcIm1vZHVsZVwiLFxuICAgICAgICAgIFwiZWNtYVZlcnNpb25cIjogMjAyMixcbiAgICAgICAgICBcImVjbWFGZWF0dXJlc1wiOiB7XG4gICAgICAgICAgICBcImpzeFwiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInByb2plY3RcIjogXCIuL3RzY29uZmlnLmpzb25cIlxuICAgICAgICB9LFxuICAgICAgICBcImV4dGVuZHNcIjogW1xuICAgICAgICAgIFwicGx1Z2luOkB0eXBlc2NyaXB0LWVzbGludC9yZWNvbW1lbmRlZFwiXG4gICAgICAgIF0sXG4gICAgICAgIFwicGx1Z2luc1wiOiBbXG4gICAgICAgICAgXCJAdHlwZXNjcmlwdC1lc2xpbnRcIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImJyb3dzZXJzbGlzdFwiOiB7XG4gICAgXCJwcm9kdWN0aW9uXCI6IFtcbiAgICAgIFwiPjAuMiVcIixcbiAgICAgIFwibm90IGRlYWRcIixcbiAgICAgIFwibm90IG9wX21pbmkgYWxsXCJcbiAgICBdLFxuICAgIFwiZGV2ZWxvcG1lbnRcIjogW1xuICAgICAgXCJsYXN0IDEgY2hyb21lIHZlcnNpb25cIixcbiAgICAgIFwibGFzdCAxIGZpcmVmb3ggdmVyc2lvblwiLFxuICAgICAgXCJsYXN0IDEgc2FmYXJpIHZlcnNpb25cIlxuICAgIF1cbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGJhYmVsL2VzbGludC1wYXJzZXJcIjogXCI3LjI4LjRcIixcbiAgICBcImRvbXB1cmlmeVwiOiBcIjMuMy4xXCIsXG4gICAgXCJAZG9pc3QvcmVhY3QtaW50ZXJwb2xhdGVcIjogXCIyLjIuMVwiLFxuICAgIFwiQHNlbnRyeS9yZWFjdFwiOiBcIjcuMTIwLjRcIixcbiAgICBcIkB0ZXN0aW5nLWxpYnJhcnkvamVzdC1kb21cIjogXCI2LjkuMVwiLFxuICAgIFwiQHRlc3RpbmctbGlicmFyeS9yZWFjdFwiOiBcIjEyLjEuNVwiLFxuICAgIFwiQHRyeWdob3N0L2kxOG5cIjogXCIwLjAuMFwiLFxuICAgIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCI0LjcuMFwiLFxuICAgIFwiQHZpdGVzdC9jb3ZlcmFnZS12OFwiOiBcIjMuMi40XCIsXG4gICAgXCJAdml0ZXN0L3VpXCI6IFwiMy4yLjRcIixcbiAgICBcImNvbmN1cnJlbnRseVwiOiBcIjguMi4yXCIsXG4gICAgXCJjcm9zcy1mZXRjaFwiOiBcIjQuMS4wXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLWkxOG5leHRcIjogXCI2LjEuM1wiLFxuICAgIFwianNkb21cIjogXCIyNC4xLjNcIixcbiAgICBcInJlYWN0XCI6IFwiMTcuMC4yXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCIxNy4wLjJcIixcbiAgICBcInZpdGVcIjogXCI1LjQuMjBcIixcbiAgICBcInZpdGUtcGx1Z2luLWNzcy1pbmplY3RlZC1ieS1qc1wiOiBcIjMuNS4yXCIsXG4gICAgXCJ2aXRlLXBsdWdpbi1zdmdyXCI6IFwiMy4zLjBcIixcbiAgICBcInZpdGVzdFwiOiBcIjMuMi40XCJcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVEsZUFBYztBQUN0QixPQUFPLFFBQVE7QUFFZixTQUFRLG9CQUFtQjtBQUMzQixPQUFPLDJCQUEyQjtBQUNsQyxPQUFPLGlCQUFpQjtBQUN4QixPQUFPLGdCQUFnQjs7O0FDUHZCO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxTQUFXO0FBQUEsRUFDWCxZQUFjO0FBQUEsRUFDZCxRQUFVO0FBQUEsRUFDVixPQUFTO0FBQUEsSUFDUDtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUFBLEVBQ0EsZUFBaUI7QUFBQSxJQUNmLFFBQVU7QUFBQSxJQUNWLFVBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFPO0FBQUEsSUFDUCxPQUFTO0FBQUEsSUFDVCxlQUFlO0FBQUEsSUFDZixTQUFXO0FBQUEsSUFDWCxNQUFRO0FBQUEsSUFDUixjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsSUFDYixhQUFhO0FBQUEsSUFDYixjQUFjO0FBQUEsSUFDZCxNQUFRO0FBQUEsSUFDUixTQUFXO0FBQUEsSUFDWCxNQUFRO0FBQUEsSUFDUixnQkFBa0I7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsY0FBZ0I7QUFBQSxJQUNkLEtBQU87QUFBQSxNQUNMLFNBQVc7QUFBQSxJQUNiO0FBQUEsSUFDQSxTQUFXO0FBQUEsTUFDVCxJQUFNO0FBQUEsTUFDTixVQUFZO0FBQUEsTUFDWixJQUFNO0FBQUEsTUFDTixNQUFRO0FBQUEsTUFDUixRQUFVO0FBQUEsTUFDVixZQUFjO0FBQUEsTUFDZCxXQUFhO0FBQUEsTUFDYixXQUFhO0FBQUEsTUFDYixVQUFZO0FBQUEsTUFDWixTQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0EsZUFBaUI7QUFBQSxNQUNmLFlBQWM7QUFBQSxNQUNkLGFBQWU7QUFBQSxJQUNqQjtBQUFBLElBQ0EsU0FBVztBQUFBLE1BQ1Q7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFXO0FBQUEsTUFDVDtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFTO0FBQUEsTUFDUCxvQkFBb0I7QUFBQSxNQUNwQiwrQkFBK0I7QUFBQSxRQUM3QjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFVBQVk7QUFBQSxNQUNWLE9BQVM7QUFBQSxRQUNQLFNBQVc7QUFBQSxNQUNiO0FBQUEsSUFDRjtBQUFBLElBQ0EsV0FBYTtBQUFBLE1BQ1g7QUFBQSxRQUNFLE9BQVM7QUFBQSxVQUNQO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFFBQVU7QUFBQSxRQUNWLGVBQWlCO0FBQUEsVUFDZixZQUFjO0FBQUEsVUFDZCxhQUFlO0FBQUEsVUFDZixjQUFnQjtBQUFBLFlBQ2QsS0FBTztBQUFBLFVBQ1Q7QUFBQSxVQUNBLFNBQVc7QUFBQSxRQUNiO0FBQUEsUUFDQSxTQUFXO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFNBQVc7QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBZ0I7QUFBQSxJQUNkLFlBQWM7QUFBQSxNQUNaO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxhQUFlO0FBQUEsTUFDYjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGlCQUFtQjtBQUFBLElBQ2pCLHdCQUF3QjtBQUFBLElBQ3hCLFdBQWE7QUFBQSxJQUNiLDRCQUE0QjtBQUFBLElBQzVCLGlCQUFpQjtBQUFBLElBQ2pCLDZCQUE2QjtBQUFBLElBQzdCLDBCQUEwQjtBQUFBLElBQzFCLGtCQUFrQjtBQUFBLElBQ2xCLHdCQUF3QjtBQUFBLElBQ3hCLHVCQUF1QjtBQUFBLElBQ3ZCLGNBQWM7QUFBQSxJQUNkLGNBQWdCO0FBQUEsSUFDaEIsZUFBZTtBQUFBLElBQ2YseUJBQXlCO0FBQUEsSUFDekIsT0FBUztBQUFBLElBQ1QsT0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsTUFBUTtBQUFBLElBQ1Isa0NBQWtDO0FBQUEsSUFDbEMsb0JBQW9CO0FBQUEsSUFDcEIsUUFBVTtBQUFBLEVBQ1o7QUFDRjs7O0FEekhBLFNBQVEseUJBQXdCO0FBWGhDLElBQU0sbUNBQW1DO0FBYXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLFdBQVc7QUFDcEMsUUFBTSxpQkFBaUIsZ0JBQUksS0FBSyxDQUFDLE1BQU0sTUFBTSxnQkFBSSxLQUFLLE1BQU0sZ0JBQUksS0FBSyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksZ0JBQUk7QUFFN0YsU0FBTztBQUFBLElBQ0gsVUFBVSxRQUFRLElBQUksS0FBSyxTQUFTO0FBQUEsSUFDcEMsYUFBYTtBQUFBLElBQ2IsUUFBUTtBQUFBLE1BQ0osd0JBQXdCLEtBQUssVUFBVSxPQUFPLElBQUk7QUFBQSxNQUNsRCxtQkFBbUIsS0FBSyxVQUFVLFFBQVEsSUFBSSxtQkFBbUI7QUFBQSxJQUNyRTtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsTUFBTTtBQUFBLE1BQ04sY0FBYztBQUFBO0FBQUEsTUFDZCxNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDVjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ0osTUFBTTtBQUFBLElBQ1Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNMLHNCQUFzQjtBQUFBLE1BQ3RCLFlBQVk7QUFBQSxNQUNaLFdBQVc7QUFBQSxJQUNmO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixTQUFTLENBQUMscUJBQXFCLDJCQUEyQixvQkFBb0I7QUFBQSxNQUM5RSxTQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDVixnQkFBZ0I7QUFBQSxRQUNaLFNBQVM7QUFBQSxVQUNMO0FBQUEsWUFDSSxNQUFNO0FBQUEsWUFDTixNQUFNLE9BQU87QUFDVCxvQkFBTSxPQUFPLEVBQUMsUUFBUSxlQUFjLEdBQUcsT0FBTSxVQUFTO0FBQUEsZ0JBQ2xELFFBQVE7QUFBQSxnQkFDUixVQUFVLE1BQU0sR0FBRyxTQUFTLEtBQUssTUFBTSxNQUFNO0FBQUEsY0FDakQsRUFBRTtBQUFBLFlBQ047QUFBQSxVQUNKO0FBQUEsUUFDSjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDSCxRQUFRLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQ2hDLGFBQWE7QUFBQSxNQUNiLHNCQUFzQjtBQUFBLE1BQ3RCLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxNQUNYLGNBQWM7QUFBQSxNQUNkLEtBQUs7QUFBQSxRQUNELE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsUUFDeEMsU0FBUyxDQUFDLEtBQUs7QUFBQSxRQUNmLE1BQU0sZ0JBQUk7QUFBQSxRQUNWLFVBQVUsWUFBVSxHQUFHLGNBQWM7QUFBQSxNQUN6QztBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ1gsUUFBUTtBQUFBLFVBQ0osY0FBYztBQUFBLFFBQ2xCO0FBQUEsTUFDSjtBQUFBLE1BQ0EsaUJBQWlCO0FBQUEsUUFDYixTQUFTLENBQUMsU0FBUyxjQUFjO0FBQUEsUUFDakMsb0JBQW9CO0FBQUEsUUFDcEIsdUJBQXVCLGtCQUFrQixJQUFJLFlBQVUsNEJBQTRCLE1BQU0sY0FBYztBQUFBLE1BQzNHO0FBQUEsSUFDSjtBQUFBLElBQ0EsTUFBTTtBQUFBLE1BQ0YsU0FBUztBQUFBLE1BQ1QsYUFBYTtBQUFBLE1BQ2IsWUFBWTtBQUFBLE1BQ1osYUFBYTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ04sVUFBVSxDQUFDLGFBQWEsZ0JBQWdCLE1BQU07QUFBQSxNQUNsRDtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

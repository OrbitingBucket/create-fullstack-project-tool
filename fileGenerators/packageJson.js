const generatePackageJson = (projectConfig) => {
  const scripts = {};
  const dependencies = {};
  const devDependencies = {};

  // Default type, can be overridden by specific framework needs (e.g., Angular)
  let packageType = projectConfig.language === 'typescript' || projectConfig.bundler === 'vite' ? 'module' : 'commonjs';


  // Frontend dependencies and scripts
  if (projectConfig.jsFramework !== 'skip') {
    // Bundler-specific configurations
    switch (projectConfig.bundler) {
      case 'vite':
        scripts.dev = 'vite';
        scripts.build = 'vite build';
        scripts.preview = 'vite preview';
        devDependencies.vite = '^5.2.0'; // Updated to a more recent version
        break;
      case 'webpack':
        scripts.dev = 'webpack serve --mode development';
        scripts.build = 'webpack --mode production';
        devDependencies.webpack = '^5.90.0'; // Updated
        devDependencies['webpack-cli'] = '^5.1.4';
        devDependencies['webpack-dev-server'] = '^4.15.1'; // Check for v5 if available
        devDependencies['html-webpack-plugin'] = '^5.6.0'; // Updated
        // Loaders for CSS, Sass, Images, Fonts
        devDependencies['style-loader'] = '^3.3.4'; // Injects styles into DOM
        devDependencies['css-loader'] = '^6.10.0'; // Translates CSS into CommonJS
        devDependencies['sass-loader'] = '^14.1.1'; // Compiles Sass to CSS
        devDependencies['sass'] = '^1.71.1'; // Dart Sass
        devDependencies['file-loader'] = '^6.2.0'; // For images and fonts (can also use asset modules)
        // For asset modules (alternative to file-loader/url-loader for Webpack 5+)
        // No specific package needed, configured in webpack.config.js

        if (projectConfig.language === 'typescript') {
          devDependencies['ts-loader'] = '^9.5.1'; // For TypeScript with Webpack
        }
        break;
      case 'rollup':
        scripts.dev = 'rollup -c -w';
        scripts.build = 'rollup -c';
        devDependencies.rollup = '^4.9.0'; // Updated
        devDependencies['@rollup/plugin-node-resolve'] = '^15.2.3';
        devDependencies['@rollup/plugin-commonjs'] = '^25.0.7';
        devDependencies['rollup-plugin-postcss'] = '^4.0.2'; // For CSS and Sass
        devDependencies['postcss'] = '^8.4.35'; // Peer dependency for rollup-plugin-postcss
        devDependencies['sass'] = '^1.71.1'; // For Sass compilation with postcss
        devDependencies['@rollup/plugin-image'] = '^3.0.3'; // For images

        if (projectConfig.language === 'typescript') {
          devDependencies['@rollup/plugin-typescript'] = '^11.1.6'; // For TypeScript with Rollup
        }
        break;
      case 'parcel':
        scripts.dev = `parcel ${projectConfig.jsFramework === 'angular' ? 'src/index.html' : 'index.html'}`; // Angular typically has index in src
        scripts.build = `parcel build ${projectConfig.jsFramework === 'angular' ? 'src/index.html' : 'index.html'}`;
        devDependencies.parcel = '^2.11.0'; // Updated
        break;
      case 'esbuild':
        const entryPoint = projectConfig.language === 'typescript' ?
                           (projectConfig.jsFramework === 'react' || projectConfig.jsFramework === 'solid' ? 'src/index.tsx' : 'src/index.ts') :
                           (projectConfig.jsFramework === 'react' || projectConfig.jsFramework === 'solid' ? 'src/index.jsx' : 'src/index.js');
        scripts.dev = `esbuild ${entryPoint} --bundle --servedir=public --outdir=dist --serve=localhost:3000`;
        scripts.build = `esbuild ${entryPoint} --bundle --outfile=dist/bundle.js --minify --sourcemap`;
        devDependencies.esbuild = '^0.20.0'; // Updated
        break;
    }

    // Framework-specific dependencies
    switch (projectConfig.jsFramework) {
      case 'react':
        dependencies.react = '^18.2.0';
        dependencies['react-dom'] = '^18.2.0';
        if (projectConfig.bundler === 'vite') {
          devDependencies['@vitejs/plugin-react'] = '^4.2.0'; // Keep as is or update if needed
        }
        if (projectConfig.language === 'typescript') {
          devDependencies['@types/react'] = '^18.2.0';
          devDependencies['@types/react-dom'] = '^18.2.0';
        }
        break;

      case 'vue':
        dependencies.vue = '^3.4.0'; // Updated
        if (projectConfig.bundler === 'vite') {
          devDependencies['@vitejs/plugin-vue'] = '^5.0.0'; // Updated for Vite 5
        }
        if (projectConfig.language === 'typescript') {
          devDependencies['vue-tsc'] = '^1.8.27'; // Updated
        }
        break;

      case 'angular':
        // Angular CLI handles most dependencies, these are core ones.
        // ng new will create its own package.json, this is a fallback or for non-CLI setups.
        scripts.ng = 'ng';
        scripts.start = 'ng serve'; // Overrides backend start if only frontend
        scripts.build = 'ng build';
        scripts.watch = 'ng build --watch --configuration development';
        scripts.test = 'ng test';

        dependencies['@angular/animations'] = '~17.1.0'; // Use ~ for Angular patch versions
        dependencies['@angular/common'] = '~17.1.0';
        dependencies['@angular/compiler'] = '~17.1.0';
        dependencies['@angular/core'] = '~17.1.0';
        dependencies['@angular/forms'] = '~17.1.0';
        dependencies['@angular/platform-browser'] = '~17.1.0';
        dependencies['@angular/platform-browser-dynamic'] = '~17.1.0';
        dependencies['@angular/router'] = '~17.1.0';
        dependencies.rxjs = '~7.8.0';
        dependencies.tslib = '^2.6.2'; // Updated
        dependencies['zone.js'] = '~0.14.3'; // Updated

        devDependencies['@angular-devkit/build-angular'] = '~17.1.0';
        devDependencies['@angular/cli'] = '~17.1.0';
        devDependencies['@angular/compiler-cli'] = '~17.1.0';
        if (projectConfig.language === 'typescript') {
          devDependencies.typescript = '~5.3.0'; // Angular has specific TS version
        }
        packageType = 'module'; // Angular 17+ uses ES modules
        break;

      case 'svelte':
        if (projectConfig.bundler === 'vite') {
          devDependencies['@sveltejs/vite-plugin-svelte'] = '^3.0.0'; // Updated
        }
        dependencies.svelte = '^4.2.9'; // Updated
        if (projectConfig.language === 'typescript') {
            devDependencies['@tsconfig/svelte'] = '^5.0.2';
            devDependencies['svelte-check'] = '^3.6.2';
        }
        break;

      case 'solid':
        dependencies['solid-js'] = '^1.8.11'; // Updated
        if (projectConfig.bundler === 'vite') {
          devDependencies['vite-plugin-solid'] = '^2.8.2'; // Updated
        }
        if (projectConfig.language === 'typescript') {
          devDependencies['typescript'] = '^5.3.0'; // Solid works well with latest TS
        }
        break;

      case 'vanilla':
        // No specific framework dependencies needed
        break;
    }

    // TypeScript dependencies (general, if not Angular which has its own)
    if (projectConfig.language === 'typescript' && projectConfig.jsFramework !== 'angular') {
      devDependencies.typescript = '^5.3.0'; // General TS version
      devDependencies['@types/node'] = '^20.11.0'; // Updated
    }

    // Styling dependencies
    switch (projectConfig.styling) {
      case 'tailwind':
        // Using Tailwind v4 alpha dependencies
        devDependencies.tailwindcss = '^4.0.0-alpha.17';
        devDependencies.postcss = '^8.4.33';
        if (projectConfig.bundler === 'vite') {
          devDependencies['@tailwindcss/vite'] = '^4.0.0-alpha.17';
        } else {
          devDependencies['@tailwindcss/postcss'] = '^4.0.0-alpha.17';
        }
        // `autoprefixer` is no longer needed as a separate dependency in v4
        break;
      case 'bootstrap':
        dependencies.bootstrap = '^5.3.2';
        break;
      case 'bulma':
        dependencies.bulma = '^0.9.4'; // Check for v1.0 if available
        break;
      case 'styled-components':
        dependencies['styled-components'] = '^6.1.8'; // Updated
        if (projectConfig.language === 'typescript') {
          devDependencies['@types/styled-components'] = '^5.1.34';
        }
        // Babel plugin for styled-components (improves debugging, SSR, minification)
        devDependencies['babel-plugin-styled-components'] = '^2.1.4'; // Check latest version
        break;
      case 'emotion':
        dependencies['@emotion/react'] = '^11.11.3'; // Updated
        dependencies['@emotion/styled'] = '^11.11.0';
        // Babel plugin for emotion (similar benefits to styled-components plugin)
        devDependencies['@emotion/babel-plugin'] = '^11.11.0'; // Check latest version
        break;
      case 'sass':
        devDependencies.sass = '^1.70.0'; // Updated
        break;
    }

    // UI Library dependencies
    if (projectConfig.uiLibrary && projectConfig.uiLibrary !== 'none') {
        switch (projectConfig.uiLibrary) {
        case 'mui': // Material-UI
            dependencies['@mui/material'] = '^5.15.4'; // Updated
            dependencies['@mui/icons-material'] = '^5.15.4'; // Often used with MUI
            dependencies['@emotion/react'] = '^11.11.3'; // Already listed if emotion is chosen
            dependencies['@emotion/styled'] = '^11.11.0'; // Already listed
            break;
        case 'antd':
            dependencies.antd = '^5.13.0'; // Updated
            break;
        case 'chakra':
            dependencies['@chakra-ui/react'] = '^2.8.2';
            dependencies['@emotion/react'] = '^11.11.3';
            dependencies['@emotion/styled'] = '^11.11.0';
            dependencies['framer-motion'] = '^10.18.0'; // Updated
            break;
        case 'mantine':
            dependencies['@mantine/core'] = '^7.4.2'; // Updated
            dependencies['@mantine/hooks'] = '^7.4.2';
            devDependencies['postcss-preset-mantine'] = '^1.12.3'; // For Mantine with PostCSS
            devDependencies['postcss-simple-vars'] = '^7.0.1';
            break;
        case 'shadcn':
            // shadcn/ui is more about copy-pasting, but some core peer deps might be listed
            dependencies['class-variance-authority'] = '^0.7.0';
            dependencies.clsx = '^2.1.0'; // Updated
            dependencies['tailwind-merge'] = '^2.2.0'; // Updated
            dependencies['lucide-react'] = '^0.309.0'; // Common icon library with shadcn
            if (projectConfig.styling !== 'tailwind') {
                console.warn("Shadcn/ui is designed to work with Tailwind CSS. Please ensure Tailwind is also selected.");
            }
            break;
        }
    }


    // State Management dependencies
    if (projectConfig.stateManagement && projectConfig.stateManagement !== 'none') {
        switch (projectConfig.stateManagement) {
        case 'redux':
            dependencies['@reduxjs/toolkit'] = '^2.0.1'; // Updated
            dependencies['react-redux'] = '^9.1.0'; // Updated
            break;
        case 'zustand':
            dependencies.zustand = '^4.4.7';
            break;
        case 'jotai':
            dependencies.jotai = '^2.6.4'; // Updated
            break;
        case 'recoil':
            dependencies.recoil = '^0.7.7';
            break;
        case 'mobx':
            dependencies.mobx = '^6.12.0';
            dependencies['mobx-react-lite'] = '^4.0.5'; // For React
            // For Vue: dependencies['mobx-vue-lite'] = '...'
            break;
        }
    }
  }

  // Backend dependencies and scripts
  if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python') {
    const serverEntry = projectConfig.language === 'typescript' ? 'server/src/server.ts' : 'server/src/server.js';
    const serverDistEntry = projectConfig.language === 'typescript' ? 'server/dist/server.js' : 'server/src/server.js';

    const serverDevCommand = projectConfig.language === 'typescript'
      ? `nodemon --exec "node --loader ts-node/esm ${serverEntry}"`
      : `nodemon ${serverEntry}`;

    scripts['dev:server'] = serverDevCommand;
    scripts['build:server'] = projectConfig.language === 'typescript' ? 'tsc -p tsconfig.server.json' : 'echo "No build step needed for JavaScript backend"';
    scripts.start = `node ${serverDistEntry}`;


    // Backend framework dependencies
    switch (projectConfig.backend) {
      case 'express':
        dependencies.express = '^4.18.2'; // Updated
        dependencies.cors = '^2.8.5';
        dependencies.dotenv = '^16.3.1'; // Updated
        if (projectConfig.language === 'typescript') {
          devDependencies['@types/express'] = '^4.17.21'; // Updated
          devDependencies['@types/cors'] = '^2.8.17'; // Updated
        }
        break;

      case 'fastify':
        dependencies.fastify = '^4.25.0'; // Updated
        dependencies['@fastify/cors'] = '^9.0.1'; // Updated
        dependencies['@fastify/sensible'] = '^5.5.0'; // Good for error handling, etc.
        dependencies.dotenv = '^16.3.1';
        if (projectConfig.language === 'typescript') {
            // Fastify has good built-in TS support, specific @types might not be needed for core
        }
        break;

      case 'koa':
        dependencies.koa = '^2.15.0'; // Updated
        dependencies['@koa/cors'] = '^5.0.0'; // Updated
        dependencies['koa-router'] = '^12.0.1';
        dependencies['koa-bodyparser'] = '^4.4.1'; // Or koa-body for more features
        dependencies.dotenv = '^16.3.1';
        if (projectConfig.language === 'typescript') {
          devDependencies['@types/koa'] = '^2.14.0'; // Updated
          devDependencies['@types/koa-router'] = '^7.4.8';
          devDependencies['@types/koa-bodyparser'] = '^4.3.12';
        }
        break;

      case 'nest':
        dependencies['@nestjs/common'] = '^10.3.0'; // Updated
        dependencies['@nestjs/core'] = '^10.3.0';
        dependencies['@nestjs/platform-express'] = '^10.3.0'; // Or platform-fastify
        dependencies['reflect-metadata'] = '^0.2.1'; // Updated
        dependencies.rxjs = '^7.8.1'; // Updated
        devDependencies['@nestjs/cli'] = '^10.3.0'; // Updated
        devDependencies['@nestjs/schematics'] = '^10.1.0'; // Updated
        devDependencies['@nestjs/testing'] = '^10.3.0';
        if (projectConfig.language === 'typescript') {
            devDependencies['@types/express'] = '^4.17.21'; // If using platform-express
            devDependencies['ts-loader'] = '^9.5.1'; // NestJS uses Webpack by default
            devDependencies['tsconfig-paths'] = '^4.2.0';
        }
        scripts.start = 'nest start';
        scripts['dev:server'] = 'nest start --watch';
        scripts['build:server'] = 'nest build';
        packageType = 'commonjs'; // NestJS typically uses CommonJS for now
        break;

      case 'hapi':
        dependencies['@hapi/hapi'] = '^21.3.3'; // Updated
        dependencies.dotenv = '^16.3.1';
        if (projectConfig.language === 'typescript') {
          devDependencies['@types/hapi__hapi'] = '^20.0.16'; // Updated
        }
        break;
    }

    // Common backend dev dependencies
    devDependencies.nodemon = '^3.0.2'; // Updated
    if (projectConfig.language === 'typescript') {
      devDependencies['ts-node'] = '^10.9.2'; // Updated
    }
  }

  // Python backend (handled separately with requirements.txt, but can add helper scripts)
  if (projectConfig.backend === 'python') {
    scripts['dev:server'] = `python server/main.py`; // Or specific command for framework
    scripts['install:python:venv'] = 'python3 -m venv server/venv && source server/venv/bin/activate && pip install -r server/requirements.txt';
    scripts['lint:python'] = 'flake8 server/app server/main.py && black server/app server/main.py --check && mypy server/app server/main.py';
    scripts['format:python'] = 'black server/app server/main.py';
  }

  // *** MODIFICATION START ***
  // Concurrently for running both frontend and backend
  if (projectConfig.jsFramework !== 'skip' && projectConfig.backend !== 'none' && projectConfig.jsFramework !== 'angular') {
    const frontendDevScript = scripts.dev || 'vite'; // Default to vite if not otherwise set
    const backendDevScript = scripts['dev:server'];
    // Use single quotes to wrap each command to avoid shell parsing issues with nested quotes
    scripts.dev = `concurrently '${backendDevScript}' '${frontendDevScript}'`;
    devDependencies.concurrently = '^8.2.2';
  } else if (projectConfig.jsFramework === 'angular' && projectConfig.backend !== 'none') {
    // For Angular with backend
    const backendDevScript = scripts['dev:server'];
    scripts.dev = `concurrently '${backendDevScript}' 'ng serve --open'`; // ng serve usually opens browser
    devDependencies.concurrently = '^8.2.2';
  }
  // *** MODIFICATION END ***


  // Database dependencies (for Node.js backends)
  if (projectConfig.backend !== 'python') {
    switch (projectConfig.database) {
      case 'sqlite':
        dependencies.sqlite3 = '^5.1.7'; // Updated
        dependencies.sqlite = '^5.1.1'; // The `sqlite` package for ORM-like features
        break;
      case 'postgresql':
        dependencies.pg = '^8.11.3'; // Updated
        if (projectConfig.language === 'typescript') {
          devDependencies['@types/pg'] = '^8.10.9'; // Updated
        }
        break;
      case 'mysql':
        dependencies.mysql2 = '^3.7.0'; // Updated
        // @types/mysql is less common with mysql2, which has its own types.
        break;
      case 'mongodb':
        dependencies.mongodb = '^6.3.0'; // Updated
        break;
      case 'redis':
        dependencies.redis = '^4.6.12'; // Updated
        break;
    }
  }

  // Ensure main script is set if only frontend or only backend
  if (projectConfig.jsFramework !== 'skip' && projectConfig.backend === 'none' && !scripts.start) {
    scripts.start = scripts.preview || scripts.dev; // Fallback for frontend-only
  } else if (projectConfig.jsFramework === 'skip' && projectConfig.backend !== 'none' && !scripts.start) {
     // Backend-only 'start' is already set above
  }


  return {
    name: projectConfig.name,
    version: '0.1.0',
    private: true,
    type: packageType,
    main: projectConfig.backend !== 'none' && projectConfig.backend !== 'python' && projectConfig.language === 'javascript' ?
          'server/src/server.js' :
          (projectConfig.backend !== 'none' && projectConfig.backend !== 'python' && projectConfig.language === 'typescript' ?
          'server/dist/server.js' : undefined),
    scripts,
    dependencies: Object.keys(dependencies).length > 0 ? dependencies : undefined,
    devDependencies: Object.keys(devDependencies).length > 0 ? devDependencies : undefined,
  };
};

module.exports = {
  generatePackageJson
};
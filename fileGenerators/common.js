const { writeFile } = require('../utils'); // Adjusted path

const createBasicFiles = (projectConfig) => {
  // Create .gitignore
  const gitignore = `
# Dependencies
node_modules/
.pnp
.pnp.js

# Build artifacts
dist/
build/
out/
coverage/
*.vite.ssr.*

# Environment variables
.env
.env*.local
!.env.example

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# OS generated files
.DS_Store
Thumbs.db

# IDEs and editors
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# TypeScript
*.tsbuildinfo

# Next.js specific
.next/
out/

# Nuxt.js specific
.nuxt/
dist/

# Angular specific
/dist/
/tmp/
*.jar
*.war

# Svelte specific
.svelte-kit/

# Python specific (if a Python backend might be added later, good to have some basics)
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
*.db
*.sqlite3
  `;
  writeFile('.gitignore', gitignore.trim());

  // Create README.md
  const readmeScripts = [];
  if (projectConfig.jsFramework !== 'skip' && projectConfig.backend !== 'none' && projectConfig.backend !== 'python') {
    readmeScripts.push(
      `- \`npm run dev\` - Start both frontend (Vite/bundler) and Node.js backend (Nodemon)`,
      `- \`npm run dev:server\` - Start only backend server (Nodemon)`,
      `- \`npm run build\` - Build frontend for production`,
      `- \`npm run build:server\` - Build backend for production (if TypeScript)`,
      `- \`npm start\` - Start production backend server`
    );
  } else if (projectConfig.jsFramework !== 'skip') {
    readmeScripts.push(
      `- \`npm run dev\` - Start frontend development server (Vite/bundler)`,
      `- \`npm run build\` - Build frontend for production`,
      projectConfig.bundler === 'vite' ? `- \`npm run preview\` - Preview production build (Vite)` : ''
    );
  } else if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python') {
    readmeScripts.push(
      `- \`npm run dev:server\` - Start backend development server (Nodemon)`,
      `- \`npm run build:server\` - Build backend for production (if TypeScript)`,
      `- \`npm start\` - Start production backend server`
    );
  } else if (projectConfig.backend === 'python') {
     readmeScripts.push(
      `- \`npm run dev:server\` - Start Python backend server`,
      `- \`npm run install:python:venv\` - Create venv and install Python dependencies`
     );
     if (projectConfig.jsFramework !== 'skip') {
        readmeScripts.unshift(`- \`npm run dev\` - Start both frontend (Vite/bundler) and Python backend`);
     }
  }

  const readme = `# ${projectConfig.name}

Generated with Modular Development Environment Setup

## Configuration
- Project Name: ${projectConfig.name}
- Template: ${projectConfig.template}
- Frontend Framework: ${projectConfig.jsFramework || 'None'}
- Language: ${projectConfig.language || 'N/A'}
- Bundler: ${projectConfig.bundler || 'N/A'}
- Styling: ${projectConfig.styling || 'N/A'}
- UI Library: ${projectConfig.uiLibrary || 'None'}
- State Management: ${projectConfig.stateManagement || 'None'}
- Backend Framework: ${projectConfig.backend || 'None'}
${projectConfig.backend === 'python' ? `- Python Framework: ${projectConfig.pythonFramework}` : ''}
- Database: ${projectConfig.database || 'None'}
- Deployment: ${projectConfig.deployment || 'None'}

## Getting Started

1.  **Install dependencies:**
    \`\`\`bash
    npm install
    \`\`\`
    ${projectConfig.backend === 'python' ? `
2.  **Setup Python environment (if not already done):**
    \`\`\`bash
    npm run install:python:venv
    # Activate venv: source server/venv/bin/activate (Linux/macOS) or server\\venv\\Scripts\\activate (Windows)
    \`\`\`
    Then, ensure Python dependencies are installed if you didn't use the script:
    \`\`\`bash
    # (Activate venv first if needed)
    pip install -r server/requirements.txt
    # For dev dependencies: pip install -r server/requirements-dev.txt
    \`\`\`
` : ''}
3.  **Run the development server:**
    \`\`\`bash
    npm run dev
    \`\`\`
    (This usually starts both frontend and backend if both are configured. See available scripts below.)

## Available Scripts

${readmeScripts.filter(Boolean).join('\n')}

---
Happy Coding! 🚀
`;
  writeFile('README.md', readme.trim());

  // Create .env file (primarily for backend, but can be used by frontend too)
  if (projectConfig.backend !== 'none' || projectConfig.database !== 'none') {
    let envContent = `NODE_ENV=development\n`;
    if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python') {
      envContent += `PORT=5000\n`;
    }
    if (projectConfig.backend === 'python') {
      envContent += `PYTHON_PORT=8000\n`; // Or use PORT, but can conflict if Node.js also present
      envContent += `FLASK_APP=server/main.py\n`; // For Flask
      envContent += `FLASK_ENV=development\n`; // For Flask
    }

    switch (projectConfig.database) {
      case 'postgresql':
        envContent += `DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/${projectConfig.name}_db\n`;
        break;
      case 'mysql':
        envContent += `DATABASE_URL=mysql://youruser:yourpassword@localhost:3306/${projectConfig.name}_db\n`;
        break;
      case 'mongodb':
        envContent += `MONGODB_URI=mongodb://localhost:27017/${projectConfig.name}_db\n`;
        break;
      case 'sqlite':
        envContent += `DATABASE_URL=file:./dev.db\n`; // For Prisma-like URL or adjust for direct sqlite usage
        break;
      case 'redis':
        envContent += `REDIS_URL=redis://localhost:6379\n`;
        break;
    }
    writeFile('.env', envContent.trim());
    writeFile('.env.example', envContent.trim()); // Create an example env file
  }


  // Create Vite config if using Vite (and not Angular, which has its own setup)
  if (projectConfig.bundler === 'vite' && projectConfig.jsFramework !== 'angular') {
    const isTS = projectConfig.language === 'typescript';
    let vitePlugins = [];
    if (projectConfig.jsFramework === 'react') vitePlugins.push("react()");
    if (projectConfig.jsFramework === 'vue') vitePlugins.push("vue()");
    if (projectConfig.jsFramework === 'svelte') vitePlugins.push("svelte()");
    if (projectConfig.jsFramework === 'solid') vitePlugins.push("solidPlugin()");
    // *** MODIFICATION START ***
    if (projectConfig.styling === 'tailwind') {
        vitePlugins.push("tailwindcss()");
    }
    // *** MODIFICATION END ***

    const viteConfig = `import { defineConfig } from 'vite';
${projectConfig.jsFramework === 'react' ? "import react from '@vitejs/plugin-react';" : ''}
${projectConfig.jsFramework === 'vue' ? "import vue from '@vitejs/plugin-vue';" : ''}
${projectConfig.jsFramework === 'svelte' ? "import { svelte } from '@sveltejs/vite-plugin-svelte';" : ''}
${projectConfig.jsFramework === 'solid' ? "import solidPlugin from 'vite-plugin-solid';" : ''}
${projectConfig.styling === 'tailwind' ? "import tailwindcss from '@tailwindcss/vite';" : ""}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [${vitePlugins.join(', ')}],
  server: {
    port: 3000,
    open: true, // Automatically open in browser
    ${projectConfig.backend !== 'none' ? `proxy: {
      '/api': {
        target: 'http://localhost:${projectConfig.backend === 'python' ? 8000 : 5000}',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\\/api/, '') // Optional: if your backend doesn't expect /api prefix
      }
    }` : ''}
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable sourcemaps for production build
  }
});
`;
    writeFile(`vite.config.${isTS ? 'ts' : 'js'}`, viteConfig.trim());
  }

  // Create Webpack config if using Webpack
  if (projectConfig.bundler === 'webpack') {
    const isTS = projectConfig.language === 'typescript';
    const entryPoint = isTS ? './src/index.ts' : './src/index.js';
    if (projectConfig.jsFramework === 'react' && isTS) entryPoint = './src/index.tsx';
    else if (projectConfig.jsFramework === 'react' && !isTS) entryPoint = './src/index.jsx';


    const webpackConfig = `
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development', // or 'production'
  entry: '${entryPoint}',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // or your assets folder
    },
    compress: true,
    port: 3000,
    open: true,
    hot: true,
    historyApiFallback: true, // For single-page applications
    ${projectConfig.backend !== 'none' ? `proxy: {
      '/api': {
        target: 'http://localhost:${projectConfig.backend === 'python' ? 8000 : 5000}',
        changeOrigin: true,
      }
    },` : ''}
  },
  module: {
    rules: [
      {
        test: /\\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Assuming Babel is set up for React/JS
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'] // Basic presets
          }
        }
      },
      ${isTS ? `
      {
        test: /\\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },` : ''}
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource', // Webpack 5 asset modules
      },
      {
        test: /\\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource', // Webpack 5 asset modules
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Path to your HTML template
      filename: 'index.html'
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'], // Add .jsx if using React with JS
  },
  devtool: 'source-map', // Enable sourcemaps for production build
};
`;
    writeFile('webpack.config.js', webpackConfig.trim());

    // Create a basic public/index.html for Webpack
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectConfig.name}</title>
</head>
<body>
    <div id="root"></div>
    <!-- bundle.js will be injected here by HtmlWebpackPlugin -->
</body>
</html>`;
    writeFile('public/index.html', htmlContent.trim());

    // Basic .babelrc if not TypeScript (or if TS needs Babel for other transforms)
    if (!isTS || projectConfig.jsFramework === 'react') { // React often uses Babel even with TS
        const babelrcContent = `{
  "presets": [
    "@babel/preset-env",
    ${projectConfig.jsFramework === 'react' ? `["@babel/preset-react", { "runtime": "automatic" }]` : ''}
  ]
}`;
        writeFile('.babelrc', babelrcContent.trim());
    }
  }

  // Create Rollup config if using Rollup
  if (projectConfig.bundler === 'rollup') {
    const isTS = projectConfig.language === 'typescript';
    let entryPoint = 'src/main.js'; // Default entry for Rollup
    if (isTS) entryPoint = 'src/main.ts';
    if (projectConfig.jsFramework === 'react' && isTS) entryPoint = 'src/index.tsx';
    else if (projectConfig.jsFramework === 'react' && !isTS) entryPoint = 'src/index.jsx';


    const rollupConfig = `
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
${isTS ? "import typescript from '@rollup/plugin-typescript';" : ""}
import postcss from 'rollup-plugin-postcss';
import image from '@rollup/plugin-image';
// import { terser } from 'rollup-plugin-terser'; // For minification, add to devDependencies if used

export default {
  input: '${entryPoint}',
  output: {
    file: 'dist/bundle.js',
    format: 'iife', // or 'es', 'cjs'
    sourcemap: true,
    name: '${projectConfig.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'MyBundle'}' // Global variable name for IIFE
  },
  plugins: [
    resolve(),
    commonjs(),
    ${isTS ? "typescript({ tsconfig: './tsconfig.json' })," : ""}
    postcss({
      extensions: ['.css', '.scss', '.sass'],
      inject: true, // Injects CSS into <head>
      extract: false, // Can be set to true to extract to a separate file
      minimize: process.env.NODE_ENV === 'production',
      use: ['sass'], // Enable SASS/SCSS
    }),
    image(),
    // process.env.NODE_ENV === 'production' && terser() // Minify in production
  ],
  watch: {
    clearScreen: false
  }
};
`;
    writeFile('rollup.config.js', rollupConfig.trim());

    // Create a basic public/index.html for Rollup (manual linking)
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectConfig.name}</title>
    <!-- <link rel="stylesheet" href="dist/bundle.css"> Rollup with postcss extract:true -->
</head>
<body>
    <div id="root"></div>
    <script src="dist/bundle.js"></script>
</body>
</html>`;
    // Typically, Rollup users might place index.html in the root or a public folder.
    // For consistency with Webpack's public/index.html:
    writeFile('public/index.html', htmlContent.trim());
  }

  // Create TypeScript config if using TypeScript
  if (projectConfig.language === 'typescript') {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020', // or ESNext
        module: projectConfig.jsFramework === 'angular' ? 'ESNext' : (projectConfig.bundler === 'vite' || projectConfig.type === 'module' ? 'ESNext' : 'CommonJS'),
        moduleResolution: 'node', // or 'bundler' for modern setups
        baseUrl: './',
        paths: { // Example path alias
          "@/*": ["src/*"]
        },
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        jsx: projectConfig.jsFramework === 'react' ? 'react-jsx' :
             projectConfig.jsFramework === 'solid' ? 'preserve' :
             undefined, // Svelte/Vue handle JSX differently or not at all in tsconfig

        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: projectConfig.bundler === 'vite', // Vite requires this
        noEmit: projectConfig.bundler === 'vite' && projectConfig.jsFramework !== 'svelte', // Vite handles emit, Svelte needs tsc for declarations
        ...(projectConfig.jsFramework === 'svelte' && { declaration: true, emitDeclarationOnly: true, outDir: './dist/types' }),


        // For backend if it's also TS
        outDir: projectConfig.jsFramework === 'skip' ? './dist_server' : (projectConfig.jsFramework !== 'skip' && projectConfig.backend !== 'none' ? './dist_server_temp' : './dist_temp'), // Avoid conflict if fullstack TS
        rootDir: projectConfig.jsFramework === 'skip' ? './server/src' : (projectConfig.jsFramework !== 'skip' && projectConfig.backend !== 'none' ? './server_src_temp' : './src_temp'),
      },
      include: projectConfig.jsFramework !== 'skip' ? ['src'] : [],
      exclude: ['node_modules', 'dist', 'build'],
    };

    if (projectConfig.jsFramework === 'angular') {
        // Angular has a very specific tsconfig setup, often multiple files (tsconfig.json, tsconfig.app.json, tsconfig.spec.json)
        // The ng new command will generate these. This is a basic placeholder if not using CLI.
        tsConfig.compilerOptions.experimentalDecorators = true;
        tsConfig.compilerOptions.emitDecoratorMetadata = true;
        tsConfig.compilerOptions.module = 'ESNext'; // Angular uses ESNext modules
        tsConfig.compilerOptions.moduleResolution = 'bundler'; // Modern Angular
        tsConfig.compilerOptions.target = 'ES2022'; // Modern Angular
        tsConfig.compilerOptions.useDefineForClassFields = false; // Angular specific
        delete tsConfig.compilerOptions.noEmit; // Angular CLI handles emit
        delete tsConfig.compilerOptions.isolatedModules;
        tsConfig.include = ["src/**/*.ts"];
    }


    // Clean up undefined keys
    Object.keys(tsConfig.compilerOptions).forEach(key => {
      if (tsConfig.compilerOptions[key] === undefined) {
        delete tsConfig.compilerOptions[key];
      }
    });
    // Remove temp outDir/rootDir if not applicable
    if (tsConfig.compilerOptions.outDir && tsConfig.compilerOptions.outDir.endsWith('_temp')) delete tsConfig.compilerOptions.outDir;
    if (tsConfig.compilerOptions.rootDir && tsConfig.compilerOptions.rootDir.endsWith('_temp')) delete tsConfig.compilerOptions.rootDir;


    // Only write tsconfig.json if not an Angular project (as ng new handles it)
    if (projectConfig.jsFramework !== 'angular') {
      writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));
    }

    // Create a separate tsconfig.server.json if Node.js backend and TypeScript
    if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python' && projectConfig.language === 'typescript') {
        const tsConfigServer = {
            extends: "./tsconfig.json", // Inherit from base
            compilerOptions: {
                module: "NodeNext", // Use modern module format for Node
                moduleResolution: "NodeNext", // Required with NodeNext module
                outDir: "./server/dist",
                rootDir: "./server/src",
                noEmit: false, // We want to emit JS for the server
                isolatedModules: false, // Not required for this setup
                // Remove frontend specific options if any were inherited that conflict
                jsx: undefined,
            },
            include: ["server/src/**/*.ts"],
            exclude: ["node_modules", "dist", "build", "src"] // Exclude frontend src
        };
        // Clean up undefined keys for server config
        Object.keys(tsConfigServer.compilerOptions).forEach(key => {
            if (tsConfigServer.compilerOptions[key] === undefined) {
                delete tsConfigServer.compilerOptions[key];
            }
        });
        writeFile('tsconfig.server.json', JSON.stringify(tsConfigServer, null, 2));
    }
  }


  // *** MODIFICATION START ***
  // Create Tailwind v4 config files
  if (projectConfig.styling === 'tailwind') {
    // For Tailwind v4, we no longer need a default tailwind.config.js.
    // The configuration is handled by the bundler plugin.

    // For non-Vite bundlers, create a modern postcss.config.mjs file.
    if (projectConfig.bundler !== 'vite') {
        const postcssConfigContent = `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}`;
        writeFile('postcss.config.mjs', postcssConfigContent);
    }
    // For Vite, the setup is handled directly in vite.config.js (as done above).
  }
  // *** MODIFICATION END ***


  // Create a basic .babelrc if not already created by Webpack and if React is used (for other bundlers or no bundler)
  if (projectConfig.jsFramework === 'react' && projectConfig.bundler !== 'webpack') {
    // Check if .babelrc already exists to avoid overwriting if Webpack created it
    // This is a simplified check; a more robust check would use fs.existsSync
    try {
      require('fs').readFileSync('.babelrc');
    } catch (e) {
      const babelrcContent = `{
  "presets": [
    "@babel/preset-env",
    ["@babel/preset-react", { "runtime": "automatic" }]
  ]
}`;
      writeFile('.babelrc', babelrcContent.trim());
    }
  }
};

module.exports = {
  createBasicFiles
};
const { writeFile, execCommand, createDirectory } = require('../utils'); // Adjusted path
const { log } = require('../ui'); // Adjusted path for log

// Helper function to get file extension based on framework and language
const getFileExtension = (projectConfig) => {
  const isTs = projectConfig.language === 'typescript';
  switch (projectConfig.jsFramework) {
    case 'react':
    case 'solid':
      return isTs ? 'tsx' : 'jsx';
    case 'vue':
    case 'svelte':
    case 'angular': // Angular files are .ts by default with CLI, .js if chosen otherwise
    case 'vanilla':
      return isTs ? 'ts' : 'js';
    default:
      return isTs ? 'ts' : 'js';
  }
};

const createStyleFiles = (projectConfig) => {
  if (projectConfig.jsFramework === 'skip') return;

  let cssContent = '';
  let cssFilePath = `src/style.${projectConfig.styling === 'sass' ? 'scss' : 'css'}`; // Default path

  switch (projectConfig.styling) {
    case 'tailwind':
      // Tailwind v4 uses a single import statement.
      const tailwindCss = `@import "tailwindcss";`;
      // Tailwind's entry CSS can have different names based on framework conventions
      if (projectConfig.jsFramework === 'svelte') {
        cssFilePath = 'src/app.css';
      } else if (projectConfig.jsFramework === 'vue') {
        cssFilePath = 'src/style.css'; // Vue CLI often uses style.css
      } else {
        cssFilePath = 'src/index.css'; // Common for React/Vite
      }
      cssContent = tailwindCss;
      break;
    case 'sass':
      cssContent = `// Variables
\$primary-color: #007bff;
\$secondary-color: #6c757d;
\$font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

// Base styles
body {
  font-family: \$font-family;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#root, #app { // Common root IDs
  padding: 2rem;
  text-align: center;
}
`;
      break;
    case 'css':
    case 'plain css': // handle variations
      cssContent = `/* Base styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#root, #app { /* Common root IDs */
  padding: 2rem;
  text-align: center;
}
`;
      break;
    // Bootstrap, Bulma, Styled Components, Emotion are primarily installed as packages
    // and imported/used in JS/TS files, not necessarily requiring a separate global CSS file from this script.
    // Basic CSS/SCSS files are provided for plain CSS and Sass.
    default:
      log(`No specific global style file generated for ${projectConfig.styling}. It's likely managed via JS/TS imports.`, 'dim');
      return;
  }
  if (cssContent) {
    writeFile(cssFilePath, cssContent.trim());
    log(`🎨 Created ${cssFilePath}`, 'green');
  }
};

const createReactFiles = (projectConfig) => {
  const ext = getFileExtension(projectConfig);
  const mainFile = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
${projectConfig.styling === 'tailwind' ? "import './index.css';" : ''}
${projectConfig.styling === 'sass' ? "import './style.scss';" : ''}
${projectConfig.styling === 'css' ? "import './style.css';" : ''}
${projectConfig.styling === 'bootstrap' ? "import 'bootstrap/dist/css/bootstrap.min.css';" : ''}
${projectConfig.styling === 'bulma' ? "import 'bulma/css/bulma.min.css';" : ''}
${projectConfig.styling === 'styled-components' ? "import { ThemeProvider } from 'styled-components';" : ''}
${projectConfig.styling === 'emotion' ? "import { ThemeProvider } from '@emotion/react';" : ''}

// Basic theme for ThemeProvider (Styled Components/Emotion)
const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    text: '#212529',
  },
  fonts: ['sans-serif', 'Roboto'],
  fontSizes: {
    small: '1em',
    medium: '2em',
    large: '3em'
  }
};

const rootElement = document.getElementById('root')${projectConfig.language === 'typescript' ? '!' : ''};
const appContent = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

ReactDOM.createRoot(rootElement).render(
  ${
    (projectConfig.styling === 'styled-components' || projectConfig.styling === 'emotion')
    ? '<ThemeProvider theme={theme}>{appContent}</ThemeProvider>'
    : 'appContent'
  }
);
`;
  writeFile(`src/main.${ext}`, mainFile.trim());

  // *** MODIFICATION START ***
  const appFile = `import React from 'react';

function App() {
  const projectName = '${projectConfig.name}';
  const language = '${projectConfig.language}';
  const styling = '${projectConfig.styling}';
  const backendExists = ${projectConfig.backend !== 'none'};

  const testApi = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
      const data = await response.json();
      console.log('API Response:', data);
      alert('API connection successful! Check console.');
    } catch (error) {
      console.error('API Error:', error);
      alert('API connection failed. Check console.');
    }
  };

  const useTailwind = styling === 'tailwind';

  return (
    <div className={useTailwind ? 'min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4' : ''}>
      <div className="text-center">
        <h1 className={useTailwind ? 'text-5xl font-bold text-cyan-400 mb-4' : ''}>
          Welcome to {projectName}!
        </h1>
        <p className={useTailwind ? 'text-lg text-gray-300' : ''}>
          Your React + {language} + {styling} app is ready!
        </p>
        {backendExists && (
          <button
            onClick={testApi}
            className={useTailwind ? 'mt-8 px-6 py-3 bg-cyan-500 text-black font-semibold rounded-lg shadow-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-colors duration-300' : ''}
            style={!useTailwind ? { marginTop: '20px', padding: '10px', cursor: 'pointer' } : {}}
          >
            Test Backend Connection
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
`;
  // *** MODIFICATION END ***
  writeFile(`src/App.${ext}`, appFile.trim());
};

const createVueFiles = (projectConfig) => {
  const ext = getFileExtension(projectConfig);
  const mainFile = `import { createApp } from 'vue';
import App from './App.vue';
${projectConfig.styling === 'tailwind' ? "import './style.css';" : ''}
${projectConfig.styling === 'sass' ? "import './style.scss';" : ''}
${projectConfig.styling === 'css' ? "import './style.css';" : ''}
${projectConfig.styling === 'bootstrap' ? "import 'bootstrap/dist/css/bootstrap.min.css';" : ''}
${projectConfig.styling === 'bulma' ? "import 'bulma/css/bulma.min.css';" : ''}

createApp(App).mount('#app');
`;
  writeFile(`src/main.${ext}`, mainFile.trim());

  const appFile = `<template>
  <div :class="containerClasses">
    <div class="text-center">
      <h1 :class="headerClasses">Welcome to {{ projectName }}!</h1>
      <p :class="paragraphClasses">Your Vue + ${projectConfig.language} + ${projectConfig.styling} app is ready!</p>
      <button v-if="backendExists" @click="testApi" :class="buttonClasses" :style="buttonStyles">
        Test Backend Connection
      </button>
    </div>
  </div>
</template>

<script${projectConfig.language === 'typescript' ? ' lang="ts" setup' : ' setup'}>
import { ref, computed } from 'vue';

const projectName = ref('${projectConfig.name}');
const backendExists = ref(${projectConfig.backend !== 'none'});
const useTailwind = ref(${projectConfig.styling === 'tailwind'});

const containerClasses = computed(() => (useTailwind.value ? 'min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4' : ''));
const headerClasses = computed(() => (useTailwind.value ? 'text-5xl font-bold text-emerald-400 mb-4' : ''));
const paragraphClasses = computed(() => (useTailwind.value ? 'text-lg text-gray-300' : ''));
const buttonClasses = computed(() => (useTailwind.value ? 'mt-8 px-6 py-3 bg-emerald-500 text-black font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75 transition-colors duration-300' : ''));
const buttonStyles = computed(() => (!useTailwind.value ? { marginTop: '20px', padding: '10px', cursor: 'pointer' } : {}));

const testApi = async () => {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    console.log('API Response:', data);
    alert('API connection successful! Check console.');
  } catch (error) {
    console.error('API Error:', error);
    alert('API connection failed. Check console.');
  }
};
</script>

<style scoped>
/* Add component-specific styles here if not using Tailwind */
.non-tailwind-styles {
  text-align: center;
  padding: 2rem;
}
</style>
`;
  writeFile('src/App.vue', appFile.trim());
};

const createAngularFiles = (projectConfig) => {
  log('🚀 Creating Angular project using Angular CLI...', 'blue');
  log('   This might take a few minutes and will overwrite some base files.', 'dim');
  try {
    // Angular CLI creates files in the current directory if --directory . is used
    // Ensure projectConfig.name is the actual desired Angular project name for `ng new`
    // The project root directory should already be created and CWD set to it by projectSetup.js
    const cliProjectName = projectConfig.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(); // Sanitize for ng new

    let command = `npx --yes @angular/cli@latest new ${cliProjectName} --directory . --routing --style=${projectConfig.styling === 'sass' ? 'scss' : 'css'} --skip-install --skip-git --defaults`;
    if (projectConfig.styling === 'tailwind') {
        // For Tailwind, Angular CLI doesn't directly support it. We'd typically add it after.
        // For now, we'll default to SCSS or CSS and let user add Tailwind manually or via a schematic.
        command = `npx --yes @angular/cli@latest new ${cliProjectName} --directory . --routing --style=scss --skip-install --skip-git --defaults`;
        log('ℹ️ Tailwind CSS with Angular requires manual setup or a schematic after CLI generation. Defaulting to SCSS for CLI.', 'yellow');
    }

    log(`Executing: ${command}`, 'dim');
    execCommand(command, { stdio: 'inherit' }); // Show output

    log('✅ Angular project scaffolded successfully by Angular CLI.', 'green');
    log('   Run `npm install` in the project directory to install Angular dependencies.', 'dim');

    if (projectConfig.styling === 'tailwind') {
      log('Attempting to add Tailwind CSS using Angular Schematics...', 'blue');
      try {
        // First, ensure dependencies from ng new are installed, as ng add might need them.
        // However, ng new was run with --skip-install.
        // The user will run `npm install` later.
        // `ng add` typically installs its own dependencies.
        const tailwindSchematicCommand = `npx --yes @angular/cli@latest add tailwindcss --skip-confirmation`;
        log(`Executing: ${tailwindSchematicCommand}`, 'dim');
        execCommand(tailwindSchematicCommand, { stdio: 'inherit' });
        log('✅ Tailwind CSS schematic `ng add tailwindcss` executed.', 'green');
        log('   Review `tailwind.config.js`, `styles.scss`, and `angular.json` for changes.', 'dim');
        log('   You may still need to run `npm install` to get all dependencies if not handled by the schematic.', 'dim');
      } catch (schematicError) {
        log(`❌ Error running 'ng add tailwindcss': ${schematicError.message}`, 'red');
        log('   Attempting Tailwind CSS setup failed. Please follow manual steps:', 'yellow');
        log('   1. Ensure Angular CLI project is installed: `npm install`', 'cyan');
        log('   2. Install Tailwind dependencies: `npm install -D tailwindcss postcss autoprefixer`', 'cyan');
        log('   3. Initialize Tailwind: `npx tailwindcss init`', 'cyan');
        log('   4. Configure `tailwind.config.js` content array, e.g.:', 'cyan');
        log('      `content: ["./src/**/*.{html,ts}"]`', 'cyan');
        log('   5. Add Tailwind directives to `src/styles.scss` (or .css):', 'cyan');
        log('      `@tailwind base;`', 'cyan');
        log('      `@tailwind components;`', 'cyan');
        log('      `@tailwind utilities;`', 'cyan');
        log('   6. Ensure `src/styles.scss` (or .css) is listed in `angular.json` under `projects.<projectName>.architect.build.options.styles`.', 'cyan');
      }
    }

  } catch (error) {
    log(`❌ Error scaffolding Angular project with Angular CLI: ${error.message}`, 'red');
    log('   Please ensure Node.js, npm, and npx are correctly installed and in your PATH.', 'yellow');
    log(`   You can try running "npx @angular/cli new test-project --directory ." manually in an empty folder to diagnose.`, 'yellow');
    throw error;
  }
};

const createSvelteFiles = (projectConfig) => {
  const ext = getFileExtension(projectConfig);
  const mainFile = `import App from './App.svelte';
${projectConfig.styling === 'tailwind' ? "import './app.css';" : ''}
${projectConfig.styling === 'sass' ? "import './style.scss';" : ''}
${projectConfig.styling === 'css' ? "import './style.css';" : ''}
${projectConfig.styling === 'bootstrap' ? "import 'bootstrap/dist/css/bootstrap.min.css';" : ''}
${projectConfig.styling === 'bulma' ? "import 'bulma/css/bulma.min.css';" : ''}

const app = new App({
  target: document.getElementById('app')${projectConfig.language === 'typescript' ? '!' : ''},
});

export default app;
`;
  writeFile(`src/main.${ext}`, mainFile.trim());

  const appFile = `<script${projectConfig.language === 'typescript' ? ' lang="ts"' : ''}>
  let projectName = '${projectConfig.name}';
  let backendExists = ${projectConfig.backend !== 'none'};
  let useTailwind = ${projectConfig.styling === 'tailwind'};

  async function testApi() {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      console.log('API Response:', data);
      alert('API connection successful! Check console.');
    } catch (error) {
      console.error('API Error:', error);
      alert('API connection failed. Check console.');
    }
  }
</script>

<main class:min-h-screen={useTailwind} class:bg-gray-900={useTailwind} class:text-white={useTailwind} class:flex={useTailwind} class:flex-col={useTailwind} class:items-center={useTailwind} class:justify-center={useTailwind}>
  <div class="text-center">
    <h1 class="text-5xl font-bold text-orange-500 mb-4">Welcome to {projectName}!</h1>
    <p class="text-lg text-gray-300">Your Svelte + ${projectConfig.language} + ${projectConfig.styling} app is ready!</p>
    {#if backendExists}
      <button on:click={testApi} class="mt-8 px-6 py-3 bg-orange-500 text-black font-semibold rounded-lg shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 transition-colors duration-300">
        Test Backend Connection
      </button>
    {/if}
  </div>
</main>

<style>
  /* Non-tailwind styles can go here */
  :global(body) {
    margin: 0;
    font-family: sans-serif;
  }
  main:not(.bg-gray-900) {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }
  h1:not(.text-orange-500) {
    color: #ff3e00;
  }
</style>
`;
  writeFile('src/App.svelte', appFile.trim());
};

const createSolidFiles = (projectConfig) => {
  const ext = getFileExtension(projectConfig);
  // Solid's entry point is often index.tsx/jsx
  const mainFile = `/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
${projectConfig.styling === 'tailwind' ? "import './index.css';" : ''}
${projectConfig.styling === 'sass' ? "import './style.scss';" : ''}
${projectConfig.styling === 'css' ? "import './style.css';" : ''}
${projectConfig.styling === 'bootstrap' ? "import 'bootstrap/dist/css/bootstrap.min.css';" : ''}
${projectConfig.styling === 'bulma' ? "import 'bulma/css/bulma.min.css';" : ''}

render(() => <App />, document.getElementById('root')${projectConfig.language === 'typescript' ? '!' : ''});
`;
  writeFile(`src/index.${ext}`, mainFile.trim()); // Note: index.ext, not main.ext

  const appFile = `import type { Component } from 'solid-js';
import { Show } from 'solid-js';

const App: Component = () => {
  const projectName = '${projectConfig.name}';
  const backendExists = ${projectConfig.backend !== 'none'};
  const useTailwind = ${projectConfig.styling === 'tailwind'};

  const testApi = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      console.log('API Response:', data);
      alert('API connection successful! Check console.');
    } catch (error) {
      console.error('API Error:', error);
      alert('API connection failed. Check console.');
    }
  };

  return (
    <div classList={{ "min-h-screen bg-gray-900 text-white flex items-center justify-center": useTailwind }}>
      <div class="text-center p-4">
        <h1 class="text-5xl font-bold text-sky-400 mb-4">Welcome to {projectName}!</h1>
        <p class="text-lg text-gray-300">Your SolidJS + ${projectConfig.language} + ${projectConfig.styling} app is ready!</p>
        <Show when={backendExists}>
          <button onClick={testApi} class="mt-8 px-6 py-3 bg-sky-500 text-black font-semibold rounded-lg shadow-md hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 transition-colors duration-300">
            Test Backend Connection
          </button>
        </Show>
      </div>
    </div>
  );
};

export default App;
`;
  writeFile(`src/App.${ext}`, appFile.trim());
};

const createVanillaFiles = (projectConfig) => {
  const ext = getFileExtension(projectConfig);
  const mainFile = `${projectConfig.styling === 'tailwind' ? "import './index.css';" : ''}
${projectConfig.styling === 'sass' ? "import './style.scss';" : ''}
${projectConfig.styling === 'css' ? "import './style.css';" : ''}
${projectConfig.styling === 'bootstrap' ? "import 'bootstrap/dist/css/bootstrap.min.css';" : ''}
${projectConfig.styling === 'bulma' ? "import 'bulma/css/bulma.min.css';" : ''}

document.addEventListener('DOMContentLoaded', () => {
  const appDiv = document.getElementById('app');
  if (!appDiv) return;
  const useTailwind = ${projectConfig.styling === 'tailwind'};

  if (useTailwind) {
    document.body.className = "bg-gray-900";
    appDiv.className = "min-h-screen text-white flex flex-col items-center justify-center p-4";
  }

  appDiv.innerHTML = \`
    <div class="text-center">
      <h1 class="\${useTailwind ? 'text-5xl font-bold text-yellow-400 mb-4' : ''}">Welcome to ${projectConfig.name}!</h1>
      <p class="\${useTailwind ? 'text-lg text-gray-300' : ''}">Your Vanilla JS (${projectConfig.language}) + ${projectConfig.styling} app is ready!</p>
      ${projectConfig.backend !== 'none' ? `
      <button id="testApiBtn" class="\${useTailwind ? 'mt-8 px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 transition-colors duration-300' : ''}">
        Test Backend Connection
      </button>
      ` : ''}
    </div>
  \`;
  
  const testApiBtn = document.getElementById('testApiBtn');
  if (testApiBtn && !useTailwind) {
      testApiBtn.style.marginTop = '20px';
      testApiBtn.style.padding = '10px';
      testApiBtn.style.cursor = 'pointer';
  }

  if (${projectConfig.backend !== 'none'}) {
    if (testApiBtn) {
      testApiBtn.addEventListener('click', async () => {
        try {
          const response = await fetch('/api/health');
          const data = await response.json();
          console.log('API Response:', data);
          alert('API connection successful! Check console.');
        } catch (error) {
          console.error('API Error:', error);
          alert('API connection failed. Check console.');
        }
      });
    }
  }
});
`;
  writeFile(`src/main.${ext}`, mainFile.trim());
};


const createFrontendFiles = (projectConfig) => {
  if (projectConfig.jsFramework === 'skip') {
    log('⏭️ Skipping frontend file generation.', 'dim');
    return;
  }
   if (projectConfig.jsFramework === 'angular') {
    createAngularFiles(projectConfig); // Angular CLI handles its own index.html and main files.
    // Style files for Angular are typically handled by CLI or manual setup for Tailwind.
    return;
  }


  // Create index.html (common structure, script src will vary)
  const rootElementId = projectConfig.jsFramework === 'angular' ? 'app-root' : (projectConfig.jsFramework === 'vue' || projectConfig.jsFramework === 'svelte' ? 'app' : 'root');
  const scriptSrc = projectConfig.jsFramework === 'solid' ? `/src/index.${getFileExtension(projectConfig)}` : `/src/main.${getFileExtension(projectConfig)}`;

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectConfig.name}</title>
    ${'' /* Bootstrap/Bulma CSS is now imported in JS/TS entry points */}
  </head>
  <body>
    <div id="${rootElementId}"></div>
    <script type="module" src="${scriptSrc}"></script>
  </body>
</html>`;
  writeFile('index.html', indexHtml);
  log(`📄 Created index.html`, 'green');


  // Create framework-specific files
  switch (projectConfig.jsFramework) {
    case 'react':
      createReactFiles(projectConfig);
      break;
    case 'vue':
      createVueFiles(projectConfig);
      break;
    // Angular is handled above
    case 'svelte':
      createSvelteFiles(projectConfig);
      break;
    case 'solid':
      createSolidFiles(projectConfig);
      break;
    case 'vanilla':
      createVanillaFiles(projectConfig);
      break;
    default:
      log(`Unsupported frontend framework: ${projectConfig.jsFramework}`, 'yellow');
  }

  // Create CSS/styling files (global ones)
  createStyleFiles(projectConfig);
};

module.exports = {
  createFrontendFiles,
};
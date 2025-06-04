const fs = require('fs');
const path = require('path');
const { log, question, showWelcome, rl } = require('./ui');
const { CONFIG_OPTIONS } = require('./config');
const { createDirectory, writeFile, execCommand } = require('./utils');

// Project configuration, to be owned by this module
let projectConfig = {
  name: '',
  template: 'custom' // or 'quick'
};

// Placeholder imports for functions that will be moved to other modules
// These will be properly imported once those modules are created.
const { generatePackageJson } = require('./fileGenerators/packageJson');
const { createBasicFiles } = require('./fileGenerators/common');
const { createFrontendFiles } = require('./fileGenerators/frontend');
const { createBackendFiles: createNodeBackendFiles } = require('./fileGenerators/backendNode');
const { createPythonBackendFiles } = require('./fileGenerators/backendPython');
const { createDatabaseFiles } = require('./fileGenerators/database');
const { createDeploymentFiles } = require('./fileGenerators/deployment');

const getProjectName = async () => {
  while (!projectConfig.name) {
    // Pass array to use log for colored prompt
    const name = await question([log('📝 Enter project name: ', 'yellow')]);
    if (name.trim()) {
      projectConfig.name = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      break;
    }
    log('❌ Project name cannot be empty!', 'red');
  }
};

const chooseSetupType = async () => {
  log('');
  log('Choose setup type:', 'bold');
  log('1. 🚀 Quick Setup (React + TypeScript + Vite + Tailwind + Express + Docker)', 'green');
  log('2. ⚙️  Custom Setup (Choose all options)', 'blue');
  log('');

  const choice = await question('Enter your choice (1 or 2): ');

  if (choice === '1') {
    projectConfig.template = 'quick';
    // Set quick defaults
    projectConfig.jsFramework = 'react';
    projectConfig.language = 'typescript';
    projectConfig.bundler = 'vite';
    projectConfig.styling = 'tailwind';
    projectConfig.uiLibrary = 'none'; // Default for quick
    projectConfig.stateManagement = 'none'; // Default for quick
    projectConfig.backend = 'express';
    projectConfig.database = 'none';
    projectConfig.deployment = 'docker';
    log('✅ Quick setup selected!', 'green');
  } else if (choice === '2') {
    projectConfig.template = 'custom';
    log('✅ Custom setup selected!', 'blue');
  } else {
    log('❌ Invalid choice. Please enter 1 or 2.', 'red');
    return await chooseSetupType();
  }
};

const selectOption = async (configKey) => {
  const config = CONFIG_OPTIONS[configKey];
  log('');
  log(`${config.title}:`, 'bold');

  config.options.forEach((option, index) => {
    const isDefault = option.key === config.default;
    const marker = isDefault ? '→' : ' ';
    log(`${marker} ${index + 1}. ${option.name} - ${option.description}`, isDefault ? 'green' : 'reset');
  });

  log('');
  const choice = await question(`Choose option (1-${config.options.length}) [default: ${config.default}]: `);

  if (!choice.trim()) {
    return config.default;
  }

  const index = parseInt(choice) - 1;
  if (index >= 0 && index < config.options.length) {
    return config.options[index].key;
  } else {
    log('❌ Invalid choice. Using default.', 'yellow');
    return config.default;
  }
};

const gatherConfiguration = async () => {
  if (projectConfig.template === 'quick') {
    return;
  }

  log('');
  log('🔧 Let\'s configure your project...', 'blue');

  projectConfig.jsFramework = await selectOption('jsFrameworks');

  if (projectConfig.jsFramework !== 'skip') {
    projectConfig.language = await selectOption('language');
    projectConfig.bundler = await selectOption('bundler');
    projectConfig.styling = await selectOption('styling');

    if (['react', 'vue'].includes(projectConfig.jsFramework)) {
      projectConfig.uiLibrary = await selectOption('uiLibrary');
      projectConfig.stateManagement = await selectOption('stateManagement');
    } else {
      projectConfig.uiLibrary = 'none'; // Default if not React/Vue
      projectConfig.stateManagement = 'none'; // Default if not React/Vue
    }
  } else {
    // Set defaults if frontend is skipped
    projectConfig.language = CONFIG_OPTIONS.language.default;
    projectConfig.bundler = 'none';
    projectConfig.styling = 'css';
    projectConfig.uiLibrary = 'none';
    projectConfig.stateManagement = 'none';
  }

  projectConfig.backend = await selectOption('backend');

  if (projectConfig.backend === 'python') {
    projectConfig.pythonFramework = await selectOption('pythonFramework');
  } else {
    projectConfig.pythonFramework = null; // Ensure it's null if not Python
  }

  projectConfig.database = await selectOption('database');
  projectConfig.deployment = await selectOption('deployment');
};

const showConfigSummary = () => {
  log('');
  log('📋 Project Configuration Summary:', 'bold');
  log('═'.repeat(50), 'cyan');
  log(`Project Name:     ${projectConfig.name}`, 'green');
  log(`Template:         ${projectConfig.template}`, 'blue');

  if (projectConfig.jsFramework !== 'skip') {
    log(`Frontend:         ${projectConfig.jsFramework}`, 'yellow');
    log(`Language:         ${projectConfig.language}`, 'yellow');
    log(`Bundler:          ${projectConfig.bundler}`, 'yellow');
    log(`Styling:          ${projectConfig.styling}`, 'yellow');
    if (projectConfig.uiLibrary && projectConfig.uiLibrary !== 'none') log(`UI Library:       ${projectConfig.uiLibrary}`, 'yellow');
    if (projectConfig.stateManagement && projectConfig.stateManagement !== 'none') log(`State Mgmt:       ${projectConfig.stateManagement}`, 'yellow');
  }

  if (projectConfig.backend !== 'none') {
    log(`Backend:          ${projectConfig.backend}`, 'magenta');
    if (projectConfig.pythonFramework) log(`Python Framework: ${projectConfig.pythonFramework}`, 'magenta');
  }

  log(`Database:         ${projectConfig.database}`, 'cyan');
  log(`Deployment:       ${projectConfig.deployment}`, 'blue');
  log('═'.repeat(50), 'cyan');
};

const confirmSetup = async () => {
  log('');
  const confirm = await question('🤔 Proceed with this configuration? (y/N): ');
  return confirm.toLowerCase().startsWith('y');
};

const createProjectStructure = () => {
  log('📁 Creating project structure...', 'blue');
  const projectPath = path.join(process.cwd(), projectConfig.name);

  if (fs.existsSync(projectPath)) {
    log(`❌ Directory ${projectConfig.name} already exists!`, 'red');
    process.exit(1);
  }

  createDirectory(projectPath);
  process.chdir(projectPath); // Change current working directory to the project path

  if (projectConfig.jsFramework !== 'skip') {
    createDirectory('src');
    createDirectory('public');
  }

  if (projectConfig.backend !== 'none') {
    // Python backend will create its own 'server' structure
    if (projectConfig.backend !== 'python') {
        createDirectory('server/src');
    }
  }

  // Generate package.json (will be imported from packageJson.js)
  const packageJsonContent = generatePackageJson(projectConfig);
  writeFile('package.json', JSON.stringify(packageJsonContent, null, 2));

  // Create basic files (will be imported from common.js)
  createBasicFiles(projectConfig); // This will handle .gitignore, README, .env, tsconfig, tailwind, postcss

   // Create frontend files (will be imported from frontend.js)
  if (projectConfig.jsFramework !== 'skip') { // Angular CLI will be handled within createFrontendFiles
    createFrontendFiles(projectConfig);
  }

  // Create backend files (will be imported from backendNode.js or backendPython.js)
  if (projectConfig.backend !== 'none') {
    if (projectConfig.backend === 'python') {
      createPythonBackendFiles(projectConfig);
    } else {
      createNodeBackendFiles(projectConfig); // For Node.js backends
    }
  }
};

const installDependencies = async () => {
  log('📦 Installing dependencies...', 'blue');
  const projectPath = path.join(process.cwd()); // projectConfig.name is already part of cwd due to process.chdir

  try {
    // Always run npm install if a package.json is expected (i.e., not a Python-only backend with no frontend)
    if (projectConfig.jsFramework !== 'skip' || (projectConfig.backend !== 'none' && projectConfig.backend !== 'python')) {
        log('  Running npm install...', 'cyan');
        await execCommand('npm install', { cwd: projectPath }); // execCommand will throw on error
        log('  npm install completed.', 'green');
    }

    if (projectConfig.backend === 'python') {
      const serverDir = path.join(projectPath, 'server');
      // Standardize Python virtual environment location to PROJECT_ROOT/server/.venv
      const venvDir = path.join(serverDir, '.venv');

      log(`  🐍 Setting up Python environment in ${serverDir}...`, 'magenta');

      // 1. Create virtual environment in server/.venv
      log(`  Creating virtual environment in ${path.relative(projectPath, venvDir)}...`, 'cyan');
      // Ensure server directory exists before creating venv in it
      if (!fs.existsSync(serverDir)) {
        createDirectory(serverDir); // Assuming createDirectory is synchronous or handled
      }
      await execCommand(`python3 -m venv ${path.relative(projectPath, venvDir)}`, { cwd: projectPath });
      log('  Virtual environment created.', 'green');

      // Determine pip command based on OS for venv activation
      const pipExecutable = process.platform === 'win32' ? path.join(venvDir, 'Scripts', 'pip') : path.join(venvDir, 'bin', 'pip');
      const pythonExecutable = process.platform === 'win32' ? path.join(venvDir, 'Scripts', 'python') : path.join(venvDir, 'bin', 'python');


      // 2. Install requirements.txt
      const requirementsPath = path.join(serverDir, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        log('  Installing dependencies from server/requirements.txt...', 'cyan');
        await execCommand(`${pipExecutable} install -r requirements.txt`, { cwd: serverDir });
        log('  server/requirements.txt installed.', 'green');
      } else {
        log('  No server/requirements.txt found. Skipping pip install.', 'yellow');
      }

      // 3. Install requirements-dev.txt (optional)
      const requirementsDevPath = path.join(serverDir, 'requirements-dev.txt');
      if (fs.existsSync(requirementsDevPath)) {
        log('  Installing development dependencies from server/requirements-dev.txt...', 'cyan');
        await execCommand(`${pipExecutable} install -r requirements-dev.txt`, { cwd: serverDir });
        log('  server/requirements-dev.txt installed.', 'green');
      }
    }
    log('✅ Dependencies installed successfully!', 'green');
  } catch (error) {
    log('❌ Error during dependency installation.', 'red');
    log(`Error message: ${error.message}`, 'red');
    if (error.stdout) log(`Stdout: ${error.stdout}`, 'red');
    if (error.stderr) log(`Stderr: ${error.stderr}`, 'red');
    console.error("Full error during dependency installation:", error);
    log('Exiting script due to dependency installation failure.', 'red');
    process.exit(1);
  }
};

const showCompletionMessage = () => {
  log('');
  log('🎉 Project setup complete!', 'green');
  log('═'.repeat(50), 'cyan');
  log('Next Steps:', 'bold');
  log(`  1. Navigate to your project directory:`, 'cyan');
  log(`     cd ${projectConfig.name}`, 'yellow');

  let stepCount = 2;
  const devCommands = [];

  // Frontend related commands
  if (projectConfig.jsFramework !== 'skip') {
    if (projectConfig.bundler === 'vite') {
      devCommands.push('npm run dev');
    } else if (projectConfig.bundler === 'webpack') {
      devCommands.push('npm run start'); // Or 'npm run dev' depending on typical webpack setup
    } else if (projectConfig.jsFramework === 'angular') {
      devCommands.push('ng serve');
    }
    // Add other bundler/framework specific start commands if necessary
  }

  // Backend related commands (if not covered by a single frontend command)
  if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python') { // Node.js backends
    // Assuming backend runs with frontend if using Vite/Webpack and a Node backend
    // If backend needs separate start, add here. e.g. if not part of npm run dev
    // For Express, usually `npm run dev` or `npm start` in package.json handles both.
    // If a separate command is needed for backend: devCommands.push('npm run start:server');
  }

  if (projectConfig.backend === 'python') {
    const venvActivateCommand = process.platform === 'win32' ? `venv\\Scripts\\activate` : `source venv/bin/activate`;
    log(`  ${stepCount++}. Activate Python virtual environment:`, 'cyan');
    log(`     ${venvActivateCommand}`, 'yellow');
    if (projectConfig.pythonFramework === 'flask') {
      devCommands.push('flask run');
    } else if (projectConfig.pythonFramework === 'django') {
      devCommands.push('python manage.py runserver');
    } else if (projectConfig.pythonFramework === 'fastapi') {
      // Assuming uvicorn main:app --reload, adjust if entry point is different
      // Python backend implies .py, so no need to check projectConfig.language here for main file extension
      devCommands.push(`uvicorn server.app.main:app --reload --port 8000`);
    }
  }

  if (devCommands.length > 0) {
    log(`  ${stepCount++}. Start the development server(s):`, 'cyan');
    devCommands.forEach(cmd => log(`     ${cmd}`, 'yellow'));
  }


  // Deployment related commands
  // process.cwd() here refers to the project root because of chdir in createProjectStructure
  if (projectConfig.deployment === 'docker' && fs.existsSync(path.join(process.cwd(), 'docker-compose.yml'))) {
    log(`  ${stepCount++}. To run with Docker (if configured):`, 'cyan');
    log(`     docker-compose up --build`, 'yellow');
  } else if (projectConfig.deployment === 'docker' && fs.existsSync(path.join(process.cwd(), 'Dockerfile'))) {
    log(`  ${stepCount++}. To build and run with Docker (if configured):`, 'cyan');
    log(`     docker build -t ${projectConfig.name} .`, 'yellow');
    log(`     docker run -p YOUR_PORT:CONTAINER_PORT ${projectConfig.name}`, 'yellow');
  }


  log('');
  log('✨ Happy coding!', 'magenta');
  log('═'.repeat(50), 'cyan');
};

const runSetup = async () => {
  try {
    showWelcome();
    await getProjectName();
    await chooseSetupType();
    await gatherConfiguration();
    showConfigSummary();

    const confirmed = await confirmSetup();
    if (!confirmed) {
      log('👋 Setup cancelled. Goodbye!', 'yellow');
      process.exit(0);
    }

    createProjectStructure(); // This now internally calls generatePackageJson and createBasicFiles
    // createFrontendFiles and createBackendFiles are also called within createProjectStructure or will be called after
    
    createDatabaseFiles(projectConfig);
    createDeploymentFiles(projectConfig);

    await installDependencies();
    showCompletionMessage();

  } catch (error) {
    log(`❌ Setup failed: ${error.message}`, 'red');
    console.error(error); // Log the full error for debugging
    process.exit(1);
  } finally {
    rl.close();
  }
};

module.exports = {
  runSetup,
  getProjectName,
  chooseSetupType,
  selectOption,
  gatherConfiguration,
  showConfigSummary,
  confirmSetup,
  createProjectStructure,
  installDependencies,
  showCompletionMessage
};
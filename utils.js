const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cross-platform compatibility (will be shared or moved as needed)
const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : '/bin/bash';

// Import log and colors from ui.js
const { log, colors } = require('./ui');

const execCommand = (command, options = {}) => {
  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: shell,
      ...options
    });
    return result;
  } catch (error) {
    if (!options.silent) {
      log(`❌ Error executing: ${command}`, 'red');
      log(error.message, 'red');
    }
    throw error;
  }
};

const createDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
};

module.exports = {
  execCommand,
  createDirectory,
  writeFile,
  isWindows, // Exporting for now, might be better in a central config/env module
  shell     // Same as above
};
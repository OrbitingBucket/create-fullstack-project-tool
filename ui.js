const readline = require('readline');
const os = require('os');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const log = (message, color = 'reset') => {
  // Ensure color exists, otherwise default to reset
  const selectedColor = colors[color] ? colors[color] : colors.reset;
  console.log(`${selectedColor}${message}${colors.reset}`);
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
const question = (prompt) => {
  return new Promise((resolve) => {
    // Use the log function for consistent colored output if prompt is an array [message, color]
    if (Array.isArray(prompt)) {
        // Log the prompt message with its color, but don't add a newline for rl.question
        const [message, colorName] = prompt;
        const selectedColor = colors[colorName] ? colors[colorName] : colors.reset;
        process.stdout.write(`${selectedColor}${message}${colors.reset}`);
        rl.question('', resolve); // readline will use the already written prompt
    } else {
        rl.question(prompt, resolve);
    }
  });
};

const showWelcome = () => {
  console.clear();
  log('╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                              ║', 'cyan');
  log('║        🚀 MODULAR DEVELOPMENT ENVIRONMENT SETUP 🚀          ║', 'cyan');
  log('║                                                              ║', 'cyan');
  log('║         Cross-platform • Customizable • Fast               ║', 'cyan');
  log('║                                                              ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
  log('');
  log(`Platform: ${os.platform()} ${os.arch()}`, 'dim');
  log(`Node.js: ${process.version}`, 'dim');
  log('');
};

module.exports = {
  colors,
  log,
  rl,
  question,
  showWelcome
};
#!/usr/bin/env node

const { log, rl } = require('./ui'); // For process handlers
const { runSetup } = require('./projectSetup');

// Main execution
const main = async () => {
  try {
    await runSetup();
  } catch (error) {
    // Use imported log for consistency if possible, otherwise console.error
    if (typeof log === 'function') {
      log(`❌ Critical setup failure: ${error.message}`, 'red');
      if (error.stack) {
        log(error.stack, 'red');
      }
    } else {
      console.error(`❌ Critical setup failure: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
  // rl.close() is expected to be handled within runSetup or by ui.js if necessary.
};

// Handle process termination gracefully
process.on('SIGINT', () => {
  log('\n👋 Setup cancelled by user (SIGINT). Goodbye!', 'yellow');
  if (rl && typeof rl.close === 'function') {
    rl.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n👋 Setup terminated (SIGTERM). Goodbye!', 'yellow');
  if (rl && typeof rl.close === 'function') {
    rl.close();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`❌ Uncaught Exception: ${error.message}`);
  console.error(error.stack);
  if (rl && typeof rl.close === 'function') {
    rl.close();
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`❌ Unhandled Rejection at promise: ${promise}, reason: ${reason}`);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
  if (rl && typeof rl.close === 'function') {
    rl.close();
  }
  process.exit(1);
});

// Run the script only if this file is executed directly
if (require.main === module) {
  main();
}

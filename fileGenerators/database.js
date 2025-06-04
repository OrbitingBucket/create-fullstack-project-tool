const { writeFile, createDirectory } = require('../utils'); // Adjusted path
const { log } = require('../ui'); // Adjusted path
const fs = require('fs'); // For reading/appending .env
const path = require('path'); // For path joining

const updateSingleEnvFile = (filePath, dbVarsList, projectConfig) => {
  let lines = [];
  if (fs.existsSync(filePath)) {
    lines = fs.readFileSync(filePath, 'utf8').split('\n');
  }

  const outputLines = [];
  const handledKeys = new Set();
  const dbConfigHeader = '# Database Configuration added by setup script';
  let headerInjected = lines.some(line => line.trim() === dbConfigHeader);

  // First pass: update existing vars and preserve order of other lines
  for (const line of lines) {
    let matchFound = false;
    if (line.includes('=')) {
      const key = line.substring(0, line.indexOf('='));
      for (const dbVar of dbVarsList) {
        if (dbVar.key === key) {
          outputLines.push(`${dbVar.key}=${dbVar.value}`);
          handledKeys.add(dbVar.key);
          matchFound = true;
          break;
        }
      }
    }
    if (!matchFound) {
      // Avoid re-adding the header if it's already processed or will be added
      if (line.trim() === dbConfigHeader && headerInjected) {
        // Skip if header is already marked as injected (or present)
      } else {
        outputLines.push(line);
      }
    }
  }

  // Inject header if not already present
  if (!headerInjected) {
    let injectionPoint = outputLines.findIndex(l => l.startsWith("PORT=") || l.startsWith("PYTHON_PORT="));
    if (injectionPoint === -1) injectionPoint = outputLines.findIndex(l => l.startsWith("NODE_ENV="));
    if (injectionPoint === -1 && outputLines.length > 0 && outputLines.every(l => l.trim() === '')) { // If only blank lines
        injectionPoint = 0; // Put at top if file is effectively empty
        outputLines.splice(injectionPoint, 0, dbConfigHeader);
    } else if (injectionPoint !== -1) {
      outputLines.splice(injectionPoint + 1, 0, dbConfigHeader);
    } else { // Append at the end if no suitable point found or file is empty
      if (outputLines.length > 0 && outputLines[outputLines.length -1].trim() !== '') outputLines.push(''); // Add blank line before header
      outputLines.push(dbConfigHeader);
    }
    headerInjected = true; // Mark as injected
  }
  
  // Append new vars that weren't updates
  for (const dbVar of dbVarsList) {
    if (dbVar.key && !handledKeys.has(dbVar.key)) {
      // Find header index to append after it
      const headerIdx = outputLines.findIndex(l => l.trim() === dbConfigHeader);
      if (headerIdx !== -1) {
        outputLines.splice(headerIdx + 1 + dbVarsList.filter(v => v.key && !handledKeys.has(v.key) && dbVarsList.indexOf(v) < dbVarsList.indexOf(dbVar)).length, 0, `${dbVar.key}=${dbVar.value}`);
      } else { // Should not happen if header is always injected
        outputLines.push(`${dbVar.key}=${dbVar.value}`);
      }
      handledKeys.add(dbVar.key); // Mark as handled
    }
  }

  // Clean up: remove leading/trailing whitespace from lines, filter multiple blank lines, ensure trailing newline
  let finalContent = outputLines
    .map(line => line.trimEnd()) // Trim trailing whitespace from each line
    .filter((line, index, arr) => !(line.trim() === '' && arr[index - 1] && arr[index - 1].trim() === '')) // Remove consecutive blank lines
    .join('\n');
  
  if (finalContent.trim() === '') { // If file becomes empty (e.g. only comments removed)
    fs.writeFileSync(filePath, '\n'); // Write a single newline for an empty file
  } else {
    fs.writeFileSync(filePath, finalContent.trim() + '\n');
  }
};

const updateEnvForDatabase = (projectConfig) => {
  if (projectConfig.database === 'none') return;

  const dbVarsList = [];
  const dbName = `${projectConfig.name.replace(/[^a-zA-Z0-9_]/g, '_')}_db`;

  // Note: The header comment is handled by updateSingleEnvFile
  // dbVarsList.push({ comment: '# Database Configuration added by setup script' });

  switch (projectConfig.database) {
    case 'sqlite':
      const sqlitePath = projectConfig.backend === 'python' ? `sqlite:///./server/database.db` : `sqlite:./data/database.sqlite`;
      dbVarsList.push({ key: 'DATABASE_URL', value: sqlitePath });
      break;
    case 'postgresql':
      dbVarsList.push({ key: 'DB_HOST', value: 'localhost' });
      dbVarsList.push({ key: 'DB_PORT', value: '5432' });
      dbVarsList.push({ key: 'DB_USER', value: 'postgres' });
      dbVarsList.push({ key: 'DB_PASSWORD', value: 'yoursecurepassword' });
      dbVarsList.push({ key: 'DB_NAME', value: dbName });
      dbVarsList.push({ key: 'DATABASE_URL', value: `postgresql://\${DB_USER}:\${DB_PASSWORD}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}` });
      break;
    case 'mysql':
      dbVarsList.push({ key: 'DB_HOST', value: 'localhost' });
      dbVarsList.push({ key: 'DB_PORT', value: '3306' });
      dbVarsList.push({ key: 'DB_USER', value: 'root' });
      dbVarsList.push({ key: 'DB_PASSWORD', value: 'yoursecurepassword' });
      dbVarsList.push({ key: 'DB_NAME', value: dbName });
      const driver = projectConfig.backend === 'python' ? 'mysql+pymysql' : 'mysql';
      dbVarsList.push({ key: 'DATABASE_URL', value: `${driver}://\${DB_USER}:\${DB_PASSWORD}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}` });
      break;
    case 'mongodb':
      // common.js already adds MONGODB_URI, this will update/ensure it
      dbVarsList.push({ key: 'MONGODB_URI', value: `mongodb://localhost:27017/${dbName}` });
      break;
    case 'redis':
      // common.js already adds REDIS_URL, this will update/ensure it with the default DB index
      dbVarsList.push({ key: 'REDIS_URL', value: `redis://localhost:6379/0` });
      break;
  }

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  updateSingleEnvFile(envPath, dbVarsList, projectConfig);
  updateSingleEnvFile(envExamplePath, dbVarsList, projectConfig);

  log('📝 .env and .env.example updated with database connection variables.', 'green');
};

const createSQLiteConfig = (projectConfig) => {
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const dbDir = projectConfig.backend === 'python' ? 'server' : 'server/src/database';
  const modelDir = projectConfig.backend === 'python' ? 'server/app/models_sql' : 'server/src/models'; // Differentiate from Pydantic models
  const dataDir = projectConfig.backend === 'python' ? 'server/data' : 'server/data'; // data dir at server level or project root

  createDirectory(dbDir);
  createDirectory(modelDir);
  createDirectory(dataDir);


  const sqliteConnection = isTypeScript ? `
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Determine the correct path to the data directory
// This assumes the script is run from the project root where server/data will be.
const dbFilePath = path.join(process.cwd(), '${dataDir.replace(/\\/g, '/')}', 'database.sqlite');

let db: Database | null = null;

export const connectDatabase = async (): Promise<Database> => {
  if (db) return db;
  try {
    db = await open({
      filename: dbFilePath,
      driver: sqlite3.Database
    });
    console.log('✅ Connected to SQLite database at:', dbFilePath);
    await initializeTables(db);
    return db;
  } catch (error) {
    console.error('❌ SQLite connection error:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('🔒 SQLite database connection closed');
  }
};

const initializeTables = async (database: Database): Promise<void> => {
  await database.exec(\`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  \`);
  // Add more tables as needed
  console.log('📋 SQLite tables (users, todos) initialized (if not exist)');
};

export const getDatabase = (): Database | null => db;
` : `
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbFilePath = path.join(process.cwd(), '${dataDir.replace(/\\/g, '/')}', 'database.sqlite');
let db = null;

const connectDatabase = async () => {
  if (db) return db;
  try {
    db = await open({
      filename: dbFilePath,
      driver: sqlite3.Database
    });
    console.log('✅ Connected to SQLite database at:', dbFilePath);
    await initializeTables(db);
    return db;
  } catch (error) {
    console.error('❌ SQLite connection error:', error);
    throw error;
  }
};

const closeDatabase = async () => { /* ... */ };
const initializeTables = async (database) => { /* ... */ };
const getDatabase = () => db;

module.exports = { connectDatabase, closeDatabase, getDatabase, initializeTables };
`;
  // For Node.js backend, place it in server/src/database
  if (projectConfig.backend !== 'python') {
    writeFile(`${dbDir}/sqlite.${ext}`, sqliteConnection.trim());
    log(`📄 Created SQLite connection file: ${dbDir}/sqlite.${ext}`, 'green');
  }
  // Python version is handled by createPythonDatabaseFile in backendPython.js
};

const createPostgreSQLConfig = (projectConfig) => {
  if (projectConfig.backend === 'python') return; // Handled by backendPython.js
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const dbDir = 'server/src/database';
  createDirectory(dbDir);

  const pgConnection = isTypeScript ? `
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Ensure .env from project root is loaded

let pool: Pool | null = null;

export const connectDatabase = async (): Promise<Pool> => {
  if (pool) return pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    await initializeTables(pool);
    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 PostgreSQL database pool closed');
  }
};

const initializeTables = async (p: Pool): Promise<void> => {
  const client = await p.connect();
  try {
    await client.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        user_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    \`);
    console.log('📋 PostgreSQL tables (users, todos) initialized (if not exist)');
  } finally {
    client.release();
  }
};

export const getPool = (): Pool | null => pool;

export const query = async (text: string, params?: any[]): Promise<any> => {
  if (!pool) throw new Error('PostgreSQL pool not initialized');
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};
` : `
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let pool = null;

const connectDatabase = async () => {
  if (pool) return pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    await initializeTables(pool);
    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 PostgreSQL database pool closed');
  }
};

const initializeTables = async (p) => {
  const client = await p.connect();
  try {
    await client.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    console.log('📋 PostgreSQL tables initialized (if not exist)');
  } finally {
    client.release();
  }
};

const getPool = () => pool;

const query = async (text, params) => {
  if (!pool) throw new Error('PostgreSQL pool not initialized');
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};

module.exports = { connectDatabase, closeDatabase, initializeTables, getPool, query };
`;
  writeFile(`${dbDir}/postgresql.${ext}`, pgConnection.trim());
  log(`📄 Created PostgreSQL config: ${dbDir}/postgresql.${ext}`, 'green');
};

const createMySQLConfig = (projectConfig) => {
  if (projectConfig.backend === 'python') return; // Handled by backendPython.js
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const dbDir = 'server/src/database';
  createDirectory(dbDir);

  const mysqlConnection = isTypeScript ? `
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let pool: mysql.Pool | null = null;
export const connectDatabase = async (): Promise<mysql.Pool> => {
  if (pool) return pool;
  try {
    pool = mysql.createPool(process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    connection.release();
    await initializeTables(pool);
    return pool;
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 MySQL database pool closed');
  }
};

const initializeTables = async (p: mysql.Pool): Promise<void> => {
  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await p.getConnection();
    await connection.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    \`);
    console.log('📋 MySQL tables (users, todos) initialized (if not exist)');
  } finally {
    if (connection) connection.release();
  }
};

export const getPool = (): mysql.Pool | null => pool;

export const query = async (sql: string, params?: any[]): Promise<[mysql.QueryResult, mysql.FieldPacket[]]> => {
  if (!pool) throw new Error('MySQL pool not initialized');
  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    const [results, fields] = await connection.query(sql, params);
    return [results, fields];
  } finally {
    if (connection) connection.release();
  }
};
` : `
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let pool = null;

const connectDatabase = async () => {
  if (pool) return pool;
  try {
    pool = mysql.createPool(process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    connection.release();
    await initializeTables(pool);
    return pool;
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    throw error;
  }
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 MySQL database pool closed');
  }
};

const initializeTables = async (p) => {
  let connection = null;
  try {
    connection = await p.getConnection();
    await connection.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    \`);
    console.log('📋 MySQL tables initialized (if not exist)');
  } finally {
    if (connection) connection.release();
  }
};

const getPool = () => pool;

const query = async (sql, params) => {
  if (!pool) throw new Error('MySQL pool not initialized');
  let connection = null;
  try {
    connection = await pool.getConnection();
    const [results, fields] = await connection.query(sql, params);
    return [results, fields];
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { connectDatabase, closeDatabase, initializeTables, getPool, query };
`;
  writeFile(`${dbDir}/mysql.${ext}`, mysqlConnection.trim());
  log(`📄 Created MySQL config: ${dbDir}/mysql.${ext}`, 'green');
};

const createMongoDBConfig = (projectConfig) => {
  if (projectConfig.backend === 'python') return; // Handled by backendPython.js
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const dbDir = 'server/src/database';
  createDirectory(dbDir);

  const mongoConnection = isTypeScript ? `
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export const connectDatabase = async (): Promise<Db> => {
  if (dbInstance) return dbInstance;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');
  try {
    client = new MongoClient(uri);
    await client.connect();
    dbInstance = client.db(); // Assumes DB name is in URI or uses default
    console.log('✅ Connected to MongoDB database');
    // No specific table initialization for MongoDB in this basic setup
    return dbInstance;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log('🔒 MongoDB connection closed');
  }
};

export const getDb = (): Db | null => dbInstance;

// Example helper:
export const getCollection = (name: string) => {
  if (!dbInstance) throw new Error('MongoDB not connected');
  return dbInstance.collection(name);
};
` : `
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let client = null;
let dbInstance = null;

const connectDatabase = async () => {
  if (dbInstance) return dbInstance;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');
  try {
    client = new MongoClient(uri);
    await client.connect();
    dbInstance = client.db(); // Assumes DB name is in URI or uses default
    console.log('✅ Connected to MongoDB database');
    return dbInstance;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

const closeDatabase = async () => {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log('🔒 MongoDB connection closed');
  }
};

const getDb = () => dbInstance;

const getCollection = (name) => {
  if (!dbInstance) throw new Error('MongoDB not connected');
  return dbInstance.collection(name);
};

module.exports = { connectDatabase, closeDatabase, getDb, getCollection };
`;
  writeFile(`${dbDir}/mongodb.${ext}`, mongoConnection.trim());
  log(`📄 Created MongoDB config: ${dbDir}/mongodb.${ext}`, 'green');
};

const createRedisConfig = (projectConfig) => {
  if (projectConfig.backend === 'python') return; // Handled by backendPython.js
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const dbDir = 'server/src/database';
  createDirectory(dbDir);

  const redisConnection = isTypeScript ? `
import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let client: RedisClientType | null = null;
export const connectDatabase = async (): Promise<RedisClientType> => {
  if (client && client.isOpen) return client;
  try {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL not set in .env');
    client = createClient({ url });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
    console.log('✅ Connected to Redis');
    return client;
  } catch (error) {
    console.error('❌ Redis connection error:', error);
    if (client && client.isOpen) { // Attempt to quit if connection was partially open
        await client.quit();
    }
    client = null; // Reset client
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
    console.log('🔒 Redis connection closed');
  }
};

export const getClient = (): RedisClientType | null => client;

// Example Redis commands (can be expanded)
export const setValue = async (key: string, value: string): Promise<string | null> => {
  if (!client || !client.isOpen) throw new Error('Redis client not connected');
  return client.set(key, value);
};

export const getValue = async (key: string): Promise<string | null> => {
  if (!client || !client.isOpen) throw new Error('Redis client not connected');
  return client.get(key);
};
` : `
const { createClient } = require('redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let client = null;

const connectDatabase = async () => {
  if (client && client.isOpen) return client;
  try {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL not set in .env');
    client = createClient({ url });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
    console.log('✅ Connected to Redis');
    return client;
  } catch (error) {
    console.error('❌ Redis connection error:', error);
    if (client && client.isOpen) {
        await client.quit();
    }
    client = null;
    throw error;
  }
};

const closeDatabase = async () => {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
    console.log('🔒 Redis connection closed');
  }
};

const getClient = () => client;

const setValue = async (key, value) => {
  if (!client || !client.isOpen) throw new Error('Redis client not connected');
  return client.set(key, value);
};

const getValue = async (key) => {
  if (!client || !client.isOpen) throw new Error('Redis client not connected');
  return client.get(key);
};

module.exports = { connectDatabase, closeDatabase, getClient, setValue, getValue };
`;
  writeFile(`${dbDir}/redis.${ext}`, redisConnection.trim());
  log(`📄 Created Redis config: ${dbDir}/redis.${ext}`, 'green');
};

const createDatabaseUtilities = (projectConfig) => {
  if (projectConfig.database === 'none' || projectConfig.backend === 'python') return; // Python handles its own DB utils

  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const dbDir = 'server/src/database';
  createDirectory(dbDir); // Ensure it exists

  // Create database index file for easy imports (for Node.js backends)
  const dbIndexContent = isTypeScript ? `
// Dynamically export the correct database module based on selection
// This assumes only one database is configured at a time for the Node.js backend.

${projectConfig.database === 'sqlite' ? "export * from './sqlite';" : ""}
${projectConfig.database === 'postgresql' ? "export * from './postgresql';" : ""}
${projectConfig.database === 'mysql' ? "export * from './mysql';" : ""}
${projectConfig.database === 'mongodb' ? "export * from './mongodb';" : ""}
${projectConfig.database === 'redis' ? "export * from './redis';" : ""}

// Add a generic connect function if possible, or specific ones.
// For example, if all have a 'connectDatabase' export:
// import { connectDatabase as connectSqlite } from './sqlite';
// ... and so on, then a generic one:
/*
export const connectCurrentDatabase = async () => {
  switch ('${projectConfig.database}') {
    case 'sqlite': return (await import('./sqlite')).connectDatabase();
    // ... other cases
    default: throw new Error('No database configured or unsupported database for Node.js');
  }
};
*/
` : `
// Dynamically export the correct database module
module.exports = require('./${projectConfig.database}');
`;
  writeFile(`${dbDir}/index.${ext}`, dbIndexContent.trim());
  log(`📄 Created database index: ${dbDir}/index.${ext}`, 'green');
};


const createDatabaseFiles = (projectConfig) => {
  if (projectConfig.database === 'none') {
    log('⏭️ No database selected, skipping database file generation.', 'dim');
    return;
  }

  log(`🗄️ Setting up database configuration for ${projectConfig.database}...`, 'blue');

  // For Node.js backends, create specific config files
  if (projectConfig.backend !== 'python') {
    const serverDbPath = 'server/src/database';
    const serverModelPath = 'server/src/models'; // For ORM models if applicable
    createDirectory(serverDbPath);
    createDirectory(serverModelPath);

    switch (projectConfig.database) {
      case 'sqlite':
        createSQLiteConfig(projectConfig);
        break;
      case 'postgresql':
        createPostgreSQLConfig(projectConfig);
        break;
      case 'mysql':
        createMySQLConfig(projectConfig);
        break;
      case 'mongodb':
        createMongoDBConfig(projectConfig);
        break;
      case 'redis':
        createRedisConfig(projectConfig);
        break;
      default:
        log(`⚠️ Database ${projectConfig.database} Node.js configuration not fully implemented yet.`, 'yellow');
    }
    createDatabaseUtilities(projectConfig); // Creates index.ts/js for Node.js database modules
  } else {
    // For Python backends, database setup is handled within createPythonDatabaseFile in backendPython.js
    log('🐍 Python database setup is handled by the Python backend module.', 'dim');
  }
  
  updateEnvForDatabase(projectConfig); // Update .env file with DB connection strings
};

module.exports = {
  createDatabaseFiles
};
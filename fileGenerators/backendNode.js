const { writeFile, createDirectory } = require('../utils'); // Adjusted path
const { log } = require('../ui'); // Adjusted path

// --- Refactoring Helper Functions ---

const generateGracefulShutdownLogic = (projectConfig) => {
  const closeDbLine = projectConfig.database !== 'none' ? `  if (projectConfig.database !== 'none') await closeDatabase();\n` : '';
  return `
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
${closeDbLine}  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
${closeDbLine}  process.exit(0);
});
  `.trim();
};

const generateStartServerWrapper = (projectConfig, frameworkListenBlock, frameworkName = '') => {
  const dbConnectLine = projectConfig.database !== 'none' ? `    if (projectConfig.database !== 'none') await connectDatabase(); // Connect to database if configured\n` : '';
  const dbCloseOnErrorLine = projectConfig.database !== 'none' ? `    if (projectConfig.database !== 'none') await closeDatabase(); // Ensure database connection is closed on failure\n` : '';
  const serverNameForLog = frameworkName ? `${frameworkName} ` : '';

  return `
const startServer = async () => {
  try {
${dbConnectLine}${frameworkListenBlock}
  } catch (error) {
    console.error(\`Failed to start ${serverNameForLog}server:\`, error);
${dbCloseOnErrorLine}    process.exit(1);
  }
};

startServer();
  `.trim();
};

// General template for Express and Koa which have similar synchronous setup flows
const generateStandardServerFileTemplate = (projectConfig, frameworkImpl) => {
  const isTypeScript = projectConfig.language === 'typescript';
  let content = `
${frameworkImpl.getImports(isTypeScript, projectConfig)}

${frameworkImpl.getAppSetup(isTypeScript, projectConfig)}

${frameworkImpl.getMiddleware(isTypeScript, projectConfig)}

${frameworkImpl.getRootRoute(isTypeScript, projectConfig)}

${frameworkImpl.getHealthCheckRoute(isTypeScript, projectConfig)}

${frameworkImpl.getTodoApi(isTypeScript, projectConfig)}

${frameworkImpl.getExtraRoutes ? frameworkImpl.getExtraRoutes(isTypeScript, projectConfig) : ''}

${frameworkImpl.getErrorHandler(isTypeScript, projectConfig)}

${frameworkImpl.getStartServerBlock(isTypeScript, projectConfig)}

${generateGracefulShutdownLogic(projectConfig)}
`;
  return content.trim();
};


// --- Framework Specific File Creation ---

const createExpressFiles = (projectConfig) => {
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const expressServerDir = 'server/src';
  createDirectory(expressServerDir);

  const expressImpl = {
    getImports: (isTs, pConf) => {
      const dbImports = pConf.database !== 'none' ? (isTs ? `import { connectDatabase, closeDatabase } from './database/index';` : `const { connectDatabase, closeDatabase } = require('./database/index');`) : '';
      return isTs ? `
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
${dbImports}
` : `
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
${dbImports}
`;
    },
    getAppSetup: (isTs, pConf) => `
dotenv.config();
const app${isTs ? ': Express' : ''} = express();
const port = process.env.PORT || 5000;
`,
    getMiddleware: (isTs, pConf) => `
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
`,
    getRootRoute: (isTs, pConf) => isTs ? `
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running! 🚀');
});
` : `
app.get('/', (req, res) => {
  res.send('Express + JavaScript Server is running! 🚀');
});
`,
    getHealthCheckRoute: (isTs, pConf) => isTs ? `
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', message: 'Server is up and running' });
});
` : `
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'Server is up and running' });
});
`,
    getTodoApi: (isTs, pConf) => {
      const todoInterface = isTs ? `
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}` : '';
      const todoArrayType = isTs ? ': Todo[]' : '';
      const newTodoType = isTs ? ': Todo' : '';
      const reqType = isTs ? ': Request' : '';
      const resType = isTs ? ': Response' : '';
      const bodyText = isTs ? '(req.body as { text?: string })' : 'req.body';
      const bodyTextCompleted = isTs ? '(req.body as { text?: string, completed?: boolean })' : 'req.body';

      return `
// --- Todo API Example ---
${todoInterface}
let todos${todoArrayType} = [
  { id: '1', text: 'Learn Express', completed: true },
  { id: '2', text: 'Build a Todo API', completed: false },
];

app.get('/api/todos', (req${reqType}, res${resType}) => {
  res.json(todos);
});

app.get('/api/todos/:id', (req${reqType}, res${resType}) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) { return res.status(404).json({ message: 'Todo not found' }); }
  res.json(todo);
});

app.post('/api/todos', (req${reqType}, res${resType}) => {
  const { text } = ${bodyText};
  if (!text) { return res.status(400).json({ message: 'Text is required' }); }
  const newTodo${newTodoType} = { id: String(Date.now()), text, completed: false };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req${reqType}, res${resType}) => {
  const { text, completed } = ${bodyTextCompleted};
  const todoIndex = todos.findIndex(t => t.id === req.params.id);
  if (todoIndex === -1) { return res.status(404).json({ message: 'Todo not found' }); }
  const currentTodo = todos[todoIndex];
  todos[todoIndex] = { ...currentTodo, text: text ?? currentTodo.text, completed: completed ?? currentTodo.completed };
  res.json(todos[todoIndex]);
});

app.delete('/api/todos/:id', (req${reqType}, res${resType}) => {
  const todoIndex = todos.findIndex(t => t.id === req.params.id);
  if (todoIndex === -1) { return res.status(404).json({ message: 'Todo not found' }); }
  todos.splice(todoIndex, 1);
  res.status(204).send();
});
// --- End Todo API Example ---
`;
    },
    getExtraRoutes: (isTs, pConf) => {
      const reqQuery = isTs ? '(req.query as any)' : 'req.query';
      return `
app.get('/api/greet', (req${isTs ? ': Request' : ''}, res${isTs ? ': Response' : ''}) => {
  const name = ${reqQuery}.name || 'World';
  res.json({ message: \`Hello, \${name}!\` });
});
`;
    },
    getErrorHandler: (isTs, pConf) => isTs ? `
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
` : `
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
`,
    getStartServerBlock: (isTs, pConf) => {
      const listenBlock = `    app.listen(port, () => {\n      console.log(\`[server]: Express server is running at http://localhost:\${port}\`);\n    });`;
      return generateStartServerWrapper(pConf, listenBlock, 'Express');
    }
  };

  const expressServerFileContent = generateStandardServerFileTemplate(projectConfig, expressImpl);
  writeFile(`${expressServerDir}/server.${ext}`, expressServerFileContent.trim());
  log(`🚀 Created Express server file: ${expressServerDir}/server.${ext}`, 'green');
};

const createFastifyFiles = (projectConfig) => {
  const isTypeScript = projectConfig.language === 'typescript';
  const ext = isTypeScript ? 'ts' : 'js';
  const fastifyServerDir = 'server/src';
  createDirectory(fastifyServerDir);

  const fastifyImpl = {
    getImports: (isTs, pConf) => {
      const dbImports = pConf.database !== 'none' ? (isTs ? `import { connectDatabase, closeDatabase } from './database/index';` : `const { connectDatabase, closeDatabase } = require('./database/index');`) : '';
      return isTs ? `
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
${dbImports}
` : `
const Fastify = require('fastify');
const sensible = require('@fastify/sensible');
const cors = require('@fastify/cors');
const dotenv = require('dotenv');
${dbImports}
`;
    },
    getAppSetup: (isTs, pConf) => `
dotenv.config();
const server${isTs ? ': FastifyInstance' : ''} = Fastify({});
const port = parseInt(process.env.PORT || '5000');
`,
    getCoreServerLogic: (isTs, pConf) => {
      const todoInterface = isTs ? `
    interface Todo {
      id: string;
      text: string;
      completed: boolean;
    }` : '';
      const todoArrayType = isTs ? ': Todo[]' : '';
      const newTodoType = isTs ? ': Todo' : '';

      const reqType = (generics = '') => isTs ? `: FastifyRequest${generics}` : '';
      const repType = isTs ? ': FastifyReply' : '';
      
      const bodyAccess = (isTsVar) => isTsVar ? '(request.body as any)' : 'request.body';
      const paramsAccess = (isTsVar) => isTsVar ? '(request.params as any)' : 'request.params';
      const queryAccess = (isTsVar) => isTsVar ? '(request.query as any)' : 'request.query';

      return `
  await server.register(cors);
  await server.register(sensible);

  server.get('/', async (request${reqType()}, reply${repType}) => {
    return { hello: 'Fastify + ${isTs ? "TypeScript" : "JavaScript"} world 🚀' };
  });

  server.get('/api/health', async (request${reqType()}, reply${repType}) => {
    return reply.status(200).send({ status: 'healthy', message: 'Server is up and running' });
  });

  // --- Todo API Example (Fastify) ---
${todoInterface}
  let todos${todoArrayType} = [
    { id: '1', text: 'Learn Fastify', completed: true },
    { id: '2', text: 'Build a Todo API with Fastify', completed: false },
  ];

  server.get('/api/todos', async (request${reqType()}, reply${repType}) => {
    return todos;
  });

  server.get('/api/todos/:id', async (request${reqType('<{ Params: { id: string } }>')}, reply${repType}) => {
    const todo = todos.find(t => t.id === ${paramsAccess(isTs)}.id);
    if (!todo) { return reply.status(404).send({ message: 'Todo not found' }); }
    return todo;
  });

  server.post('/api/todos', async (request${reqType('<{ Body: { text?: string } }>')}, reply${repType}) => {
    const { text } = ${getBody(isTs)};
    if (!text) { return reply.status(400).send({ message: 'Text is required' }); }
    const newTodo${newTodoType} = { id: String(Date.now()), text, completed: false };
    todos.push(newTodo);
    return reply.status(201).send(newTodo);
  });

  server.put('/api/todos/:id', async (request${reqType('<{ Params: { id: string }, Body: { text?: string, completed?: boolean } }>')}, reply${repType}) => {
    const { text, completed } = ${getBody(isTs)};
    const todoIndex = todos.findIndex(t => t.id === ${paramsAccess(isTs)}.id);
    if (todoIndex === -1) { return reply.status(404).send({ message: 'Todo not found' }); }
    const currentTodo = todos[todoIndex];
    todos[todoIndex] = { ...currentTodo, text: text ?? currentTodo.text, completed: completed ?? currentTodo.completed };
    return todos[todoIndex];
  });

  server.delete('/api/todos/:id', async (request${reqType('<{ Params: { id: string } }>')}, reply${repType}) => {
    const todoIndex = todos.findIndex(t => t.id === ${paramsAccess(isTs)}.id);
    if (todoIndex === -1) { return reply.status(404).send({ message: 'Todo not found' }); }
    todos.splice(todoIndex, 1);
    return reply.status(204).send();
  });
  // --- End Todo API Example (Fastify) ---

  server.get('/api/greet', async (request${reqType('<{ Querystring: { name?: string } }>')}, reply${repType}) => {
      const name = ${queryAccess(isTs)}.name || 'World';
      return { message: \`Hello, \${name}!\` };
  });

  // Fastify's @fastify/sensible plugin handles error responses automatically.
`;
    },
    getStartServerBlock: (isTs, pConf) => {
      const dbConnectLine = pConf.database !== 'none' ? `    if (projectConfig.database !== 'none') await connectDatabase();\n` : '';
      const dbCloseOnErrorLine = pConf.database !== 'none' ? `    if (projectConfig.database !== 'none') await closeDatabase();\n` : '';
      
      return `
const start = async () => {
  try {
${dbConnectLine}
${fastifyImpl.getCoreServerLogic(isTs, pConf)}
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(\`[server]: Fastify server is running at http://localhost:\${port}\`);
  } catch (err) {
    server.log.error(err);
${dbCloseOnErrorLine}    process.exit(1);
  }
};

start();
`;
    }
  };

  const fastifyServerFileContent = `
${fastifyImpl.getImports(isTypeScript, projectConfig)}
${fastifyImpl.getAppSetup(isTypeScript, projectConfig)}
${fastifyImpl.getStartServerBlock(isTypeScript, projectConfig)}
${generateGracefulShutdownLogic(projectConfig)}
  `.trim();

  writeFile(`${fastifyServerDir}/server.${ext}`, fastifyServerFileContent);
  log(`🚀 Created Fastify server file: ${fastifyServerDir}/server.${ext}`, 'green');
};

const createKoaFiles = (projectConfig) => {
    const isTypeScript = projectConfig.language === 'typescript';
    const ext = isTypeScript ? 'ts' : 'js';
    const koaServerDir = 'server/src';
    createDirectory(koaServerDir);

    const koaImpl = {
      getImports: (isTs, pConf) => {
        const dbImports = pConf.database !== 'none' ? (isTs ? `import { connectDatabase, closeDatabase } from './database/index';` : `const { connectDatabase, closeDatabase } = require('./database/index');`) : '';
        return isTs ? `
import Koa, { Context, Next } from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import dotenv from 'dotenv';
${dbImports}
` : `
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const dotenv = require('dotenv');
${dbImports}
`;
      },
      getAppSetup: (isTs, pConf) => `
dotenv.config();
const app = new Koa();
const router = new Router();
const port = process.env.PORT || 5000;
`,
      getMiddleware: (isTs, pConf) => `
app.use(cors());
app.use(bodyParser());
`,
      getRootRoute: (isTs, pConf) => `
router.get('/', (ctx${isTs ? ': Context' : ''}) => {
  ctx.body = 'Koa + ${isTs ? "TypeScript" : "JavaScript"} Server is running! 🚀';
});
`,
      getHealthCheckRoute: (isTs, pConf) => `
router.get('/api/health', (ctx${isTs ? ': Context' : ''}) => {
  ctx.status = 200;
  ctx.body = { status: 'healthy', message: 'Server is up and running' };
});
`,
      getTodoApi: (isTs, pConf) => {
        const todoInterface = isTs ? `
interface TodoKoa {
  id: string;
  text: string;
  completed: boolean;
}` : '';
        const todoArrayType = isTs ? ': TodoKoa[]' : '';
        const newTodoType = isTs ? ': TodoKoa' : '';
        const ctxType = isTs ? ': Context' : '';
        const requestBody = isTs ? '(ctx.request.body as { text?: string, completed?: boolean })' : 'ctx.request.body';
        const requestBodyTextOnly = isTs ? '(ctx.request.body as { text?: string })' : 'ctx.request.body';


        return `
// --- Todo API Example (Koa) ---
${todoInterface}
let todosKoa${todoArrayType} = [
  { id: '1', text: 'Learn Koa', completed: true },
  { id: '2', text: 'Build a Todo API with Koa', completed: false },
];

router.get('/api/todos', (ctx${ctxType}) => {
  ctx.body = todosKoa;
});

router.get('/api/todos/:id', (ctx${ctxType}) => {
  const todo = todosKoa.find(t => t.id === ctx.params.id);
  if (!todo) { ctx.status = 404; ctx.body = { message: 'Todo not found' }; return; }
  ctx.body = todo;
});

router.post('/api/todos', (ctx${ctxType}) => {
  const { text } = ${requestBodyTextOnly};
  if (!text) { ctx.status = 400; ctx.body = { message: 'Text is required' }; return; }
  const newTodo${newTodoType} = { id: String(Date.now()), text, completed: false };
  todosKoa.push(newTodo);
  ctx.status = 201;
  ctx.body = newTodo;
});

router.put('/api/todos/:id', (ctx${ctxType}) => {
  const { text, completed } = ${requestBody};
  const todoIndex = todosKoa.findIndex(t => t.id === ctx.params.id);
  if (todoIndex === -1) { ctx.status = 404; ctx.body = { message: 'Todo not found' }; return; }
  const currentTodo = todosKoa[todoIndex];
  todosKoa[todoIndex] = { ...currentTodo, text: text ?? currentTodo.text, completed: completed ?? currentTodo.completed };
  ctx.body = todosKoa[todoIndex];
});

router.delete('/api/todos/:id', (ctx${ctxType}) => {
  const todoIndex = todosKoa.findIndex(t => t.id === ctx.params.id);
  if (todoIndex === -1) { ctx.status = 404; ctx.body = { message: 'Todo not found' }; return; }
  todosKoa.splice(todoIndex, 1);
  ctx.status = 204;
});
// --- End Todo API Example (Koa) ---
`;
      },
      getExtraRoutes: (isTs, pConf) => {
        const ctxQuery = isTs ? '(ctx.query as any)' : 'ctx.query';
        return `
router.get('/api/greet', (ctx${isTs ? ': Context' : ''}) => {
  const name = ${ctxQuery}.name || 'World';
  ctx.body = { message: \`Hello, \${name}!\` };
});
`;
      },
      getErrorHandler: (isTs, pConf) => `
app.use(router.routes()).use(router.allowedMethods());

app.on('error', (err, ctx${isTs ? ': Context' : ''}) => {
  console.error('Server error', err, ctx);
});
`,
      getStartServerBlock: (isTs, pConf) => {
        const listenBlock = `    app.listen(port, () => {\n      console.log(\`[server]: Koa server is running at http://localhost:\${port}\`);\n    });`;
        return generateStartServerWrapper(pConf, listenBlock, 'Koa');
      }
    };
    const serverFileContentForKoa = generateStandardServerFileTemplate(projectConfig, koaImpl);
    writeFile(`${koaServerDir}/server.${ext}`, serverFileContentForKoa.trim());
    log(`🚀 Created Koa server file: ${koaServerDir}/server.${ext}`, 'green');
};

const createNestFiles = (projectConfig) => {
  const isTypeScript = projectConfig.language === 'typescript'; // NestJS is TS first
    // const ext = isTypeScript ? 'ts' : 'js'; // NestJS is primarily TS
    const nestServerDir = 'server/src';
    createDirectory(nestServerDir);

    log('🚀 NestJS setup typically uses its CLI. Generating basic structure...', 'blue');
    log('   Run `npm install -g @nestjs/cli` then `nest new server` (or your project name) inside the project root for full setup.', 'dim');
    log('   The following files are a minimal setup and might need `nest build` to run if not using CLI directly.', 'dim');

    const mainTsContent = `
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
${projectConfig.database !== 'none' ? "import { connectDatabase, closeDatabase } from './database/index';" : "// No DB import"}

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Basic CORS setup

  ${projectConfig.database !== 'none' ? "if (projectConfig.database !== 'none') {\n    await connectDatabase();\n  }" : ''}

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(\`[nestjs]: NestJS application is running on: http://localhost:\${port}\`);
}

bootstrap().catch(async err => {
  console.error('Failed to bootstrap NestJS application:', err);
  ${projectConfig.database !== 'none' ? "if (projectConfig.database !== 'none') {\n    await closeDatabase();\n  }" : ''}
  process.exit(1);
});

${generateGracefulShutdownLogic(projectConfig)}
`;
    writeFile(`${nestServerDir}/main.ts`, mainTsContent.trim());

    const appModuleTsContent = `
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Import TodoModule if it were separate
// import { TodoModule } from './todo/todo.module';

@Module({
  imports: [/* TodoModule */], // Add TodoModule here if separated
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
    writeFile(`${nestServerDir}/app.module.ts`, appModuleTsContent.trim());

    const appControllerTsContent = `
import { Controller, Get, Query, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { TodoNestDto, CreateTodoNestDto, UpdateTodoNestDto } from './dto/todo-nest.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/api/health')
  getHealth(): { status: string; message: string } {
    return this.appService.getHealth();
  }
  
  @Get('/api/greet')
  getGreet(@Query('name') name?: string): { message: string } {
    return this.appService.getGreet(name);
  }

  // --- Todo API Example (NestJS) ---
  @Get('/api/todos')
  getAllTodos(): TodoNestDto[] {
    return this.appService.getAllTodos();
  }

  @Get('/api/todos/:id')
  getTodoById(@Param('id') id: string): TodoNestDto {
    return this.appService.getTodoById(id);
  }

  @Post('/api/todos')
  @HttpCode(HttpStatus.CREATED)
  createTodo(@Body() createTodoDto: CreateTodoNestDto): TodoNestDto {
    return this.appService.createTodo(createTodoDto);
  }

  @Put('/api/todos/:id')
  updateTodo(@Param('id') id: string, @Body() updateTodoDto: UpdateTodoNestDto): TodoNestDto {
    return this.appService.updateTodo(id, updateTodoDto);
  }

  @Delete('/api/todos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTodo(@Param('id') id: string): void {
    return this.appService.deleteTodo(id);
  }
  // --- End Todo API Example (NestJS) ---
}
`;
    writeFile(`${nestServerDir}/app.controller.ts`, appControllerTsContent.trim());

    createDirectory(`${nestServerDir}/dto`);
    const todoNestDtoContent = `
export class TodoNestDto {
  id: string;
  text: string;
  completed: boolean;
}

export class CreateTodoNestDto {
  text: string;
}

export class UpdateTodoNestDto {
  text?: string;
  completed?: boolean;
}
`;
    writeFile(`${nestServerDir}/dto/todo-nest.dto.ts`, todoNestDtoContent.trim());

    const appServiceTsContent = `
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TodoNestDto, CreateTodoNestDto, UpdateTodoNestDto } from './dto/todo-nest.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService {
  private todos: TodoNestDto[] = [
    { id: uuidv4(), text: 'Learn NestJS', completed: true },
    { id: uuidv4(), text: 'Build a Todo API with NestJS', completed: false },
  ];

  getHello(): string {
    return 'NestJS Server is running! 🚀';
  }

  getHealth(): { status: string; message: string } {
    return { status: 'healthy', message: 'Server is up and running' };
  }
  
  getGreet(name?: string): { message: string } {
    const displayName = name || 'World';
    return { message: \`Hello, \${displayName}!\` };
  }

  getAllTodos(): TodoNestDto[] {
    return this.todos;
  }

  getTodoById(id: string): TodoNestDto {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) {
      throw new NotFoundException(\`Todo with ID "\${id}" not found\`);
    }
    return todo;
  }

  createTodo(createTodoDto: CreateTodoNestDto): TodoNestDto {
    if (!createTodoDto.text) {
      throw new BadRequestException('Text is required');
    }
    const newTodo: TodoNestDto = {
      id: uuidv4(),
      text: createTodoDto.text,
      completed: false,
    };
    this.todos.push(newTodo);
    return newTodo;
  }

  updateTodo(id: string, updateTodoDto: UpdateTodoNestDto): TodoNestDto {
    const todoIndex = this.todos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      throw new NotFoundException(\`Todo with ID "\${id}" not found\`);
    }
    const updatedTodo = { ...this.todos[todoIndex], ...updateTodoDto };
    this.todos[todoIndex] = updatedTodo;
    return updatedTodo;
  }

  deleteTodo(id: string): void {
    const todoIndex = this.todos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      throw new NotFoundException(\`Todo with ID "\${id}" not found\`);
    }
    this.todos.splice(todoIndex, 1);
  }
}
`;
    writeFile(`${nestServerDir}/app.service.ts`, appServiceTsContent.trim());
    log(`🚀 Created basic NestJS files in ${nestServerDir}`, 'green');
};

const createHapiFiles = (projectConfig) => {
    const isTypeScript = projectConfig.language === 'typescript';
    const ext = isTypeScript ? 'ts' : 'js';
    const hapiServerDir = 'server/src';
    createDirectory(hapiServerDir);

    const hapiImpl = {
      getFullServerContent: (isTs, pConf) => {
        const dbImports = pConf.database !== 'none' ? (isTs ? `import { connectDatabase, closeDatabase } from './database/index';` : `const { connectDatabase, closeDatabase } = require('./database/index');`) : '';
        
        const serverType = isTs ? ': Server' : '';
        const requestParamType = isTs ? ': Request' : '';
        const hToolkitType = isTs ? ': ResponseToolkit' : '';
        const payloadCast = (props) => isTs ? `request.payload as ${props}` : 'request.payload';
        const todoInterface = isTs ? `
  interface TodoHapi {
    id: string;
    text: string;
    completed: boolean;
  }` : '';
        const todoArrayType = isTs ? ': TodoHapi[]' : '';
        const newTodoType = isTs ? ': TodoHapi' : '';
        const queryNameAccess = isTs ? '(request.query as any).name' : 'request.query.name';

        return `
${isTs ? "import Hapi, { Server, Request, ResponseToolkit } from '@hapi/hapi';" : "const Hapi = require('@hapi/hapi');"}
${isTs ? "import dotenv from 'dotenv';" : "const dotenv = require('dotenv');"}
${dbImports}

dotenv.config();

const init = async () => {
  let server${serverType};
  try {
    if (projectConfig.database !== 'none') {
      await connectDatabase();
    }

    server = Hapi.server({
      port: process.env.PORT || 5000,
      host: 'localhost',
      routes: {
        cors: {
          origin: ['*']
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        return 'Hapi + ${isTs ? "TypeScript" : "JavaScript"} Server is running! 🚀';
      }
    });

    server.route({
      method: 'GET',
      path: '/api/health',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        return h.response({ status: 'healthy', message: 'Server is up and running' }).code(200);
      }
    });

    // --- Todo API Example (Hapi) ---
    ${todoInterface}
    let todosHapi${todoArrayType} = [
      { id: '1', text: 'Learn Hapi', completed: true },
      { id: '2', text: 'Build a Todo API with Hapi', completed: false },
    ];

    server.route({
      method: 'GET',
      path: '/api/todos',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        return todosHapi;
      }
    });

    server.route({
      method: 'GET',
      path: '/api/todos/{id}',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        const todo = todosHapi.find(t => t.id === request.params.id);
        if (!todo) { return h.response({ message: 'Todo not found' }).code(404); }
        return todo;
      }
    });

    server.route({
      method: 'POST',
      path: '/api/todos',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        const payload = ${payloadCast('{ text?: string }')};
        if (!payload || !payload.text) { return h.response({ message: 'Text is required' }).code(400); }
        const newTodo${newTodoType} = { id: String(Date.now()), text: payload.text, completed: false };
        todosHapi.push(newTodo);
        return h.response(newTodo).code(201);
      }
    });

    server.route({
      method: 'PUT',
      path: '/api/todos/{id}',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        const payload = ${payloadCast('{ text?: string, completed?: boolean }')};
        const todoIndex = todosHapi.findIndex(t => t.id === request.params.id);
        if (todoIndex === -1) { return h.response({ message: 'Todo not found' }).code(404); }
        const currentTodo = todosHapi[todoIndex];
        todosHapi[todoIndex] = { ...currentTodo, text: payload.text ?? currentTodo.text, completed: payload.completed ?? currentTodo.completed };
        return todosHapi[todoIndex];
      }
    });

    server.route({
      method: 'DELETE',
      path: '/api/todos/{id}',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        const todoIndex = todosHapi.findIndex(t => t.id === request.params.id);
        if (todoIndex === -1) { return h.response({ message: 'Todo not found' }).code(404); }
        todosHapi.splice(todoIndex, 1);
        return h.response().code(204);
      }
    });
    // --- End Todo API Example (Hapi) ---
    
    server.route({
      method: 'GET',
      path: '/api/greet',
      handler: (request${requestParamType}, h${hToolkitType}) => {
        const name = ${queryNameAccess} || 'World';
        return { message: \`Hello, \${name}!\` };
      }
    });

    await server.start();
    console.log(\`[server]: Hapi server running on \${server.info.uri}\`);
  } catch (err) {
    console.error('Failed to start Hapi server:', err);
    if (projectConfig.database !== 'none') {
      await closeDatabase();
    }
    if (server && server.stop) {
       await server.stop({ timeout: 10000 });
    }
    process.exit(1);
  }
};

process.on('unhandledRejection', async (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

init();
${generateGracefulShutdownLogic(projectConfig)}
`;
      }
    };
    
    const hapiServerFileContent = hapiImpl.getFullServerContent(isTypeScript, projectConfig);
    writeFile(`${hapiServerDir}/server.${ext}`, hapiServerFileContent.trim());
    log(`🚀 Created Hapi server file: ${hapiServerDir}/server.${ext}`, 'green');
};

const createBackendFiles = (projectConfig) => {
  if (projectConfig.backend === 'none' || projectConfig.backend === 'python') {
    log('⏭️ Skipping Node.js backend file generation.', 'dim');
    return;
  }

  log(`🛠️ Creating Node.js backend files for ${projectConfig.backend}...`, 'blue');

  switch (projectConfig.backend) {
    case 'express':
      createExpressFiles(projectConfig);
      break;
    case 'fastify':
      createFastifyFiles(projectConfig);
      break;
    case 'koa':
      createKoaFiles(projectConfig);
      break;
    case 'nest':
      createNestFiles(projectConfig);
      break;
    case 'hapi':
      createHapiFiles(projectConfig);
      break;
    default:
      log(`Unsupported Node.js backend framework: ${projectConfig.backend}`, 'yellow');
  }
};

module.exports = {
  createBackendFiles
};
const { writeFile, createDirectory, execCommand, isWindows } = require('../utils'); // Adjusted path
const { log } = require('../ui'); // Adjusted path

const createDockerFiles = (projectConfig) => {
  log('🐳 Creating Docker configuration...', 'cyan');

  // Common .dockerignore
  const dockerignore = `
node_modules
npm-debug.log
Dockerfile*
docker-compose*.yml
.dockerignore
.git
.gitignore
README.md
.env
.env.*
!/.env.production
!/.env.example
*.log
logs/
coverage/
dist/ # General build output, can be refined
build/
.nyc_output
.vscode
.idea
*.swp
*.swo
# Python specific (if Python backend is chosen)
__pycache__/
*.pyc
*.pyo
*.pyd
*.db
*.sqlite3
server/venv/
server/instance/
# Frontend specific build outputs if not 'dist'
.next/
.nuxt/
.svelte-kit/
# Add any other large files or directories that shouldn't be in the image
`;
  writeFile('.dockerignore', dockerignore.trim());

  let dockerComposeServices = '';
  let dockerComposeVolumes = '';
  const frontendPort = projectConfig.frontendPort || 3000; // Assuming a default or configured frontend port
  const backendPort = projectConfig.backendPort || (projectConfig.backend === 'python' ? 8000 : 5000);


  // Frontend Dockerfile and Service
  if (projectConfig.jsFramework !== 'skip') {
    const frontendDockerfileContent = `# Frontend Dockerfile (${projectConfig.jsFramework})
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/${projectConfig.bundler === 'vite' ? 'dist' : 'build'} /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf 
# Ensure nginx.conf is created or use a default one
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
    writeFile('Dockerfile.frontend', frontendDockerfileContent.trim());

    const nginxConfContent = `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }

    ${projectConfig.backend !== 'none' ? `
    location /api {
        proxy_pass http://backend:${backendPort}; # backend is service name in docker-compose
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }` : ''}
}`;
    writeFile('nginx.conf', nginxConfContent.trim());


    dockerComposeServices += `
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "${frontendPort}:80"
    networks:
      - app-network
    ${projectConfig.backend !== 'none' ? 'depends_on:\n      - backend' : ''}
    restart: unless-stopped
`;
  }

  // Backend Dockerfile and Service (Node.js)
  if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python') {
    const nodeBackendDockerfileContent = `# Backend Dockerfile (Node.js - ${projectConfig.backend})
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production # Install only production dependencies
COPY . .
${projectConfig.language === 'typescript' ? 'RUN npm run build:server' : ''}
# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE ${backendPort}
CMD ["npm", "start"]
`;
    writeFile('Dockerfile.backend.node', nodeBackendDockerfileContent.trim());

    dockerComposeServices += `
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.node
    ports:
      - "${backendPort}:${backendPort}"
    environment:
      - NODE_ENV=production
      - PORT=${backendPort}
      # Pass DATABASE_URL and other necessary env vars from .env file or docker-compose env section
      - DATABASE_URL=\${DATABASE_URL} 
    networks:
      - app-network
    ${projectConfig.database !== 'none' ? 'depends_on:\n      - database' : ''}
    volumes:
      - ./logs:/app/logs # Example volume for logs
    restart: unless-stopped
`;
  }

  // Backend Dockerfile and Service (Python)
  if (projectConfig.backend === 'python') {
    const pythonBackendDockerfileContent = `# Backend Dockerfile (Python - ${projectConfig.pythonFramework})
FROM python:3.11-slim
ENV PYTHONUNBUFFERED 1
WORKDIR /app/server 
# Copy requirements first to leverage Docker cache
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./server /app/server
# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE ${backendPort}
# Command will depend on the framework
# For Django, project name needs to be Python-identifier friendly
${(() => {
    const projectNameForPython = projectConfig.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    let cmd = '';
    if (projectConfig.pythonFramework === 'fastapi') {
        cmd = `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${backendPort}"]`;
    } else if (projectConfig.pythonFramework === 'flask') {
        cmd = `CMD ["gunicorn", "-w", "4", "--bind", "0.0.0.0:${backendPort}", "main:app"]`;
    } else if (projectConfig.pythonFramework === 'django') {
        // Ensure project name is available or derive it as done in backendPython.js
        cmd = `CMD ["gunicorn", "-w", "4", "--bind", "0.0.0.0:${backendPort}", "${projectNameForPython}.wsgi:application"]`;
    } else if (projectConfig.pythonFramework === 'quart') {
        cmd = `CMD ["hypercorn", "main:app", "--bind", "0.0.0.0:${backendPort}"]`;
    } else {
        cmd = `# CMD instruction needs to be set according to your Python framework and entrypoint`;
    }
    return cmd;
})()}
`;
    writeFile('Dockerfile.backend.python', pythonBackendDockerfileContent.trim());

    dockerComposeServices += `
  backend:
    build:
      context: . # Build context is project root
      dockerfile: Dockerfile.backend.python
    ports:
      - "${backendPort}:${backendPort}"
    environment:
      - PYTHON_PORT=${backendPort}
      - DATABASE_URL=\${DATABASE_URL}
      # Add other Python specific env vars
    networks:
      - app-network
    ${projectConfig.database !== 'none' ? 'depends_on:\n      - database' : ''}
    volumes:
      - ./server:/app/server # Mount server code for development (optional for prod)
      - ./logs:/app/server/logs # Example for logs if Python app writes them there
    restart: unless-stopped
`;
  }

  // Database Service
  if (projectConfig.database !== 'none') {
    const dbName = `${projectConfig.name.replace(/[^a-zA-Z0-9_]/g, '_')}_db`;
    dockerComposeServices += `
  database:`;
    switch (projectConfig.database) {
      case 'postgresql':
        dockerComposeServices += `
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: \${DB_NAME:-${dbName}}
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-yoursecurepassword}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped`;
        dockerComposeVolumes += `\n  postgres_data:`;
        break;
      case 'mysql':
        dockerComposeServices += `
    image: mysql:8.0
    command: '--default-authentication-plugin=mysql_native_password' # For compatibility
    environment:
      MYSQL_ROOT_PASSWORD: \${DB_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: \${DB_NAME:-${dbName}}
      MYSQL_USER: \${DB_USER:-user}
      MYSQL_PASSWORD: \${DB_PASSWORD:-yoursecurepassword}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - app-network
    restart: unless-stopped`;
        dockerComposeVolumes += `\n  mysql_data:`;
        break;
      case 'mongodb':
        dockerComposeServices += `
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_ROOT_PASSWORD:-yoursecurepassword}
      MONGO_INITDB_DATABASE: \${DB_NAME:-${dbName}}
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network
    restart: unless-stopped`;
        dockerComposeVolumes += `\n  mongodb_data:`;
        break;
      case 'redis':
        dockerComposeServices += `
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped`;
        dockerComposeVolumes += `\n  redis_data:`;
        break;
    }
  }

  const dockerComposeContent = `version: '3.8'

services:${dockerComposeServices}

networks:
  app-network:
    driver: bridge
${dockerComposeVolumes ? `\nvolumes:${dockerComposeVolumes}` : ''}
`;
  writeFile('docker-compose.yml', dockerComposeContent.trim());
  log('✅ Docker configuration (Dockerfiles, docker-compose.yml, .dockerignore, nginx.conf) created successfully!', 'green');
  log('   Make sure to populate your .env file with necessary variables like DATABASE_URL, DB_USER, etc.', 'yellow');
};


const createVercelFiles = (projectConfig) => {
  log('▲ Creating Vercel configuration (vercel.json)...', 'cyan');
  const vercelJson = {
    version: 2,
    name: projectConfig.name,
    builds: [],
    routes: [],
    env: {
        NODE_ENV: "production",
        // Add other common env vars here, Vercel UI is preferred for secrets
    }
  };

  if (projectConfig.jsFramework !== 'skip') {
    vercelJson.builds.push({
      src: "package.json", // Vercel often uses package.json to determine build command
      use: "@vercel/static-build", // Generic builder, can be more specific
      config: {
        distDir: projectConfig.bundler === 'vite' ? 'dist' : 'build' // Output directory
      }
    });
    // Default route for SPA
    vercelJson.routes.push({ handle: "filesystem" });
    vercelJson.routes.push({ src: "/.*", dest: "/index.html" });
  }

  if (projectConfig.backend !== 'none') {
    const serverEntry = projectConfig.language === 'typescript' ? 
                        (projectConfig.backend === 'nest' ? 'server/dist/main.js' : 'server/dist/server.js') : 
                        (projectConfig.backend === 'nest' ? 'server/src/main.js' : 'server/src/server.js');
    
    vercelJson.builds.push({
      src: projectConfig.backend === 'python' ? "server/main.py" : serverEntry, // Entry point for serverless function
      use: projectConfig.backend === 'python' ? "@vercel/python" : "@vercel/node"
    });
    // Route all API calls to the serverless function
    vercelJson.routes.unshift({ // Add to beginning to ensure it takes precedence
      src: "/api/(.*)",
      dest: projectConfig.backend === 'python' ? "server/main.py" : serverEntry
    });
    if (projectConfig.database !== 'none') {
        vercelJson.env.DATABASE_URL = "@db_url"; // Placeholder for Vercel environment variable
    }
    if (projectConfig.backend === 'python') {
        vercelJson.builds.find(b => b.use === "@vercel/python").config = {
            maxLambdaSize: "50mb", // Example config
            runtime: "python3.11"
        };
        // Ensure requirements.txt is at server/requirements.txt for Vercel Python
    }
  }
  writeFile('vercel.json', JSON.stringify(vercelJson, null, 2));
  log('✅ Vercel configuration created. Add secrets via Vercel dashboard.', 'green');
};

const createNetlifyFiles = (projectConfig) => {
  log('🌐 Creating Netlify configuration (netlify.toml)...', 'cyan');
  let netlifyTomlContent = `[build]
  command = "npm run build" # Assumes frontend build script
  publish = "${projectConfig.bundler === 'vite' ? 'dist' : 'build'}" # Frontend output directory
  environment = { NODE_VERSION = "18" }

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

  if (projectConfig.backend !== 'none') {
    const functionsDir = "netlify/functions";
    createDirectory(functionsDir);
    netlifyTomlContent += `
[functions]
  directory = "${functionsDir}"
`;
    // Add redirect for API to Netlify functions
    netlifyTomlContent = netlifyTomlContent.replace(
        '[[redirects]]\n  from = "/*"', 
        `[[redirects]]\n  from = "/api/*"\n  to = "/.netlify/functions/:splat"\n  status = 200\n\n[[redirects]]\n  from = "/*"`
    );

    // Create a sample Netlify function
    const ext = projectConfig.language === 'typescript' ? 'ts' : 'js';
    const handlerName = projectConfig.backend === 'python' ? 'main' : 'api'; // Python often uses main.py
    
    let functionContent = '';
    if (projectConfig.backend === 'python') {
        functionContent = `# ${functionsDir}/${handlerName}.py
import json
import os

def handler(event, context):
    print("Received event:", event)
    # Your Python serverless logic here
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": "Hello from Python Netlify Function!", "path": event.get("path")})
    }
`;
        // Netlify needs requirements.txt in the functions directory or project root for Python
        writeFile(`${functionsDir}/requirements.txt`, "fastapi\nuvicorn\n# Add other Python deps for this function");

    } else { // Node.js function
        functionContent = projectConfig.language === 'typescript' ? `// ${functionsDir}/${handlerName}.${ext}
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log("Received event:", event);
  // Your Node.js serverless logic here
  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ message: "Hello from TypeScript Netlify Function!", path: event.path }),
  };
};
` : `// ${functionsDir}/${handlerName}.${ext}
exports.handler = async function(event, context) {
  console.log("Received event:", event);
  // Your Node.js serverless logic here
  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ message: "Hello from JavaScript Netlify Function!", path: event.path }),
  };
};
`;
    }
    writeFile(`${functionsDir}/${handlerName}.${projectConfig.backend === 'python' ? 'py' : ext}`, functionContent.trim());
  }

  writeFile('netlify.toml', netlifyTomlContent.trim());
  log('✅ Netlify configuration created. Add secrets via Netlify dashboard.', 'green');
};

const createHerokuFiles = (projectConfig) => {
  log('🟣 Creating Heroku configuration (Procfile, app.json)...', 'cyan');
  let procfileContent = '';
  if (projectConfig.backend !== 'none') {
    if (projectConfig.backend === 'python') {
      const port = projectConfig.backendPort || 8000;
      // Gunicorn is common for Python production on Heroku
      procfileContent = `web: gunicorn server.main:app --bind 0.0.0.0:$PORT --workers 4 --log-file -`; 
      // Assumes server/main.py and 'app' instance (e.g. main.py has app = Flask(__name__))
      // For Django: web: gunicorn your_project_name.wsgi --log-file -
      writeFile('runtime.txt', 'python-3.11.5'); // Specify Python runtime
    } else { // Node.js backend
      procfileContent = 'web: npm start'; // Assumes package.json has a start script for the server
    }
  } else if (projectConfig.jsFramework !== 'skip') {
    // Frontend only, serve static files (e.g. with serve)
    procfileContent = `web: npx serve -s ${projectConfig.bundler === 'vite' ? 'dist' : 'build'} -l $PORT`;
  }
  if (procfileContent) {
    writeFile('Procfile', procfileContent);
  }

  const appJson = {
    name: projectConfig.name,
    description: `A ${projectConfig.template} application.`,
    keywords: [projectConfig.jsFramework, projectConfig.backend, projectConfig.language].filter(Boolean),
    repository: "https://github.com/yourusername/yourrepository", // Placeholder
    // Add addons, env vars, buildpacks as needed
    // Example for Node.js:
    buildpacks: projectConfig.backend === 'python' ? [{ url: "heroku/python" }] : [{ url: "heroku/nodejs" }],
    env: {
        NODE_ENV: { value: "production" },
        // DATABASE_URL will be set by Heroku addon if used
    },
    addons: []
  };
  if (projectConfig.database === 'postgresql') appJson.addons.push("heroku-postgresql:hobby-dev");
  if (projectConfig.database === 'redis') appJson.addons.push("heroku-redis:hobby-dev");

  writeFile('app.json', JSON.stringify(appJson, null, 2));
  log('✅ Heroku configuration created. Deploy via Heroku Git or CLI.', 'green');
};

const createAWSFiles = (projectConfig) => {
  log('☁️ Creating basic AWS deployment setup files (e.g., for Elastic Beanstalk or Amplify)...', 'cyan');
  // This is highly dependent on the AWS service (EC2, EB, Lambda, Amplify, S3+CloudFront, Fargate, etc.)
  // For Elastic Beanstalk (Node.js example):
  if (projectConfig.backend !== 'none' && projectConfig.backend !== 'python') {
    createDirectory('.ebextensions');
    const ebConfigContent = `option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: ${projectConfig.backendPort || 5000}
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start" 
    # ProxyServer: nginx # Can configure nginx as reverse proxy
`;
    writeFile('.ebextensions/options.config', ebConfigContent.trim());
    log('📄 Created basic .ebextensions/options.config for Elastic Beanstalk (Node.js).', 'dim');
  } else if (projectConfig.backend === 'python') {
     createDirectory('.ebextensions');
     const ebPythonConfig = `option_settings:
  aws:elasticbeanstalk:application:environment:
    PYTHON_PORT: ${projectConfig.backendPort || 8000}
    # Add other environment variables needed by your Python app
  aws:elasticbeanstalk:container:python:
    WSGIPath: server.main:app # Adjust if your entry point is different (e.g., project_name.wsgi:application for Django)
    NumProcesses: 1 # Adjust based on instance size and app needs
    NumThreads: 15
`;
    writeFile('.ebextensions/python.config', ebPythonConfig.trim());
    log('📄 Created basic .ebextensions/python.config for Elastic Beanstalk (Python).', 'dim');
    // Also ensure Procfile or other EB recognized files are present for Python.
    // A common Procfile for Python on EB (if not using WSGIPath directly):
    // web: gunicorn --bind 0.0.0.0:$PORT server.main:app (adjust for your app)
  }


  // For S3 static hosting (frontend)
  if (projectConfig.jsFramework !== 'skip') {
    const s3DeployScript = `#!/bin/bash
# Basic S3 deployment script for frontend assets
BUCKET_NAME="your-s3-bucket-name-${projectConfig.name}" # REPLACE THIS
BUILD_DIR="${projectConfig.bundler === 'vite' ? 'dist' : 'build'}"

echo "Building frontend..."
npm run build

echo "Deploying to S3 bucket: \$BUCKET_NAME"
aws s3 sync "\$BUILD_DIR/" "s3://\$BUCKET_NAME/" --delete --acl public-read

# Optional: Invalidate CloudFront distribution
# DISTRIBUTION_ID="YOUR_CLOUDFRONT_DISTRIBUTION_ID"
# aws cloudfront create-invalidation --distribution-id \$DISTRIBUTION_ID --paths "/*"

echo "Deployment to S3 complete."
echo "Website URL (approx): http://\$BUCKET_NAME.s3-website-$(aws configure get region).amazonaws.com/"
`;
    writeFile('deploy_frontend_s3.sh', s3DeployScript);
    if (!isWindows) execCommand('chmod +x deploy_frontend_s3.sh', { silent: true });
    log('📄 Created basic deploy_frontend_s3.sh script.', 'dim');
  }
  log('   AWS setup is highly custom. These are minimal examples. Consider AWS CDK, SAM, or CloudFormation for robust deployments.', 'yellow');
};


const createDeploymentFiles = (projectConfig) => {
  if (projectConfig.deployment === 'none') {
    log('⏭️ Skipping deployment file generation.', 'dim');
    return;
  }
  log(`🚀 Creating deployment configuration files for ${projectConfig.deployment}...`, 'blue');

  switch (projectConfig.deployment) {
    case 'docker':
      createDockerFiles(projectConfig);
      break;
    case 'vercel':
      createVercelFiles(projectConfig);
      break;
    case 'netlify':
      createNetlifyFiles(projectConfig);
      break;
    case 'heroku':
      createHerokuFiles(projectConfig);
      break;
    case 'aws':
      createAWSFiles(projectConfig);
      break;
    default:
      log(`⚠️ Deployment option ${projectConfig.deployment} not implemented yet.`, 'yellow');
  }
};

module.exports = {
  createDeploymentFiles
};
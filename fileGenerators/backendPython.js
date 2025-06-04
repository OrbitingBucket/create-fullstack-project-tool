const { writeFile, createDirectory, execCommand, isWindows } = require('../utils'); // Adjusted path
const { log } = require('../ui'); // Adjusted path

const createPythonRequirements = (projectConfig) => {
  const requirements = [];
  const devRequirements = [
    'pytest>=7.4.0',
    'pytest-asyncio>=0.21.0', // For async frameworks like FastAPI/Quart
    'black>=23.12.0', // Code formatter
    'flake8>=6.1.0',  // Linter
    'mypy>=1.8.0',    // Type checker
    'isort>=5.12.0',  // Import sorter
    'python-dotenv>=1.0.0' // Already in main requirements but good for dev too
  ];

  // Base requirements for all Python backends
  requirements.push('python-dotenv>=1.0.0');


  // Framework-specific requirements
  if (projectConfig.pythonFramework === 'fastapi') {
    requirements.push('fastapi>=0.109.0'); // Updated
    requirements.push('uvicorn[standard]>=0.27.0'); // Uvicorn with standard deps for performance
    requirements.push('pydantic>=2.5.0');
    requirements.push('pydantic-settings>=2.1.0'); // For settings management
    requirements.push('email-validator>=2.1.0'); // Often needed with Pydantic for email validation
  } else if (projectConfig.pythonFramework === 'django') {
    requirements.push('Django>=4.2.9'); // Updated LTS or latest
    requirements.push('djangorestframework>=3.14.0');
    requirements.push('django-cors-headers>=4.3.1'); // Updated
    requirements.push('gunicorn>=21.2.0'); // Production server for Django
    devRequirements.push('django-stubs>=4.2.7'); // For mypy
    devRequirements.push('djangorestframework-stubs>=3.14.5'); // For mypy
  } else if (projectConfig.pythonFramework === 'flask') {
    requirements.push('Flask>=3.0.0');
    requirements.push('Flask-Cors>=4.0.0');
    requirements.push('Werkzeug>=3.0.1'); // Flask dependency, good to specify
    requirements.push('gunicorn>=21.2.0'); // Production server for Flask
    devRequirements.push('flask-stubs>=0.0.0'); // Check for more specific stubs if available
  } else if (projectConfig.pythonFramework === 'quart') {
    requirements.push('quart>=0.19.4'); // Updated
    requirements.push('quart-cors>=0.7.0');
    requirements.push('hypercorn>=0.15.0'); // ASGI server for Quart
  }

  // Database requirements
  if (projectConfig.database !== 'none') {
    if (projectConfig.pythonFramework === 'django') {
        // Django handles DB drivers via settings.py, but good to list common ones
        if (projectConfig.database === 'postgresql') requirements.push('psycopg2-binary>=2.9.9'); // Updated
        if (projectConfig.database === 'mysql') requirements.push('mysqlclient>=2.2.0'); // Common C-based driver
    } else { // For FastAPI, Flask, Quart (often with SQLAlchemy or similar)
        requirements.push('SQLAlchemy>=2.0.25'); // Updated
        if (projectConfig.database === 'postgresql') requirements.push('psycopg2-binary>=2.9.9');
        if (projectConfig.database === 'mysql') requirements.push('PyMySQL>=1.1.0'); // Pure Python driver
        // SQLite is built-in, SQLAlchemy handles it.
        if (projectConfig.database === 'mongodb') {
            requirements.push('pymongo>=4.6.1'); // Updated
            if (projectConfig.pythonFramework === 'fastapi' || projectConfig.pythonFramework === 'quart') {
                requirements.push('motor>=3.3.2'); // Async MongoDB driver
            }
        }
    }
  }
  
  const serverDir = 'server'; // Python files go into 'server' directory
  writeFile(`${serverDir}/requirements.txt`, requirements.join('\\n') + '\\n');
  writeFile(`${serverDir}/requirements-dev.txt`, [...new Set([...requirements, ...devRequirements])].join('\\n') + '\\n'); // Unique entries
  log('📄 Created server/requirements.txt and server/requirements-dev.txt', 'green');
};

const createPythonDatabaseFile = (projectConfig) => {
  if (projectConfig.database === 'none') return;

  const serverAppDir = 'server/app'; // Python files go into 'server/app'
  createDirectory(serverAppDir);
  let databaseContent = '';

  const commonImports = `import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Load .env from project root, relative to server/app/database.py
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set in .env file")

engine = create_engine(DATABASE_URL${projectConfig.database === 'sqlite' ? ', connect_args={"check_same_thread": False}' : ''})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all modules here that might define models so that
    # Base.metadata.create_all(bind=engine) knows about them.
    # Example: from . import models
    Base.metadata.create_all(bind=engine)
    print("Database initialized.")

# Example model (can be in a separate models.py)
# from sqlalchemy import Column, Integer, String, DateTime
# from datetime import datetime
# class Item(Base):
# __tablename__ = "items"
# id = Column(Integer, primary_key=True, index=True)
# name = Column(String, index=True)
# description = Column(String, index=True, nullable=True)
# created_at = Column(DateTime, default=datetime.utcnow)
`;

  if (projectConfig.database === 'mongodb') {
    databaseContent = `import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# Load .env from project root, relative to server/app/database.py
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=dotenv_path)

MONGODB_URL = os.getenv("MONGODB_URI")
if not MONGODB_URL:
    raise EnvironmentError("MONGODB_URI not set in .env file")

# For async frameworks (FastAPI, Quart)
async_client = AsyncIOMotorClient(MONGODB_URL)
# Assuming DB name is part of MONGODB_URL or a default like projectConfig.name
async_db = async_client.get_default_database() 

# For sync frameworks (Flask, Django - though Django has its own ORM)
sync_client = MongoClient(MONGODB_URL)
sync_db = sync_client.get_default_database()

async def get_async_mongo_db():
    return async_db

def get_sync_mongo_db():
    return sync_db

# Example: async def get_item_collection(): return async_db["items"]
`;
  } else if (['postgresql', 'mysql', 'sqlite'].includes(projectConfig.database)) {
    databaseContent = commonImports;
  }

  if (databaseContent) {
    writeFile(`${serverAppDir}/database.py`, databaseContent.trim());
    log(`📄 Created ${serverAppDir}/database.py for ${projectConfig.database}`, 'green');
  }
};


const createFastAPIFiles = (projectConfig) => {
  const serverDir = 'server';
  const appDir = `${serverDir}/app`;
  createDirectory(appDir);
  createDirectory(`${appDir}/routers`);
  createDirectory(`${appDir}/models`); // For Pydantic models
  createDirectory(`${appDir}/core`); // For config

  // server/app/core/config.py
  const configPy = `from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    APP_NAME: str = "${projectConfig.name} API"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db") # Default if not in .env
    # Add other settings here

    class Config:
        # Load .env from the project root, relative to server/app/core/
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        env_file_encoding = 'utf-8'
        extra = 'ignore' # Ignore extra fields from .env not defined in Settings

settings = Settings()
`;
  writeFile(`${appDir}/core/config.py`, configPy.trim());
  writeFile(`${appDir}/core/__init__.py`, "");


  // server/app/models/todo.py (Example Pydantic model for Todo)
  const todoModelPy = `from pydantic import BaseModel, Field
from typing import Optional
import uuid

class TodoBase(BaseModel):
    text: str = Field(..., min_length=1, example="Buy groceries")
    completed: bool = False

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, example="Walk the dog")
    completed: Optional[bool] = None

class TodoInDB(TodoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), example="a1b2c3d4-e5f6-7890-1234-567890abcdef")

    class Config:
        from_attributes = True
`;
  writeFile(`${appDir}/models/todo.py`, todoModelPy.trim());
  writeFile(`${appDir}/models/__init__.py`, "from .todo import TodoInDB, TodoCreate, TodoUpdate # noqa");


  // server/app/routers/todos.py (Todo router)
  const todosRouterPyFastAPI = `from fastapi import APIRouter, HTTPException, status
from typing import List
from ..models.todo import TodoInDB, TodoCreate, TodoUpdate # Adjusted import
import uuid # Ensure uuid is imported here

router = APIRouter()

# In-memory database for todos
fake_todos_db: List[TodoInDB] = [
    TodoInDB(id=str(uuid.uuid4()), text="Learn FastAPI", completed=True),
    TodoInDB(id=str(uuid.uuid4()), text="Build a Todo App", completed=False),
]

@router.get("/", response_model=List[TodoInDB])
async def read_todos(skip: int = 0, limit: int = 10):
    return fake_todos_db[skip : skip + limit]

@router.post("/", response_model=TodoInDB, status_code=status.HTTP_201_CREATED)
async def create_todo(todo: TodoCreate):
    new_todo = TodoInDB(id=str(uuid.uuid4()), **todo.model_dump()) # Ensure new ID is generated
    fake_todos_db.append(new_todo)
    return new_todo

@router.get("/{todo_id}", response_model=TodoInDB)
async def read_todo(todo_id: str):
    found_todo = next((t for t in fake_todos_db if t.id == todo_id), None)
    if not found_todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return found_todo

@router.put("/{todo_id}", response_model=TodoInDB)
async def update_todo(todo_id: str, todo_update: TodoUpdate):
    todo_index = -1
    for i, t in enumerate(fake_todos_db):
        if t.id == todo_id:
            todo_index = i
            break
    
    if todo_index == -1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

    original_todo = fake_todos_db[todo_index]
    updated_data = todo_update.model_dump(exclude_unset=True)
    # Create a new TodoInDB instance for the update to ensure all fields are correctly processed by Pydantic
    updated_todo_data = original_todo.model_dump()
    updated_todo_data.update(updated_data)
    
    # Ensure 'id' is not accidentally changed if present in updated_data (though it shouldn't be in TodoUpdate)
    updated_todo_data['id'] = original_todo.id
    
    fake_todos_db[todo_index] = TodoInDB(**updated_todo_data)
    return fake_todos_db[todo_index]

@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id: str):
    todo_index = -1
    for i, t in enumerate(fake_todos_db):
        if t.id == todo_id:
            todo_index = i
            break

    if todo_index == -1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    
    fake_todos_db.pop(todo_index)
    return # No content
`;
  writeFile(`${appDir}/routers/todos.py`, todosRouterPyFastAPI.trim());


  // server/app/routers/__init__.py
  const routersInitPy = `from fastapi import APIRouter
from . import todos # Import your todo router

api_router = APIRouter()
api_router.include_router(todos.router, prefix="/todos", tags=["todos"])
# Include other routers
`;
  writeFile(`${appDir}/routers/__init__.py`, routersInitPy.trim());

  // server/main.py
  const mainPy = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api_router
from app.core.config import settings
# from app.database import init_db # If you have an init_db function

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Configure as needed, e.g., from settings
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.on_event("startup")
# async def startup_event():
#    init_db() # Initialize database if needed

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}

if __name__ == "__main__":
    import uvicorn
    # Ensure .env is loaded if running directly, though FastAPI/Uvicorn usually handle it via config
    # from dotenv import load_dotenv
    # load_dotenv() # Load from server/.env
    
    port = int(os.getenv("PYTHON_PORT", os.getenv("PORT", "8000")))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
`;
  writeFile(`${serverDir}/main.py`, mainPy.trim());
  writeFile(`${appDir}/__init__.py`, ""); // Make app a package
  log('🚀 Created FastAPI project structure', 'green');
};


const createFlaskFiles = (projectConfig) => {
  const serverDir = 'server';
  const appDir = `${serverDir}/app`;
  createDirectory(appDir);
  createDirectory(`${appDir}/routes`);
  createDirectory(`${appDir}/models`);

  // server/app/__init__.py
  const appInitPy = `from flask import Flask
from flask_cors import CORS
from .core.config import Config
# from .database import db # If using Flask-SQLAlchemy or similar

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app) # Basic CORS for all routes

    # Initialize extensions like DB here if needed
    # db.init_app(app)

    # Register blueprints
    from .routes.main import main_bp
    app.register_blueprint(main_bp)
    
    from .routes.todos import todos_bp # Changed from items to todos
    app.register_blueprint(todos_bp, url_prefix='/api/v1/todos') # Changed from items to todos


    @app.route('/api/health')
    def health():
        return {"status": "healthy", "service": "${projectConfig.name}"}

    return app
`;
  writeFile(`${appDir}/__init__.py`, appInitPy.trim());

  // server/app/core/config.py
  const configPy = `import os
from dotenv import load_dotenv

# Load .env from server directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=dotenv_path)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///./app.db'
    # Add other config variables
`;
  writeFile(`${appDir}/core/__init__.py`, "");
  writeFile(`${appDir}/core/config.py`, configPy.trim());


  // server/app/routes/main.py
  const mainRoutesPy = `from flask import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return jsonify(message="Welcome to Flask Backend for ${projectConfig.name}!")
`;
  writeFile(`${appDir}/routes/main.py`, mainRoutesPy.trim());

  // server/app/routes/todos.py (Todo example for Flask)
  const todosRoutesPy = `from flask import Blueprint, jsonify, request
import uuid

todos_bp = Blueprint('todos', __name__)

# In-memory database for todos
fake_todos_db = [
    {"id": str(uuid.uuid4()), "text": "Learn Flask", "completed": True},
    {"id": str(uuid.uuid4()), "text": "Build a Flask Todo App", "completed": False},
]

@todos_bp.route('/', methods=['GET'])
def get_todos():
    return jsonify(fake_todos_db)

@todos_bp.route('/', methods=['POST'])
def create_todo():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing text field"}), 400
    
    new_todo = {
        "id": str(uuid.uuid4()),
        "text": data["text"],
        "completed": data.get("completed", False)
    }
    fake_todos_db.append(new_todo)
    return jsonify(new_todo), 201

@todos_bp.route('/<string:todo_id>', methods=['GET'])
def get_todo(todo_id):
    todo = next((t for t in fake_todos_db if t["id"] == todo_id), None)
    if todo is None:
        return jsonify({"error": "Todo not found"}), 404
    return jsonify(todo)

@todos_bp.route('/<string:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = request.get_json()
    todo_index = -1
    for i, t in enumerate(fake_todos_db):
        if t["id"] == todo_id:
            todo_index = i
            break
            
    if todo_index == -1:
        return jsonify({"error": "Todo not found"}), 404

    updated_todo = fake_todos_db[todo_index]
    if 'text' in data:
        updated_todo['text'] = data['text']
    if 'completed' in data:
        updated_todo['completed'] = data['completed']
    
    fake_todos_db[todo_index] = updated_todo
    return jsonify(updated_todo)

@todos_bp.route('/<string:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo_index = -1
    for i, t in enumerate(fake_todos_db):
        if t["id"] == todo_id:
            todo_index = i
            break

    if todo_index == -1:
        return jsonify({"error": "Todo not found"}), 404
    
    fake_todos_db.pop(todo_index)
    return '', 204
`;
  writeFile(`${appDir}/routes/todos.py`, todosRoutesPy.trim());
  writeFile(`${appDir}/routes/__init__.py`, "");


  // server/main.py (or run.py)
  const mainPy = `import os
from app import create_app
# from dotenv import load_dotenv # Already loaded in app/core/config.py

# load_dotenv() # Load .env from server/ directory

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv("PYTHON_PORT", os.getenv("PORT", "8000")))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', '1') == '1')
`;
  writeFile(`${serverDir}/main.py`, mainPy.trim());
  log('🚀 Created Flask project structure', 'green');
};


const createDjangoFiles = (projectConfig) => {
  const projectName = projectConfig.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(); // Django project name convention
  const serverDir = 'server';
  
  log(`🚀 Django setup is complex. Generating a basic structure.`, 'blue');
  log(`   It's highly recommended to use Django's own CLI:`, 'dim');
  log(`   1. (Inside server venv) pip install Django`, 'dim');
  log(`   2. (In workspace root) django-admin startproject ${projectName} ${serverDir}`, 'dim');
  log(`   This will create a more complete and standard Django project.`, 'dim');
  log(`   The files generated now are a simplified version.`, 'dim');

  createDirectory(serverDir);
  createDirectory(`${serverDir}/${projectName}`); // Project config directory
  createDirectory(`${serverDir}/api`); // Example app

  // server/manage.py
  const managePy = `#!/usr/bin/env python
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', '${projectName}.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
`;
  writeFile(`${serverDir}/manage.py`, managePy);
  if (!isWindows) execCommand(`chmod +x ${serverDir}/manage.py`, { silent: true });


  // server/projectName/settings.py
  const settingsPy = `import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from server directory
dotenv_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-fallback-key-for-${projectName}') # CHANGE THIS!
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() in ('true', '1', 't')
ALLOWED_HOSTS = ['localhost', '127.0.0.1'] # Add your production hosts

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api', # Your app
]
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = '${projectName}.urls'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True, 'OPTIONS': {}}] # Basic
WSGI_APPLICATION = '${projectName}.wsgi.application'

# Database (example for PostgreSQL, adjust for others)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
if os.getenv('DATABASE_URL'):
    import dj_database_url
    DATABASES['default'] = dj_database_url.config(conn_max_age=600, ssl_require=os.getenv('DJANGO_DB_SSL', 'False').lower() == 'true')


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = os.getenv('DJANGO_CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
# REST_FRAMEWORK = {'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny']}
`;
  writeFile(`${serverDir}/${projectName}/settings.py`, settingsPy);
  writeFile(`${serverDir}/${projectName}/__init__.py`, "");

  // server/projectName/urls.py
  const projectUrlsPy = `from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')), # Original generic API
    path('api/v1/todos/', include('api.todos.urls')), # Todos API
    path('api/health/', lambda r: JsonResponse({'status': 'healthy', 'service': '${projectName}'})),
]`;
  writeFile(`${serverDir}/${projectName}/urls.py`, projectUrlsPy);

  // server/projectName/wsgi.py and asgi.py (basic)
  writeFile(`${serverDir}/${projectName}/wsgi.py`, `import os\nfrom django.core.wsgi import get_wsgi_application\nos.environ.setdefault('DJANGO_SETTINGS_MODULE', '${projectName}.settings')\napplication = get_wsgi_application()`);
  writeFile(`${serverDir}/${projectName}/asgi.py`, `import os\nfrom django.core.asgi import get_asgi_application\nos.environ.setdefault('DJANGO_SETTINGS_MODULE', '${projectName}.settings')\napplication = get_asgi_application()`);

  // server/api/ (generic app, can be removed or kept for other examples)
  createDirectory(`${serverDir}/api/migrations`);
  writeFile(`${serverDir}/api/migrations/__init__.py`, "");
  writeFile(`${serverDir}/api/apps.py`, `from django.apps import AppConfig\nclass ApiConfig(AppConfig):\n    default_auto_field = 'django.db.models.BigAutoField'\n    name = 'api'`);
  writeFile(`${serverDir}/api/admin.py`, `from django.contrib import admin\n# Register your models here.`);
  writeFile(`${serverDir}/api/models.py`, `# Create your models here.`); // Kept empty for now
  writeFile(`${serverDir}/api/tests.py`, `# Create your tests here.`);
  writeFile(`${serverDir}/api/__init__.py`, "");
  const genericApiViewsPy = `from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class HelloWorldView(APIView):
    def get(self, request):
        return Response({"message": "Hello from Django REST framework generic API!"}, status=status.HTTP_200_OK)
`;
  writeFile(`${serverDir}/api/views.py`, genericApiViewsPy);
  const genericApiUrlsPy = `from django.urls import path
from .views import HelloWorldView

urlpatterns = [
    path('hello/', HelloWorldView.as_view(), name='hello_world_generic'),
]`;
  writeFile(`${serverDir}/api/urls.py`, genericApiUrlsPy);


  // --- Django Todo App ---
  const todoAppDir = `${serverDir}/api/todos`; // New app directory for todos
  createDirectory(todoAppDir);
  createDirectory(`${todoAppDir}/migrations`);
  writeFile(`${todoAppDir}/migrations/__init__.py`, "");

  // server/api/todos/apps.py
  writeFile(`${todoAppDir}/apps.py`, `from django.apps import AppConfig\nclass TodosConfig(AppConfig):\n    default_auto_field = 'django.db.models.BigAutoField'\n    name = 'api.todos'`);
  
  // server/api/todos/models.py
  const todoModelsPyDjango = `from django.db import models
import uuid

class Todo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.text

    class Meta:
        ordering = ['created_at']
`;
  writeFile(`${todoAppDir}/models.py`, todoModelsPyDjango);

  // server/api/todos/admin.py
  writeFile(`${todoAppDir}/admin.py`, `from django.contrib import admin\nfrom .models import Todo\n\nadmin.site.register(Todo)`);

  // server/api/todos/serializers.py
  const todoSerializersPy = `from rest_framework import serializers
from .models import Todo

class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ['id', 'text', 'completed', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
`;
  writeFile(`${todoAppDir}/serializers.py`, todoSerializersPy);

  // server/api/todos/views.py
  const todoViewsPyDjango = `from rest_framework import viewsets
from .models import Todo
from .serializers import TodoSerializer

class TodoViewSet(viewsets.ModelViewSet):
    queryset = Todo.objects.all()
    serializer_class = TodoSerializer
`;
  writeFile(`${todoAppDir}/views.py`, todoViewsPyDjango);

  // server/api/todos/urls.py
  const todoUrlsPyDjango = `from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TodoViewSet

router = DefaultRouter()
router.register(r'', TodoViewSet, basename='todo') # Empty prefix for /api/v1/todos/

urlpatterns = [
    path('', include(router.urls)),
]`;
  writeFile(`${todoAppDir}/urls.py`, todoUrlsPyDjango);
  writeFile(`${todoAppDir}/__init__.py`, "");
  // --- End Django Todo App ---


  log('✅ Created basic Django project structure. Remember to run migrations (makemigrations api.todos, then migrate).', 'green');
};


const createQuartFiles = (projectConfig) => {
  const serverDir = 'server';
  const appDir = `${serverDir}/app`;
  createDirectory(appDir);
  createDirectory(`${appDir}/routes`);

  // server/app/__init__.py
  const appInitPy = `from quart import Quart
from quart_cors import cors
from .core.config import Config # Assuming config.py for Quart

def create_app(config_class=Config):
    app = Quart(__name__)
    app.config.from_object(config_class)

    app = cors(app) # Basic CORS

    # Register blueprints
    from .routes.main import main_bp
    app.register_blueprint(main_bp)
    
    from .routes.todos import todos_bp # Changed from items to todos
    app.register_blueprint(todos_bp, url_prefix='/api/v1/todos') # Changed from items to todos

    @app.route('/api/health')
    async def health():
        return {"status": "healthy", "service": "${projectConfig.name}"}

    return app
`;
  writeFile(`${appDir}/__init__.py`, appInitPy.trim());

  // server/app/core/config.py
  const configPy = `import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=dotenv_path)

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY') or 'quart-secret-key'
    DATABASE_URL = os.getenv('DATABASE_URL') or 'sqlite+aiosqlite:///./app.db' # Async driver for SQLite
    # Add other config
`;
  writeFile(`${appDir}/core/__init__.py`, "");
  writeFile(`${appDir}/core/config.py`, configPy.trim());

  // server/app/routes/main.py
  const mainRoutesPy = `from quart import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
async def index():
    return jsonify(message="Welcome to Quart Backend for ${projectConfig.name}!")
`;
  writeFile(`${appDir}/routes/main.py`, mainRoutesPy.trim());

  // server/app/routes/todos.py (Todo example for Quart)
  const todosRoutesPyQuart = `from quart import Blueprint, jsonify, request
import uuid

todos_bp = Blueprint('todos', __name__)

# In-memory database for todos
fake_todos_db = [
    {"id": str(uuid.uuid4()), "text": "Learn Quart", "completed": True},
    {"id": str(uuid.uuid4()), "text": "Build a Quart Todo App", "completed": False},
]

@todos_bp.route('/', methods=['GET'])
async def get_todos():
    return jsonify(fake_todos_db)

@todos_bp.route('/', methods=['POST'])
async def create_todo():
    data = await request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing text field"}), 400
    
    new_todo = {
        "id": str(uuid.uuid4()),
        "text": data["text"],
        "completed": data.get("completed", False)
    }
    fake_todos_db.append(new_todo)
    return jsonify(new_todo), 201

@todos_bp.route('/<string:todo_id>', methods=['GET'])
async def get_todo(todo_id):
    todo = next((t for t in fake_todos_db if t["id"] == todo_id), None)
    if todo is None:
        return jsonify({"error": "Todo not found"}), 404
    return jsonify(todo)

@todos_bp.route('/<string:todo_id>', methods=['PUT'])
async def update_todo(todo_id):
    data = await request.get_json()
    todo_index = -1
    for i, t in enumerate(fake_todos_db):
        if t["id"] == todo_id:
            todo_index = i
            break
            
    if todo_index == -1:
        return jsonify({"error": "Todo not found"}), 404

    updated_todo = fake_todos_db[todo_index]
    if 'text' in data:
        updated_todo['text'] = data['text']
    if 'completed' in data:
        updated_todo['completed'] = data['completed']
    
    fake_todos_db[todo_index] = updated_todo
    return jsonify(updated_todo)

@todos_bp.route('/<string:todo_id>', methods=['DELETE'])
async def delete_todo(todo_id):
    todo_index = -1
    for i, t in enumerate(fake_todos_db):
        if t["id"] == todo_id:
            todo_index = i
            break

    if todo_index == -1:
        return jsonify({"error": "Todo not found"}), 404
    
    fake_todos_db.pop(todo_index)
    return '', 204
`;
  writeFile(`${appDir}/routes/todos.py`, todosRoutesPyQuart.trim());
  writeFile(`${appDir}/routes/__init__.py`, "");

  // server/main.py
  const mainPy = `import os
import asyncio
from app import create_app
# from dotenv import load_dotenv # Loaded in app/core/config.py

# load_dotenv()

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv("PYTHON_PORT", os.getenv("PORT", "8000")))
    # For Quart, Hypercorn is often used for production, but app.run for dev
    # For production: hypercorn main:app --bind 0.0.0.0:8000
    asyncio.run(app.run_task(host='0.0.0.0', port=port, debug=os.getenv('QUART_DEBUG', '1') == '1'))
`;
  writeFile(`${serverDir}/main.py`, mainPy.trim());
  log('🚀 Created Quart project structure', 'green');
};


const createPythonCommonFiles = (projectConfig) => {
  const serverDir = 'server';
  // server/.env file generation is removed. Python apps will use the root .env.

  // Create Python .gitignore (can be appended to main .gitignore or be specific to server/)
  const pythonGitignore = `# Python Bytecode and Cache
__pycache__/
*.py[cod]
*$py.class

# Virtual Environment
venv/
env/
ENV/
*.venv

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
# Usually these files are written by a PyInstaller build:
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/
cover/

# Translations
*.mo
*.pot

# Django stuff:
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal

# Flask stuff:
instance/
.webassets-cache

# Scrapy stuff:
.scrapy

# Sphinx documentation
docs/_build/

# PyBuilder
target/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# Environments
.env
.env.local
.env.dev
.env.test
.env.prod
*.env

# IDE specific files
.idea/
.vscode/
*.sublime-project
*.sublime-workspace
`;
  writeFile(`${serverDir}/.gitignore`, pythonGitignore.trim());
  log(`📄 Created ${serverDir}/.gitignore for Python backend`, 'green');

  // Create startup script (e.g., start.sh or instructions in README)
  let startupScriptContent = `#!/bin/bash
# Python Backend Startup Script for ${projectConfig.name}

# Navigate to server directory if script is run from project root
# cd server || exit

# Create virtual environment if it doesn't exist in server/.venv
# This script is intended to be run from the 'server' directory.
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment in $(pwd)/.venv..."
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "Failed to create virtual environment. Please ensure python3 and venv are installed."
        exit 1
    fi
fi

# Activate virtual environment
echo "Activating virtual environment from .venv..."
source .venv/bin/activate

# Install/upgrade pip and install dependencies
echo "Installing/upgrading pip and installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt
if [ -f "requirements-dev.txt" ]; then
    pip install -r requirements-dev.txt
fi

# Run the application
echo "Starting ${projectConfig.name} Python backend (${projectConfig.pythonFramework})..."
`;

  const portVar = "PYTHON_PORT=$(grep PYTHON_PORT .env | cut -d '=' -f2 || echo ${PORT:-8000})";
  startupScriptContent += portVar + "\n";

  if (projectConfig.pythonFramework === 'django') {
    startupScriptContent += `python manage.py migrate\n`;
    startupScriptContent += `python manage.py runserver 0.0.0.0:$PYTHON_PORT\n`;
  } else if (projectConfig.pythonFramework === 'fastapi') {
    startupScriptContent += `uvicorn main:app --host 0.0.0.0 --port $PYTHON_PORT --reload\n`;
  } else if (projectConfig.pythonFramework === 'flask') {
    startupScriptContent += `flask run --host=0.0.0.0 --port=$PYTHON_PORT --debug\n`; // Uses FLASK_APP=main.py from .env
  } else if (projectConfig.pythonFramework === 'quart') {
    startupScriptContent += `hypercorn main:app --bind 0.0.0.0:$PYTHON_PORT --reload\n`; // Or quart run
  }

  writeFile(`${serverDir}/start_server.sh`, startupScriptContent);
  if (!isWindows) {
    try {
      execCommand(`chmod +x ${serverDir}/start_server.sh`, { silent: true });
      log(`🔩 Made ${serverDir}/start_server.sh executable`, 'green');
    } catch (error) {
      log(`⚠️ Could not make ${serverDir}/start_server.sh executable. You might need to do it manually.`, 'yellow');
    }
  }
  log(`📄 Created ${serverDir}/start_server.sh`, 'green');
};


const createPythonBackendFiles = (projectConfig) => {
  if (projectConfig.backend !== 'python') {
    log('⏭️ Skipping Python backend file generation.', 'dim');
    return;
  }

  log(`🐍 Creating Python backend files for ${projectConfig.pythonFramework}...`, 'blue');
  const serverDir = 'server';
  createDirectory(serverDir); // Ensure server directory exists

  createPythonRequirements(projectConfig); // requirements.txt
  createPythonCommonFiles(projectConfig); // .env, .gitignore for server, start_server.sh

  // Framework-specific application structure
  switch (projectConfig.pythonFramework) {
    case 'fastapi':
      createFastAPIFiles(projectConfig);
      break;
    case 'flask':
      createFlaskFiles(projectConfig);
      break;
    case 'django':
      createDjangoFiles(projectConfig);
      break;
    case 'quart':
      createQuartFiles(projectConfig);
      break;
    default:
      log(`Unsupported Python framework: ${projectConfig.pythonFramework}`, 'yellow');
      return;
  }

  // Database setup file (if a DB is selected and not Django which handles it differently)
  if (projectConfig.database !== 'none' && projectConfig.pythonFramework !== 'django') {
    createPythonDatabaseFile(projectConfig);
  }
  
  log(`✅ Python backend setup for ${projectConfig.pythonFramework} completed in '${serverDir}' directory.`, 'green');
  log(`   To run: cd ${serverDir} && ./start_server.sh (or activate venv and run manually)`, 'cyan');
};

module.exports = {
  createPythonBackendFiles,
  // Potentially export sub-functions if they need to be called independently, though unlikely.
};
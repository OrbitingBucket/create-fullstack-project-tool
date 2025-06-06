# Modular Full-Stack Development Environment Generator 🚀

<!-- Badges -->
<p align="center">
  <a href="LICENSE.md">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/version-1.0.0-green.svg" alt="Version">
  </a>
  <!-- Add more badges as needed: build status, code coverage, etc. -->
  <!-- 
  <a href="https://github.com/your-username/your-repo-name/actions/workflows/main.yml">
    <img src="https://github.com/your-username/your-repo-name/actions/workflows/main.yml/badge.svg" alt="Build Status">
  </a> 
  -->
</p>

Generate tailored development environments for your full-stack, frontend-only, or backend-only projects with an interactive CLI. Choose your favorite technologies, from frontend frameworks and styling solutions to backend stacks (Node.js & Python), databases, and deployment configurations.

<!-- Optional: Add a GIF or screenshot of the CLI in action -->
<!-- 
<p align="center">
  <img src="path/to/your/demo.gif" alt="CLI Demo" width="700">
</p>
-->

## Table of Contents

- [✨ Features](#-features)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Usage](#-usage)
  - [Method 1: Direct Execution (Simple)](#method-1-direct-execution-simple)
  - [Method 2: System-Wide Command (Recommended)](#method-2-system-wide-command-recommended)
- [🛠️ Project Structure (of this Generator)](#️-project-structure-of-this-generator)
- [📖 Generated Project](#-generated-project)
- [🤝 Contributing](#-contributing)
- [🗺️ Roadmap](#️-roadmap-potential-future-enhancements)
- [📄 License](#-license)

## ✨ Features

- **Interactive CLI:** Guides you through the setup process with clear prompts.
- **Highly Customizable:** Select from a wide range of modern technologies.
  - **Frontend:** React, Vue, Angular (via Angular CLI), Svelte, SolidJS, Vanilla JS.
  - **Language:** TypeScript, JavaScript.
  - **Bundlers:** Vite, Webpack, Rollup, Parcel, ESBuild, or None.
  - **Styling:** Tailwind CSS, Bootstrap, Bulma, Styled Components, Emotion, Sass/SCSS, Plain CSS.
  - **UI Libraries (React/Vue):** Material-UI, Ant Design, Chakra UI, Mantine, shadcn/ui (concept).
  - **State Management (React/Vue):** Redux Toolkit, Zustand, Jotai, Recoil, MobX, or built-in.
  - **Backend:**
    - **Node.js:** Express, Fastify, Koa, NestJS, Hapi.
    - **Python:** FastAPI, Django, Flask, Quart.
  - **Database:** SQLite, PostgreSQL, MySQL, MongoDB, Redis, or None.
  - **Deployment:** Docker, Vercel, Netlify, Heroku, AWS (basic stubs).
- **Quick Setup Option:** Get started instantly with a pre-configured modern stack (React, TypeScript, Vite, Tailwind, Express, Docker).
- **Sensible Defaults:** Intelligent defaults for options you might want to skip.
- **Boilerplate Code:** Generates basic application structure, sample components, and a Todo API example for selected backends.
- **Configuration Files:** Creates `package.json`, bundler configs (Vite, Webpack, etc.), `tsconfig.json`, `.env`, `.gitignore`, and more.
- **Dependency Management:** Installs necessary Node.js dependencies (`npm install`) and sets up Python virtual environments (`venv`) with `pip install` for Python backends.
- **Deployment Ready:** Includes Dockerfiles, `docker-compose.yml`, and configuration files for popular hosting platforms.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** LTS version (e.g., 20.x or higher) recommended.
- **npm:** (Usually comes with Node.js).
- **Python 3:** (e.g., 3.9+) and `pip` if you plan to generate Python backends.
- **Git:** For version control (the script generates a `.gitignore` file).
- **(Optional but Recommended):**
  - `tree` command (for viewing project structure in generated snapshots).
  - `docker` and `docker-compose` (if using Docker for deployment).

## 🚀 Usage

You can run the generator in two ways.

### Method 1: Direct Execution (Simple)

This is the easiest way to run the script without any setup.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name

    Run the script directly with Node.js:

    node create-fullstack-app.js

Method 2: System-Wide Command (Recommended)

This method makes the script available as a global create-fullstack-app command, which you can run from any directory on your system.

    Clone the repository:

git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

Add a bin field to package.json:
Make sure your generator's package.json file includes a bin field that points to the main script. If you don't have a package.json for the generator itself, create one and add the following:

{
  "name": "create-fullstack-app-generator",
  "version": "1.0.0",
  "description": "A modular full-stack development environment generator.",
  "main": "projectSetup.js",
  "bin": {
    "create-fullstack-app": "./create-fullstack-app.js"
  },
  "scripts": {
    "start": "node create-fullstack-app.js"
  },
  "keywords": ["cli", "generator", "fullstack", "react", "node"],
  "author": "Your Name",
  "license": "MIT"
}

Link the package:
In the root of the generator's directory, run the npm link command. This will create a global symbolic link to your script.

npm link

Run from anywhere!
You can now open a new terminal window and run the generator from any directory.

create-fullstack-app

To unlink the command later, navigate back to the generator's directory and run:

    npm unlink

🛠️ Project Structure (of this Generator)

create-fullstack-app.js         # The main executable entry point for the CLI.
package.json                     # Defines dependencies and the bin command for the generator.
projectSetup.js                  # Core logic for orchestrating the setup process, user interactions, and calling generators.
ui.js                            # Handles user interface elements like prompts, logging, and welcome messages.
config.js                        # Defines all available configuration options and their defaults.
utils.js                         # Contains utility functions for file operations and command execution.

fileGenerators/                  # Directory containing modules responsible for generating specific files:
  ├── packageJson.js             # Generates package.json.
  ├── common.js                  # Generates common files like .gitignore, README.md, bundler configs, etc.
  ├── frontend.js                # Generates frontend framework-specific files.
  ├── backendNode.js             # Generates Node.js backend files.
  ├── backendPython.js           # Generates Python backend files.
  ├── database.js                # Generates database configuration and connection files.
  └── deployment.js              # Generates deployment-specific files (Docker, Vercel, etc.).

snapshot.sh                      # A utility script to generate a snapshot of the generator's own codebase for review or debugging.

📖 Generated Project

Once the script completes, your new project will be ready in a new directory (e.g., my-awesome-project/). This generated project will include:

    Your chosen frontend and/or backend stack.

    A package.json with relevant scripts (dev, build, start, etc.).

    A README.md tailored to your selected configuration, with instructions on how to run that specific project.

    Configuration files for your bundler, TypeScript, styling, etc.

    A sample "Todo API" if a backend framework was selected.

    Basic database connection setup (if a database was chosen).

    Deployment configuration files (if a deployment option was selected).

🤝 Contributing

Contributions are welcome! Whether it's adding new framework support, improving existing generators, fixing bugs, or enhancing documentation, please feel free to:

    Fork the repository.

    Create a new feature branch:

git checkout -b feature/your-feature-name

Make and commit your changes:

git commit -m "Add some amazing feature"

Push to the branch:

    git push origin feature/your-feature-name

    Open a Pull Request.

Please open an issue first to discuss any significant changes or new features.
🗺️ Roadmap (Potential Future Enhancements)

    Support for more frontend frameworks (e.g., Qwik, Preact).

    Support for additional backend languages/frameworks (e.g., Go, Rust, Ruby on Rails).

    More UI component libraries (e.g., PrimeReact, NextUI).

    Integration of testing frameworks (Jest, Vitest, Pytest, Cypress).

    Option for monorepo setup (e.g., with Turborepo, Nx).

    More advanced and specific deployment configurations for various platforms.

    Enhanced error handling and recovery.

    Plugin system for easier extension.

📄 License

This project is licensed under the MIT License. See the LICENSE.md file for details.

Happy Hacking! 🎉

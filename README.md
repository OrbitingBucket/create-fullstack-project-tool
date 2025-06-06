# Modular Full-Stack Development Environment Generator 🚀

Generate tailored development environments for your full-stack, frontend-only, or backend-only projects with an interactive CLI. Choose your favorite technologies, from frontend frameworks and styling solutions to backend stacks (Node.js & Python), databases, and deployment configurations.

## ✨ Features

*   **Interactive CLI:** Guides you through the setup process with clear prompts.
*   **Highly Customizable:** Select from a wide range of modern technologies.
    *   **Frontend:** React, Vue, Angular (via Angular CLI), Svelte, SolidJS, Vanilla JS.
    *   **Language:** TypeScript, JavaScript.
    *   **Bundlers:** Vite, Webpack, Rollup, Parcel, ESBuild, or None.
    *   **Styling:** Tailwind CSS, Bootstrap, Bulma, Styled Components, Emotion, Sass/SCSS, Plain CSS.
    *   **UI Libraries (React/Vue):** Material-UI, Ant Design, Chakra UI, Mantine, shadcn/ui (concept).
    *   **State Management (React/Vue):** Redux Toolkit, Zustand, Jotai, Recoil, MobX, or built-in.
    *   **Backend:**
        *   **Node.js:** Express, Fastify, Koa, NestJS, Hapi.
        *   **Python:** FastAPI, Django, Flask, Quart.
    *   **Database:** SQLite, PostgreSQL, MySQL, MongoDB, Redis, or None.
    *   **Deployment:** Docker, Vercel, Netlify, Heroku, AWS (basic stubs).
*   **Quick Setup Option:** Get started instantly with a pre-configured modern stack (React, TypeScript, Vite, Tailwind, Express, Docker).
*   **Sensible Defaults:** Intelligent defaults for options you might want to skip.
*   **Boilerplate Code:** Generates basic application structure, sample components, and a Todo API example for selected backends.
*   **Configuration Files:** Creates `package.json`, bundler configs (Vite, Webpack, etc.), `tsconfig.json`, `.env`, `.gitignore`, and more.
*   **Dependency Management:** Installs necessary Node.js dependencies (`npm install`) and sets up Python virtual environments (`venv`) with `pip install` for Python backends.
*   **Deployment Ready:** Includes Dockerfiles, `docker-compose.yml`, and configuration files for popular hosting platforms.

##  Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** LTS version (e.g., 18.x or 20.x) recommended.
*   **npm:** (Usually comes with Node.js).
*   **Python 3:** (e.g., 3.9+) and `pip` if you plan to generate Python backends.
*   **Git:** For version control (the script generates a `.gitignore` file).
*   **(Optional but Recommended for some features):**
    *   `tree` command (for viewing project structure in generated snapshots).
    *   `docker` and `docker-compose` (if using Docker for deployment).

## 🚀 Getting Started

1.  **Clone the repository (or download the files):**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Make the main script executable (Optional, but convenient):**
    ```bash
    chmod +x create-fullstack-app.js
    ```

3.  **Run the script:**
    ```bash
    ./create-fullstack-app.js
    # OR
    node create-fullstack-app.js
    ```

4.  **Follow the on-screen prompts:**
    *   Enter your project name.
    *   Choose between "Quick Setup" or "Custom Setup".
    *   If "Custom Setup", select your preferred technologies for frontend, backend, database, and deployment.
    *   Review the configuration summary.
    *   Confirm to proceed.

The script will then create a new directory for your project, generate all the necessary files, and install dependencies.

## 🛠️ Project Structure (of this Generator)

*   `create-fullstack-app.js`: The main executable entry point for the CLI.
*   `projectSetup.js`: Core logic for orchestrating the setup process, user interactions, and calling generators.
*   `ui.js`: Handles user interface elements like prompts, logging, and welcome messages.
*   `config.js`: Defines all available configuration options and their defaults.
*   `utils.js`: Contains utility functions for file operations and command execution.
*   `fileGenerators/`: Directory containing modules responsible for generating specific files:
    *   `packageJson.js`: Generates `package.json`.
    *   `common.js`: Generates common files like `.gitignore`, `README.md`, bundler configs, etc.
    *   `frontend.js`: Generates frontend framework-specific files.
    *   `backendNode.js`: Generates Node.js backend files.
    *   `backendPython.js`: Generates Python backend files.
    *   `database.js`: Generates database configuration and connection files.
    *   `deployment.js`: Generates deployment-specific files (Docker, Vercel, etc.).
*   `snapshot.sh`: A utility script to generate a snapshot of the generator's own codebase for review or debugging.

## 📖 Generated Project

Once the script completes, your new project will be ready in a new directory (e.g., `my-awesome-project/`). This generated project will include:

*   Your chosen frontend and/or backend stack.
*   A `package.json` with relevant scripts (`dev`, `build`, `start`, etc.).
*   A `README.md` tailored to your selected configuration, with instructions on how to run *that specific project*.
*   Configuration files for your bundler, TypeScript, styling, etc.
*   Sample "Todo API" if a backend framework was selected.
*   Basic database connection setup (if a database was chosen).
*   Deployment configuration files (if a deployment option was selected).

## 🤝 Contributing

Contributions are welcome! Whether it's adding new framework support, improving existing generators, fixing bugs, or enhancing documentation, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please open an issue first to discuss any significant changes or new features.

## 🗺️ Roadmap (Potential Future Enhancements)

*   [ ] Support for more frontend frameworks (e.g., Qwik, Preact).
*   [ ] Support for additional backend languages/frameworks (e.g., Go, Rust, Ruby on Rails).
*   [ ] More UI component libraries (e.g., PrimeReact, NextUI).
*   [ ] Integration of testing frameworks (Jest, Vitest, Pytest, Cypress).
*   [ ] Option for monorepo setup (e.g., with Turborepo, Nx).
*   [ ] More advanced and specific deployment configurations for various platforms.
*   [ ] Enhanced error handling and recovery.
*   [ ] Plugin system for easier extension.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

Happy Hacking! 🎉

// Configuration options
const CONFIG_OPTIONS = {
  jsFrameworks: {
    title: 'JavaScript Frontend Framework',
    options: [
      { key: 'react', name: 'React', description: 'Popular UI library by Meta' },
      { key: 'vue', name: 'Vue.js', description: 'Progressive framework' },
      { key: 'angular', name: 'Angular', description: 'Full-featured framework by Google' },
      { key: 'svelte', name: 'Svelte', description: 'Compile-time framework' },
      { key: 'solid', name: 'SolidJS', description: 'Fast reactive framework' },
      { key: 'vanilla', name: 'Vanilla JS', description: 'No framework, pure JavaScript' },
      { key: 'skip', name: 'Skip Frontend', description: 'Backend-only project' }
    ],
    default: 'react'
  },
  language: {
    title: 'Language Choice',
    options: [
      { key: 'typescript', name: 'TypeScript', description: 'Type-safe JavaScript superset' },
      { key: 'javascript', name: 'JavaScript', description: 'Standard JavaScript' }
    ],
    default: 'typescript'
  },
  bundler: {
    title: 'Build Tool / Bundler',
    options: [
      { key: 'vite', name: 'Vite', description: 'Fast build tool with HMR' },
      { key: 'webpack', name: 'Webpack', description: 'Popular module bundler' },
      { key: 'rollup', name: 'Rollup', description: 'Efficient ES module bundler' },
      { key: 'parcel', name: 'Parcel', description: 'Zero-configuration bundler' },
      { key: 'esbuild', name: 'ESBuild', description: 'Extremely fast bundler' },
      { key: 'none', name: 'None', description: 'No bundler (for Node.js projects)' }
    ],
    default: 'vite'
  },
  styling: {
    title: 'CSS Framework / Styling',
    options: [
      { key: 'tailwind', name: 'Tailwind CSS', description: 'Utility-first CSS framework' },
      { key: 'bootstrap', name: 'Bootstrap', description: 'Popular CSS framework' },
      { key: 'bulma', name: 'Bulma', description: 'Modern CSS framework' },
      { key: 'styled-components', name: 'Styled Components', description: 'CSS-in-JS library' },
      { key: 'emotion', name: 'Emotion', description: 'CSS-in-JS library' },
      { key: 'sass', name: 'Sass/SCSS', description: 'CSS preprocessor' },
      { key: 'css', name: 'Plain CSS', description: 'Vanilla CSS' }
    ],
    default: 'tailwind'
  },
  uiLibrary: {
    title: 'UI Component Library (Optional)',
    options: [
      { key: 'none', name: 'None', description: 'Build custom components' },
      { key: 'mui', name: 'Material-UI', description: 'React Material Design components' },
      { key: 'antd', name: 'Ant Design', description: 'Enterprise UI components' },
      { key: 'chakra', name: 'Chakra UI', description: 'Simple, modular React components' },
      { key: 'mantine', name: 'Mantine', description: 'Full-featured React components' },
      { key: 'shadcn', name: 'shadcn/ui', description: 'Copy-paste React components' }
    ],
    default: 'none'
  },
  stateManagement: {
    title: 'State Management (Frontend)',
    options: [
      { key: 'none', name: 'Built-in State', description: 'Use framework\'s built-in state' },
      { key: 'redux', name: 'Redux Toolkit', description: 'Predictable state container' },
      { key: 'zustand', name: 'Zustand', description: 'Lightweight state management' },
      { key: 'jotai', name: 'Jotai', description: 'Atomic state management' },
      { key: 'recoil', name: 'Recoil', description: 'Facebook\'s state management' },
      { key: 'mobx', name: 'MobX', description: 'Reactive state management' }
    ],
    default: 'none'
  },
  backend: {
    title: 'Backend Framework',
    options: [
      { key: 'none', name: 'No Backend', description: 'Frontend-only project' },
      { key: 'express', name: 'Express.js', description: 'Minimal Node.js framework' },
      { key: 'fastify', name: 'Fastify', description: 'Fast Node.js framework' },
      { key: 'koa', name: 'Koa.js', description: 'Next-gen Node.js framework' },
      { key: 'nest', name: 'NestJS', description: 'Enterprise Node.js framework' },
      { key: 'hapi', name: 'Hapi.js', description: 'Rich Node.js framework' },
      { key: 'python', name: 'Python Backend', description: 'Choose Python framework' }
    ],
    default: 'express'
  },
  pythonFramework: {
    title: 'Python Backend Framework',
    options: [
      { key: 'fastapi', name: 'FastAPI', description: 'Modern, fast Python API framework' },
      { key: 'django', name: 'Django', description: 'Full-featured Python framework' },
      { key: 'flask', name: 'Flask', description: 'Lightweight Python framework' },
      { key: 'quart', name: 'Quart', description: 'Async Python framework' }
    ],
    default: 'fastapi'
  },
  database: {
    title: 'Database',
    options: [
      { key: 'none', name: 'No Database', description: 'Use mock data or external APIs' },
      { key: 'sqlite', name: 'SQLite', description: 'Lightweight file database' },
      { key: 'postgresql', name: 'PostgreSQL', description: 'Advanced relational database' },
      { key: 'mysql', name: 'MySQL', description: 'Popular relational database' },
      { key: 'mongodb', name: 'MongoDB', description: 'NoSQL document database' },
      { key: 'redis', name: 'Redis', description: 'In-memory data store' }
    ],
    default: 'none'
  },
  deployment: {
    title: 'Deployment & DevOps',
    options: [
      { key: 'none', name: 'No Deployment Setup', description: 'Manual deployment' },
      { key: 'docker', name: 'Docker', description: 'Containerization setup' },
      { key: 'vercel', name: 'Vercel', description: 'Frontend deployment config' },
      { key: 'netlify', name: 'Netlify', description: 'JAMstack deployment' },
      { key: 'heroku', name: 'Heroku', description: 'Cloud platform deployment' },
      { key: 'aws', name: 'AWS', description: 'Amazon Web Services setup' }
    ],
    default: 'docker'
  }
};

// Project configuration
module.exports = {
  CONFIG_OPTIONS
};
# Quick Polls

Quick Polls is a modern web application for creating, sharing, and managing polls and quizzes. It features user authentication, a dashboard, and a dynamic poll builder with support for multiple questions and answer types.

## Features

- **User Authentication**: Secure signup and login forms with validation and session/token storage.
- **Dashboard**: Personalized dashboard for logged-in users, with quick access to poll creation and management.
- **Poll Creation**: Dynamic UI to add, remove, and reorder questions. Each question supports multiple answer options, single/multiple choice, and answer randomization.
- **Access Control**: Only authenticated users can create polls. Each poll is owned by its creator.
- **Shareable Polls**: After creation, a unique poll link is generated for sharing and collecting responses.
- **Responsive Design**: Clean, modern, and user-friendly interface.

## Getting Started

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

- **Frontend (React):**
  ```bash
  npm start
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Development with Nodemon:**
  If you have a backend entry point (e.g., `src/index.js`), you can use:
  ```bash
  npm run dev
  ```
  *(Note: This is only relevant if you add a backend/server to the project.)*

## Main Scripts

- `npm start` — Run the React frontend in development mode.
- `npm run build` — Build the app for production.
- `npm test` — Run tests (if available).
- `npm run dev` — Run backend with nodemon (if applicable).

## Project Structure

- `src/pages/` — Main pages (Dashboard, Login, Signup, CreatePoll, PollView)
- `src/components/` — Reusable UI components
- `src/utils/` — Utility modules (validation, mock API)
- `src/styles/` — CSS files

## Developer Notes

- **Nodemon** is included as a devDependency for backend/server development. If you only use the React frontend, you can ignore the `dev` script.
- All authentication and poll logic is currently mocked in the frontend for demonstration purposes.

## License

MIT

# Repository Guidelines

## Project Structure & Module Organization
- The repo splits into `frontend/` (Vite + React client) and `backend/` (Express API); install and run each package independently.
- Backend directories map to responsibilities: `config/` (database, sockets, rate limits), `controllers/` + `services/` for request flow, `routes/` for HTTP wiring, `middlewares/` for cross-cutting logic, and `jobs/` for BullMQ tasks; `uploads/` keeps transient media.
- Frontend code lives under `frontend/src/`; keep UI in `components/`, page shells in `pages/`, state in `store/` (Redux) and `stores/` (Zustand), API clients in `services/`, hooks in `hooks/`, and helpers in `utils/`. The `@` alias resolves to `src/` (see `frontend/vite.config.js`).

## Build, Test, and Development Commands
- Backend: `cd backend && npm run dev` starts Nodemon; use `npm start` for a production-like launch after setting `backend/.env`.
- Frontend: `cd frontend && npm run dev` serves the client at `http://localhost:5173`; `npm run build` creates `frontend/dist/`; `npm run preview` validates the bundle; `npm run lint` runs ESLint.

## Coding Style & Naming Conventions
- Use ES modules and two-space indentation as seen in `frontend/src/pages/LatestMoviesPage.jsx` and `backend/routes/movie.routes.js`.
- React components and hooks stay PascalCase (`LatestMoviesPage.jsx`, `useChatSocket.js`); service and utility modules use camelCase (`movieService.js`, `classNames.js`).
- Run `npm run lint` before every PR; the `frontend/eslint.config.js` rules enforce React Hooks safety and catch stray globals. Keep inline comments concise and in English.

## Testing Guidelines
- Automated tests are not wired yet; add Vitest + Testing Library for the frontend (co-locate specs as `Feature.test.jsx`) and Jest + Supertest under `backend/tests/` for API coverage.
- When tests are introduced, expose `npm test` scripts, run them in CI, and aim for ≥70% statement coverage on newly touched modules with regression cases for reported issues.

## Commit & Pull Request Guidelines
- History is minimal—follow Conventional Commits (`feat: queue monitoring dashboard`, `fix(api): handle missing tokens`) to keep changes searchable.
- Commit focused units of work and squash noisy branches before merging.
- PRs must describe intent, list manual verification (`npm run dev`, `npm run lint`, scripts), and add screenshots for UI changes. Link Jira issues or GitHub tickets when relevant.

## Security & Configuration Tips
- Keep secrets in `.env` files; never commit them. Provide `.env.example` entries for new keys so teammates can sync safely.
- Harden new endpoints with the existing middleware patterns for validation, rate limiting, and error handling before exposing them publicly.

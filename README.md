# GRIEVEASE (A platform for managing grievances)

## DESCRIPTION 

Grievease is a proposed system for students to file grievances and track their progress, while authorized college
officials can view, assign and resolve them. Each complaint gets a unique ticket ID, and important status changes are
noted so that the history of the complaint is easier to trace. The goal is to make the process more transparent and
accountable without exposing the contents of private complaints in the public sphere.

## UML DIAGRAM

![Diagramatic representation of Users and their functions](uml.png)

## FRONTEND AND BACKEND DEPLOYMENT

The frontend (`Frontend`) and API (`Backend`) deploy as separate services.
Use `.env.example` as the deployment template and configure the variables in
each hosting provider. Local `.env` files use the corresponding localhost
origins and are ignored by Git.

- Frontend `VITE_API_BASE_URL`: the backend's public URL, including `/api`
  (for example, `https://api.example.com/api`). This is a Vite build-time
  variable, so configure it in the frontend service before building.
- Backend `FRONTEND_ORIGIN`: the exact public frontend origin, without a path
  (for example, `https://grievease.example.com`). Multiple origins can be
  comma-separated.
- Backend `MONGO_URI` and `JWT_SECRET`: configure the production database
  connection and a private random secret of at least 32 characters. Do not
  commit `.env` files or put backend secrets in frontend variables.
- Backend `PORT`: use the port provided by the hosting service when applicable.

The frontend calls the backend directly in this deployment setup. The backend
allows browser requests only from the configured frontend origin; production
startup requires `FRONTEND_ORIGIN`. Replace the example hostnames with the
actual URLs assigned by your deployment providers.

Run the API from `Backend` with `npm run dev`, and run the frontend from
`Frontend` with `npm run dev`.

Run backend tests with `npm test` from `Backend`. Core service tests use the
in-memory `Backend/test/mockdb.js` adapter and do not require MongoDB.

To try the frontend and backend together without configuring or starting
MongoDB, run `npm run dev:mock` from `Backend` and `npm run dev` from
`Frontend`. Sign in with `student@example.test` and `demo-password-123`.
To test the admin workflow in the frontend, select Administrator and sign in
with `admin@example.test` and `admin-password-123`. Create an official from the
Administration page, then assign a grievance to that account. Sign out and
sign in as the newly created official to review and resolve the assigned case.
Grievances created in this mode are stored only in process memory and disappear
when the mock API stops. This mode is for local testing only, not deployment.
The HTTP integration tests, including admin assignment and official resolution,
run against the same mock API automatically with `npm test` from `Backend`.

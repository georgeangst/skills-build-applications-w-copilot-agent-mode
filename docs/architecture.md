# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep routing and page composition in React; use the shared API client for relative `/api` requests. Each capability page owns its rendering and must expose accessible loading, error, empty, and populated states without embedding business rules.
- Logic tier decision: Keep Express routes thin and put input validation, reference checks, and capability behavior in `octofitService.ts`. Return deliberate 4xx responses for invalid or missing resources; do not leak Mongoose cast or validation errors as 5xx responses.
- Data tier decision: Define required fields, types, defaults, and references in Mongoose schemas. Keep seed data representative and idempotent, and do not delete unrelated records when seeding.
- Activity tracking approach: Validate the submitted user and team IDs and confirm both records exist before writing. Store the user, team, type, and positive minutes; compute points from minutes in the service and set `occurredAt` when it is not supplied by the trusted server flow.
- Team management approach: Require a team name, preserve the submitted name and mascot, default members to an empty array, and validate member references before saving. Keep team membership references consistent when adding members.
- Leaderboard approach: Aggregate activity points by team, include teams with no activities at zero, sort by total points descending, and assign 1-based ranks in the service response.
- Workout suggestions approach: Find the requested user by email, use their fitness goal and recent activities to rank available workouts, and include a human-readable reason with each recommendation. Return a deliberate 4xx response when the user is unknown.

## Test plan

Run checks in dependency order: data, API, frontend, then both builds. The data tier underpins API behavior, and the frontend depends on the API contract.

- Data tier: `npm run test:data --prefix octofit-tracker/backend` checks schema validation/defaults and repeatable, non-destructive seeding. Failures point to models or seed behavior.
- Logic tier: `npm run test:api --prefix octofit-tracker/backend` checks request validation, persistence, leaderboard ordering, and workout matching. Failures point to service behavior or route error handling.
- Presentation tier: `npm test --prefix octofit-tracker/frontend` checks API-backed rendering, loading and empty states, user-specific workout requests, and accessible error handling. Failures point to the API client or page components.
- Backend build: `npm run build --prefix octofit-tracker/backend` type-checks the Express and data tiers; failures indicate TypeScript or backend contract mismatches.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` type-checks and bundles the presentation tier; failures indicate TypeScript or Vite integration issues.

Baseline before implementation: `npm test --prefix octofit-tracker/backend` reports 8 failures and 1 pass (the seed idempotence test); `npm test --prefix octofit-tracker/frontend` reports 15 failures. Re-run the targeted tier checks after each implementation slice, then run both build commands before considering the work complete.

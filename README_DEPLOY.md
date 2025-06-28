# Vercel Docker Deployment for InRent

- Only the root `Dockerfile` and `vercel.json` are needed for Vercel Docker builds.
- All static files should be in `/public` if you want Vercel to serve them directly.
- All API/server code should be referenced from `app.js` (as in your `vercel.json`).
- Remove any Dockerfile or compose file not in the root.
- Domain: https://inrent.vercel.app or your custom domain.

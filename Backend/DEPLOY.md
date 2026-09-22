# Free hosted backend

This repository is ready to run the Express API on Render and PostgreSQL on Neon.

## 1. Create the database

1. Create a free project at https://console.neon.tech.
2. Keep the database password private.
3. From **Connect**, select the pooled connection and copy its complete PostgreSQL connection string.

The first Render build runs `npm run migrate:deploy`. This creates the transactions, authentication, session, and import-token tables. The migration is safe to run again on later deployments.

## 2. Deploy the API

1. Commit and push this repository to GitHub.
2. Sign in at https://dashboard.render.com and connect GitHub.
3. Choose **New > Blueprint**, select this repository, and use the root `render.yaml` file.
4. When Render asks for `DATABASE_URL`, paste the Neon pooled connection string.
5. Deploy the free service.

Render supplies `PORT`. The Blueprint configures the `Backend` root directory, database migration, health check, TLS database connection, proxy handling, and the production Netlify CORS origin.

After deployment, open `https://expense-tracker-iphone-api.onrender.com/health`. A working API returns:

```json
{"status":"ok"}
```

The exact hostname can differ if the service name is already taken. Use the URL shown by Render.

## 3. Connect the frontend

Set the frontend build environment to the Render origin, without a trailing API path:

```dotenv
EXPO_PUBLIC_API_URL=https://expense-tracker-iphone-api.onrender.com
```

Run `npm run export:web` in `Frontend/expense_tracker_for_iphone`, then upload the new `dist` directory to the existing Netlify site.

Create the account in the newly deployed app. Signup displays the import-only token once. Put that token into the iPhone Shortcut's `Authorization` header as `Bearer YOUR_IMPORT_TOKEN` and send messages to:

```text
https://expense-tracker-iphone-api.onrender.com/api/transactions
```

## Free-tier behavior

Render's free web service sleeps after 15 minutes without traffic. The first request after that can take about a minute and an iPhone Shortcut may need to retry. Neon persists the database independently. Existing data in the local PostgreSQL database is not copied automatically.

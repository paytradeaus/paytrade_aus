# Railway Production Deployment Guide

Step-by-step process for deploying PayTrade updates from Replit to production on Railway.

---

## Git Remotes

The project has two GitHub repositories:

| Remote Name | Repository | Purpose |
|---|---|---|
| `origin` | `paytradeaus/paytrade_aus` | Legacy / backup repo |
| `github-new` | `pejt2000-cyber/paytrade` | **Production repo — Railway deploys from here** |

Railway is connected to `pejt2000-cyber/paytrade` and deploys from the `main` branch.

Your local working branch in Replit is `develop/release-1`. To deploy, you push this branch to `github-new/main`.

---

## Deployment Steps

### 1. Verify your changes are committed and check what will be pushed

```bash
git status
git log --oneline github-new/main..HEAD
```

The first command confirms all changes are committed. The second shows exactly which commits will be deployed to Railway (everything on your local branch that isn't yet on `github-new/main`).

### 2. Push to Railway

```bash
git push github-new develop/release-1:main

pejt2000-cyber


```
This pushes your local `develop/release-1` branch to the `main` branch on `pejt2000-cyber/paytrade`. Railway will detect the new commits and start a build automatically.

### 3. Monitor the build

Go to the Railway dashboard → your project → Deployments. Watch for the build to complete.

### 4. Verify the deployment

Once Railway reports the build is complete:
- Check `https://paytrade.app/health` (or your configured domain) to confirm the backend is responding
- Spot-check a few pages to confirm the frontend is working

---

## If Railway Does Not Auto-Deploy

If auto-deploy is disabled or you need to trigger manually:

1. Go to the Railway dashboard → your project → Deployments
2. Click **"Deploy"** or **"Redeploy"** from the latest commit

---

## Post-Deployment Checklist

After each deployment, verify:

- [ ] `/health` endpoint returns OK
- [ ] Frontend pages load correctly
- [ ] Xero integration is responsive (check Xero Dashboard sync status)
- [ ] Import any new how-to guide JSON to production database (if guides were updated)
- [ ] Check Railway logs for any startup errors

---

## Updating How-To Guides on Production

When you've updated how-to guides on staging (Replit), export them and import to Railway production:

1. **Export from staging:** Use the admin panel or run a database query to export the updated `blog_resource` records as JSON
2. **Import to production:** Connect to the Railway PostgreSQL database and run the corresponding INSERT/UPDATE statements, or use the admin panel's import function

---

## Environment Variables

Do **NOT** set `PORT=3001` on Railway — Railway assigns its own PORT automatically.

After DNS cutover to `paytrade.app`, update these Railway env vars:
- `BASE_URL` → `https://paytrade.app`
- `UPLOAD_BASE_URL` → `https://paytrade.app`
- `DEPLOYED_URL` → `https://paytrade.app`
- `NEXT_PUBLIC_DEPLOYED_URL` → `https://paytrade.app`
- `NEXT_PUBLIC_GRAPHQL_URI` → `https://paytrade.app/graphql`
- `NEXT_PUBLIC_SOCKET_URL` → `https://paytrade.app`
- `XERO_CALLBACK_URL` → `https://paytrade.app/xero/callback`

Also update third-party webhook URLs:
- **Stripe** webhook endpoint → `https://paytrade.app/...`
- **Brevo** webhook endpoint → `https://paytrade.app/...`
- **Xero** OAuth callback → `https://paytrade.app/xero/callback`

---

## Rollback

If a deployment causes issues:
1. In Railway dashboard, go to Deployments
2. Click on the previous successful deployment
3. Click **"Rollback"** to revert to that version

---

## Quick Reference (Copy-Paste)

```bash
# Check what will be pushed
git log --oneline github-new/main..HEAD

# Push to production (Railway)
git push github-new develop/release-1:main

# Force push (use with caution — only if needed)
git push github-new develop/release-1:main --force
```

---

## Keeping Both Repos in Sync (Optional)

If you also want to keep the legacy `origin` repo updated:

```bash
# Push to both repos
git push github-new develop/release-1:main
git push origin develop/release-1
```

# Troubleshooting Guide

Common issues encountered during local development and their solutions.

## 1. Firebase Authentication Issues

**Error**: `auth/unauthorized-domain`
**Solution**: 
1. Go to Firebase Console > Authentication > Settings > Authorized domains.
2. Ensure `localhost` and your Vercel deployment URL are added to the list.

**Error**: "Google Sign-In popup closes immediately"
**Solution**: Ensure your `GOOGLE_CLIENT_ID` in `.env` is correct and that the authorized redirect URI in Google Cloud Console exactly matches `http://localhost:5173`.

## 2. Firestore Permission Denied

**Error**: `Missing or insufficient permissions.`
**Solution**:
1. You are likely trying to read/write data without being authenticated, or attempting to access a document that doesn't belong to your test user.
2. Check `firestore.rules` to understand the security requirements for the collection.
3. Ensure you are using the `waitForAuth()` helper if fetching data immediately on app load.

## 3. Environment Variables

**Error**: `process is not defined` or Firebase initialization crash.
**Solution**: 
1. Vite uses `import.meta.env` instead of `process.env`.
2. Ensure all client-side variables in your `.env` file are prefixed with `VITE_`.
3. Restart the dev server (`npm run dev`) after changing `.env` files.

## 4. Build Failures

**Error**: `TypeScript error during npm run build`
**Solution**: Siyayya enforces strict TypeScript. Run `npx tsc --noEmit` locally to see the exact type errors. Fix them before pushing.

## 5. Blank Screen on Load

**Error**: White screen with no console errors in production, or `chunk load error`.
**Solution**: This usually happens if the user has an outdated cached version of the PWA and the deployment changed chunk hashes. Tell the user to hard-refresh (`Ctrl+Shift+R` or clear site data). We have mitigated this with Workbox auto-updating in the latest release.

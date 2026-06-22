import * as admin from 'firebase-admin';

let initialized = false;

export function getAdminApp(): admin.app.App {
  if (initialized || admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean);
    throw new Error(`[Firebase Admin] Missing env vars: ${missing.join(', ')}`);
  }

  let formattedKey = privateKey.trim();
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  formattedKey = formattedKey.replace(/\\n/g, '\n');

  const app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey: formattedKey }),
    databaseURL: `https://${projectId}.firebaseio.com`,
  });

  initialized = true;
  return app;
}

export function getAdminDb(): admin.firestore.Firestore {
  getAdminApp();
  return admin.firestore();
}

export function getAdminAuth(): admin.auth.Auth {
  getAdminApp();
  return admin.auth();
}

export function getAdminMessaging(): admin.messaging.Messaging {
  getAdminApp();
  return admin.messaging();
}

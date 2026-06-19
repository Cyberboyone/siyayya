import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin (Requires service account key)
// 1. Go to Firebase Console > Project Settings > Service Accounts
// 2. Generate new private key and save it as serviceAccountKey.json in the same directory
try {
  const serviceAccountPath = path.resolve("./serviceAccountKey.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("Error: serviceAccountKey.json not found.");
    console.log("Please download your Firebase Admin SDK private key and place it as serviceAccountKey.json in the root directory.");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

const db = getFirestore();

async function clearDemoData() {
  console.log("Starting demo data cleanup...");
  
  const collectionsToClean = ["products", "services", "requests", "reviews"];
  
  for (const collName of collectionsToClean) {
    console.log(`Checking collection: ${collName}`);
    const snapshot = await db.collection(collName).get();
    
    let deletedCount = 0;
    const batch = db.batch();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Delete documents representing old schema or missing ownerId
      if (!data.ownerId || data.sellerId || data.providerId || data.userId) {
        batch.delete(doc.ref);
        deletedCount++;
      }
      
      // We process batches in chunks of 500 if the database is huge
      if (deletedCount >= 500) {
        console.warn("Too many old docs, batch limit reached! Will only delete 500 in this run.");
      }
    });
    
    if (deletedCount > 0) {
      await batch.commit();
      console.log(`Deleted ${deletedCount} legacy demo documents from ${collName}.`);
    } else {
      console.log(`No legacy documents found in ${collName}.`);
    }
  }
  
  console.log("Cleanup finished.");
}

clearDemoData().catch(console.error);

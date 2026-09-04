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

    let snapshot;
    try {
      snapshot = await db.collection(collName).get();
    } catch (error) {
      console.error(`Failed to query collection ${collName}:`, error);
      continue;
    }
    
    let deletedCount = 0;
    let batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Delete documents representing old schema or missing ownerId
      if (!data.ownerId || data.sellerId || data.providerId) {
        batch.delete(doc.ref);
        deletedCount++;

        // Commit in chunks of 480 to stay safely under the 500-op batch limit
        if (deletedCount % 480 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
    }
    
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

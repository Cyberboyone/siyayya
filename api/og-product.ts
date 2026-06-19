import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('[OG API] Missing Firebase Admin credentials in environment variables.');
    }
  } catch (error) {
    console.error('[OG API] Firebase initialization error:', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  // Set Cache-Control headers
  // Cache at Vercel Edge for 1 hour, stale-while-revalidate for 24 hours
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  let htmlTemplate = '';
  try {
    // Try to read the built index.html
    const possiblePaths = [
      path.join(process.cwd(), 'dist', 'index.html'),
      path.join(process.cwd(), 'index.html')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        htmlTemplate = fs.readFileSync(p, 'utf8');
        break;
      }
    }
  } catch (e) {
    console.error('[OG API] Error reading index.html:', e);
  }

  // Fallback HTML if we can't read the file
  if (!htmlTemplate) {
    htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Siyayya</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
  }

  if (!slug || typeof slug !== 'string' || !db) {
    return res.status(200).setHeader('Content-Type', 'text/html').send(htmlTemplate);
  }

  try {
    let productData = null;

    // First try by ID
    const docRef = db.collection('products').doc(slug);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      productData = docSnap.data();
    } else {
      // Then try by slug field
      const snapshot = await db.collection('products').where('slug', '==', slug).limit(1).get();
      if (!snapshot.empty) {
        productData = snapshot.docs[0].data();
      }
    }

    if (!productData) {
      return res.status(200).setHeader('Content-Type', 'text/html').send(htmlTemplate);
    }

    const title = `${productData.title} for Sale in ${productData.location || 'Nigeria'} | Siyayya`;
    const description = `${(productData.description || '').slice(0, 150)}... Buy and sell in Siyayya.`;
    const image = (productData.images && productData.images.length > 0) 
      ? productData.images[0] 
      : (productData.image || 'https://siyayya.com/og-image.png');
    const url = `https://siyayya.com/product/${slug}`;

    // Replace the metadata in the HTML
    let injectedHtml = htmlTemplate;

    // Remove existing OG and Twitter tags to prevent duplicates
    injectedHtml = injectedHtml.replace(/<meta property="og:[^>]+>/g, '');
    injectedHtml = injectedHtml.replace(/<meta name="twitter:[^>]+>/g, '');
    injectedHtml = injectedHtml.replace(/<title>.*?<\/title>/g, '');

    const newTags = `
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="product" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    `;

    // Inject before </head>
    injectedHtml = injectedHtml.replace('</head>', `${newTags}\n</head>`);

    return res.status(200).setHeader('Content-Type', 'text/html').send(injectedHtml);

  } catch (error) {
    console.error('[OG API] Error fetching product:', error);
    // Return original HTML on error so the client app can still load and show an error
    return res.status(200).setHeader('Content-Type', 'text/html').send(htmlTemplate);
  }
}

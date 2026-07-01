import type { VercelRequest, VercelResponse } from '@vercel/node';
  import * as fs from 'fs';
  import * as path from 'path';
  import { getAdminDb } from './_lib/firebase-admin.js';

  export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { slug } = req.query;

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    let htmlTemplate = '';
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(process.cwd(), 'index.html'),
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

    if (!htmlTemplate) {
      htmlTemplate = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Siyayya</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
  </html>`;
    }

    if (!slug || typeof slug !== 'string') {
      return res.status(200).setHeader('Content-Type', 'text/html').send(htmlTemplate);
    }

    try {
      const db = getAdminDb();
      let productData: FirebaseFirestore.DocumentData | null = null;

      const docSnap = await db.collection('products').doc(slug).get();
      if (docSnap.exists) {
        productData = docSnap.data() ?? null;
      } else {
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
      const image =
        productData.images && productData.images.length > 0
          ? productData.images[0]
          : productData.image || 'https://siyayya.com/og-image.png';
      const url = `https://siyayya.com/product/${slug}`;

      let injectedHtml = htmlTemplate;
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

      injectedHtml = injectedHtml.replace('</head>', `${newTags}\n</head>`);
      return res.status(200).setHeader('Content-Type', 'text/html').send(injectedHtml);

    } catch (error) {
      console.error('[OG API] Error fetching product:', error);
      return res.status(200).setHeader('Content-Type', 'text/html').send(htmlTemplate);
    }
  }
  
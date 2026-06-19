import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://siyayya.app';

// Static campuses from the system
const CAMPUSES = [
  { id: 'buk', slug: 'buk' },
  { id: 'abu', slug: 'abu' },
  { id: 'atbu', slug: 'atbu' },
  { id: 'unimaid', slug: 'unimaid' },
  { id: 'futminna', slug: 'futminna' },
  { id: 'udus', slug: 'udus' },
  { id: 'nsuk', slug: 'nsuk' },
  { id: 'kust', slug: 'kust' },
  { id: 'yumsuk', slug: 'yumsuk' },
  { id: 'gsu', slug: 'gsu' },
  { id: 'fudma', slug: 'fudma' },
  { id: 'fuk', slug: 'fuk' },
  { id: 'tsu', slug: 'tsu' },
  { id: 'mau', slug: 'mau' },
  { id: 'unijos', slug: 'unijos' },
  { id: 'uniabuja', slug: 'uniabuja' },
  { id: 'nda', slug: 'nda' },
  { id: 'fubk', slug: 'fubk' },
  { id: 'fugusau', slug: 'fugusau' },
  { id: 'fuwukari', slug: 'fuwukari' },
  { id: 'kasu', slug: 'kasu' },
  { id: 'umyu', slug: 'umyu' },
  { id: 'fud', slug: 'fud' },
  { id: 'slu', slug: 'slu' },
  { id: 'basug', slug: 'basug' },
  { id: 'bosu', slug: 'bosu' },
  { id: 'fuga', slug: 'fuga' },
  { id: 'adsu', slug: 'adsu' },
  { id: 'aun', slug: 'aun' },
  { id: 'ksusta', slug: 'ksusta' },
  { id: 'ssu', slug: 'ssu' },
  { id: 'zasu', slug: 'zasu' },
  { id: 'plasu', slug: 'plasu' },
  { id: 'nile', slug: 'nile' },
  { id: 'baze', slug: 'baze' },
  { id: 'alqalam', slug: 'alqalam' }
];

const CATEGORIES = [
  'electronics',
  'phones',
  'laptops',
  'books',
  'fashion',
  'hostel',
  'food',
  'services'
];

function generateMainSitemap() {
  const urls = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/marketplace', changefreq: 'daily', priority: '0.9' },
    { loc: '/forum', changefreq: 'daily', priority: '0.9' },
    { loc: '/about', changefreq: 'weekly', priority: '0.5' },
    { loc: '/contact', changefreq: 'weekly', priority: '0.5' }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  urls.forEach(url => {
    xml += `
  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
  });

  xml += '\n</urlset>';
  return xml;
}

function generateCampusesSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  CAMPUSES.forEach(campus => {
    // 1. Campus Hub
    xml += `
  <url>
    <loc>${SITE_URL}/campus/${campus.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    // 2. Forum Category
    xml += `
  <url>
    <loc>${SITE_URL}/forum/${campus.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
    // 3. Hostels landing
    xml += `
  <url>
    <loc>${SITE_URL}/hostels/${campus.id}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += '\n</urlset>';
  return xml;
}

function generateMarketplaceSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  CATEGORIES.forEach(cat => {
    xml += `
  <url>
    <loc>${SITE_URL}/marketplace/${cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += '\n</urlset>';
  return xml;
}

function generateSitemapIndex() {
  const sitemaps = [
    '/sitemap-main.xml',
    '/sitemap-campuses.xml',
    '/sitemap-marketplace.xml'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  sitemaps.forEach(sm => {
    xml += `
  <sitemap>
    <loc>${SITE_URL}${sm}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`;
  });

  xml += '\n</sitemapindex>';
  return xml;
}

function writeSitemaps() {
  const publicDir = path.resolve('public');
  const distDir = path.resolve('dist');

  // Verify public dir exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemaps = {
    'sitemap.xml': generateSitemapIndex(),
    'sitemap-main.xml': generateMainSitemap(),
    'sitemap-campuses.xml': generateCampusesSitemap(),
    'sitemap-marketplace.xml': generateMarketplaceSitemap()
  };

  // Write to public folder
  Object.entries(sitemaps).forEach(([filename, content]) => {
    const filePath = path.join(publicDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Sitemap] Generated ${filePath}`);

    // If dist folder exists (runs in postbuild), copy it to dist too
    if (fs.existsSync(distDir)) {
      const distFilePath = path.join(distDir, filename);
      fs.writeFileSync(distFilePath, content, 'utf8');
      console.log(`[Sitemap] Copied to ${distFilePath}`);
    }
  });

  console.log('[Sitemap] All sitemaps created successfully!');
}

writeSitemaps();

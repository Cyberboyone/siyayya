# Deployment Configurations for SPAs

To ensure that your React (Vite) app handles routing correctly on custom servers (Nginx or Apache) and avoids 404 errors or redirect loops, use the following configurations.

## Nginx Configuration

Add this to your `server` block. It ensures that all requests that don't match a physical file are rewritten to `index.html`.

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/your-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Apache Configuration (.htaccess)

Create or update the `.htaccess` file in your root directory (or the directory where `index.html` is located).

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite for real files or directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>
```

## Why this is important for SEO

1.  **Stable 200 Status**: Search engines expect a `200 OK` status for valid pages. Without these rewrites, refreshing a deep link like `/dashboard` would return a `404 Not Found` from the server, even if React Router can handle it client-side.
2.  **No Redirect Chains**: These configurations use **Rewrites** (internal) rather than **Redirects** (external/301/302). This means the URL in the address bar stays the same, and the server simply serves the content of `index.html`, which is much faster and cleaner for indexing.

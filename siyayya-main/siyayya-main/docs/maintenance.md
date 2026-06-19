# Project Maintenance & Operations

Guidelines for long-term project health, releases, and monitoring.

## 1. Dependency Management

*   **Routine Updates**: Run `npm outdated` monthly. Use `npm update` for minor/patch versions.
*   **Major Updates**: For major version bumps (especially React, Vite, or Firebase), test thoroughly on the `develop` branch before merging.
*   **Security Audits**: Run `npm audit` regularly. Address high/critical vulnerabilities immediately.

## 2. Deployment Process

Siyayya is hosted on Vercel with automatic CI/CD.

*   **Staging**: Pushes to `develop` automatically trigger a preview deployment. Use this URL for QA testing.
*   **Production**: Merging a Pull Request into `main` triggers a production build.
*   **Rollbacks**: In the event of a critical production bug, use the Vercel Dashboard to instantly rollback to the previous successful deployment while a fix is developed.

## 3. Database Backups

While Firestore is highly resilient, point-in-time recovery is essential.

*   **Configuration**: Ensure Google Cloud Platform (GCP) Scheduled Backups are enabled for the Firestore instance.
*   **Retention**: Maintain daily backups for 7 days, and weekly backups for 1 month.

## 4. Monitoring & Incident Response

*   **Sentry**: Monitors frontend crashes and React boundary errors. Set up alerts in Sentry to ping the dev team via email/Slack when a spike occurs.
*   **Admin Dashboard**: Use the `/admin` route (System Health tab) to monitor Firestore read/write latency and system logs in real-time.
*   **Firebase Quotas**: Monitor the Firebase Console Usage tab. If read quotas are approaching the limit, review `use-queries.ts` for excessive polling or missing `staleTime` limits.

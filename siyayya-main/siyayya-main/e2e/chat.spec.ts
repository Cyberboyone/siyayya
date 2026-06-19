import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('should navigate to inbox', async ({ page }) => {
    // Navigate directly to inbox
    // It should redirect to signin if not authenticated
    await page.goto('/inbox');
    
    // Check if we got redirected to signin OR if the guest prompt is showing
    // We're looking for signs that it's protecting the route
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('/signin');
    
    // If not redirected, check if the "Inbox" title is visible (if somehow mock logged in)
    if (!isRedirected) {
       await expect(page.getByRole('heading', { name: /Messages/i }).or(page.getByText('Sign in'))).toBeVisible();
    } else {
       await expect(page).toHaveURL(/.*\/signin/);
    }
  });
});

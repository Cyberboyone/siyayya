import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should open sign in modal when clicking Post Ad unauthenticated', async ({ page }) => {
    await page.goto('/');
    
    // Click the "Post Ad" button or equivalent that requires auth
    const postAdButton = page.getByRole('button', { name: /Post Ad/i }).or(page.getByText('Sell Item'));
    
    if (await postAdButton.count() > 0) {
      await postAdButton.first().click();
      
      // Should show the Guest Auth Prompt or Sign In Modal
      await expect(page.getByText(/Sign in to continue/i).or(page.getByText(/Join Siyayya/i))).toBeVisible();
      
      // Should have a "Continue with Google" button
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    }
  });

  test('should navigate to signin page', async ({ page }) => {
    await page.goto('/signin');
    
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });
});

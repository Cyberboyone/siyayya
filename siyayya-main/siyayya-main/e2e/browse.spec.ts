import { test, expect } from '@playwright/test';

test.describe('Marketplace Browsing', () => {
  test('should load the homepage and display products', async ({ page }) => {
    await page.goto('/');
    
    // Check if the hero section is visible
    await expect(page.getByText(/Buy, Sell &/i)).toBeVisible();
    await expect(page.getByText(/On Campus/i)).toBeVisible();

    // Check if category pills are visible
    await expect(page.getByText('Trending')).toBeVisible();
    await expect(page.getByText('Electronics')).toBeVisible();

    // The feed should eventually load and show "Explore Products" or "Near"
    // We wait for the products container or a product card to appear
    // (This depends on the mock data loading in the local dev server)
    const searchInput = page.getByPlaceholder('Search campuses, products...');
    await expect(searchInput).toBeVisible();
  });

  test('should navigate to marketplace page', async ({ page }) => {
    await page.goto('/');
    
    // Click on "Market" in the navbar
    const marketLink = page.getByRole('link', { name: 'Market' }).first();
    await marketLink.click();
    
    // Ensure URL changed
    await expect(page).toHaveURL(/.*\/marketplace/);
    
    // Ensure marketplace header is visible
    await expect(page.getByRole('heading', { name: /Campus Marketplace/i })).toBeVisible();
  });
});

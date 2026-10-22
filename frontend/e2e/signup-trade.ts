import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:4200/');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Account');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('test@eatrading.com');
  await page.getByRole('textbox', { name: 'Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('12345678');
  await page.getByRole('textbox', { name: 'Password confirmation' }).click();
  await page.getByRole('textbox', { name: 'Password confirmation' }).fill('12345678');
  await page.locator('form').getByRole('button', { name: 'Sign up' }).click();
  await page.locator('.placeholder-plot').click();
  await page.locator('.placeholder-plot').click();
  await page.getByRole('link', { name: 'Start trading' }).click();
  await page.getByRole('button', { name: 'TSLA' }).click();
  await page.getByRole('button', { name: 'TSLA' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity (shares)' }).fill('1');
  await page.getByRole('spinbutton', { name: 'Quantity (shares)' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity (shares)' }).fill('2');
  await page.getByRole('spinbutton', { name: 'Quantity (shares)' }).dblclick();
  await page.getByRole('button', { name: 'Crypto' }).click();
  await page.getByRole('button', { name: 'Forex' }).click();
  await page.getByRole('button', { name: 'Equities' }).click();
  await page.getByRole('navigation', { name: 'Primary navigation' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
});
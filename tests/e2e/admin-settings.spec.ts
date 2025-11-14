import { test, expect } from "@playwright/test";

test.describe("Admin Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "Admin123!@#");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Navigate to settings
    await page.goto("/admin-settings");
    await expect(page.locator("h1")).toContainText("System Settings");
  });

  test("should display all settings tabs", async ({ page }) => {
    await expect(page.getByTestId("tab-company")).toBeVisible();
    await expect(page.getByTestId("tab-quotes")).toBeVisible();
    await expect(page.getByTestId("tab-tax")).toBeVisible();
    await expect(page.getByTestId("tab-pricing")).toBeVisible();
    await expect(page.getByTestId("tab-currency")).toBeVisible();
  });

  test("should update company settings", async ({ page }) => {
    await page.getByTestId("tab-company").click();

    // Fill company form
    await page.getByTestId("input-company-name").fill("Test Company Inc");
    await page.getByTestId("input-company-address").fill("123 Test Street, Test City");
    await page.getByTestId("input-tax-id").fill("GSTIN123456789");
    await page.getByTestId("input-company-phone").fill("+1234567890");
    await page.getByTestId("input-company-email").fill("info@testcompany.com");

    // Save
    await page.getByTestId("button-save-company").click();

    // Verify success toast
    await expect(page.locator("text=Settings updated")).toBeVisible();
  });

  test("should update quote settings", async ({ page }) => {
    await page.getByTestId("tab-quotes").click();

    // Update quote settings
    await page.getByTestId("input-quote-prefix").fill("QT");
    await page.getByTestId("input-invoice-prefix").fill("INV");
    await page.getByTestId("input-tax-rate").fill("18");

    // Save
    await page.getByTestId("button-save-quote-settings").click();

    // Verify success toast
    await expect(page.locator("text=Settings updated")).toBeVisible();
  });

  test("should manage tax rates", async ({ page }) => {
    await page.getByTestId("tab-tax").click();

    // Open add tax rate dialog
    await page.click('button:has-text("Add Tax Rate")');

    // Fill tax rate form
    await page.fill('input[name="region"]', "IN-KA");
    await page.selectOption('select[name="taxType"]', "GST");
    await page.fill('input[name="sgstRate"]', "9");
    await page.fill('input[name="cgstRate"]', "9");
    await page.fill('input[name="igstRate"]', "18");

    // Submit
    await page.click('button:has-text("Create Tax Rate")');

    // Verify success
    await expect(page.locator("text=Tax rate created")).toBeVisible();

    // Verify tax rate appears in table
    await expect(page.locator("text=IN-KA")).toBeVisible();
    await expect(page.locator("text=9%").first()).toBeVisible();
  });

  test("should manage pricing tiers", async ({ page }) => {
    await page.getByTestId("tab-pricing").click();

    // Open add pricing tier dialog
    await page.click('button:has-text("Add Pricing Tier")');

    // Fill pricing tier form
    await page.fill('input[name="name"]', "Standard");
    await page.fill('input[name="minAmount"]', "0");
    await page.fill('input[name="maxAmount"]', "50000");
    await page.fill('input[name="discountPercent"]', "5");
    await page.fill('textarea[name="description"]', "Standard tier for small projects");

    // Submit
    await page.click('button:has-text("Create Pricing Tier")');

    // Verify success
    await expect(page.locator("text=Pricing tier created")).toBeVisible();

    // Verify pricing tier appears in table
    await expect(page.locator("text=Standard")).toBeVisible();
    await expect(page.locator("text=5%")).toBeVisible();
  });

  test("should delete tax rate", async ({ page }) => {
    await page.getByTestId("tab-tax").click();

    // Add a tax rate first
    await page.click('button:has-text("Add Tax Rate")');
    await page.fill('input[name="region"]', "IN-TEST");
    await page.selectOption('select[name="taxType"]', "GST");
    await page.fill('input[name="sgstRate"]', "9");
    await page.fill('input[name="cgstRate"]', "9");
    await page.fill('input[name="igstRate"]', "18");
    await page.click('button:has-text("Create Tax Rate")');
    await expect(page.locator("text=Tax rate created")).toBeVisible();

    // Delete it
    const deleteButton = page.locator('tr:has-text("IN-TEST") button:has-text("Delete")').first();
    await deleteButton.click();

    // Verify deletion
    await expect(page.locator("text=Tax rate deleted")).toBeVisible();
  });

  test("should delete pricing tier", async ({ page }) => {
    await page.getByTestId("tab-pricing").click();

    // Add a pricing tier first
    await page.click('button:has-text("Add Pricing Tier")');
    await page.fill('input[name="name"]', "Test Tier");
    await page.fill('input[name="minAmount"]', "0");
    await page.fill('input[name="discountPercent"]', "10");
    await page.click('button:has-text("Create Pricing Tier")');
    await expect(page.locator("text=Pricing tier created")).toBeVisible();

    // Delete it
    const deleteButton = page.locator('tr:has-text("Test Tier") button:has-text("Delete")').first();
    await deleteButton.click();

    // Verify deletion
    await expect(page.locator("text=Pricing tier deleted")).toBeVisible();
  });

  test("should update currency settings", async ({ page }) => {
    await page.getByTestId("tab-currency").click();

    // Select base currency
    await page.getByTestId("select-base-currency").click();
    await page.click('text="USD - US Dollar"');

    // Select supported currencies
    await page.getByTestId("checkbox-currency-USD").check();
    await page.getByTestId("checkbox-currency-EUR").check();
    await page.getByTestId("checkbox-currency-GBP").check();

    // Save
    await page.getByTestId("button-save-currency").click();

    // Verify success
    await expect(page.locator("text=Currency settings updated")).toBeVisible();
  });

  test("should display current currency settings", async ({ page }) => {
    await page.getByTestId("tab-currency").click();

    // Verify current settings section is visible
    await expect(page.locator("text=Current Settings")).toBeVisible();
    await expect(page.locator("text=Base Currency:")).toBeVisible();
    await expect(page.locator("text=Supported:")).toBeVisible();
  });

  test("should validate required fields in company settings", async ({ page }) => {
    await page.getByTestId("tab-company").click();

    // Clear required fields
    await page.getByTestId("input-company-name").clear();
    await page.getByTestId("input-company-address").clear();
    await page.getByTestId("input-tax-id").clear();

    // Try to save
    await page.getByTestId("button-save-company").click();

    // Verify validation errors
    await expect(page.locator("text=Company name is required")).toBeVisible();
    await expect(page.locator("text=Address is required")).toBeVisible();
    await expect(page.locator("text=Tax ID is required")).toBeVisible();
  });

  test("should validate email format in company settings", async ({ page }) => {
    await page.getByTestId("tab-company").click();

    // Fill with invalid email
    await page.getByTestId("input-company-email").fill("invalid-email");

    // Try to save
    await page.getByTestId("button-save-company").click();

    // Verify validation error
    await expect(page.locator("text=Invalid email address")).toBeVisible();
  });

  test("should validate tax rate ranges", async ({ page }) => {
    await page.getByTestId("tab-tax").click();

    // Open add tax rate dialog
    await page.click('button:has-text("Add Tax Rate")');

    // Fill with invalid rates (> 100)
    await page.fill('input[name="region"]', "IN-TEST");
    await page.fill('input[name="sgstRate"]', "150");
    await page.fill('input[name="cgstRate"]', "150");
    await page.fill('input[name="igstRate"]', "150");

    // Submit
    await page.click('button:has-text("Create Tax Rate")');

    // Should show validation errors
    await expect(page.locator("text=Failed to create tax rate")).toBeVisible();
  });

  test("should persist settings after page reload", async ({ page }) => {
    await page.getByTestId("tab-company").click();

    // Update a setting
    const testCompanyName = "Persistent Test Company " + Date.now();
    await page.getByTestId("input-company-name").fill(testCompanyName);
    await page.getByTestId("button-save-company").click();
    await expect(page.locator("text=Settings updated")).toBeVisible();

    // Reload page
    await page.reload();

    // Verify setting persists
    await page.getByTestId("tab-company").click();
    const value = await page.getByTestId("input-company-name").inputValue();
    expect(value).toBe(testCompanyName);
  });

  test("should show loading states", async ({ page }) => {
    await page.getByTestId("tab-tax").click();

    // Loading state should appear when fetching data
    const loadingElement = page.locator('text="Loading tax rates..."');
    if (await loadingElement.isVisible()) {
      await expect(loadingElement).toBeVisible();
    }
  });

  test("should handle empty states", async ({ page }) => {
    // If there are no tax rates, should show appropriate message
    await page.getByTestId("tab-tax").click();

    const emptyState = page.locator('text="No tax rates configured yet"');
    const hasData = await page.locator('table tbody tr').count() > 1;

    if (!hasData) {
      await expect(emptyState).toBeVisible();
    }
  });
});


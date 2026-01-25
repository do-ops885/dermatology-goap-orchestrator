# Anti-Patterns: What NOT to Do

## 1. Brittle Selectors

❌ WRONG:

```typescript
await page.locator('.btn-primary-large-blue').click();
await page.locator('#user-12345').click();
```

✅ CORRECT:

```typescript
await page.getByRole('button', { name: /submit/i });
await page.getByLabel('Email Address');
```

## 2. Hard Waits

❌ WRONG:

```typescript
await page.waitForTimeout(3000);
```

✅ CORRECT:

```typescript
await expect(page.getByText('Success')).toBeVisible();
```

## 3. Testing Implementation

❌ WRONG:

```typescript
const state = await page.evaluate(() => window.__REACT_STATE__);
```

✅ CORRECT:

```typescript
await expect(page.getByText('Welcome, John')).toBeVisible();
```

## 4. Test Dependencies

❌ WRONG:

```typescript
test.describe.serial('Flow', () => {
  test('step 1', ...);
  test('step 2', ...); // Depends on step 1
});
```

✅ CORRECT:

```typescript
test('complete workflow', async ({ page }) => {
  // Full independent test
});
```

## Golden Rules

1. Use semantic selectors
2. Auto-wait instead of hard waits
3. Test user outcomes, not implementation
4. Isolate tests
5. Mock external APIs

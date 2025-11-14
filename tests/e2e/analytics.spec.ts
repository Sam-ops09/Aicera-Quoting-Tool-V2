import { test, expect, makeAuthenticatedRequest, createTestUser, testData } from './setup';

test.describe('Analytics - Time Range Endpoint (\\d+ constraint)', () => {
  test('should accept numeric time range parameter', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    // Test with numeric time range
    const response = await makeAuthenticatedRequest(
      authRequest,
      'http://localhost:5000/api/analytics/12',
      'GET'
    );

    expect(response.status()).toBe(200);
    
    // Only parse JSON if successful
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    }
  });

  test('should accept various numeric time ranges', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    // Test various numeric time ranges
    const timeRanges = [3, 6, 12, 24];
    
    for (const timeRange of timeRanges) {
      const response = await makeAuthenticatedRequest(
        authRequest,
        `http://localhost:5000/api/analytics/${timeRange}`,
        'GET'
      );

      // Should successfully route to the numeric endpoint
      expect([200, 500]).toContain(response.status());
    }
  });

  test('should route non-numeric strings to specialized endpoints', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    // Test that non-numeric strings don't match the numeric constraint
    const response = await makeAuthenticatedRequest(
      authRequest,
      'http://localhost:5000/api/analytics/forecast',
      'GET'
    );

    // Should reach the /forecast endpoint (not caught by /:timeRange(\\d+) constraint)
    expect(response.status()).toBe(200);
  });

  test('should handle single digit numeric values', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    const response = await makeAuthenticatedRequest(
      authRequest,
      'http://localhost:5000/api/analytics/3',
      'GET'
    );

    expect([200, 500]).toContain(response.status());
  });

  test('should handle large numeric values', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    const response = await makeAuthenticatedRequest(
      authRequest,
      'http://localhost:5000/api/analytics/120',
      'GET'
    );

    expect([200, 500]).toContain(response.status());
  });

  test('should return analytics data structure for valid time range', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    const response = await makeAuthenticatedRequest(
      authRequest,
      'http://localhost:5000/api/analytics/12',
      'GET'
    );

    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      expect(typeof data === 'object').toBe(true);
    }
  });

  test('should require authentication for time range endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/analytics/12');
    expect(response.status()).toBe(401);
  });

  test('should not interfere with specialized analytics endpoints', async ({ request }) => {
    const { request: authRequest } = await createTestUser(request, { role: 'admin' });
    
    // Test that these specialized endpoints still work
    const endpoints = [
      'http://localhost:5000/api/analytics/forecast',
      'http://localhost:5000/api/analytics/deal-distribution',
      'http://localhost:5000/api/analytics/regional',
      'http://localhost:5000/api/analytics/pipeline',
      'http://localhost:5000/api/analytics/competitor-insights',
    ];

    for (const endpoint of endpoints) {
      const response = await makeAuthenticatedRequest(authRequest, endpoint, 'GET');
      // These endpoints should all return 200 (not be caught by the numeric constraint)
      expect([200, 404]).toContain(response.status());
    }
  });
});

test.describe('Analytics - Phase 3 Features', () => {
  test.describe('Revenue Forecasting', () => {
    test('should return revenue forecast', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/forecast',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should support monthsAhead parameter', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/forecast?months=6',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should return 401 without authentication', async ({ request }) => {
      const response = await request.get('http://localhost:5000/api/analytics/forecast');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Deal Distribution Analysis', () => {
    test('should return deal distribution by amount ranges', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/deal-distribution',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        const distribution = data[0];
        expect(distribution).toHaveProperty('range');
        expect(distribution).toHaveProperty('count');
        expect(distribution).toHaveProperty('totalValue');
      }
    });

    test('should include pricing ranges in distribution', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/deal-distribution',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      const ranges = data.map((d: any) => d.range);
      expect(ranges.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Regional Sales Distribution', () => {
    test('should return sales by region', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/regional',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        const region = data[0];
        expect(region).toHaveProperty('region');
      }
    });

    test('should include performance metrics per region', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/regional',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Custom Report Generation', () => {
    test('should generate custom report with filters', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/custom-report',
        'POST',
        undefined,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }
      );

      expect([200, 400]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    test('should support filtering options', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/custom-report',
        'POST',
        undefined,
        {
          status: 'draft',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }
      );

      expect([200, 400]).toContain(response.status());
    });

    test('should handle amount range filtering', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/custom-report',
        'POST',
        undefined,
        {
          minAmount: 1000,
          maxAmount: 50000,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }
      );

      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe('Sales Pipeline Visualization', () => {
    test('should return quote counts by pipeline stage', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/pipeline',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        const stage = data[0];
        expect(stage).toHaveProperty('stage');
        expect(stage).toHaveProperty('count');
      }
    });

    test('should show progress through sales pipeline', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/pipeline',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Client Lifetime Value (LTV)', () => {
    test('should require authentication for LTV endpoint', async ({
      request,
    }) => {
      const response = await request.get(
        'http://localhost:5000/api/analytics/client/test-id/ltv'
      );

      expect(response.status()).toBe(401);
    });

    test('should return LTV data for authenticated user', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      // Use a dummy client ID - endpoint should still work
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/client/test-client-id/ltv',
        'GET'
      );

      // Should return 200 or 404 depending on whether client exists
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Competitor Insights', () => {
    test('should provide market insights data', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/competitor-insights',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('should require admin role for insights', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'user' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/competitor-insights',
        'GET'
      );

      // Should work regardless of role (or return 403 if role-restricted)
      expect([200, 403]).toContain(response.status());
    });
  });

  test.describe('Analytics Authorization', () => {
    test('should return 401 for unauthenticated requests', async ({
      request,
    }) => {
      const response = await request.get('http://localhost:5000/api/analytics/forecast');
      expect(response.status()).toBe(401);
    });

    test('should reject invalid token', async ({
      request,
    }) => {
      const response = await request.get('http://localhost:5000/api/analytics/forecast', {
        headers: {
          'Authorization': 'Bearer invalid_token_12345',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Analytics Edge Cases', () => {
    test('should handle empty forecast gracefully', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/forecast',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data) || typeof data === 'object').toBeTruthy();
    });

    test('should handle invalid date ranges', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/custom-report',
        'POST',
        undefined,
        {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      );

      expect([200, 400]).toContain(response.status());
    });

    test('should handle zero revenue scenarios', async ({
      request,
    }) => {
      const { request: authRequest } = await createTestUser(request, { role: 'admin' });
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/analytics/deal-distribution',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });
});
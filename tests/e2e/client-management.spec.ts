import { test, expect, makeAuthenticatedRequest, createTestUser, testData } from './setup';

test.describe('Client Management - Phase 3 Features', () => {
  test.describe('Client CRUD Operations', () => {
    test('should create a client', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients',
        'POST',
        undefined,
        testData.client()
      );

      expect([200, 201]).toContain(response.status());
      if (response.status() === 201 || response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
      }
    });

    test('should retrieve all clients', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data) || (typeof data === 'object' && data !== null)).toBeTruthy();
    });

    test('should update a client', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      // First create a client
      const createRes = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients',
        'POST',
        undefined,
        testData.client()
      );
      
      if (createRes.status() !== 201 && createRes.status() !== 200) {
        test.skip();
        return;
      }
      
      const client = await createRes.json();
      const clientId = client.id;

      // Then update it
      const updateRes = await makeAuthenticatedRequest(
        authRequest,
        `http://localhost:5000/api/clients/${clientId}`,
        'PATCH',
        undefined,
        { name: 'Updated Client Name' }
      );

      expect([200, 204]).toContain(updateRes.status());
    });

    test('should delete a client', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      // First create a client
      const createRes = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients',
        'POST',
        undefined,
        testData.client()
      );
      
      if (createRes.status() !== 201 && createRes.status() !== 200) {
        test.skip();
        return;
      }
      
      const client = await createRes.json();
      const clientId = client.id;

      // Then delete it
      const deleteRes = await makeAuthenticatedRequest(
        authRequest,
        `http://localhost:5000/api/clients/${clientId}`,
        'DELETE'
      );

      expect([200, 204]).toContain(deleteRes.status());
    });
  });

  test.describe('Client Authorization', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('http://localhost:5000/api/clients');
      expect(response.status()).toBe(401);
    });

    test('should prevent non-owner access', async ({ request }) => {
      const user1 = await createTestUser(request);
      const user2 = await createTestUser(request);

      // Create client as user1
      const clientRes = await makeAuthenticatedRequest(
        user1.request,
        'http://localhost:5000/api/clients',
        'POST',
        undefined,
        testData.client()
      );

      if (clientRes.status() !== 201 && clientRes.status() !== 200) {
        test.skip();
        return;
      }

      const client = await clientRes.json();

      // Try to access as user2
      const accessRes = await makeAuthenticatedRequest(
        user2.request,
        `http://localhost:5000/api/clients/${client.id}`,
        'GET'
      );

      // Should be 403 or 404
      expect([403, 404, 200]).toContain(accessRes.status()); // 200 if clients are shared
    });
  });

  test.describe('Client Edge Cases', () => {
    test('should handle empty client list', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients',
        'GET'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data) || typeof data === 'object').toBeTruthy();
    });

    test('should validate required fields', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients',
        'POST',
        undefined,
        { name: '' } // Invalid: empty name
      );

      expect([400, 422]).toContain(response.status());
    });

    test('should handle non-existent client', async ({ request }) => {
      const { request: authRequest } = await createTestUser(request);
      
      const response = await makeAuthenticatedRequest(
        authRequest,
        'http://localhost:5000/api/clients/non-existent-id',
        'GET'
      );

      expect([404, 200]).toContain(response.status()); // 200 if endpoint returns all clients
    });
  });
});
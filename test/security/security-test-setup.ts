import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export class SecurityTestSetup {
  static async testSQLInjection(
    app: INestApplication,
    endpoint: string,
    token?: string,
  ): Promise<boolean> {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; DELETE FROM courses; --",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'hacked'); --",
    ];

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    for (const payload of sqlInjectionPayloads) {
      const response = await request(app.getHttpServer())
        .get(`${endpoint}?search=${encodeURIComponent(payload)}`)
        .set(headers);

      // Should not return 500 errors or reveal database structure
      if (
        response.status === 500 ||
        response.text.includes('mysql') ||
        response.text.includes('SQL')
      ) {
        return false; // Vulnerable
      }
    }

    return true; // Secure
  }

  static async testXSS(app: INestApplication, endpoint: string, token?: string): Promise<boolean> {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
    ];

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    for (const payload of xssPayloads) {
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .set(headers)
        .send({ content: payload });

      // Should not execute scripts or return unsanitized content
      if (
        response.text.includes('<script>') ||
        response.text.includes('javascript:') ||
        response.text.includes('onerror=')
      ) {
        return false; // Vulnerable
      }
    }

    return true; // Secure
  }

  static async testAuthenticationBypass(
    app: INestApplication,
    protectedEndpoint: string,
  ): Promise<boolean> {
    const bypassAttempts = [
      // No token
      {},
      // Invalid token
      { Authorization: 'Bearer invalid-token' },
      // Malformed token
      { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid' },
      // Wrong token type
      { Authorization: 'Basic invalid-token' },
      // SQL injection in header
      { Authorization: "Bearer '; DROP TABLE users; --" },
    ];

    for (const headers of bypassAttempts) {
      const response = await request(app.getHttpServer()).get(protectedEndpoint).set(headers);

      // Should return 401 Unauthorized, not 200 or protected data
      if (response.status === 200) {
        return false; // Vulnerable
      }
    }

    return true; // Secure
  }

  static async testRateLimiting(
    app: INestApplication,
    endpoint: string,
    maxRequests: number = 10,
  ): Promise<boolean> {
    const requests = Array.from({ length: maxRequests + 5 }, () =>
      request(app.getHttpServer()).post(endpoint).send({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    );

    const results = await Promise.all(requests);

    // Should have some 429 (Too Many Requests) responses
    const rateLimitedResponses = results.filter(r => r.status === 429);

    return rateLimitedResponses.length > 0;
  }

  static async testCSRF(app: INestApplication, endpoint: string, token: string): Promise<boolean> {
    // Test without CSRF token or with invalid origin
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://malicious-site.com')
      .send({ data: 'test' });

    // Should reject requests from unauthorized origins
    return response.status !== 200;
  }

  static async testInputValidation(
    app: INestApplication,
    endpoint: string,
    token?: string,
  ): Promise<boolean> {
    const invalidInputs = [
      // Oversized input
      { field: 'A'.repeat(10000) },
      // Invalid data types
      { email: 12345 },
      { age: 'not-a-number' },
      // Null byte injection
      { name: 'test\x00admin' },
      // Path traversal
      { filename: '../../../etc/passwd' },
    ];

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    for (const invalidInput of invalidInputs) {
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .set(headers)
        .send(invalidInput);

      // Should return 400 Bad Request for invalid inputs
      if (response.status === 200 || response.status === 500) {
        return false; // Vulnerable
      }
    }

    return true; // Secure
  }
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'], // Error rate must be below 5%
    errors: ['rate<0.1'], // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Test health endpoint
  let response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health check status is 200': r => r.status === 200,
    'health check response time < 100ms': r => r.timings.duration < 100,
  }) || errorRate.add(1);

  // Test API endpoints
  response = http.get(`${BASE_URL}/api/v1`);
  check(response, {
    'API status is 200': r => r.status === 200,
  }) || errorRate.add(1);

  // Test authentication
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword',
  });

  response = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(response, {
    'login status is 400 or 401': r => [400, 401].includes(r.status),
  }) || errorRate.add(1);

  sleep(1);
}

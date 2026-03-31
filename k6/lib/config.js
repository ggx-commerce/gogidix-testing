/**
 * Gogidix Testing Infrastructure - Shared Configuration
 * Financial-Grade Load Testing Configuration
 * 
 * This module provides centralized configuration for all k6 test scripts.
 * Supports multiple environments and test scenarios.
 */

export const THRESHOLDS = {
  financial: {
    errorRate: 0.02,
    p95: 2000,
    p99: 5000,
    avg: 1000,
    minThroughput: 100,
  },
  standard: {
    errorRate: 0.05,
    p95: 3000,
    p99: 6000,
    avg: 1500,
    minThroughput: 50,
  },
};

export const TEST_TYPES = {
  LOAD: 'load',
  STRESS: 'stress',
  SPIKE: 'spike',
  ENDURANCE: 'endurance',
  SMOKE: 'smoke',
};

export const DEFAULT_OPTIONS = {
  load: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 100 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.02'],
      http_req_duration: ['p(95)<2000', 'p(99)<5000'],
      http_reqs: ['rate>100'],
    },
  },
  stress: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 500 },
      { duration: '2m', target: 1000 },
      { duration: '5m', target: 1000 },
      { duration: '2m', target: 500 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<5000'],
    },
  },
  spike: {
    stages: [
      { duration: '10s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '5s', target: 1000 },
      { duration: '30s', target: 1000 },
      { duration: '10s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.03'],
      http_req_duration: ['p(95)<3000'],
    },
  },
  endurance: {
    stages: [
      { duration: '5m', target: 100 },
      { duration: '50m', target: 100 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<2000'],
    },
  },
  smoke: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<1000'],
    },
  },
};

export function getBaseUrl() {
  return __ENV.BASE_URL || 'http://localhost:8080';
}

export function getAuthToken() {
  return __ENV.AUTH_TOKEN || '';
}

export function getServiceEndpoint(serviceName) {
  const endpoints = {
    auth: __ENV.AUTH_SERVICE_ENDPOINT || '/api/v1/auth',
    payment: __ENV.PAYMENT_SERVICE_ENDPOINT || '/api/v1/payments',
    fraud: __ENV.FRAUD_SERVICE_ENDPOINT || '/api/v1/fraud-detection',
    user: __ENV.USER_SERVICE_ENDPOINT || '/api/v1/users',
    order: __ENV.ORDER_SERVICE_ENDPOINT || '/api/v1/orders',
    product: __ENV.PRODUCT_SERVICE_ENDPOINT || '/api/v1/products',
    notification: __ENV.NOTIFICATION_SERVICE_ENDPOINT || '/api/v1/notifications',
    analytics: __ENV.ANALYTICS_SERVICE_ENDPOINT || '/api/v1/analytics',
  };
  return endpoints[serviceName] || '/';
}

export function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Request-ID': generateRequestId(),
    'X-Correlation-ID': generateCorrelationId(),
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateCorrelationId() {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateTimestamp() {
  return new Date().toISOString();
}

export function sleepWithJitter(baseSeconds, maxJitter = 0.5) {
  const jitter = Math.random() * maxJitter;
  const sleepTime = baseSeconds + jitter;
  return sleep(sleepTime);
}

export function logResponse(response, context = '') {
  const timestamp = generateTimestamp();
  const status = response.status;
  const duration = response.timings.duration;
  const url = response.request.url;
  
  console.log(`[${timestamp}] ${context} - Status: ${status}, Duration: ${duration}ms, URL: ${url}`);
}

export function checkFinancialThresholds(response, testName) {
  const thresholds = THRESHOLDS.financial;
  
  const checks = {};
  checks[`${testName}: status is 2xx`] = (r) => r.status >= 200 && r.status < 300;
  checks[`${testName}: response time < p95`] = (r) => r.timings.duration < thresholds.p95;
  checks[`${testName}: response time < p99`] = (r) => r.timings.duration < thresholds.p99;
  
  return check(response, checks);
}

export { check, sleep } from 'k6';
export { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js';

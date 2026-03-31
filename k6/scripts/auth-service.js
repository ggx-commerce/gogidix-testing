/**
 * Authentication Service Load Testing
 * Financial-Grade Authentication Testing for Gogidix Platform
 * 
 * Test Scenarios:
 * - User Login
 * - Token Refresh
 * - Session Validation
 * - Logout
 */

import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import http from 'k6/http';
import {
  getBaseUrl,
  getHeaders,
  getServiceEndpoint,
  generateRequestId,
  generateCorrelationId,
  sleepWithJitter,
  logResponse,
  DEFAULT_OPTIONS,
  THRESHOLDS,
} from '../lib/config.js';

// Custom Metrics
const authSuccessRate = new Rate('auth_success_rate');
const loginDuration = new Trend('login_duration');
const tokenRefreshDuration = new Trend('token_refresh_duration');
const sessionValidationDuration = new Trend('session_validation_duration');
const authErrors = new Counter('auth_errors');
const tokensIssued = new Counter('tokens_issued');

// Test Configuration
export const options = DEFAULT_OPTIONS.load;

// Test Data
const TEST_USERS = [
  { email: 'testuser1@gogidix.com', password: 'Test@123456' },
  { email: 'testuser2@gogidix.com', password: 'Test@123456' },
  { email: 'testuser3@gogidix.com', password: 'Test@123456' },
  { email: 'merchant1@gogidix.com', password: 'Merchant@123' },
  { email: 'admin@gogidix.com', password: 'Admin@123' },
];

// Session Storage
let authToken = '';
let refreshToken = '';
let sessionData = {};

export function setup() {
  console.log('='.repeat(60));
  console.log('GOGIDIX AUTHENTICATION SERVICE LOAD TEST');
  console.log('='.repeat(60));
  console.log(`Base URL: ${getBaseUrl()}`);
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  return { startTime: Date.now() };
}

export default function (data) {
  const baseUrl = getBaseUrl();
  const authEndpoint = getServiceEndpoint('auth');
  const user = TEST_USERS[__VU % TEST_USERS.length];
  
  // Test 1: User Login
  testUserLogin(baseUrl, authEndpoint, user);
  
  // Test 2: Token Refresh (if we have a refresh token)
  if (refreshToken) {
    testTokenRefresh(baseUrl, authEndpoint);
  }
  
  // Test 3: Session Validation
  if (authToken) {
    testSessionValidation(baseUrl, authEndpoint);
  }
  
  // Test 4: Protected Resource Access
  if (authToken) {
    testProtectedResourceAccess(baseUrl);
  }
  
  // Test 5: Logout (only for some iterations to maintain sessions)
  if (__ITER % 10 === 9) {
    testLogout(baseUrl, authEndpoint);
  }
  
  sleepWithJitter(1, 0.5);
}

function testUserLogin(baseUrl, authEndpoint, user) {
  const url = `${baseUrl}${authEndpoint}/login`;
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
    deviceId: `device_${__VU}_${__ITER}`,
    ipAddress: '192.168.1.1',
    userAgent: 'GogidixLoadTest/1.0',
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
      timestamp: new Date().toISOString(),
    },
  });
  
  const params = {
    headers: getHeaders(),
    timeout: '30s',
  };
  
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  
  loginDuration.add(duration);
  
  const success = check(response, {
    'Login: Status is 200': (r) => r.status === 200,
    'Login: Has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Login: Has refresh token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.refreshToken !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Login: Response time < 2s': (r) => r.timings.duration < 2000,
    'Login: Has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.user !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  authSuccessRate.add(success);
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      authToken = body.data.accessToken;
      refreshToken = body.data.refreshToken;
      sessionData = body.data.user;
      tokensIssued.add(1);
    } catch (e) {
      authErrors.add(1);
    }
  } else {
    authErrors.add(1);
    logResponse(response, 'LOGIN_FAILED');
  }
}

function testTokenRefresh(baseUrl, authEndpoint) {
  const url = `${baseUrl}${authEndpoint}/refresh`;
  const payload = JSON.stringify({
    refreshToken: refreshToken,
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  });
  
  const params = {
    headers: getHeaders(),
    timeout: '30s',
  };
  
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  
  tokenRefreshDuration.add(duration);
  
  const success = check(response, {
    'Token Refresh: Status is 200': (r) => r.status === 200,
    'Token Refresh: Has new access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Token Refresh: Response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  authSuccessRate.add(success);
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      authToken = body.data.accessToken;
      if (body.data.refreshToken) {
        refreshToken = body.data.refreshToken;
      }
    } catch (e) {
      authErrors.add(1);
    }
  } else {
    authErrors.add(1);
  }
}

function testSessionValidation(baseUrl, authEndpoint) {
  const url = `${baseUrl}${authEndpoint}/validate`;
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '10s',
  };
  
  const startTime = Date.now();
  const response = http.get(url, params);
  const duration = Date.now() - startTime;
  
  sessionValidationDuration.add(duration);
  
  const success = check(response, {
    'Session Validation: Status is 200': (r) => r.status === 200,
    'Session Validation: Session is valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.valid === true;
      } catch (e) {
        return false;
      }
    },
    'Session Validation: Response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  authSuccessRate.add(success);
  
  if (!success) {
    authErrors.add(1);
  }
}

function testProtectedResourceAccess(baseUrl) {
  const url = `${baseUrl}/api/v1/users/profile`;
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '10s',
  };
  
  const response = http.get(url, params);
  
  check(response, {
    'Protected Resource: Status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'Protected Resource: Not 401/403': (r) => r.status !== 401 && r.status !== 403,
    'Protected Resource: Response time < 1s': (r) => r.timings.duration < 1000,
  });
}

function testLogout(baseUrl, authEndpoint) {
  const url = `${baseUrl}${authEndpoint}/logout`;
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '10s',
  };
  
  const response = http.post(url, null, params);
  
  check(response, {
    'Logout: Status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    'Logout: Response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  // Clear tokens after logout
  authToken = '';
  refreshToken = '';
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('AUTHENTICATION SERVICE LOAD TEST COMPLETED');
  console.log(`Test Duration: ${(Date.now() - data.startTime) / 1000} seconds`);
  console.log('='.repeat(60));
}

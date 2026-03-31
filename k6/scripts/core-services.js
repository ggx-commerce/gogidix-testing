/**
 * Core Services Load Testing
 * Comprehensive Testing for Multiple Gogidix Platform Services
 * 
 * Services Tested:
 * - User Service
 * - Order Service
 * - Product Service
 * - Notification Service
 * - Analytics Service
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
} from '../lib/config.js';

// Custom Metrics
const coreServiceSuccessRate = new Rate('core_service_success_rate');
const userOperationDuration = new Trend('user_operation_duration');
const orderOperationDuration = new Trend('order_operation_duration');
const productOperationDuration = new Trend('product_operation_duration');
const notificationLatency = new Trend('notification_latency');
const analyticsQueryDuration = new Trend('analytics_query_duration');
const apiCalls = new Counter('api_calls');
const errors = new Counter('errors');

// Test Configuration
export const options = {
  ...DEFAULT_OPTIONS.load,
  thresholds: {
    ...DEFAULT_OPTIONS.load.thresholds,
    core_service_success_rate: ['rate>0.95'],
    user_operation_duration: ['p(95)<1500'],
    order_operation_duration: ['p(95)<2000'],
    product_operation_duration: ['p(95)<1000'],
    notification_latency: ['p(95)<3000'],
    analytics_query_duration: ['p(95)<5000'],
  },
};

let authToken = '';
let userId = '';
let orderId = '';
let productId = '';

export function setup() {
  console.log('='.repeat(60));
  console.log('GOGIDIX CORE SERVICES LOAD TEST');
  console.log('='.repeat(60));
  console.log(`Base URL: ${getBaseUrl()}`);
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  const token = authenticateUser();
  if (token) {
    authToken = token;
    const user = createTestUser();
    if (user) {
      userId = user.userId;
    }
  }
  
  return { startTime: Date.now(), token: authToken, userId: userId };
}

export default function (data) {
  const baseUrl = getBaseUrl();
  
  if (!authToken && data.token) {
    authToken = data.token;
  }
  if (!userId && data.userId) {
    userId = data.userId;
  }
  
  // Distribute load across different services
  const serviceSelector = __ITER % 5;
  
  switch (serviceSelector) {
    case 0:
      testUserService(baseUrl);
      break;
    case 1:
      testOrderService(baseUrl);
      break;
    case 2:
      testProductService(baseUrl);
      break;
    case 3:
      testNotificationService(baseUrl);
      break;
    case 4:
      testAnalyticsService(baseUrl);
      break;
  }
  
  sleepWithJitter(1, 0.5);
}

function authenticateUser() {
  const baseUrl = getBaseUrl();
  const authEndpoint = getServiceEndpoint('auth');
  const url = `${baseUrl}${authEndpoint}/login`;
  
  const payload = JSON.stringify({
    email: 'testuser@gogidix.com',
    password: 'Test@123456',
  });
  
  const response = http.post(url, payload, { headers: getHeaders() });
  
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return body.data.accessToken;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function createTestUser() {
  const baseUrl = getBaseUrl();
  const userEndpoint = getServiceEndpoint('user');
  const url = `${baseUrl}${userEndpoint}`;
  
  const userData = {
    email: `loadtest_${Date.now()}_${__VU}@gogidix.com`,
    password: 'TestPassword@123',
    firstName: 'Load',
    lastName: 'Test',
    phone: `+234${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    role: 'CUSTOMER',
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  };
  
  const response = http.post(url, JSON.stringify(userData), {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  if (response.status === 200 || response.status === 201) {
    try {
      const body = JSON.parse(response.body);
      return { userId: body.data.userId || body.data.id };
    } catch (e) {
      return null;
    }
  }
  return null;
}

function testUserService(baseUrl) {
  const userEndpoint = getServiceEndpoint('user');
  
  // Test: Get User Profile
  if (userId) {
    const url = `${baseUrl}${userEndpoint}/${userId}`;
    const startTime = Date.now();
    
    const response = http.get(url, {
      headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
    });
    
    userOperationDuration.add(Date.now() - startTime);
    apiCalls.add(1);
    
    const success = check(response, {
      'User Service - Get Profile: Status is 200': (r) => r.status === 200,
      'User Service - Get Profile: Has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data !== undefined;
        } catch (e) {
          return false;
        }
      },
      'User Service - Get Profile: Response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    coreServiceSuccessRate.add(success);
    if (!success) errors.add(1);
  }
  
  // Test: Update User Profile
  if (userId) {
    const url = `${baseUrl}${userEndpoint}/${userId}`;
    const payload = JSON.stringify({
      firstName: 'LoadTest',
      lastName: `User${__ITER}`,
      metadata: {
        lastUpdated: new Date().toISOString(),
        updatedBy: 'LOAD_TEST',
      },
    });
    
    const startTime = Date.now();
    const response = http.patch(url, payload, {
      headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
    });
    
    userOperationDuration.add(Date.now() - startTime);
    apiCalls.add(1);
    
    const success = check(response, {
      'User Service - Update Profile: Status is 200': (r) => r.status === 200,
      'User Service - Update Profile: Response time < 1.5s': (r) => r.timings.duration < 1500,
    });
    
    coreServiceSuccessRate.add(success);
    if (!success) errors.add(1);
  }
}

function testOrderService(baseUrl) {
  const orderEndpoint = getServiceEndpoint('order');
  
  // Test: Create Order
  const orderData = {
    customerId: userId || `customer_${__VU}`,
    items: [
      {
        productId: `prod_${Math.floor(Math.random() * 1000)}`,
        quantity: Math.floor(Math.random() * 5 + 1),
        unitPrice: parseFloat((Math.random() * 500 + 10).toFixed(2)),
      },
    ],
    shippingAddress: {
      street: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'NG',
      postalCode: '100001',
    },
    paymentMethod: 'CARD',
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  };
  
  const createUrl = `${baseUrl}${orderEndpoint}`;
  const startTime = Date.now();
  
  const createResponse = http.post(createUrl, JSON.stringify(orderData), {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
    timeout: '30s',
  });
  
  orderOperationDuration.add(Date.now() - startTime);
  apiCalls.add(1);
  
  const createSuccess = check(createResponse, {
    'Order Service - Create: Status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'Order Service - Create: Has order ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && (body.data.orderId || body.data.id) !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Order Service - Create: Response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  coreServiceSuccessRate.add(createSuccess);
  if (!createSuccess) errors.add(1);
  
  // Extract order ID for subsequent operations
  if (createSuccess) {
    try {
      const body = JSON.parse(createResponse.body);
      orderId = body.data.orderId || body.data.id;
    } catch (e) {}
  }
  
  // Test: Get Order Status
  if (orderId) {
    const statusUrl = `${baseUrl}${orderEndpoint}/${orderId}/status`;
    const statusStartTime = Date.now();
    
    const statusResponse = http.get(statusUrl, {
      headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
    });
    
    orderOperationDuration.add(Date.now() - statusStartTime);
    apiCalls.add(1);
    
    const statusSuccess = check(statusResponse, {
      'Order Service - Get Status: Status is 200': (r) => r.status === 200,
      'Order Service - Get Status: Response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    coreServiceSuccessRate.add(statusSuccess);
    if (!statusSuccess) errors.add(1);
  }
  
  // Test: List Orders
  const listUrl = `${baseUrl}${orderEndpoint}?page=0&size=10&customerId=${userId || `customer_${__VU}`}`;
  const listStartTime = Date.now();
  
  const listResponse = http.get(listUrl, {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  orderOperationDuration.add(Date.now() - listStartTime);
  apiCalls.add(1);
  
  const listSuccess = check(listResponse, {
    'Order Service - List: Status is 200': (r) => r.status === 200,
    'Order Service - List: Has content array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && (Array.isArray(body.data.content) || Array.isArray(body.data));
      } catch (e) {
        return false;
      }
    },
  });
  
  coreServiceSuccessRate.add(listSuccess);
  if (!listSuccess) errors.add(1);
}

function testProductService(baseUrl) {
  const productEndpoint = getServiceEndpoint('product');
  
  // Test: Search Products
  const searchTerm = ['phone', 'laptop', 'clothing', 'electronics', 'food'][Math.floor(Math.random() * 5)];
  const searchUrl = `${baseUrl}${productEndpoint}/search?q=${searchTerm}&page=0&size=20`;
  
  const searchStartTime = Date.now();
  const searchResponse = http.get(searchUrl, {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  productOperationDuration.add(Date.now() - searchStartTime);
  apiCalls.add(1);
  
  const searchSuccess = check(searchResponse, {
    'Product Service - Search: Status is 200': (r) => r.status === 200,
    'Product Service - Search: Has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Product Service - Search: Response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  coreServiceSuccessRate.add(searchSuccess);
  if (!searchSuccess) errors.add(1);
  
  // Test: Get Product Details
  const productId = `prod_${Math.floor(Math.random() * 1000)}`;
  const detailUrl = `${baseUrl}${productEndpoint}/${productId}`;
  
  const detailStartTime = Date.now();
  const detailResponse = http.get(detailUrl, {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  productOperationDuration.add(Date.now() - detailStartTime);
  apiCalls.add(1);
  
  const detailSuccess = check(detailResponse, {
    'Product Service - Get Details: Status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'Product Service - Get Details: Response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  coreServiceSuccessRate.add(detailSuccess);
  if (!detailSuccess) errors.add(1);
  
  // Test: Get Categories
  const categoriesUrl = `${baseUrl}${productEndpoint}/categories`;
  
  const categoriesStartTime = Date.now();
  const categoriesResponse = http.get(categoriesUrl, {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  productOperationDuration.add(Date.now() - categoriesStartTime);
  apiCalls.add(1);
  
  const categoriesSuccess = check(categoriesResponse, {
    'Product Service - Categories: Status is 200': (r) => r.status === 200,
    'Product Service - Categories: Has categories': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  coreServiceSuccessRate.add(categoriesSuccess);
  if (!categoriesSuccess) errors.add(1);
}

function testNotificationService(baseUrl) {
  const notificationEndpoint = getServiceEndpoint('notification');
  
  // Test: Send Notification
  const notificationData = {
    userId: userId || `user_${__VU}`,
    type: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'][Math.floor(Math.random() * 4)],
    title: 'Load Test Notification',
    message: `Test notification from VU ${__VU}, iteration ${__ITER}`,
    channels: ['EMAIL'],
    priority: 'NORMAL',
    metadata: {
      source: 'LOAD_TEST',
      timestamp: new Date().toISOString(),
    },
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  };
  
  const sendUrl = `${baseUrl}${notificationEndpoint}/send`;
  const sendStartTime = Date.now();
  
  const sendResponse = http.post(sendUrl, JSON.stringify(notificationData), {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
    timeout: '15s',
  });
  
  notificationLatency.add(Date.now() - sendStartTime);
  apiCalls.add(1);
  
  const sendSuccess = check(sendResponse, {
    'Notification - Send: Status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'Notification - Send: Has notification ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && (body.data.notificationId || body.data.id) !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Notification - Send: Response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  coreServiceSuccessRate.add(sendSuccess);
  if (!sendSuccess) errors.add(1);
  
  // Test: Get Notification History
  const historyUrl = `${baseUrl}${notificationEndpoint}/history/${userId || `user_${__VU}`}?page=0&size=10`;
  
  const historyStartTime = Date.now();
  const historyResponse = http.get(historyUrl, {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  notificationLatency.add(Date.now() - historyStartTime);
  apiCalls.add(1);
  
  const historySuccess = check(historyResponse, {
    'Notification - History: Status is 200': (r) => r.status === 200,
    'Notification - History: Has notifications': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  coreServiceSuccessRate.add(historySuccess);
  if (!historySuccess) errors.add(1);
}

function testAnalyticsService(baseUrl) {
  const analyticsEndpoint = getServiceEndpoint('analytics');
  
  // Test: Track Event
  const eventData = {
    eventType: ['PAGE_VIEW', 'CLICK', 'PURCHASE', 'SEARCH'][Math.floor(Math.random() * 4)],
    userId: userId || `user_${__VU}`,
    sessionId: `session_${__VU}_${__ITER}`,
    properties: {
      page: '/load-test',
      referrer: 'https://gogidix.com',
      userAgent: 'GogidixLoadTest/1.0',
    },
    timestamp: new Date().toISOString(),
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  };
  
  const trackUrl = `${baseUrl}${analyticsEndpoint}/track`;
  const trackStartTime = Date.now();
  
  const trackResponse = http.post(trackUrl, JSON.stringify(eventData), {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
  });
  
  analyticsQueryDuration.add(Date.now() - trackStartTime);
  apiCalls.add(1);
  
  const trackSuccess = check(trackResponse, {
    'Analytics - Track: Status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'Analytics - Track: Response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  coreServiceSuccessRate.add(trackSuccess);
  if (!trackSuccess) errors.add(1);
  
  // Test: Query Analytics
  const queryUrl = `${baseUrl}${analyticsEndpoint}/query`;
  const queryData = {
    metrics: ['views', 'clicks', 'conversions'],
    dimensions: ['page', 'source'],
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    filters: {
      userId: userId || `user_${__VU}`,
    },
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  };
  
  const queryStartTime = Date.now();
  const queryResponse = http.post(queryUrl, JSON.stringify(queryData), {
    headers: { ...getHeaders(), 'Authorization': `Bearer ${authToken}` },
    timeout: '30s',
  });
  
  analyticsQueryDuration.add(Date.now() - queryStartTime);
  apiCalls.add(1);
  
  const querySuccess = check(queryResponse, {
    'Analytics - Query: Status is 200': (r) => r.status === 200,
    'Analytics - Query: Has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Analytics - Query: Response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  coreServiceSuccessRate.add(querySuccess);
  if (!querySuccess) errors.add(1);
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('CORE SERVICES LOAD TEST COMPLETED');
  console.log(`Test Duration: ${(Date.now() - data.startTime) / 1000} seconds`);
  console.log('='.repeat(60));
}

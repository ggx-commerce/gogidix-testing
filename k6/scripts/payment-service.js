/**
 * Payment Service Load Testing
 * Financial-Grade Payment Processing Testing for Gogidix Platform
 * 
 * Test Scenarios:
 * - Payment Initiation
 * - Payment Status Check
 * - Payment Confirmation
 * - Refund Processing
 * - Transaction History
 */

import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
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
const paymentSuccessRate = new Rate('payment_success_rate');
const paymentInitiationDuration = new Trend('payment_initiation_duration');
const paymentStatusDuration = new Trend('payment_status_duration');
const refundDuration = new Trend('refund_duration');
const transactionVolume = new Counter('transaction_volume');
const paymentErrors = new Counter('payment_errors');
const successfulPayments = new Counter('successful_payments');
const failedPayments = new Counter('failed_payments');
const averageTransactionValue = new Gauge('average_transaction_value');

// Test Configuration
export const options = {
  ...DEFAULT_OPTIONS.load,
  thresholds: {
    ...DEFAULT_OPTIONS.load.thresholds,
    payment_success_rate: ['rate>0.98'],
    payment_initiation_duration: ['p(95)<3000', 'p(99)<5000'],
    payment_status_duration: ['p(95)<1000'],
    refund_duration: ['p(95)<4000'],
  },
};

// Payment Methods
const PAYMENT_METHODS = [
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'DIGITAL_WALLET',
  'CRYPTOCURRENCY',
];

// Currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR'];

// Transaction Statuses
const TRANSACTION_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'];

// Session Storage
let authToken = '';
let paymentIds = [];

export function setup() {
  console.log('='.repeat(60));
  console.log('GOGIDIX PAYMENT SERVICE LOAD TEST');
  console.log('='.repeat(60));
  console.log(`Base URL: ${getBaseUrl()}`);
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log('Financial-Grade Testing: Payment Processing');
  console.log('='.repeat(60));
  
  // Perform initial authentication
  const token = authenticateUser();
  if (token) {
    authToken = token;
    console.log('Authentication successful');
  }
  
  return { startTime: Date.now(), token: authToken };
}

export default function (data) {
  const baseUrl = getBaseUrl();
  const paymentEndpoint = getServiceEndpoint('payment');
  
  if (!authToken && data.token) {
    authToken = data.token;
  }
  
  // Test 1: Payment Initiation (Primary Flow)
  const paymentResult = testPaymentInitiation(baseUrl, paymentEndpoint);
  
  // Test 2: Payment Status Check (if we have a payment ID)
  if (paymentResult && paymentResult.paymentId) {
    testPaymentStatus(baseUrl, paymentEndpoint, paymentResult.paymentId);
    
    // Test 3: Payment Confirmation (for pending payments)
    if (paymentResult.status === 'PENDING') {
      testPaymentConfirmation(baseUrl, paymentEndpoint, paymentResult.paymentId);
    }
    
    // Test 4: Transaction History
    testTransactionHistory(baseUrl, paymentEndpoint);
    
    // Test 5: Refund Processing (random selection)
    if (__ITER % 20 === 19) {
      testRefundProcessing(baseUrl, paymentEndpoint, paymentResult.paymentId, paymentResult.amount);
    }
  }
  
  // Simulate user think time
  sleepWithJitter(2, 1);
}

function authenticateUser() {
  const baseUrl = getBaseUrl();
  const authEndpoint = getServiceEndpoint('auth');
  const url = `${baseUrl}${authEndpoint}/login`;
  
  const payload = JSON.stringify({
    email: 'testuser@gogidix.com',
    password: 'Test@123456',
    deviceId: 'loadtest-device',
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

function generatePaymentRequest() {
  const amount = (Math.random() * 9900 + 100).toFixed(2);
  const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
  const method = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  
  return {
    amount: parseFloat(amount),
    currency: currency,
    paymentMethod: method,
    description: `Load Test Payment - VU${__VU}-ITER${__ITER}`,
    reference: `LT-${Date.now()}-${__VU}-${__ITER}`,
    metadata: {
      customerId: `customer_${__VU}`,
      orderId: `order_${Date.now()}_${__VU}_${__ITER}`,
      source: 'LOAD_TEST',
      testRunId: `run_${__ENV.TEST_RUN_ID || 'default'}`,
    },
    recipient: {
      type: 'MERCHANT',
      id: `merchant_${Math.floor(Math.random() * 100)}`,
      name: `Test Merchant ${Math.floor(Math.random() * 100)}`,
    },
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
      timestamp: new Date().toISOString(),
      sourceIp: '10.0.0.1',
      userAgent: 'GogidixLoadTest/1.0',
    },
    fraudCheckConfig: {
      enabled: true,
      riskThreshold: 'MEDIUM',
      skipRules: false,
    },
    notificationConfig: {
      sendConfirmation: true,
      channels: ['EMAIL', 'SMS'],
    },
  };
}

function testPaymentInitiation(baseUrl, paymentEndpoint) {
  const url = `${baseUrl}${paymentEndpoint}/initiate`;
  const paymentRequest = generatePaymentRequest();
  
  const payload = JSON.stringify(paymentRequest);
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
      'X-Idempotency-Key': `payment-${__VU}-${__ITER}-${Date.now()}`,
    },
    timeout: '45s',
  };
  
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  
  paymentInitiationDuration.add(duration);
  transactionVolume.add(paymentRequest.amount);
  
  const success = check(response, {
    'Payment Initiation: Status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'Payment Initiation: Has payment ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.paymentId !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Payment Initiation: Has transaction reference': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.transactionReference !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Payment Initiation: Response time < 3s': (r) => r.timings.duration < 3000,
    'Payment Initiation: Valid amount': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.amount === paymentRequest.amount;
      } catch (e) {
        return false;
      }
    },
  });
  
  paymentSuccessRate.add(success);
  
  if (success) {
    successfulPayments.add(1);
    averageTransactionValue.add(paymentRequest.amount);
    
    try {
      const body = JSON.parse(response.body);
      return {
        paymentId: body.data.paymentId,
        transactionReference: body.data.transactionReference,
        status: body.data.status,
        amount: paymentRequest.amount,
      };
    } catch (e) {
      paymentErrors.add(1);
      return null;
    }
  } else {
    failedPayments.add(1);
    paymentErrors.add(1);
    logResponse(response, 'PAYMENT_INITIATION_FAILED');
    return null;
  }
}

function testPaymentStatus(baseUrl, paymentEndpoint, paymentId) {
  const url = `${baseUrl}${paymentEndpoint}/${paymentId}/status`;
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '15s',
  };
  
  const startTime = Date.now();
  const response = http.get(url, params);
  const duration = Date.now() - startTime;
  
  paymentStatusDuration.add(duration);
  
  const success = check(response, {
    'Payment Status: Status is 200': (r) => r.status === 200,
    'Payment Status: Has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && TRANSACTION_STATUSES.includes(body.data.status);
      } catch (e) {
        return false;
      }
    },
    'Payment Status: Response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  paymentSuccessRate.add(success);
  
  if (!success) {
    paymentErrors.add(1);
  }
}

function testPaymentConfirmation(baseUrl, paymentEndpoint, paymentId) {
  const url = `${baseUrl}${paymentEndpoint}/${paymentId}/confirm`;
  
  const payload = JSON.stringify({
    confirmationCode: `CONF-${Math.random().toString(36).substring(7)}`,
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  });
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '30s',
  };
  
  const response = http.post(url, payload, params);
  
  check(response, {
    'Payment Confirmation: Status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'Payment Confirmation: Response time < 2s': (r) => r.timings.duration < 2000,
  });
}

function testTransactionHistory(baseUrl, paymentEndpoint) {
  const url = `${baseUrl}${paymentEndpoint}/history`;
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '15s',
  };
  
  const response = http.get(url, params);
  
  check(response, {
    'Transaction History: Status is 200': (r) => r.status === 200,
    'Transaction History: Has transactions array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data.transactions);
      } catch (e) {
        return false;
      }
    },
    'Transaction History: Response time < 2s': (r) => r.timings.duration < 2000,
  });
}

function testRefundProcessing(baseUrl, paymentEndpoint, paymentId, amount) {
  const url = `${baseUrl}${paymentEndpoint}/${paymentId}/refund`;
  
  const refundAmount = (amount * 0.5).toFixed(2);
  
  const payload = JSON.stringify({
    amount: parseFloat(refundAmount),
    reason: 'LOAD_TEST_REFUND',
    description: 'Automated refund from load test',
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
    },
  });
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '45s',
  };
  
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  
  refundDuration.add(duration);
  
  const success = check(response, {
    'Refund: Status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'Refund: Has refund ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.refundId !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Refund: Response time < 4s': (r) => r.timings.duration < 4000,
  });
  
  paymentSuccessRate.add(success);
  
  if (!success) {
    paymentErrors.add(1);
    logResponse(response, 'REFUND_FAILED');
  }
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('PAYMENT SERVICE LOAD TEST COMPLETED');
  console.log(`Test Duration: ${(Date.now() - data.startTime) / 1000} seconds`);
  console.log('='.repeat(60));
}

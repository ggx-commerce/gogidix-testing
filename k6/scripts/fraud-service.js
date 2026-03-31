/**
 * Fraud Detection Service Load Testing
 * Financial-Grade Fraud Detection Testing for Gogidix Platform
 * 
 * Test Scenarios:
 * - Transaction Analysis
 * - Pattern Detection
 * - Risk Scoring
 * - Real-time Alerts
 * - Historical Analysis
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
const fraudAnalysisRate = new Rate('fraud_analysis_success_rate');
const analysisDuration = new Trend('fraud_analysis_duration');
const riskScoreDuration = new Trend('risk_score_duration');
const patternDetectionDuration = new Trend('pattern_detection_duration');
const highRiskTransactions = new Counter('high_risk_transactions');
const mediumRiskTransactions = new Counter('medium_risk_transactions');
const lowRiskTransactions = new Counter('low_risk_transactions');
const fraudAlerts = new Counter('fraud_alerts');
const analysisErrors = new Counter('analysis_errors');

// Test Configuration
export const options = {
  ...DEFAULT_OPTIONS.load,
  thresholds: {
    ...DEFAULT_OPTIONS.load.thresholds,
    fraud_analysis_success_rate: ['rate>0.98'],
    fraud_analysis_duration: ['p(95)<2000', 'p(99)<3000'],
    risk_score_duration: ['p(95)<500'],
  },
};

// Risk Levels
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Transaction Types
const TRANSACTION_TYPES = [
  'PURCHASE',
  'REFUND',
  'TRANSFER',
  'WITHDRAWAL',
  'DEPOSIT',
  'PAYMENT',
];

// Device Fingerprints
const DEVICE_FINGERPRINTS = [
  'fp_001_android_samsung',
  'fp_002_ios_iphone',
  'fp_003_web_chrome',
  'fp_004_web_firefox',
  'fp_005_android_xiaomi',
];

// Geographic Locations
const LOCATIONS = [
  { country: 'US', city: 'New York', lat: 40.7128, lng: -74.0060 },
  { country: 'NG', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { country: 'KE', city: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { country: 'GB', city: 'London', lat: 51.5074, lng: -0.1278 },
  { country: 'GH', city: 'Accra', lat: 5.6037, lng: -0.1870 },
];

let authToken = '';

export function setup() {
  console.log('='.repeat(60));
  console.log('GOGIDIX FRAUD DETECTION SERVICE LOAD TEST');
  console.log('='.repeat(60));
  console.log(`Base URL: ${getBaseUrl()}`);
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log('Financial-Grade Testing: Fraud Detection');
  console.log('='.repeat(60));
  
  const token = authenticateUser();
  if (token) {
    authToken = token;
  }
  
  return { startTime: Date.now(), token: authToken };
}

export default function (data) {
  const baseUrl = getBaseUrl();
  const fraudEndpoint = getServiceEndpoint('fraud');
  
  if (!authToken && data.token) {
    authToken = data.token;
  }
  
  // Test 1: Real-time Transaction Analysis
  const analysisResult = testTransactionAnalysis(baseUrl, fraudEndpoint);
  
  // Test 2: Risk Score Calculation
  if (analysisResult) {
    testRiskScoreCalculation(baseUrl, fraudEndpoint, analysisResult.transactionId);
  }
  
  // Test 3: Pattern Detection
  testPatternDetection(baseUrl, fraudEndpoint);
  
  // Test 4: Historical Analysis (periodic)
  if (__ITER % 10 === 5) {
    testHistoricalAnalysis(baseUrl, fraudEndpoint);
  }
  
  // Test 5: Alert Management
  if (__ITER % 15 === 0 && analysisResult && analysisResult.riskLevel === 'HIGH') {
    testAlertManagement(baseUrl, fraudEndpoint, analysisResult.transactionId);
  }
  
  sleepWithJitter(1.5, 0.5);
}

function authenticateUser() {
  const baseUrl = getBaseUrl();
  const authEndpoint = getServiceEndpoint('auth');
  const url = `${baseUrl}${authEndpoint}/login`;
  
  const payload = JSON.stringify({
    email: 'fraud.analyst@gogidix.com',
    password: 'FraudAnalyst@123',
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

function generateTransactionForAnalysis() {
  const amount = (Math.random() * 50000 + 10).toFixed(2);
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const deviceFingerprint = DEVICE_FINGERPRINTS[Math.floor(Math.random() * DEVICE_FINGERPRINTS.length)];
  const transactionType = TRANSACTION_TYPES[Math.floor(Math.random() * TRANSACTION_TYPES.length)];
  
  // Introduce some suspicious patterns occasionally
  const isSuspicious = Math.random() < 0.05;
  
  return {
    transactionId: `txn_${Date.now()}_${__VU}_${__ITER}`,
    userId: `user_${__VU}`,
    merchantId: `merchant_${Math.floor(Math.random() * 1000)}`,
    amount: parseFloat(amount),
    currency: 'USD',
    transactionType: transactionType,
    timestamp: new Date().toISOString(),
    deviceFingerprint: deviceFingerprint,
    ipAddress: isSuspicious ? '192.168.100.100' : `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    location: {
      country: location.country,
      city: location.city,
      latitude: location.lat,
      longitude: location.lng,
    },
    paymentMethod: {
      type: Math.random() > 0.3 ? 'CARD' : 'BANK_TRANSFER',
      lastFourDigits: Math.floor(Math.random() * 9000 + 1000).toString(),
      issuer: ['VISA', 'MASTERCARD', 'VERVE', 'AMEX'][Math.floor(Math.random() * 4)],
    },
    metadata: {
      channel: ['WEB', 'MOBILE', 'API', 'POS'][Math.floor(Math.random() * 4)],
      sessionId: `session_${Date.now()}`,
      userAgent: 'GogidixLoadTest/1.0',
      velocityCheck: {
        transactionsLastHour: Math.floor(Math.random() * 10),
        transactionsLastDay: Math.floor(Math.random() * 50),
        averageTransactionAmount: Math.floor(Math.random() * 500 + 50),
      },
    },
    behavioralData: {
      typingPattern: Math.random().toString(36).substring(7),
      mouseMovements: Math.floor(Math.random() * 1000),
      scrollDepth: Math.floor(Math.random() * 100),
      timeOnPage: Math.floor(Math.random() * 300 + 10),
    },
    isSuspiciousTest: isSuspicious,
    requestMetadata: {
      requestId: generateRequestId(),
      correlationId: generateCorrelationId(),
      timestamp: new Date().toISOString(),
    },
  };
}

function testTransactionAnalysis(baseUrl, fraudEndpoint) {
  const url = `${baseUrl}${fraudEndpoint}/analyze`;
  const transaction = generateTransactionForAnalysis();
  
  const payload = JSON.stringify(transaction);
  
  const params = {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${authToken}`,
      'X-Priority': transaction.isSuspiciousTest ? 'HIGH' : 'NORMAL',
    },
    timeout: '30s',
  };
  
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  
  analysisDuration.add(duration);
  
  const success = check(response, {
    'Fraud Analysis: Status is 200': (r) => r.status === 200,
    'Fraud Analysis: Has risk score': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && typeof body.data.riskScore === 'number';
      } catch (e) {
        return false;
      }
    },
    'Fraud Analysis: Has risk level': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && RISK_LEVELS.includes(body.data.riskLevel);
      } catch (e) {
        return false;
      }
    },
    'Fraud Analysis: Has recommendation': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.recommendation !== undefined;
      } catch (e) {
        return false;
      }
    },
    'Fraud Analysis: Response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  fraudAnalysisRate.add(success);
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      
      // Track risk level distribution
      switch (body.data.riskLevel) {
        case 'HIGH':
        case 'CRITICAL':
          highRiskTransactions.add(1);
          fraudAlerts.add(1);
          break;
        case 'MEDIUM':
          mediumRiskTransactions.add(1);
          break;
        case 'LOW':
        default:
          lowRiskTransactions.add(1);
      }
      
      return {
        transactionId: transaction.transactionId,
        riskScore: body.data.riskScore,
        riskLevel: body.data.riskLevel,
        recommendation: body.data.recommendation,
      };
    } catch (e) {
      analysisErrors.add(1);
      return null;
    }
  } else {
    analysisErrors.add(1);
    logResponse(response, 'FRAUD_ANALYSIS_FAILED');
    return null;
  }
}

function testRiskScoreCalculation(baseUrl, fraudEndpoint, transactionId) {
  const url = `${baseUrl}${fraudEndpoint}/risk-score/${transactionId}`;
  
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
  
  riskScoreDuration.add(duration);
  
  check(response, {
    'Risk Score: Status is 200': (r) => r.status === 200,
    'Risk Score: Valid score range': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.score >= 0 && body.data.score <= 100;
      } catch (e) {
        return false;
      }
    },
    'Risk Score: Response time < 500ms': (r) => r.timings.duration < 500,
  });
}

function testPatternDetection(baseUrl, fraudEndpoint) {
  const url = `${baseUrl}${fraudEndpoint}/patterns/detect`;
  
  const payload = JSON.stringify({
    userId: `user_${__VU}`,
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    patternTypes: ['VELOCITY', 'GEOGRAPHIC', 'AMOUNT', 'BEHAVIORAL'],
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
    timeout: '20s',
  };
  
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  
  patternDetectionDuration.add(duration);
  
  check(response, {
    'Pattern Detection: Status is 200': (r) => r.status === 200,
    'Pattern Detection: Has patterns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data.patterns);
      } catch (e) {
        return false;
      }
    },
    'Pattern Detection: Response time < 2s': (r) => r.timings.duration < 2000,
  });
}

function testHistoricalAnalysis(baseUrl, fraudEndpoint) {
  const url = `${baseUrl}${fraudEndpoint}/historical/analyze`;
  
  const payload = JSON.stringify({
    userId: `user_${__VU}`,
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    includePatterns: true,
    includeRiskTrends: true,
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
    'Historical Analysis: Status is 200': (r) => r.status === 200,
    'Historical Analysis: Has analysis data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
}

function testAlertManagement(baseUrl, fraudEndpoint, transactionId) {
  const url = `${baseUrl}${fraudEndpoint}/alerts`;
  
  const payload = JSON.stringify({
    transactionId: transactionId,
    alertType: 'HIGH_RISK_TRANSACTION',
    priority: 'HIGH',
    message: 'High risk transaction detected during load testing',
    metadata: {
      triggeredBy: 'LOAD_TEST',
      vuId: __VU,
      iteration: __ITER,
    },
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
    timeout: '15s',
  };
  
  const response = http.post(url, payload, params);
  
  check(response, {
    'Alert Creation: Status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('FRAUD DETECTION SERVICE LOAD TEST COMPLETED');
  console.log(`Test Duration: ${(Date.now() - data.startTime) / 1000} seconds`);
  console.log('='.repeat(60));
}

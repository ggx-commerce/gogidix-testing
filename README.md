# Gogidix Testing Infrastructure

> **Financial-Grade Load Testing Platform for the Gogidix Microservices Ecosystem**

[![Testing Pipeline](https://github.com/gogidix/gogidix-testing/actions/workflows/main-pipeline.yml/badge.svg)](https://github.com/gogidix/gogidix-testing/actions/workflows/main-pipeline.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](reports/coverage/)
[![k6](https://img.shields.io/badge/k6-0.47.0-purple)](https://k6.io/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Test Types](#test-types)
- [CI/CD Integration](#cicd-integration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Metrics & Reporting](#metrics--reporting)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

The **Gogidix Testing Infrastructure** is a dedicated, independent testing repository designed for comprehensive load testing of the Gogidix microservices platform. It provides financial-grade reliability testing with the following capabilities:

### Key Features

- ✅ **Multiple Test Types**: Load, Stress, Spike, Endurance, and Smoke tests
- ✅ **Service Coverage**: Authentication, Payment, Fraud Detection, User, Order, Product, Notification, and Analytics services
- ✅ **Financial-Grade Thresholds**: 98% success rate, P95 < 2s, P99 < 5s
- ✅ **Cloud-First Design**: Runs independently from main application
- ✅ **CI/CD Integration**: GitHub Actions workflows for automated testing
- ✅ **Comprehensive Reporting**: JSON, HTML, and real-time metrics
- ✅ **Scalable Architecture**: Supports distributed execution for high-volume testing

### Financial-Grade Requirements

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Error Rate | < 2% | Maximum acceptable error rate |
| P95 Latency | < 2,000ms | 95th percentile response time |
| P99 Latency | < 5,000ms | 99th percentile response time |
| Throughput | > 100 req/s | Minimum requests per second |
| Availability | > 99.9% | Target system uptime |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Gogidix Testing Infrastructure               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   GitHub    │    │   k6 Test   │    │   Reports   │         │
│  │   Actions   │───▶│   Runner    │───▶│   Storage   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                   │                │
│         │                  ▼                   │                │
│         │          ┌─────────────┐             │                │
│         │          │  Gogidix    │             │                │
│         │          │  Services   │             │                │
│         │          └─────────────┘             │                │
│         │                                      │                │
│         └──────────────────────────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **k6 Test Scripts** - Load testing scenarios written in JavaScript
2. **Environment Configs** - Environment-specific configuration files
3. **Test Data** - JSON datasets for realistic simulation
4. **Execution Scripts** - Shell scripts for test orchestration
5. **CI/CD Workflows** - GitHub Actions for automation
6. **Report Generator** - HTML/JSON report generation

---

## 📁 Repository Structure

```
gogidix-testing/
├── .github/
│   └── workflows/
│       ├── main-pipeline.yml      # Main CI/CD pipeline
│       └── post-deploy.yml        # Post-deployment tests
│
├── k6/
│   ├── lib/
│   │   └── config.js              # Shared configuration
│   └── scripts/
│       ├── auth-service.js        # Authentication tests
│       ├── payment-service.js     # Payment tests
│       ├── fraud-service.js       # Fraud detection tests
│       └── core-services.js       # Core services tests
│
├── environments/
│   ├── dev.env                    # Development config
│   ├── staging.env                # Staging config
│   └── prod.env                   # Production config
│
├── test-data/
│   └── test-data.json             # Test datasets
│
├── scripts/
│   ├── run-tests.sh               # Main execution script
│   ├── quick-run.sh               # Quick test runner
│   └── generate-report.sh         # Report generator
│
├── reports/                       # Generated reports
│   ├── load/
│   ├── smoke/
│   └── coverage/
│
├── config/                        # Configuration files
├── jmeter/                        # JMeter scripts (optional)
│
└── README.md                      # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **k6** >= 0.47.0
- **Node.js** >= 18 (for script validation)
- **Bash** shell environment

### One-Line Quick Test

```bash
# Clone and run smoke tests
git clone https://github.com/gogidix/gogidix-testing.git && \
cd gogidix-testing && \
./scripts/run-tests.sh -e dev -t smoke
```

### Manual Installation

```bash
# Install k6 on macOS
brew install k6

# Install k6 on Ubuntu/Debian
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747667E0C07BAC51E070E4A62EBDC5BF8
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Install k6 on Windows
choco install k6
```

---

## ⚙️ Configuration

### Environment Variables

Each environment file (`dev.env`, `staging.env`, `prod.env`) contains:

```bash
# Base URL for the API Gateway
BASE_URL=https://dev-api.gogidix.com

# Authentication Service
AUTH_SERVICE_ENDPOINT=/api/v1/auth
AUTH_TOKEN=${DEV_AUTH_TOKEN}

# Payment Service
PAYMENT_SERVICE_ENDPOINT=/api/v1/payments

# Fraud Detection Service
FRAUD_SERVICE_ENDPOINT=/api/v1/fraud-detection

# Additional services...
```

### Creating a New Environment

1. Copy an existing environment file:
   ```bash
   cp environments/dev.env environments/new.env
   ```

2. Update the configuration values

3. Run tests with the new environment:
   ```bash
   ./scripts/run-tests.sh -e new -t load
   ```

### Test Data Configuration

The `test-data/test-data.json` file contains:
- Test user credentials
- Merchant data
- Product catalogs
- Payment method configurations
- Device profiles
- Geographic locations
- Fraud patterns

---

## 🧪 Test Types

### 1. Load Test

**Purpose**: Simulate normal to peak expected load

```bash
./scripts/run-tests.sh -e dev -t load
```

**Configuration**:
- 2 min warm-up: 0 → 100 users
- 5 min ramp-up: 100 → 200 users
- 2 min peak: 200 → 300 users
- 2 min ramp-down: 300 → 100 users
- 1 min cool-down: 100 → 0 users

**Thresholds**:
- Error rate < 2%
- P95 latency < 2,000ms
- Throughput > 100 req/s

---

### 2. Stress Test

**Purpose**: Find system breaking points

```bash
./scripts/run-tests.sh -e dev -t stress
```

**Configuration**:
- Gradual increase to 1,000+ users
- Hold at breaking point
- Monitor degradation patterns

**Thresholds**:
- Error rate < 5%
- P95 latency < 5,000ms

---

### 3. Spike Test

**Purpose**: Test sudden traffic bursts

```bash
./scripts/run-tests.sh -e dev -t spike
```

**Configuration**:
- 100 users baseline
- 5-second spike to 1,000 users
- Return to baseline
- Repeat cycle

**Thresholds**:
- Error rate < 3%
- P95 latency < 3,000ms

---

### 4. Endurance Test

**Purpose**: Long-running stability test

```bash
./scripts/run-tests.sh -e dev -t endurance
```

**Configuration**:
- 60 minutes sustained load
- 100 concurrent users
- Monitor for memory leaks

**Thresholds**:
- Error rate < 1%
- No memory leaks
- Consistent response times

---

### 5. Smoke Test

**Purpose**: Quick health validation

```bash
./scripts/run-tests.sh -e dev -t smoke
```

**Configuration**:
- 1 minute warm-up
- 10 concurrent users
- Basic health checks

**Thresholds**:
- Error rate < 1%
- P95 latency < 1,000ms

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The repository includes comprehensive CI/CD workflows:

#### Main Pipeline Stages

```yaml
1. Setup & Validation
   └─ Environment validation
   └─ Configuration check

2. Compile & Build
   └─ Script syntax validation
   └─ k6 archive creation

3. Unit Tests
   └─ Configuration validation tests
   └─ Script structure tests

4. Build JAR Artifacts
   └─ Create distribution package
   └─ Generate checksums

5. Smoke Tests
   └─ Health check validation
   └─ Connectivity tests

6. Coverage Analysis
   └─ Script coverage calculation
   └─ Quality gate validation

7. Load Tests
   └─ Execute load test scenarios
   └─ Collect metrics

8. Report Generation
   └─ HTML report creation
   └─ Summary generation
```

### Manual Trigger

```bash
# Trigger via GitHub CLI
gh workflow run main-pipeline.yml \
  -f environment=staging \
  -f test_type=load \
  -f service=all
```

### Integration with Main Repository

The testing infrastructure can be triggered from the main Gogidix platform repository:

```yaml
# In gogidix-platform repository
- name: Trigger Tests
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.repos.createRepositoryDispatch({
        owner: 'gogidix',
        repo: 'gogidix-testing',
        event_type: 'deployment-completed',
        client_payload: {
          environment: 'staging',
          deployment_id: '${{ steps.deploy.outputs.deployment_id }}',
          commit_sha: '${{ github.sha }}'
        }
      });
```

---

## 📊 Usage Examples

### Run All Tests for an Environment

```bash
./scripts/quick-run.sh staging
```

### Run Specific Service Tests

```bash
# Auth service only
./scripts/run-tests.sh -e dev -t load -s auth

# Payment service only
./scripts/run-tests.sh -e staging -t stress -s payment
```

### Run with Custom Parameters

```bash
# Override users count
./scripts/run-tests.sh -e dev -t load -u 500

# Custom output directory
./scripts/run-tests.sh -e staging -t load -o custom-reports/

# Verbose output
./scripts/run-tests.sh -e dev -t load -v
```

### Generate Reports

```bash
# Generate HTML report
./scripts/generate-report.sh dev

# View latest results
open reports/test-report-latest.html
```

---

## 📈 Metrics & Reporting

### Available Metrics

| Metric | Description |
|--------|-------------|
| `http_req_duration` | HTTP request latency |
| `http_req_failed` | Failed request rate |
| `http_reqs` | Request throughput |
| `iterations` | Test iteration count |
| `data_received` | Data received (bytes) |
| `data_sent` | Data sent (bytes) |

### Custom Metrics

Each service test includes custom metrics:

#### Authentication Service
- `auth_success_rate` - Authentication success rate
- `login_duration` - Login operation duration
- `token_refresh_duration` - Token refresh duration
- `session_validation_duration` - Session validation duration

#### Payment Service
- `payment_success_rate` - Payment success rate
- `payment_initiation_duration` - Payment initiation duration
- `transaction_volume` - Total transaction volume
- `average_transaction_value` - Average transaction value

#### Fraud Detection Service
- `fraud_analysis_success_rate` - Analysis success rate
- `fraud_analysis_duration` - Analysis duration
- `high_risk_transactions` - High-risk transaction count
- `fraud_alerts` - Fraud alerts triggered

### Report Formats

1. **JSON Reports** - Raw test data for analysis
2. **HTML Reports** - Visual dashboard for stakeholders
3. **InfluxDB Export** - Time-series metrics storage
4. **Prometheus Export** - Metrics for monitoring systems

### Grafana Integration

To visualize metrics in Grafana:

1. Configure InfluxDB data source
2. Import the provided dashboard (see `config/grafana-dashboard.json`)
3. Configure alerts based on thresholds

---

## ✅ Best Practices

### 1. Environment Configuration

- ✅ Use separate tokens for each environment
- ✅ Never commit production tokens
- ✅ Use environment variables for secrets
- ✅ Validate configuration before tests

### 2. Test Execution

- ✅ Run smoke tests before load tests
- ✅ Start with lower user counts
- ✅ Monitor system resources during tests
- ✅ Allow cooling periods between tests

### 3. Performance Optimization

- ✅ Use `sleep()` with jitter for realistic behavior
- ✅ Implement think time between operations
- ✅ Avoid creating objects in loops
- ✅ Use shared connections where possible

### 4. Reporting

- ✅ Archive all test results
- ✅ Include environment metadata
- ✅ Generate reports immediately after tests
- ✅ Compare results across runs

---

## 🔧 Troubleshooting

### Common Issues

#### 1. k6 Installation Fails

```bash
# Try alternative installation
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xz
sudo mv k6-*/k6 /usr/local/bin/
```

#### 2. Connection Refused

```bash
# Check if target service is running
curl -v https://dev-api.gogidix.com/actuator/health

# Verify BASE_URL in environment file
cat environments/dev.env | grep BASE_URL
```

#### 3. High Error Rate

```bash
# Run with verbose output to diagnose
./scripts/run-tests.sh -e dev -t smoke -v

# Check individual service health
curl https://dev-api.gogidix.com/api/v1/auth/health
```

#### 4. Memory Issues

```bash
# Reduce concurrency
./scripts/run-tests.sh -e dev -t load -u 50

# Use smaller test data subsets
export TEST_DATA_FILE=test-data/small-dataset.json
```

---

## 🤝 Contributing

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/gogidix-testing.git
cd gogidix-testing

# Create feature branch
git checkout -b feature/new-test-scenario

# Make changes and test
./scripts/run-tests.sh -e dev -t smoke

# Commit and push
git commit -am "Add new test scenario"
git push origin feature/new-test-scenario

# Create pull request
```

### Coding Standards

- Use JavaScript ES6+ syntax
- Follow existing script patterns
- Include comprehensive checks
- Add custom metrics where appropriate
- Document new scenarios

---

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 📞 Support

- **Documentation**: [docs.gogidix.com/testing](https://docs.gogidix.com/testing)
- **Issues**: [GitHub Issues](https://github.com/gogidix/gogidix-testing/issues)
- **Slack**: #testing-infrastructure

---

<div align="center">

**Built with ❤️ by the Gogidix Team**

[⬆ Back to Top](#gogidix-testing-infrastructure)

</div>

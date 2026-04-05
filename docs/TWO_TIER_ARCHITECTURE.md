# Two-Tier Testing Architecture
## Gogidix Ecosystem CI/CD

**Version**: 1.0
**Last Updated**: 2026-04-05
**Purpose**: Centralized testing infrastructure for all domains

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    gogidix-testing Repository                       │
│  Purpose: Centralized testing infrastructure for ALL services        │
│                                                                     │
│  Workflows:                                                          │
│  ├── financial-grade-test.yml    (Tier 1: Security/Payment/Risk)   │
│  └── enterprise-grade-test.yml    (Tier 2: Customer/Analytics/Ops) │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Main Repository CI/CD (per domain)                     │
│  Purpose: Deployment gates with quality checks                      │
│                                                                     │
│  Pipeline Stages:                                                   │
│  1. Code Quality (SonarQube, SpotBugs, Checkstyle)                 │
│  2. Security Scan (OWASP, Snyk, Trivy)                             │
│  3. Dependency Validation                                          │
│  4. Integration Tests (via gogidix-testing)                        │
│  5. Deployment (staging → production)                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tier Classification

### Tier 1: Financial-Grade (Critical Services)

**Use for**: Security, payments, risk, compliance, financial transactions

| Criteria | Threshold |
|----------|-----------|
| Line Coverage | 85% |
| Branch Coverage | 75% |
| Mutation Coverage | 60% |
| Test Types | Unit + Integration + Mutation |

**Service Patterns** (apply to all domains):
- `*-fraud-*`, `*-security-*`, `*-auth-*`
- `payment-*`, `transaction-*`, `settlement-*`
- `risk-*`, `compliance-*`, `aml-*`, `kyc-*`
- `accounting-*`, `ledger-*`, `billing-*`, `invoice-*`

**Workflow**: `financial-grade-test.yml`

### Tier 2: Enterprise-Grade (Standard Services)

**Use for**: Customer experience, analytics, operational services

| Criteria | Threshold |
|----------|-----------|
| Line Coverage | 70% |
| Branch Coverage | 60% |
| Mutation Coverage | Not required |
| Test Types | Unit + Integration |

**Service Patterns** (apply to all domains):
- `*-engagement-*`, `*-experience-*`, `*-interaction-*`
- `*-analytics-*`, `*-insights-*`, `*-reporting-*`
- `*-notification-*`, `*-monitoring-*`, `*-logging-*`
- `*-content-*`, `*-document-*`, `*-messaging-*`

**Workflow**: `enterprise-grade-test.yml`

---

## Usage

### Via GitHub CLI

```bash
# Tier 1: Financial-Grade Test
gh workflow run financial-grade-test.yml \
  -f domain=shared-business-logics \
  -f service_path=ai-services/Backend/Java/security-fraud-prevention/ai-fraud-detection-service \
  -f branch=dev \
  -f run_mutation=true

# Tier 2: Enterprise-Grade Test
gh workflow run enterprise-grade-test.yml \
  -f domain=shared-business-logics \
  -f service_path=ai-services/Backend/Java/customer-experience/ai-translation-service \
  -f branch=dev
```

### Via Repository Dispatch

```bash
# From any domain repository
curl -X POST \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/ggx-commerce/gogidix-testing/dispatches \
  -d '{
    "event_type": "financial-grade-test",
    "client_payload": {
      "domain": "shared-business-logics",
      "service_path": "ai-services/Backend/Java/security-fraud-prevention/ai-fraud-detection-service",
      "branch": "dev"
    }
  }'
```

---

## Required Secrets

Configure these secrets in `gogidix-testing` repository:

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `PAT_TOKEN` | GitHub Packages authentication | All workflows |
| `MAIN_REPO_TOKEN` | Access to domain repositories | All workflows |

---

## Domain Repositories

| Domain | Repository | Services Count |
|--------|------------|----------------|
| shared-business-logics | ggx-commerce/shared-business-logics | ~60 |
| shared-business-infrastructure | ggx-commerce/shared-business-infrastructure | ~40 |
| Public-User-Domain | ggx-commerce/Public-User-Domain | ~150 |
| Foundation-domain | ggx-commerce/gogidix-foundation-domain | ~20 |
| Business-domain | ggx-commerce/Business-domain | ~30 |
| Management-domain | ggx-commerce/Management-domain | ~40 |

**Total**: ~340+ services across 6 domains

---

## Service pom.xml Configuration

### Tier 1: Financial-Grade Template

```xml
<properties>
    <fg.line.minimum>85</fg.line.minimum>
    <fg.branch.minimum>75</fg.branch.minimum>
    <fg.mutation.minimum>60</fg.mutation.minimum>
    <surefire.heap.max>1024m</surefire.heap.max>
    <pitest.heap.max>1024m</pitest.heap.max>
</properties>
```

### Tier 2: Enterprise-Grade Template

```xml
<properties>
    <eg.line.minimum>70</eg.line.minimum>
    <eg.branch.minimum>60</eg.branch.minimum>
    <pitest.skip>true</pitest.skip>
    <surefire.heap.max>512m</surefire.heap.max>
</properties>
```

---

## Status Tracking

See [DOMAIN_CLASSIFICATION_MATRIX.md](https://github.com/ggx-commerce/shared-business-logics/blob/main/docs/DOMAIN_CLASSIFICATION_MATRIX.md) for complete service classification.

---

## Support

- **Issues**: https://github.com/ggx-commerce/gogidix-testing/issues
- **Contact**: shared-business-logics (lead domain for testing)

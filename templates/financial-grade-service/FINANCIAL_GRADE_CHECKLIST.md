# Financial-Grade Testing Checklist

**Service**: _________________
**Developer**: _________________
**Date**: _________________

---

## COVERAGE REQUIREMENTS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Line Coverage | ≥ 85% | ___% | ☐ |
| Branch Coverage | ≥ 75% | ___% | ☐ |
| Mutation Score | ≥ 60% | ___% | ☐ |

---

## POM.XML CONFIGURATION

☐ `<fg.line.minimum>0.85</fg.line.minimum>`
☐ `<fg.branch.minimum>0.75</fg.branch.minimum>`
☐ `<fg.mutation.minimum>60</fg.mutation.minimum>`
☐ Memory config: `<surefire.heap.max>1024m</surefire.heap.max>`
☐ Memory config: `<pitest.heap.max>1024m</pitest.heap.max>`
☐ Test timeout: `<surefire.timeout>300</surefire.timeout>`
☐ JaCoCo exclusions configured
☐ PIT targetClasses configured correctly

---

## TEST STRUCTURE

### Unit Tests
☐ `src/test/java/unit/`
☐ Service layer tests (all methods)
☐ Domain model tests (all entities)
☐ Domain policy tests (all rules)
☐ Repository tests (all data access)
☐ Mapper tests (all transformations)

### Integration Tests
☐ `src/test/java/integration/`
☐ Controller tests (all endpoints)
☐ End-to-end flow tests
☐ Database integration tests
☐ External service integration tests

### Architecture Tests (Financial-Grade Only)
☐ `src/test/java/architecture/`
☐ Layer dependency rules
☐ Domain isolation rules
☐ No framework leakage to domain

### Security Tests (Financial-Grade Only)
☐ `src/test/java/security/`
☐ Authentication tests
☐ Authorization tests
☐ Input validation tests
☐ Output sanitization tests

### Observability Tests (Financial-Grade Only)
☐ `src/test/java/observability/`
☐ Metrics collection tests
☐ SLO compliance tests
☐ Latency threshold tests

---

## TEST QUALITY CHECKS

### Coverage Quality
☐ All critical paths tested
☐ All edge cases tested
☐ All error paths tested
☐ All boundary conditions tested

### Test Maintainability
☐ Tests use descriptive names
☐ Tests follow AAA pattern (Arrange-Act-Assert)
☐ Tests use builders/factories for test data
☐ Tests are independent (no shared state)

### Mock Usage
☐ External services mocked
☐ Database mocked for unit tests
☐ Time/UUID deterministic in tests
☐ Mock assertions verified

---

## EXECUTION STEPS

### 1. Compile
```bash
mvn clean compile
```
☐ Compiles without errors
☐ No compilation warnings

### 2. Unit Tests
```bash
mvn test
```
☐ All tests pass
☐ No test failures
☐ No test errors

### 3. Coverage Report
```bash
mvn test jacoco:report
```
☐ Report generated at `target/site/jacoco/index.html`
☐ Line coverage ≥ 85%
☐ Branch coverage ≥ 75%

### 4. Coverage Check
```bash
mvn jacoco:check
```
☐ Check passes without failures

### 5. Full Verify
```bash
mvn verify -Pci
```
☐ All phases pass
☐ All artifacts generated

### 6. Mutation Testing (Financial-Grade Only)
```bash
mvn pitest:mutationCoverage
```
☐ Mutation score ≥ 60%
☐ All surviving mutations reviewed

### 7. Certification (Financial-Grade Only)
```bash
mvn verify -Pcertification
```
☐ Full certification passes

---

## DOCUMENTATION

☐ Service README updated with test instructions
☐ Test documentation added
☐ Coverage report linked in README
☐ Known gaps documented

---

## SIGN-OFF

### Developer
☐ All checks completed
☐ Coverage thresholds met
☐ Ready for code review

**Signature**: _________________ **Date**: _________

### Code Reviewer
☐ Test quality reviewed
☐ Coverage verified
☐ Test structure approved

**Signature**: _________________ **Date**: _________

### QA Approval
☐ All tests pass in CI
☐ Coverage report verified
☐ Service approved for deployment

**Signature**: _________________ **Date**: _________

---

## NOTES

Test Results URL: _____________________________
Coverage Report URL: _____________________________
Mutation Report URL: _____________________________

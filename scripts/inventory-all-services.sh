#!/bin/bash
#
# Service Inventory Script
# Scans all domains and categorizes services by implementation status
#
# Usage: ./inventory-all-services.sh <ecosystem-root-path>
#

set -e

ECOSYSTEM_ROOT="${1:-/c/Users/TEMP.LAPTOP-1QDBFFCA/Desktop/Gogidix-ecosystem/x-gogidix-domain}"
OUTPUT_DIR="$(dirname "$0")/../reports"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/service-inventory-${TIMESTAMP}.json"
SUMMARY_FILE="$OUTPUT_DIR/inventory-summary-${TIMESTAMP}.md"

echo "========================================="
echo "Service Inventory & Categorization"
echo "========================================="
echo "Ecosystem Root: $ECOSYSTEM_ROOT"
echo "Output: $OUTPUT_FILE"
echo ""

# Domains to scan
declare -A DOMAINS=(
  ["shared-business-logics"]="shared-business-logics"
  ["shared-business-infrastructure"]="shared-business-infrastructure"
  ["Public-User-Domain"]="Public-User-Domain"
  ["Foundation-domain"]="Foundation-domain"
  ["Business-domain"]="Business-domain"
  ["Management-domain"]="Management-domain"
)

# Service patterns for tier classification
FINANCIAL_PATTERNS="fraud|security|auth|payment|transaction|settlement|billing|invoice|accounting|ledger|risk|compliance|aml|kyc|audit|policy|governance"

# Counters
declare -A CATEGORY_COUNT
CATEGORY_COUNT[A]=0
CATEGORY_COUNT[B]=0
CATEGORY_COUNT[C]=0
CATEGORY_COUNT[D]=0
CATEGORY_COUNT[TOTAL]=0

declare -A TIER_COUNT
TIER_COUNT[FINANCIAL]=0
TIER_COUNT[ENTERPRISE]=0

# Start JSON output
echo "[" > "$OUTPUT_FILE"

DOMAIN_COUNT=0
for DOMAIN_KEY in "${!DOMAINS[@]}"; do
  DOMAIN="${DOMAINS[$DOMAIN_KEY]}"
  DOMAIN_PATH="$ECOSYSTEM_ROOT/$DOMAIN"

  echo "Scanning domain: $DOMAIN"

  if [[ ! -d "$DOMAIN_PATH" ]]; then
    echo "  ⚠️  Directory not found: $DOMAIN_PATH"
    continue
  fi

  # Find all services (directories with pom.xml or package.json)
  SERVICES=$(find "$DOMAIN_PATH" -name "pom.xml" -o -name "package.json" 2>/dev/null | while read file; do
    # Get parent directory name (service name)
    SERVICE_DIR=$(dirname "$file")
    # Navigate up to find the actual service root
    while [[ "$SERVICE_DIR" != "$DOMAIN_PATH" ]]; do
      if [[ -f "$SERVICE_DIR/pom.xml" ]] || [[ -f "$SERVICE_DIR/package.json" ]]; then
        basename "$SERVICE_DIR"
        break
      fi
      SERVICE_DIR=$(dirname "$SERVICE_DIR")
    done
  done | sort -u)

  SERVICE_COUNT=$(echo "$SERVICES" | grep -c "^" || true)
  echo "  Found $SERVICE_COUNT services"

  # Process each service
  FIRST=true
  for SERVICE in $SERVICES; do
    # Find service path
    SERVICE_PATH=$(find "$DOMAIN_PATH" -type d -name "$SERVICE" | head -1)

    if [[ -z "$SERVICE_PATH" ]]; then
      continue
    fi

    # Count Java files
    JAVA_COUNT=$(find "$SERVICE_PATH/src/main/java" -name "*.java" 2>/dev/null | wc -l)
    JAVA_COUNT=${JAVA_COUNT// /}

    # Count test files
    TEST_COUNT=$(find "$SERVICE_PATH/src/test" -name "*Test.java" -o -name "*Tests.java" 2>/dev/null | wc -l)
    TEST_COUNT=${TEST_COUNT// /}

    # Determine category
    CATEGORY=""
    STATUS=""
    BLOCKERS="[]"

    if [[ $JAVA_COUNT -eq 0 ]]; then
      CATEGORY="D"
      STATUS="EMPTY"
      CATEGORY_COUNT[D]=$((CATEGORY_COUNT[D] + 1))
    elif [[ $JAVA_COUNT -lt 5 ]]; then
      CATEGORY="C"
      STATUS="STUB"
      CATEGORY_COUNT[C]=$((CATEGORY_COUNT[C] + 1))
    elif [[ $TEST_COUNT -eq 0 ]]; then
      CATEGORY="B"
      STATUS="NO_TESTS"
      CATEGORY_COUNT[B]=$((CATEGORY_COUNT[B] + 1))
    else
      CATEGORY="A"
      STATUS="HAS_TESTS"
      CATEGORY_COUNT[A]=$((CATEGORY_COUNT[A] + 1))
    fi

    # Determine tier
    if echo "$SERVICE" | grep -qiE "$FINANCIAL_PATTERNS"; then
      TIER="Financial-Grade"
      TIER_COUNT[FINANCIAL]=$((TIER_COUNT[FINANCIAL] + 1))
    else
      TIER="Enterprise-Grade"
      TIER_COUNT[ENTERPRISE]=$((TIER_COUNT[ENTERPRISE] + 1))
    fi

    # Calculate relative path
    REL_PATH="${SERVICE_PATH#$ECOSYSTEM_ROOT/}"

    # Output JSON entry
    if [[ $FIRST == false ]]; then
      echo "," >> "$OUTPUT_FILE"
    fi
    FIRST=false

    cat >> "$OUTPUT_FILE" << EOJSON
  {
    "domain": "$DOMAIN",
    "service": "$SERVICE",
    "path": "$REL_PATH",
    "tier": "$TIER",
    "category": "$CATEGORY",
    "status": "$STATUS",
    "has_pom": $( [[ -f "$SERVICE_PATH/pom.xml" ]] && echo "true" || echo "false" ),
    "java_files": $JAVA_COUNT,
    "test_files": $TEST_COUNT,
    "coverage_current": "UNKNOWN",
    "coverage_target": $( [[ "$TIER" == "Financial-Grade" ]] && echo '"85/75/60"' || echo '"70/60"' ),
    "blockers": $BLOCKERS
  }
EOJSON

    CATEGORY_COUNT[TOTAL]=$((CATEGORY_COUNT[TOTAL] + 1))
  done

  DOMAIN_COUNT=$((DOMAIN_COUNT + 1))
done

# Close JSON array
echo "" >> "$OUTPUT_FILE"
echo "]" >> "$OUTPUT_FILE"

# Generate summary markdown
cat > "$SUMMARY_FILE" << EOMD
# Service Inventory Summary
**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Total Services**: ${CATEGORY_COUNT[TOTAL]}

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Services** | ${CATEGORY_COUNT[TOTAL]} |
| **Financial-Grade** | ${TIER_COUNT[FINANCIAL]} |
| **Enterprise-Grade** | ${TIER_COUNT[ENTERPRISE]} |
| **Category A (Has Tests)** | ${CATEGORY_COUNT[A]} |
| **Category B (No Tests)** | ${CATEGORY_COUNT[B]} |
| **Category C (Stub)** | ${CATEGORY_COUNT[C]} |
| **Category D (Empty)** | ${CATEGORY_COUNT[D]} |

---

## Category Breakdown

### Category A: Has Tests (${CATEGORY_COUNT[A]} services)
**Action**: Optimize coverage, add targeted tests

### Category B: No Tests (${CATEGORY_COUNT[B]} services)
**Action**: Generate full test suite automatically

### Category C: Stub (${CATEGORY_COUNT[C]} services)
**Action**: Complete implementation + generate tests

### Category D: Empty (${CATEGORY_COUNT[D]} services)
**Action**: Create service from template + tests

---

## Tier Distribution

### Financial-Grade (${TIER_COUNT[FINANCIAL]} services)
**Thresholds**: 85% line, 75% branch, 60% mutation

### Enterprise-Grade (${TIER_COUNT[ENTERPRISE]} services)
**Thresholds**: 70% line, 60% branch

---

## Domain Breakdown

$(for DOMAIN_KEY in "${!DOMAINS[@]}"; do
  echo "- **${DOMAINS[$DOMAIN_KEY]}**: Analysis in progress"
done)

---

## Next Actions

1. Review inventory JSON for accuracy
2. Prioritize Category A services (quickest wins)
3. Plan Category B/C/D transformation
4. Execute pilot on 5 services

---

**Full Inventory**: \`$(basename "$OUTPUT_FILE")\`
EOMD

echo ""
echo "========================================="
echo "Inventory Complete!"
echo "========================================="
echo "Total Services: ${CATEGORY_COUNT[TOTAL]}"
echo "  Category A (Has Tests):    ${CATEGORY_COUNT[A]}"
echo "  Category B (No Tests):     ${CATEGORY_COUNT[B]}"
echo "  Category C (Stub):         ${CATEGORY_COUNT[C]}"
echo "  Category D (Empty):         ${CATEGORY_COUNT[D]}"
echo ""
echo "Tier Distribution:"
echo "  Financial-Grade:  ${TIER_COUNT[FINANCIAL]}"
echo "  Enterprise-Grade: ${TIER_COUNT[ENTERPRISE]}"
echo ""
echo "Output Files:"
echo "  JSON: $OUTPUT_FILE"
echo "  Summary: $SUMMARY_FILE"
echo "========================================="

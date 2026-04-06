#!/bin/bash
#
# Test Generation Script
# Generates test scaffolds for services based on their structure
#
# Usage: ./generate-tests.sh <service-path> <tier>
#   tier: "financial" or "enterprise"
#

set -e

SERVICE_PATH="${1}"
TIER="${2:-enterprise}"

if [[ -z "$SERVICE_PATH" ]]; then
  echo "Usage: $0 <service-path> [tier]"
  echo "  tier: financial (85/75/60) or enterprise (70/60)"
  exit 1
fi

SERVICE_NAME=$(basename "$SERVICE_PATH")
SERVICE_PATH=$(cd "$SERVICE_PATH" && pwd)

echo "========================================="
echo "Test Generation"
echo "========================================="
echo "Service: $SERVICE_NAME"
echo "Path: $SERVICE_PATH"
echo "Tier: $TIER"
echo ""

# Determine package name
if [[ -f "$SERVICE_PATH/pom.xml" ]]; then
  # Java service
  GROUP_ID=$(grep -oP '(?<=<groupId>).*?(?=</groupId>)' "$SERVICE_PATH/pom.xml" | head -1)
  ARTIFACT_ID=$(grep -oP '(?<=<artifactId>).*?(?=</artifactId>)' "$SERVICE_PATH/pom.xml" | head -1)

  # Convert groupId to package path
  PACKAGE_NAME=$(echo "$GROUP_ID:$ARTIFACT_ID" | sed 'y/./_/' | tr '[:upper:]' '[:lower:]' | sed 's/_/./g')

  # Try to find actual package from source
  if [[ -d "$SERVICE_PATH/src/main/java" ]]; then
    FOUND_PACKAGE=$(find "$SERVICE_PATH/src/main/java" -type f -name "*.java" | head -1 | xargs grep -oP '(?<=package ).*?(?=;)' | head -1)
    if [[ -n "$FOUND_PACKAGE" ]]; then
      PACKAGE_NAME="$FOUND_PACKAGE"
    fi
  fi

  echo "Package: $PACKAGE_NAME"
  echo ""

  # Generate tests
  TEST_DIR="$SERVICE_PATH/src/test/java/$(echo "$PACKAGE_NAME" | tr '.' '/')"
  mkdir -p "$TEST_DIR"

  # Count source files
  SOURCE_COUNT=$(find "$SERVICE_PATH/src/main/java" -name "*.java" | wc -l)

  echo "Found $SOURCE_COUNT source files"
  echo "Test directory: $TEST_DIR"
  echo ""

  # Generate test template
  cat > "$TEST_DIR/${ARTIFACT_ID}Test.java" << 'EOF'
package PACKAGE_NAME;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import static org.assertj.core.api.Assertions.*;

/**
 * Auto-generated test template for SERVICE_NAME
 * Tier: TIER
 *
 * TODO: Implement test methods
 * TODO: Add test data builders
 * TODO: Add mock configurations
 */
@DisplayName("SERVICE_NAME Tests")
class ARTIFACT_IDTest {

    @BeforeEach
    void setUp() {
        // Setup test fixtures
    }

    @Test
    @DisplayName("Should initialize service correctly")
    void shouldInitializeService() {
        // TODO: Implement test
        assertTrue(true, "Test not implemented");
    }
}
EOF

  # Replace placeholders
  sed -i "s/PACKAGE_NAME/$PACKAGE_NAME/g" "$TEST_DIR/${ARTIFACT_ID}Test.java"
  sed -i "s/SERVICE_NAME/$SERVICE_NAME/g" "$TEST_DIR/${ARTIFACT_ID}Test.java"
  sed -i "s/ARTIFACT_ID/$ARTIFACT_ID/g" "$TEST_DIR/${ARTIFACT_ID}Test.java"
  sed -i "s/TIER/$TIER/g" "$TEST_DIR/${ARTIFACT_ID}Test.java"

  echo "Generated: $TEST_DIR/${ARTIFACT_ID}Test.java"

  # For Financial-Grade, generate additional test templates
  if [[ "$TIER" == "financial" ]]; then
    echo ""
    echo "Generating Financial-Grade test templates..."

    # Architecture test
    mkdir -p "$TEST_DIR/architecture"
    cat > "$TEST_DIR/architecture/ArchTest.java" << 'EOF'
package PACKAGE_NAME.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

/**
 * Architecture tests for SERVICE_NAME
 * Financial-Grade: Validates clean architecture principles
 */
class ArchTest {

    @Test
    void shouldFollowCleanArchitecture() {
        JavaClasses importedClasses = new ClassFileImporter().importPackagesOf(CLASS);

        ArchRule rule = classes()
            .that().resideInAPackage("..domain..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage("..domain..", "java..", "org.springframework..");

        rule.check(importedClasses);
    }
}
EOF
    sed -i "s/PACKAGE_NAME/$PACKAGE_NAME/g" "$TEST_DIR/architecture/ArchTest.java"
    sed -i "s/SERVICE_NAME/$SERVICE_NAME/g" "$TEST_DIR/architecture/ArchTest.java"
    sed -i "s/CLASS/$SERVICE_NAME/g" "$TEST_DIR/architecture/ArchTest.java"

    echo "Generated: $TEST_DIR/architecture/ArchTest.java"
  fi

elif [[ -f "$SERVICE_PATH/package.json" ]]; then
  # Node.js service
  echo "Detected Node.js service"
  echo ""
  echo "Note: Test generation for Node.js services requires Jest configuration"
  echo ""
  # Generate Jest test template
  cat > "$SERVICE_PATH/src/__tests__/${SERVICE_NAME}.test.js" << 'EOF'
/**
 * Auto-generated test template for SERVICE_NAME
 * Tier: TIER
 *
 * TODO: Implement test methods
 */

describe('SERVICE_NAME', () => {
  beforeEach(() => {
    // Setup test fixtures
  });

  test('should initialize correctly', () => {
    expect(true).toBe(true);
  });
});
EOF
  sed -i "s/SERVICE_NAME/$SERVICE_NAME/g" "$SERVICE_PATH/src/__tests__/${SERVICE_NAME}.test.js"
  sed -i "s/TIER/$TIER/g" "$SERVICE_PATH/src/__tests__/${SERVICE_NAME}.test.js"

  echo "Generated: $SERVICE_PATH/src/__tests__/${SERVICE_NAME}.test.js"
fi

echo ""
echo "========================================="
echo "Test Generation Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "  1. Review generated tests"
echo "  2. Implement test methods"
echo "  3. Run: mvn test (or npm test)"
echo "  4. Generate coverage report: mvn jacoco:report"
echo ""

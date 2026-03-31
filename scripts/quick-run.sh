#!/bin/bash

# Gogidix Testing Infrastructure - Quick Run Script
# Runs all standard tests for a given environment

set -e

ENVIRONMENT=${1:-dev}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              QUICK TEST RUN                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Environment: $ENVIRONMENT"
echo ""

# Run smoke tests first
echo "Running smoke tests..."
./scripts/run-tests.sh -e "$ENVIRONMENT" -t smoke

# Run load tests
echo "Running load tests..."
./scripts/run-tests.sh -e "$ENVIRONMENT" -t load

# Generate combined report
echo "Generating combined report..."
./scripts/generate-report.sh "$ENVIRONMENT"

echo ""
echo "✓ All tests completed!"
echo ""

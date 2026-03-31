#!/bin/bash

# Gogidix Testing Infrastructure - Main Execution Script
# Usage: ./run-tests.sh [OPTIONS]
# 
# Options:
#   -e, --environment    Target environment (dev, staging, prod)
#   -t, --test-type      Test type (load, stress, spike, endurance, smoke)
#   -s, --service        Specific service to test (all, auth, payment, fraud, core)
#   -d, --duration       Test duration override (e.g., "5m")
#   -u, --users          Number of virtual users override (e.g., 100)
#   -o, --output         Output directory for reports (default: reports/)
#   -v, --verbose        Enable verbose output
#   -h, --help           Show this help message

set -e

# Default values
ENVIRONMENT="dev"
TEST_TYPE="load"
SERVICE="all"
DURATION_OVERRIDE=""
USERS_OVERRIDE=""
OUTPUT_DIR="reports"
VERBOSE=false
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help message
show_help() {
    echo "Gogidix Testing Infrastructure - Test Execution Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Target environment (dev, staging, prod)"
    echo "  -t, --test-type      Test type (load, stress, spike, endurance, smoke)"
    echo "  -s, --service        Specific service to test (all, auth, payment, fraud, core)"
    echo "  -d, --duration       Test duration override"
    echo "  -u, --users          Number of virtual users override"
    echo "  -o, --output         Output directory for reports"
    echo "  -v, --verbose        Enable verbose output"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging -t load -s auth"
    echo "  $0 -e prod -t smoke"
    echo "  $0 -e dev -t stress -s payment -u 500"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--test-type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -d|--duration)
            DURATION_OVERRIDE="$2"
            shift 2
            ;;
        -u|--users)
            USERS_OVERRIDE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
print_banner() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          GOGIDIX TESTING INFRASTRUCTURE                      ║"
    echo "║          Financial-Grade Load Testing                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check k6
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Please install k6 first."
        log_info "Visit: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check environment file
    ENV_FILE="environments/${ENVIRONMENT}.env"
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Check test scripts
    if [ "$SERVICE" != "all" ]; then
        SCRIPT_FILE="k6/scripts/${SERVICE}-service.js"
        if [ ! -f "$SCRIPT_FILE" ]; then
            log_error "Test script not found: $SCRIPT_FILE"
            exit 1
        fi
    fi
    
    log_success "Prerequisites validated"
}

# Load environment configuration
load_environment() {
    log_info "Loading $ENVIRONMENT environment configuration..."
    
    ENV_FILE="environments/${ENVIRONMENT}.env"
    
    # Export environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Set test run ID
    export TEST_RUN_ID="${ENVIRONMENT}-${TIMESTAMP}-$$"
    
    log_success "Environment loaded"
    log_info "Base URL: $BASE_URL"
}

# Create output directories
create_directories() {
    log_info "Creating output directories..."
    
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/$TEST_TYPE"
    mkdir -p "$OUTPUT_DIR/$TEST_TYPE/$TIMESTAMP"
    
    log_success "Directories created"
}

# Run k6 test
run_k6_test() {
    local script=$1
    local script_name=$(basename "$script" .js)
    
    log_info "Running test: $script_name"
    
    local output_dir="$OUTPUT_DIR/$TEST_TYPE/$TIMESTAMP/$script_name"
    mkdir -p "$output_dir"
    
    # Build k6 command
    local k6_cmd="k6 run"
    
    # Add output options
    k6_cmd="$k6_cmd --out json=$output_dir/results.json"
    k6_cmd="$k6_cmd --summary-export=$output_dir/summary.json"
    
    # Add custom thresholds for financial-grade testing
    if [ "$TEST_TYPE" == "load" ]; then
        k6_cmd="$k6_cmd --threshold-overrides 'http_req_failed=rate<0.02,http_req_duration=p(95)<2000'"
    fi
    
    # Add script
    k6_cmd="$k6_cmd $script"
    
    # Run the test
    if [ "$VERBOSE" = true ]; then
        log_info "Executing: $k6_cmd"
    fi
    
    # Capture exit code
    set +e
    $k6_cmd 2>&1 | tee "$output_dir/output.log"
    local exit_code=$?
    set -e
    
    if [ $exit_code -eq 0 ]; then
        log_success "Test completed: $script_name"
    else
        log_warning "Test completed with warnings: $script_name"
    fi
    
    return $exit_code
}

# Run all tests for a specific test type
run_tests() {
    log_info "Starting $TEST_TYPE tests for $SERVICE service(s)"
    
    local scripts=()
    
    if [ "$SERVICE" == "all" ]; then
        scripts=("k6/scripts/auth-service.js" "k6/scripts/payment-service.js" "k6/scripts/fraud-service.js" "k6/scripts/core-services.js")
    else
        scripts=("k6/scripts/${SERVICE}-service.js")
    fi
    
    local failed=0
    local passed=0
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if run_k6_test "$script"; then
                ((passed++))
            else
                ((failed++))
            fi
        else
            log_warning "Script not found: $script"
            ((failed++))
        fi
    done
    
    log_info "Tests completed: $passed passed, $failed failed"
    
    # Generate summary
    generate_summary "$passed" "$failed"
}

# Generate test summary
generate_summary() {
    local passed=$1
    local failed=$2
    
    log_info "Generating test summary..."
    
    local summary_file="$OUTPUT_DIR/$TEST_TYPE/$TIMESTAMP/summary.json"
    
    cat > "$summary_file" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "test_run_id": "$TEST_RUN_ID",
    "environment": "$ENVIRONMENT",
    "test_type": "$TEST_TYPE",
    "service": "$SERVICE",
    "results": {
        "passed": $passed,
        "failed": $failed,
        "total": $((passed + failed))
    },
    "configuration": {
        "base_url": "$BASE_URL",
        "output_directory": "$OUTPUT_DIR"
    }
}
EOF
    
    log_success "Summary generated: $summary_file"
    
    # Print summary
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                      TEST SUMMARY                             "
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  Test Run ID:    $TEST_RUN_ID"
    echo "  Environment:    $ENVIRONMENT"
    echo "  Test Type:      $TEST_TYPE"
    echo "  Service(s):     $SERVICE"
    echo ""
    echo "  Results:"
    echo "    ✓ Passed:     $passed"
    echo "    ✗ Failed:     $failed"
    echo ""
    echo "  Output:         $OUTPUT_DIR/$TEST_TYPE/$TIMESTAMP/"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Cleanup old reports
cleanup_old_reports() {
    log_info "Cleaning up old reports..."
    
    # Keep only last 10 runs
    find "$OUTPUT_DIR" -type d -name "20*" | sort -r | tail -n +11 | xargs -r rm -rf
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    print_banner
    
    validate_prerequisites
    load_environment
    create_directories
    run_tests
    cleanup_old_reports
    
    log_success "Test execution completed"
}

# Run main
main

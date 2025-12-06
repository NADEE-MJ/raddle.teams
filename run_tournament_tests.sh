#!/bin/bash

# Tournament Feature Test Runner
# Runs all tests related to the tournament feature implementation

set -e  # Exit on error

echo "=================================="
echo "Tournament Feature Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track test results
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false

echo -e "${YELLOW}Step 1: Running Backend Unit Tests${NC}"
echo "Running awards tests..."
if pytest backend/tests/test_awards.py -v; then
    echo -e "${GREEN}✓ Awards tests passed${NC}"
else
    echo -e "${RED}✗ Awards tests failed${NC}"
    exit 1
fi

echo ""
echo "Running points calculation tests..."
if pytest backend/tests/test_points_calculation.py -v; then
    echo -e "${GREEN}✓ Points calculation tests passed${NC}"
    BACKEND_TESTS_PASSED=true
else
    echo -e "${RED}✗ Points calculation tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Running Frontend Unit Tests${NC}"
echo "Running PlacementNotification tests..."
if npm run test -- PlacementNotification.test.tsx --run; then
    echo -e "${GREEN}✓ PlacementNotification tests passed${NC}"
else
    echo -e "${RED}✗ PlacementNotification tests failed${NC}"
    exit 1
fi

echo ""
echo "Running TeamLeaderboard tests..."
if npm run test -- TeamLeaderboard.test.tsx --run; then
    echo -e "${GREEN}✓ TeamLeaderboard tests passed${NC}"
    FRONTEND_TESTS_PASSED=true
else
    echo -e "${RED}✗ TeamLeaderboard tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: E2E Tests${NC}"
echo "E2E tests can be run with:"
echo "  pytest e2e/test_tournament_flow.py -v"
echo ""
echo "For visual debugging:"
echo "  PYTEST_SLOW_MO=500 pytest e2e/test_tournament_flow.py -v"

echo ""
echo "=================================="
echo -e "${GREEN}✓ All Unit Tests Passed!${NC}"
echo "=================================="
echo ""
echo "Summary:"
echo "  - Backend: 25 tests (awards + points calculation)"
echo "  - Frontend: 26 tests (PlacementNotification + TeamLeaderboard)"
echo "  - E2E: 6 scenarios (run separately)"
echo ""
echo "Total: 57 tests covering tournament feature"
echo ""

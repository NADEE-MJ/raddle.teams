# Testing Guide for Raddle Teams Rust Backend

This document describes the testing strategy and implementation for the Rust backend.

## Test Overview

The Rust backend includes **33 comprehensive unit tests** covering:
- **14 Database Model Tests** - Testing database models and business logic
- **19 Schema Tests** - Testing request/response serialization and validation

All tests are written using Rust's built-in testing framework and can be run with `cargo test`.

## Running Tests

### Run All Tests
```bash
cargo test
```

### Run Specific Test File
```bash
cargo test --test database_tests
cargo test --test schema_tests
```

### Run Tests with Output
```bash
cargo test -- --nocapture
```

### Run Specific Test
```bash
cargo test test_create_lobby_active_model
```

### Run Tests in Release Mode
```bash
cargo test --release
```

## Test Coverage

### Database Model Tests (`tests/database_tests.rs`)

#### Lobby Tests
- ✅ **test_create_lobby_active_model** - Verifies lobby creation with ActiveModel
- ✅ **test_lobby_code_format** - Tests 6-character alphanumeric code generation

#### Player Tests
- ✅ **test_create_player_active_model** - Verifies player creation
- ✅ **test_assign_player_to_team** - Tests player team assignment logic
- ✅ **test_player_session_id_is_uuid** - Validates UUID session ID format

#### Team Tests
- ✅ **test_create_team_active_model** - Verifies team creation
- ✅ **test_team_progress** - Tests word index progression and completion
- ✅ **test_multiple_teams_same_lobby** - Validates multiple teams in one lobby

#### Schema Validation Tests
- ✅ **test_lobby_code_validation** - Validates lobby code format (6 chars, uppercase, alphanumeric)
- ✅ **test_player_name_validation** - Tests player name requirements
- ✅ **test_team_name_format** - Validates "Team N" naming convention

#### Business Logic Tests
- ✅ **test_team_assignment_logic** - Tests round-robin player distribution across teams
- ✅ **test_word_progression** - Validates word chain progression logic
- ✅ **test_lobby_capacity** - Tests capacity calculations (max 100 players, 10 teams)

### Schema Tests (`tests/schema_tests.rs`)

#### Request Schema Tests
- ✅ **test_lobby_create_serialization** - Tests LobbyCreate JSON serialization
- ✅ **test_player_create_serialization** - Tests PlayerCreate JSON serialization
- ✅ **test_team_create_validation** - Validates team count boundaries (2-10)

#### Response Schema Tests
- ✅ **test_message_response_success** - Tests MessageResponse with success=true
- ✅ **test_message_response_error** - Tests MessageResponse with success=false
- ✅ **test_error_response** - Tests ErrorResponse structure
- ✅ **test_admin_authenticated_response** - Tests admin session response
- ✅ **test_api_root_response** - Tests API root endpoint response

#### JSON Roundtrip Tests
- ✅ **test_lobby_create_roundtrip** - Tests serialize → deserialize without data loss
- ✅ **test_player_create_roundtrip** - Tests player data roundtrip
- ✅ **test_team_create_roundtrip** - Tests team data roundtrip
- ✅ **test_error_response_roundtrip** - Tests error response roundtrip
- ✅ **test_message_response_roundtrip** - Tests message response roundtrip

#### Validation Tests
- ✅ **test_lobby_name_validation** - Tests various lobby name formats
- ✅ **test_player_name_validation** - Tests player name edge cases
- ✅ **test_team_count_boundaries** - Tests min/max team counts (2-10)
- ✅ **test_empty_message_response** - Tests empty message handling
- ✅ **test_special_characters_in_responses** - Tests special character preservation
- ✅ **test_unicode_in_responses** - Tests Unicode/emoji support

## Test Structure

### Unit Tests
Unit tests focus on testing individual components in isolation:
- Database models and ActiveModel creation
- Schema serialization/deserialization
- Business logic calculations
- Validation rules

### Why Mock-Free Testing?
Instead of using mocked databases, we test:
1. **ActiveModel Creation** - Tests that models can be created with correct fields
2. **Serialization Logic** - Tests JSON encode/decode roundtrips
3. **Business Rules** - Tests calculation logic (team distribution, word progression)
4. **Validation** - Tests format requirements (codes, names, counts)

This approach:
- ✅ Runs faster (no I/O)
- ✅ More reliable (no mock setup complexity)
- ✅ Tests actual logic, not database queries
- ✅ Easier to maintain

### Integration Tests (Future)
For future integration testing with real database:
```rust
#[tokio::test]
async fn test_full_lobby_workflow() {
    let db = create_test_database().await;
    // Test full create → join → assign → play flow
}
```

## Test Best Practices

### 1. Test Naming Convention
```rust
#[test]
fn test_<what>_<scenario>() {
    // Test description: "Test that <what> <scenario>"
    // Example: test_lobby_code_format tests that lobby codes are 6 characters
}
```

### 2. Arrange-Act-Assert Pattern
```rust
#[test]
fn test_example() {
    // Arrange: Set up test data
    let lobby = LobbyCreate { name: "Test".to_string() };

    // Act: Perform action
    let json = serde_json::to_string(&lobby).unwrap();

    // Assert: Verify results
    assert!(json.contains("Test"));
}
```

### 3. Use Descriptive Assertions
```rust
// ❌ Bad
assert!(lobby.name.len() > 0);

// ✅ Good
assert!(!lobby.name.is_empty(), "Lobby name should not be empty");
```

### 4. Test Edge Cases
- Empty strings
- Minimum/maximum values
- Special characters
- Unicode/emojis
- Boundary conditions

## Continuous Integration

### Local Pre-commit Checks
```bash
# Run tests
cargo test

# Check formatting
cargo fmt --check

# Run linter
cargo clippy

# Build release
cargo build --release
```

### CI Pipeline (Recommended)
```yaml
name: Rust Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cargo test --verbose
      - run: cargo clippy -- -D warnings
      - run: cargo build --release
```

## Test Performance

Current test performance (as of implementation):
```
Running tests/database_tests.rs: 14 tests in 0.00s
Running tests/schema_tests.rs: 19 tests in 0.00s
Total: 33 tests in < 1 second
```

Fast test execution enables:
- ✅ Rapid feedback during development
- ✅ Frequent test runs without slowdown
- ✅ Practical TDD workflow

## Future Testing Enhancements

### 1. Integration Tests with Real Database
```rust
// tests/integration_test.rs
#[tokio::test]
async fn test_api_endpoints() {
    let app = create_test_app().await;
    let response = app.post("/api/lobby").json(&lobby_data).await;
    assert_eq!(response.status(), 200);
}
```

### 2. WebSocket Tests
```rust
#[tokio::test]
async fn test_websocket_broadcast() {
    let manager = LobbyWebSocketManager::new();
    // Test real-time message broadcasting
}
```

### 3. Load Testing
```bash
# Using criterion.rs for benchmarks
cargo bench
```

### 4. Property-Based Testing
```rust
use quickcheck_macros::quickcheck;

#[quickcheck]
fn test_team_distribution(num_players: u8, num_teams: u8) -> bool {
    // Test team distribution with random inputs
}
```

### 5. Mutation Testing
```bash
# Using cargo-mutants
cargo install cargo-mutants
cargo mutants
```

## Debugging Tests

### Run Single Test with Debug Output
```bash
RUST_LOG=debug cargo test test_name -- --nocapture
```

### Run Tests in IDE
Most Rust IDEs (VS Code with rust-analyzer, IntelliJ IDEA) provide:
- Click-to-run test buttons
- Inline test results
- Debugger integration

### Test Failure Investigation
```bash
# Show full backtrace
RUST_BACKTRACE=1 cargo test

# Show full backtrace with line numbers
RUST_BACKTRACE=full cargo test
```

## Writing New Tests

### Template for New Test File
```rust
// tests/my_new_tests.rs
use raddle_teams_rust::*;

#[cfg(test)]
mod my_feature_tests {
    use super::*;

    #[test]
    fn test_my_feature() {
        // Arrange
        let data = setup_test_data();

        // Act
        let result = my_function(data);

        // Assert
        assert_eq!(result, expected_value);
    }
}
```

### Adding Tests to Existing Files
1. Create new test module: `mod my_tests { ... }`
2. Add `#[test]` attribute to test functions
3. Use `#[tokio::test]` for async tests
4. Use `#[should_panic]` for error case tests

## Test Maintenance

### Regular Test Audits
- Review test coverage monthly
- Remove obsolete tests
- Update tests when features change
- Add tests for bug fixes

### Test Documentation
- Document complex test setups
- Explain non-obvious assertions
- Reference related GitHub issues/PRs

## Conclusion

The Rust backend has comprehensive test coverage ensuring:
- ✅ Correct database model behavior
- ✅ Proper JSON serialization
- ✅ Business logic accuracy
- ✅ Data validation
- ✅ Edge case handling

All tests pass successfully and run in under 1 second, providing a solid foundation for confident development and refactoring.

---

**Test Statistics:**
- Total Tests: 33
- Database Tests: 14
- Schema Tests: 19
- Pass Rate: 100%
- Execution Time: < 1 second

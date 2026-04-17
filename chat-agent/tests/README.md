# Test Suite Documentation

Comprehensive testing suite for the Chat Agent security guardrails and functionality.

## Overview

This test suite validates all security guardrails implemented to prevent misuse of the AI chat agent and ensures correct behavior with actual message sending. The suite uses **pytest** with parallel execution support and comprehensive coverage reporting.

### Test Statistics

- **Total Tests**: 125 tests
  - Request Limits Tests: 22 tests
  - Suspicious Intent Tests: 54 tests
  - Response Sanitization Tests: 49 tests
- **Test Categories**: Unit, Security
- **Coverage Target**: >90%

## Security Guardrails Covered

### 1. Request Size Limits
- **Message Length**: Maximum 5,000 characters per message
- **History Length**: Maximum 50 items in conversation history
- **History Item Length**: Maximum 1,000 characters per history item
- **Validation**: Pydantic validators with detailed error messages

### 2. Suspicious Intent Detection
Eight pattern categories for malicious content:
1. **Fake Content**: fake email, template, message, notification
2. **Phishing**: phishing email, template, message
3. **Social Engineering**: social engineering attack, template
4. **Malicious Content Creation**: create fake/malicious/suspicious content
5. **Spam Generation**: generate phishing/spam email or content
6. **Security Bypass**: bypass security, authentication, verification
7. **Credential Theft**: steal password, credential, token, session
8. **Unauthorized Access**: obtain unauthorized/illegal access or data

### 3. Response Sanitization
Automatically redacts sensitive information from tool responses:
- **URLs**: http:// and https:// patterns → `[URL_REDACTED]`
- **SQL Queries**: SELECT, INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE → `[SQL_REDACTED]`
- **Passwords**: password, passwd, secret fields → `[REDACTED]`
- **Tokens**: JWT tokens, API keys, access_token, refresh_token → `[TOKEN_REDACTED]` or `[API_KEY_REDACTED]`

### 4. Content Moderation
- Integration with OpenAI Moderation API
- Detects hate speech, sexual content, violence, and other policy violations
- Handles API errors and rate limits gracefully

### 5. System Prompt Security
- Enforces scope limitations (no coding tasks outside approved tools)
- Detects jailbreak attempts (DAN, roleplay, etc.)
- Fallback prompt maintains security boundaries

### 6. Metrics Tracking
- Request count tracking
- Error count tracking
- Tool call count tracking
- Per-user request tracking

## Running Tests

### Prerequisites

Ensure dependencies are installed:
```bash
pip install -r requirements.txt
pip install -e .  # Register agent/ and tools/ as importable packages
```

### Basic Test Execution

Run all tests:
```bash
pytest
```

Run tests with verbose output:
```bash
pytest -v
```

### Parallel Execution

Run tests in parallel (recommended for faster execution):
```bash
pytest -n auto
```

Use a specific number of workers:
```bash
pytest -n 4
```

### Running Individual Test Files

```bash
# Test request limits
pytest tests/test_request_limits.py

# Test suspicious intent detection
pytest tests/test_suspicious_intent.py

# Test response sanitization
pytest tests/test_sanitization.py
```

### Running Specific Test Classes or Tests

```bash
# Run a specific test class
pytest tests/test_request_limits.py::TestMessageLengthValidator

# Run a specific test
pytest tests/test_request_limits.py::TestMessageLengthValidator::test_valid_message_length

# Run tests matching a pattern
pytest -k "test_message_exceeds"
```

### Running Tests with Coverage

```bash
# Generate coverage report
pytest --cov

# Generate HTML coverage report
pytest --cov --cov-report=html

# View coverage in browser
open htmlcov/index.html  # macOS
# or
xdg-open htmlcov/index.html  # Linux

# Generate XML coverage report (for CI/CD)
pytest --cov --cov-report=xml
```

### Running Tests by Marker

```bash
# Run only security tests
pytest -m security

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run tests matching multiple markers
pytest -m "security and unit"
```

## Test Categories and Markers

### Available Markers

- `@pytest.mark.security`: Tests for security guardrails
- `@pytest.mark.unit`: Unit tests (isolated, fast)
- `@pytest.mark.integration`: Integration tests (end-to-end, slower)
- `@pytest.mark.slow`: Slow-running tests

### Marker Usage

Apply markers to test classes or individual tests:
```python
@pytest.mark.unit
@pytest.mark.security
class TestMessageLengthValidator:
    """Test message length validator."""

    def test_valid_message_length(self):
        """Test that message within limit passes validation."""
        # Test implementation
```

## Test Fixtures

### Available Fixtures

Located in `tests/conftest.py`:

#### `mock_env_vars`
Sets up mock environment variables for testing. Automatically configures:
- OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE
- PORT, DEBUG, ASGARDEO_TOKEN_URL
- MEALS_BACKEND_URL, MEALS_APP_CLIENT_ID
- GUEST_WIFI_BACKEND_URL, GUEST_WIFI_APP_CLIENT_ID
- LEAVE_BACKEND_URL, LEAVE_APP_CLIENT_ID

**Usage:**
```python
def test_something(mock_env_vars):
    # Environment variables are available
    assert os.environ.get("OPENAI_API_KEY") == "test-api-key"
```

#### `mock_openai_client`
Provides a mock OpenAI client for testing OpenAI API interactions.

**Usage:**
```python
def test_openai_integration(mock_openai_client):
    mock_openai_client.chat.completions.create.return_value = ...
```

#### `mock_httpx_client`
Provides a mock httpx.AsyncClient for testing HTTP client interactions.

**Usage:**
```python
def test_http_request(mock_httpx_client):
    mock_httpx_client.get.return_value = AsyncMock(status_code=200)
```

#### `sample_jwt_token`
Returns a sample JWT token for testing token validation and redaction.

**Usage:**
```python
def test_token_redaction(sample_jwt_token):
    sanitized = sanitize_tool_result(sample_jwt_token)
    assert "[TOKEN_REDACTED]" in sanitized
```

#### `sample_chat_request`
Returns a sample chat request for testing.

**Usage:**
```python
def test_chat_validation(sample_chat_request):
    request = ChatRequest(**sample_chat_request)
    assert request.message == "What's for lunch today?"
```

#### `sample_history`
Returns sample conversation history for testing.

**Usage:**
```python
def test_history_validation(sample_history):
    history = [HistoryMessage(**item) for item in sample_history]
    assert len(history) == 2
```

#### `sample_tool_result`
Returns a sample tool result for testing sanitization.

**Usage:**
```python
def test_result_sanitization(sample_tool_result):
    sanitized = sanitize_tool_result(sample_tool_result)
    # Verify sanitization
```

#### `metrics_tracker`
Provides a MetricsTracker instance for testing metrics tracking.

**Usage:**
```python
def test_metrics_tracking(metrics_tracker):
    metrics_tracker.increment_request()
    metrics = metrics_tracker.get_metrics()
    assert metrics["request_count"] == 1
```

#### `mock_async_openai`
Mocks the AsyncOpenAI client for testing async OpenAI operations.

**Usage:**
```python
def test_async_openai(mock_async_openai):
    mock_async_openai.chat.completions.create.return_value = ...
```

### Creating Custom Fixtures

Add new fixtures to `tests/conftest.py`:
```python
@pytest.fixture
def my_custom_fixture():
    """Fixture description."""
    setup_data = ...
    yield setup_data
    # Cleanup if needed
```

## Test Structure

### Test File Organization

```
tests/
├── __init__.py
├── conftest.py           # Shared fixtures and configuration
├── test_request_limits.py   # Request size limit tests
├── test_suspicious_intent.py  # Suspicious intent detection tests
└── test_sanitization.py   # Response sanitization tests
```

### Test Class Organization

Tests are organized into logical classes:
```python
@pytest.mark.unit
@pytest.mark.security
class TestFeatureName:
    """Test feature description."""

    def test_scenario_one(self):
        """Test scenario one description."""
        # Test implementation
```

### Test Naming Conventions

- Test files: `test_*.py`
- Test classes: `Test*`
- Test functions: `test_*`
- Descriptive names that explain what is being tested

### Test Documentation

Each test should have a docstring describing:
- What is being tested
- What the expected behavior is
- Any special conditions or edge cases

```python
def test_message_exceeds_limit(self):
    """Test that message exceeding limit raises ValidationError."""
    message = "A" * (MAX_MESSAGE_LENGTH + 1)
    with pytest.raises(ValidationError) as exc_info:
        ChatRequest(message=message, history=None)
    assert "exceeds maximum length" in str(exc_info.value).lower()
```

## Coverage Requirements

### Current Coverage

- **Target**: >90% code coverage
- **Measurement**: Use pytest-cov for coverage reports
- **Exclusions**: Test files themselves, configuration files

### Generating Coverage Reports

```bash
# Terminal coverage report
pytest --cov

# HTML report
pytest --cov --cov-report=html

# XML report (for CI/CD)
pytest --cov --cov-report=xml
```

### Coverage Exclusions

Coverage excludes:
- `tests/` directory
- `*/tests.py` files
- `*/__pycache__/*` files

## CI/CD Integration

### CI Pipeline Configuration

Example for GitHub Actions:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pip install -e .
      - run: pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

### Pre-commit Hooks

Add to `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        pass_filenames: false
        always_run: true
```

## Troubleshooting

### Common Issues

#### Tests Fail with Import Errors

**Problem**: `ModuleNotFoundError` or `ImportError`

**Solution**:
```bash
# Install the project in editable mode
pip install -e .
```

#### Tests Fail with Environment Variable Errors

**Problem**: Tests fail due to missing environment variables

**Solution**: Ensure `mock_env_vars` fixture is used in tests that need environment variables, or set environment variables in `.env` file.

#### Parallel Test Execution Fails

**Problem**: Tests fail when run with `-n auto` but pass individually

**Solution**: Check for shared state issues. Tests should be isolated and not depend on execution order. Use fixtures to provide fresh data for each test.

#### Coverage Report Shows 0%

**Problem**: Coverage report shows 0% coverage

**Solution**:
```bash
# Ensure pytest-cov is installed
pip install pytest-cov

# Run tests from project root
cd /Users/administrator/Documents/FOSS/opensuperapp/chat-agent
pytest --cov=.
```

#### Mock Objects Not Working

**Problem**: Mocked functions don't behave as expected

**Solution**: Ensure you're using `pytest-mock` correctly:
```python
def test_with_mocker(mocker):
    mock_func = mocker.patch('module.function')
    mock_func.return_value = "test"
```

### Debugging Failed Tests

#### Run Tests with Detailed Output
```bash
pytest -vvs  # Very verbose with print statements
```

#### Run Tests with Debugger
```bash
pytest --pdb
```

#### Run Only Failed Tests
```bash
pytest --lf  # Last failed
```

#### Run Tests Until First Failure
```bash
pytest -x
```

#### Run Tests in Specific Order
```bash
pytest --tb=short  # Shorter traceback
pytest --tb=line   # One line per error
```

### Performance Issues

#### Slow Test Execution

**Solution**: Use parallel execution:
```bash
pytest -n auto
```

#### Memory Issues During Tests

**Solution**: Run tests in smaller batches:
```bash
pytest tests/test_request_limits.py
pytest tests/test_suspicious_intent.py
pytest tests/test_sanitization.py
```

## Adding New Tests

### Test Development Workflow

1. **Identify the feature or guardrail to test**
2. **Create test file or add to existing file**
3. **Write test class with appropriate markers**
4. **Implement test methods with clear descriptions**
5. **Run tests locally to verify**
6. **Check coverage with `pytest --cov`**
7. **Run full test suite to ensure no regressions**

### Test Template

```python
"""
Unit tests for [feature name].
"""

import pytest
from pydantic import ValidationError

from main import [imports needed]


@pytest.mark.unit
@pytest.mark.security
class TestFeatureName:
    """Test feature description."""

    def test_scenario_one(self):
        """Test scenario one description."""
        # Arrange
        input_data = ...
        
        # Act
        result = function_under_test(input_data)
        
        # Assert
        assert result == expected_value

    def test_scenario_two(self):
        """Test scenario two description."""
        with pytest.raises(ExpectedException) as exc_info:
            function_under_test(invalid_input)
        assert "expected message" in str(exc_info.value)
```

### Best Practices

1. **One assertion per test** when possible
2. **Use descriptive test names** that explain what is being tested
3. **Follow Arrange-Act-Assert pattern** for clear test structure
4. **Mock external dependencies** to ensure test isolation
5. **Test edge cases** and boundary conditions
6. **Keep tests focused** on a single behavior
7. **Use fixtures** for shared setup code
8. **Run tests before committing** changes
9. **Maintain >90% coverage** for security-related code
10. **Update documentation** when adding new test categories

### Test Categories

When adding new tests, choose appropriate categories:

- **Unit Tests**: Fast, isolated tests for individual functions or classes
  - Use `@pytest.mark.unit`
  - Mock all external dependencies
  - Should run in < 100ms

- **Security Tests**: Tests for security guardrails and validations
  - Use `@pytest.mark.security`
  - Often overlap with unit tests
  - Critical for preventing misuse

- **Integration Tests**: End-to-end tests with real API calls
  - Use `@pytest.mark.integration`
  - Test complete workflows
  - May be slower and require external services

## Test Configuration

### pytest.ini

The test suite uses `pytest.ini` for configuration:

```ini
[pytest]
minversion = 8.0
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=.
    --cov-report=term-missing
    --cov-report=html
    --cov-report=xml
markers =
    security: Tests for security guardrails
    unit: Unit tests
    integration: Integration tests
    slow: Slow-running tests
asyncio_mode = auto
```

### Test Dependencies

Key testing dependencies:
- `pytest>=8.0.0`: Testing framework
- `pytest-asyncio>=0.23.0`: Async test support
- `pytest-xdist>=3.5.0`: Parallel test execution
- `pytest-cov>=4.1.0`: Coverage reporting
- `pytest-mock>=3.12.0`: Mocking utilities

## Test Execution Examples

### Complete Test Suite with Coverage
```bash
pytest -n auto --cov --cov-report=html
```

### Security Tests Only
```bash
pytest -m security -v
```

### Specific Test File with Detailed Output
```bash
pytest tests/test_sanitization.py -vvs
```

### Run Tests by Pattern
```bash
pytest -k "redaction"
```

### Run Tests Until First Failure
```bash
pytest -x -n auto
```

### Run Only Previously Failed Tests
```bash
pytest --lf
```

## Test Maintenance

### Regular Tasks

- **Run full test suite** weekly to catch regressions
- **Update coverage reports** after significant changes
- **Review and update tests** when adding new features
- **Refactor tests** when code structure changes
- **Remove obsolete tests** when features are deprecated

### Test Debt

- Track test debt in issue tracker
- Prioritize security test coverage
- Address flaky tests immediately
- Keep test execution time under 5 minutes with parallel execution

## Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [pytest-mock Documentation](https://pytest-mock.readthedocs.io/)
- [Project README](../README.md)
- [API Documentation](../README.md#api-reference)

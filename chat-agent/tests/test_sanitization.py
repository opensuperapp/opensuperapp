# Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
#
# WSO2 LLC. licenses this file to you under the Apache License,
# Version 2.0 (the "License"); you may not use this file except
# in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied. See the License for the
# specific language governing permissions and limitations
# under the License.

"""
Unit tests for response sanitization.
"""

import pytest

from application.chat_service import sanitize_tool_result


@pytest.mark.unit
@pytest.mark.security
class TestURLRedaction:
    """Test URL redaction from responses."""

    def test_http_url_redaction(self):
        """Test that HTTP URLs are redacted."""
        result = "Visit http://example.com for more info"
        sanitized = sanitize_tool_result(result)
        assert "[URL_REDACTED]" in sanitized
        assert "http://example.com" not in sanitized

    def test_https_url_redaction(self):
        """Test that HTTPS URLs are redacted."""
        result = "Go to https://api.example.com/v1/users"
        sanitized = sanitize_tool_result(result)
        assert "[URL_REDACTED]" in sanitized
        assert "https://api.example.com" not in sanitized

    def test_multiple_urls_redaction(self):
        """Test that multiple URLs are all redacted."""
        result = "Check http://site1.com and https://site2.com"
        sanitized = sanitize_tool_result(result)
        assert sanitized.count("[URL_REDACTED]") == 2

    def test_url_with_path_and_params(self):
        """Test that URLs with paths and params are redacted."""
        result = "https://api.example.com/v1/users?id=123&token=abc"
        sanitized = sanitize_tool_result(result)
        assert "[URL_REDACTED]" in sanitized
        assert "https://api.example.com" not in sanitized

    def test_case_insensitive_url(self):
        """Test that URL redaction is case-insensitive."""
        result = "HTTP://EXAMPLE.COM and HTTPS://API.EXAMPLE.COM"
        sanitized = sanitize_tool_result(result)
        assert "[URL_REDACTED]" in sanitized

    def test_url_in_middle_of_text(self):
        """Test that URL in middle of text is redacted."""
        result = "Please visit https://example.com for details"
        sanitized = sanitize_tool_result(result)
        assert "Please visit [URL_REDACTED] for details" == sanitized

    def test_preserve_non_url_text(self):
        """Test that non-URL text is preserved."""
        result = "Visit example.com for more info"
        sanitized = sanitize_tool_result(result)
        assert "example.com" in sanitized


@pytest.mark.unit
@pytest.mark.security
class TestSQLRedaction:
    """Test SQL query redaction from responses."""

    def test_select_redaction(self):
        """Test that SELECT queries are redacted."""
        result = "SELECT * FROM users WHERE id = 1"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "SELECT" not in sanitized

    def test_insert_redaction(self):
        """Test that INSERT queries are redacted."""
        result = "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "INSERT" not in sanitized

    def test_update_redaction(self):
        """Test that UPDATE queries are redacted."""
        result = "UPDATE users SET email = 'new@example.com' WHERE id = 1"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "UPDATE" not in sanitized

    def test_delete_redaction(self):
        """Test that DELETE queries are redacted."""
        result = "DELETE FROM users WHERE id = 1"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "DELETE" not in sanitized

    def test_drop_redaction(self):
        """Test that DROP queries are redacted."""
        result = "DROP TABLE users"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "DROP" not in sanitized

    def test_alter_redaction(self):
        """Test that ALTER queries are redacted."""
        result = "ALTER TABLE users ADD COLUMN age INT"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "ALTER" not in sanitized

    def test_create_redaction(self):
        """Test that CREATE queries are redacted."""
        result = "CREATE TABLE users (id INT, name VARCHAR(255))"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "CREATE" not in sanitized

    def test_truncate_redaction(self):
        """Test that TRUNCATE queries are redacted."""
        result = "TRUNCATE TABLE users"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "TRUNCATE" not in sanitized

    def test_case_insensitive_sql(self):
        """Test that SQL redaction is case-insensitive."""
        result = "select * from users"
        sanitized = sanitize_tool_result(result)
        assert "[SQL_REDACTED]" in sanitized
        assert "select" not in sanitized.lower()

    def test_multiple_sql_keywords(self):
        """Test that multiple SQL keywords are redacted."""
        result = "SELECT * FROM users; UPDATE users SET name = 'test'"
        sanitized = sanitize_tool_result(result)
        assert sanitized.count("[SQL_REDACTED]") >= 2


@pytest.mark.unit
@pytest.mark.security
class TestPasswordRedaction:
    """Test password redaction from responses."""

    def test_password_field_redaction(self):
        """Test that password fields are redacted."""
        result = {"password": "secret123", "username": "john"}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "secret123" not in sanitized

    def test_passwd_field_redaction(self):
        """Test that passwd fields are redacted."""
        result = {"passwd": "mypassword", "user": "admin"}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "mypassword" not in sanitized

    def test_nested_password_redaction(self):
        """Test that passwords in nested dicts are redacted."""
        result = {"user": {"name": "John", "password": "secret"}}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "secret" not in sanitized

    def test_password_in_list(self):
        """Test that passwords in lists are redacted."""
        result = [{"username": "user1", "password": "pass1"},
                  {"username": "user2", "password": "pass2"}]
        sanitized = sanitize_tool_result(result)
        assert "pass1" not in sanitized
        assert "pass2" not in sanitized
        assert sanitized.count("[REDACTED]") >= 2

    def test_case_insensitive_password(self):
        """Test that password field is case-insensitive."""
        result = {"PASSWORD": "secret", "USERNAME": "john"}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "secret" not in sanitized

    def test_secret_field_redaction(self):
        """Test that secret fields are redacted."""
        result = {"secret": "mysecret", "value": "data"}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "mysecret" not in sanitized


@pytest.mark.unit
@pytest.mark.security
class TestTokenRedaction:
    """Test token redaction from responses."""

    def test_jwt_token_redaction(self):
        """Test that JWT tokens are redacted."""
        result = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        sanitized = sanitize_tool_result(result)
        assert "[TOKEN_REDACTED]" in sanitized
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in sanitized

    def test_api_key_redaction(self):
        """Test that API keys are redacted."""
        result = "api_key=sk-proj-abc123def456ghi789"
        sanitized = sanitize_tool_result(result)
        assert "[API_KEY_REDACTED]" in sanitized
        assert "sk-proj-abc123def456ghi789" not in sanitized

    def test_apikey_field_redaction(self):
        """Test that apikey fields are redacted."""
        result = {"apikey": "secret_key_123", "app": "myapp"}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "secret_key_123" not in sanitized

    def test_secret_key_redaction(self):
        """Test that secret_key fields are redacted."""
        result = {"secret_key": "mysecretkey", "name": "app"}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "mysecretkey" not in sanitized

    def test_token_field_redaction(self):
        """Test that token fields are redacted."""
        result = {"token": "abc123def456", "id": 1}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "abc123def456" not in sanitized

    def test_token_in_nested_structure(self):
        """Test that tokens in nested structures are redacted."""
        result = {"data": {"auth": {"token": "secret123", "expires": 3600}}}
        sanitized = sanitize_tool_result(result)
        assert "[REDACTED]" in sanitized
        assert "secret123" not in sanitized

    def test_multiple_tokens_redaction(self):
        """Test that multiple tokens are redacted."""
        result = {"access_token": "token1", "refresh_token": "token2"}
        sanitized = sanitize_tool_result(result)
        assert sanitized.count("[REDACTED]") >= 2
        assert "token1" not in sanitized
        assert "token2" not in sanitized


@pytest.mark.unit
@pytest.mark.security
class TestNestedStructures:
    """Test sanitization of nested data structures."""

    def test_nested_dict(self):
        """Test that nested dictionaries are sanitized."""
        result = {
            "user": {
                "name": "John",
                "credentials": {
                    "password": "secret",
                    "token": "abc123"
                }
            }
        }
        sanitized = sanitize_tool_result(result)
        assert "secret" not in sanitized
        assert "abc123" not in sanitized
        assert "John" in sanitized

    def test_nested_list(self):
        """Test that nested lists are sanitized."""
        result = [
            {"name": "User1", "password": "pass1"},
            {"name": "User2", "password": "pass2"}
        ]
        sanitized = sanitize_tool_result(result)
        assert "pass1" not in sanitized
        assert "pass2" not in sanitized
        assert "User1" in sanitized
        assert "User2" in sanitized

    def test_mixed_nested_structure(self):
        """Test that mixed nested structures are sanitized."""
        result = {
            "users": [
                {"name": "John", "email": "http://example.com"},
                {"name": "Jane", "password": "secret123"}
            ]
        }
        sanitized = sanitize_tool_result(result)
        assert "http://example.com" not in sanitized
        assert "secret123" not in sanitized
        assert "John" in sanitized
        assert "Jane" in sanitized

    def test_deeply_nested_structure(self):
        """Test that deeply nested structures are sanitized."""
        result = {
            "level1": {
                "level2": {
                    "level3": {
                        "password": "deepsecret",
                        "api_key": "sk-abc123"
                    }
                }
            }
        }
        sanitized = sanitize_tool_result(result)
        assert "deepsecret" not in sanitized
        assert "sk-abc123" not in sanitized


@pytest.mark.unit
@pytest.mark.security
class TestSafeContentPreservation:
    """Test that safe content is preserved."""

    def test_safe_text_preservation(self):
        """Test that safe text is not modified."""
        result = "This is a safe message with no sensitive data"
        sanitized = sanitize_tool_result(result)
        assert result == sanitized

    def test_safe_dict_preservation(self):
        """Test that safe dictionaries are not modified."""
        result = {"name": "John", "age": 30, "city": "New York"}
        sanitized = sanitize_tool_result(result)
        assert "John" in sanitized
        assert "30" in sanitized
        assert "New York" in sanitized

    def test_safe_list_preservation(self):
        """Test that safe lists are not modified."""
        result = ["apple", "banana", "orange"]
        sanitized = sanitize_tool_result(result)
        assert "apple" in sanitized
        assert "banana" in sanitized
        assert "orange" in sanitized

    def test_partial_sanitization(self):
        """Test that only sensitive parts are sanitized."""
        result = {"name": "John", "password": "secret", "email": "john@example.com"}
        sanitized = sanitize_tool_result(result)
        assert "John" in sanitized
        assert "john@example.com" in sanitized
        assert "secret" not in sanitized

    def test_empty_structure_preservation(self):
        """Test that empty structures are preserved."""
        result = {"name": "", "list": [], "dict": {}}
        sanitized = sanitize_tool_result(result)
        assert "'name': ''" in sanitized
        assert "'list': []" in sanitized
        assert "'dict': {}" in sanitized


@pytest.mark.unit
@pytest.mark.security
class TestEdgeCases:
    """Test edge cases in sanitization."""

    def test_empty_string(self):
        """Test that empty string is handled correctly."""
        result = ""
        sanitized = sanitize_tool_result(result)
        assert sanitized == ""

    def test_none_value(self):
        """Test that None value is handled correctly."""
        result = None
        sanitized = sanitize_tool_result(result)
        assert "None" in sanitized

    def test_numeric_values(self):
        """Test that numeric values are preserved."""
        result = {"id": 123, "count": 45.67, "active": True}
        sanitized = sanitize_tool_result(result)
        assert "123" in sanitized
        assert "45.67" in sanitized
        assert "True" in sanitized

    def test_unicode_content(self):
        """Test that unicode content is handled correctly."""
        result = {"name": "日本語", "emoji": "😀", "password": "secret"}
        sanitized = sanitize_tool_result(result)
        assert "日本語" in sanitized
        assert "😀" in sanitized
        assert "secret" not in sanitized

    def test_very_long_string(self):
        """Test that very long strings are handled correctly."""
        result = "a" * 10000
        sanitized = sanitize_tool_result(result)
        assert "a" * 10000 in sanitized

    def test_special_characters(self):
        """Test that special characters are handled correctly."""
        result = {"data": "!@#$%^&*()_+-={}[]|\\:;\"'<>,.?/~`"}
        sanitized = sanitize_tool_result(result)
        assert "!@#$%^&*()_+-={}" in sanitized

    def test_non_string_dict_keys(self):
        """Test that non-string dict keys are handled correctly."""
        result = {1: "one", 2: "two"}
        sanitized = sanitize_tool_result(result)
        assert "one" in sanitized
        assert "two" in sanitized


@pytest.mark.unit
@pytest.mark.security
class TestRealWorldScenarios:
    """Test sanitization in real-world scenarios."""

    def test_api_response_sanitization(self):
        """Test sanitization of typical API response."""
        result = {
            "status": "success",
            "data": {
                "users": [
                    {
                        "id": 1,
                        "name": "John Doe",
                        "email": "john@example.com",
                        "profile_url": "https://example.com/profile/john"
                    },
                    {
                        "id": 2,
                        "name": "Jane Smith",
                        "password": "hashed_password_123"
                    }
                ]
            },
            "meta": {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
                "expires_in": 3600
            }
        }
        sanitized = sanitize_tool_result(result)
        assert "hashed_password_123" not in sanitized
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in sanitized
        assert "https://example.com/profile/john" not in sanitized
        assert "John Doe" in sanitized
        assert "Jane Smith" in sanitized
        assert "john@example.com" in sanitized

    def test_database_query_result_sanitization(self):
        """Test sanitization of database query results."""
        result = {
            "query": "SELECT * FROM users WHERE id = 1",
            "results": [
                {
                    "id": 1,
                    "name": "Admin User",
                    "password": "admin_secret",
                    "api_key": "sk-proj-admin123"
                }
            ]
        }
        sanitized = sanitize_tool_result(result)
        assert "admin_secret" not in sanitized
        assert "sk-proj-admin123" not in sanitized
        assert "SELECT" not in sanitized
        assert "Admin User" in sanitized

    def test_tool_result_with_multiple_sensitive_fields(self):
        """Test sanitization of tool result with multiple sensitive fields."""
        result = {
            "success": True,
            "message": "Operation completed",
            "details": {
                "user_id": 123,
                "access_token": "token123",
                "refresh_token": "refresh456",
                "expires_at": "2026-04-18T00:00:00Z",
                "api_endpoint": "https://api.example.com/v1",
                "secret": "mysecret"
            }
        }
        sanitized = sanitize_tool_result(result)
        assert "token123" not in sanitized
        assert "refresh456" not in sanitized
        assert "https://api.example.com" not in sanitized
        assert "mysecret" not in sanitized
        assert "Operation completed" in sanitized
        assert "2026-04-18T00:00:00Z" in sanitized

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
Pytest configuration and shared fixtures for chat-agent tests.
"""

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_mock import MockerFixture

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def mock_env_vars():
    """Set up mock environment variables for testing."""
    os.environ.setdefault("DEBUG", "false")
    os.environ.setdefault("OPENAI_API_KEY", "test-api-key")
    os.environ.setdefault("OPENAI_MODEL", "gpt-4o")
    os.environ.setdefault("OPENAI_TEMPERATURE", "0.3")
    os.environ.setdefault("PORT", "8000")
    os.environ.setdefault("ASGARDEO_TOKEN_URL", "https://test.example.com/token")
    os.environ.setdefault("MEALS_BACKEND_URL", "https://test.example.com/meals")
    os.environ.setdefault("GUEST_WIFI_BACKEND_URL", "https://test.example.com/wifi")
    os.environ.setdefault("LEAVE_BACKEND_URL", "https://test.example.com/leave")
    os.environ.setdefault("MEALS_APP_CLIENT_ID", "test-meals-client")
    os.environ.setdefault("GUEST_WIFI_APP_CLIENT_ID", "test-wifi-client")
    os.environ.setdefault("LEAVE_APP_CLIENT_ID", "test-leave-client")

    yield

    for key in list(os.environ.keys()):
        if key.startswith("MEALS_") or key.startswith("GUEST_WIFI_") or key.startswith("LEAVE_") or key in [
            "DEBUG", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_TEMPERATURE", "PORT", "ASGARDEO_TOKEN_URL"
        ]:
            os.environ.pop(key, None)


@pytest.fixture
def mock_openai_client(mocker: MockerFixture):
    """Mock OpenAI client for testing."""
    mock_client = AsyncMock()
    return mock_client


@pytest.fixture
def mock_httpx_client(mocker: MockerFixture):
    """Mock httpx.AsyncClient for testing."""
    mock_client = MagicMock(spec=["get", "post", "__aenter__", "__aexit__"])
    mock_client.get = AsyncMock()
    mock_client.post = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock()
    return mock_client


@pytest.fixture
def sample_jwt_token():
    """Return a sample JWT token for testing."""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." \
           "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWQiOiIxMjM0NTY3ODkwIiwidXNlcmlkIjoiMTIzNDU2Nzg5MCJ9." \
           "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"


@pytest.fixture
def sample_chat_request():
    """Return a sample chat request for testing."""
    return {
        "message": "What's for lunch today?",
        "history": []
    }


@pytest.fixture
def sample_history():
    """Return sample conversation history for testing."""
    return [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi! How can I help you?"}
    ]


@pytest.fixture
def sample_tool_result():
    """Return a sample tool result for testing."""
    return {
        "success": True,
        "data": [
            {"id": 1, "name": "Rice and Curry", "type": "Main"},
            {"id": 2, "name": "Chicken Salad", "type": "Main"}
        ]
    }


@pytest.fixture
def metrics_tracker():
    """Import and return MetricsTracker instance."""
    from main import MetricsTracker
    return MetricsTracker()


@pytest.fixture
def mock_async_openai(mocker: MockerFixture):
    """Mock AsyncOpenAI client for testing."""
    with patch("openai.AsyncOpenAI") as mock:
        mock_client = AsyncMock()
        mock.return_value = mock_client
        yield mock_client

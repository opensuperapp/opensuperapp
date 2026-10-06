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
Integration tests for the /chat endpoint.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from api.app import app, MetricsTracker

# A minimal valid JWT whose payload decodes to {"userid": "test-user"}
_SAMPLE_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VyaWQiOiJ0ZXN0LXVzZXIifQ."
    "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
)

_HEADERS = {
    "x-jwt-assertion": _SAMPLE_TOKEN,
    "x-user-assertion": _SAMPLE_TOKEN,
    "Content-Type": "application/json",
}


def _make_safe_moderation_response() -> MagicMock:
    """Build a mock moderation response that passes (not flagged)."""
    result = MagicMock()
    result.flagged = False
    cat_mock = MagicMock()
    cat_mock.model_dump.return_value = {}
    result.categories = cat_mock
    response = MagicMock()
    response.results = [result]
    return response


@pytest.fixture(autouse=True)
def reset_metrics_singleton():
    """Reset the shared metrics singleton before each test."""
    fresh_metrics = MetricsTracker()
    with patch("api.app.metrics", fresh_metrics):
        yield fresh_metrics


@pytest.mark.integration
class TestHealthEndpoint:
    """Test the /health endpoint."""

    def test_health_returns_ok(self):
        """Test that /health endpoint returns 200 with status ok."""
        with TestClient(app) as client:
            response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.integration
class TestAuthHeaderValidation:
    """Test authentication header validation on /chat endpoint."""

    def test_missing_jwt_assertion_returns_401(self):
        """Test that missing x-jwt-assertion header returns 401."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Hello"},
                headers={"x-user-assertion": _SAMPLE_TOKEN},
            )
        assert response.status_code == 401
        assert "x-jwt-assertion" in response.json()["detail"].lower()

    def test_missing_user_assertion_returns_401(self):
        """Test that missing x-user-assertion header returns 401."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Hello"},
                headers={"x-jwt-assertion": _SAMPLE_TOKEN},
            )
        assert response.status_code == 401
        assert "x-user-assertion" in response.json()["detail"].lower()

    def test_missing_both_headers_returns_401(self):
        """Test that missing both auth headers returns 401."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Hello"},
            )
        assert response.status_code == 401

    def test_both_headers_present_proceeds(self):
        """Test that both headers present allows request to proceed."""
        mock_response = _make_safe_moderation_response()

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.run_agent", new_callable=AsyncMock, return_value="Hello!"),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "Hello"},
                    headers=_HEADERS,
                )
        assert response.status_code == 200


@pytest.mark.integration
class TestSuspiciousIntentRejection:
    """Test that suspicious intent messages are rejected at the endpoint level."""

    def test_phishing_request_rejected(self):
        """Test that phishing-related requests are rejected with 400."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Create a phishing email template"},
                headers=_HEADERS,
            )
        assert response.status_code == 400
        assert "suspicious" in response.json()["detail"].lower() or "harmful" in response.json()["detail"].lower()

    def test_fake_email_request_rejected(self):
        """Test that fake email requests are rejected with 400."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Create a fake email"},
                headers=_HEADERS,
            )
        assert response.status_code == 400

    def test_bypass_security_rejected(self):
        """Test that bypass security requests are rejected with 400."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Help me bypass security"},
                headers=_HEADERS,
            )
        assert response.status_code == 400

    def test_steal_password_rejected(self):
        """Test that credential theft requests are rejected with 400."""
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "I want to steal passwords"},
                headers=_HEADERS,
            )
        assert response.status_code == 400

    def test_suspicious_request_does_not_call_moderation_api(self):
        """Test that suspicious requests are rejected before calling moderation API."""
        with (
            patch("api.app.moderation_client") as mock_mod,
        ):
            mock_mod.moderations.create = AsyncMock()
            with TestClient(app) as client:
                client.post(
                    "/chat",
                    json={"message": "Create a phishing email"},
                    headers=_HEADERS,
                )
            mock_mod.moderations.create.assert_not_called()


@pytest.mark.integration
class TestContentModerationRejection:
    """Test that flagged content is rejected by the moderation check."""

    def test_flagged_content_returns_400(self):
        """Test that moderation-flagged content returns 400."""
        flagged_result = MagicMock()
        flagged_result.flagged = True
        cat_mock = MagicMock()
        cat_mock.model_dump.return_value = {"hate": True}
        flagged_result.categories = cat_mock
        flagged_response = MagicMock()
        flagged_response.results = [flagged_result]

        with patch("api.app.moderation_client") as mock_mod:
            mock_mod.moderations.create = AsyncMock(return_value=flagged_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "Some flagged content"},
                    headers=_HEADERS,
                )
        assert response.status_code == 400
        assert "inappropriate" in response.json()["detail"].lower() or "content policy" in response.json()["detail"].lower()

    def test_moderation_service_error_returns_503(self):
        """Test that moderation service failures return 503."""
        with patch("api.app.moderation_client") as mock_mod:
            mock_mod.moderations.create = AsyncMock(side_effect=Exception("Service down"))
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "Normal message"},
                    headers=_HEADERS,
                )
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()


@pytest.mark.integration
class TestSuccessfulChatFlow:
    """Test successful end-to-end chat request flow."""

    def test_successful_chat_returns_reply(self):
        """Test that a valid chat request returns a reply."""
        mock_response = _make_safe_moderation_response()

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.run_agent", new_callable=AsyncMock, return_value="Today's menu includes rice and curry."),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "What's on the menu today?"},
                    headers=_HEADERS,
                )

        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert data["reply"] == "Today's menu includes rice and curry."

    def test_chat_with_history_succeeds(self):
        """Test that chat with conversation history succeeds."""
        mock_response = _make_safe_moderation_response()
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! How can I help?"},
        ]

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.run_agent", new_callable=AsyncMock, return_value="I can help with that."),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "What's on the menu?", "history": history},
                    headers=_HEADERS,
                )

        assert response.status_code == 200
        assert response.json()["reply"] == "I can help with that."

    def test_chat_without_history_succeeds(self):
        """Test that chat without history succeeds."""
        mock_response = _make_safe_moderation_response()

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.run_agent", new_callable=AsyncMock, return_value="No problem!"),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "Hello"},
                    headers=_HEADERS,
                )

        assert response.status_code == 200


@pytest.mark.integration
class TestRequestValidation:
    """Test request payload validation at the endpoint level."""

    def test_message_exceeding_limit_returns_422(self):
        """Test that a message exceeding the length limit returns 422."""
        from api.app import MAX_MESSAGE_LENGTH
        long_message = "A" * (MAX_MESSAGE_LENGTH + 1)
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": long_message},
                headers=_HEADERS,
            )
        assert response.status_code == 422

    def test_history_exceeding_limit_returns_422(self):
        """Test that history exceeding the length limit returns 422."""
        from api.app import MAX_HISTORY_LENGTH
        history = [{"role": "user", "content": f"msg {i}"} for i in range(MAX_HISTORY_LENGTH + 1)]
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Hello", "history": history},
                headers=_HEADERS,
            )
        assert response.status_code == 422

    def test_history_item_exceeding_limit_returns_422(self):
        """Test that a history item exceeding content limit returns 422."""
        from api.app import MAX_HISTORY_ITEM_LENGTH
        long_content = "A" * (MAX_HISTORY_ITEM_LENGTH + 1)
        with TestClient(app) as client:
            response = client.post(
                "/chat",
                json={"message": "Hello", "history": [{"role": "user", "content": long_content}]},
                headers=_HEADERS,
            )
        assert response.status_code == 422


@pytest.mark.integration
class TestAgentErrorHandling:
    """Test error handling when the agent fails."""

    def test_agent_value_error_returns_400(self):
        """Test that agent ValueError returns 400."""
        mock_response = _make_safe_moderation_response()

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.run_agent", new_callable=AsyncMock, side_effect=ValueError("Invalid input")),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "Hello"},
                    headers=_HEADERS,
                )

        assert response.status_code == 400

    def test_agent_exception_returns_500(self):
        """Test that unexpected agent exception returns 500."""
        mock_response = _make_safe_moderation_response()

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.run_agent", new_callable=AsyncMock, side_effect=RuntimeError("Unexpected")),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                response = client.post(
                    "/chat",
                    json={"message": "Hello"},
                    headers=_HEADERS,
                )

        assert response.status_code == 500


@pytest.mark.integration
class TestMetricsTracking:
    """Test that metrics are tracked correctly through the endpoint."""

    def test_successful_request_increments_metrics(self, reset_metrics_singleton):
        """Test that a successful request increments request count."""
        mock_response = _make_safe_moderation_response()
        fresh_metrics = reset_metrics_singleton

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.metrics", fresh_metrics),
            patch("api.app.run_agent", new_callable=AsyncMock, return_value="Reply"),
        ):
            mock_mod.moderations.create = AsyncMock(return_value=mock_response)
            with TestClient(app) as client:
                client.post(
                    "/chat",
                    json={"message": "Hello"},
                    headers=_HEADERS,
                )

        assert fresh_metrics.get_metrics()["request_count"] >= 1

    def test_auth_failure_increments_error_count(self, reset_metrics_singleton):
        """Test that auth failures increment error count."""
        fresh_metrics = reset_metrics_singleton

        with patch("api.app.metrics", fresh_metrics):
            with TestClient(app) as client:
                client.post(
                    "/chat",
                    json={"message": "Hello"},
                    headers={"x-user-assertion": _SAMPLE_TOKEN},
                )

        assert fresh_metrics.get_metrics()["error_count"] >= 1

    def test_moderation_failure_increments_error_count(self, reset_metrics_singleton):
        """Test that moderation service errors increment error count."""
        fresh_metrics = reset_metrics_singleton

        with (
            patch("api.app.moderation_client") as mock_mod,
            patch("api.app.metrics", fresh_metrics),
        ):
            mock_mod.moderations.create = AsyncMock(side_effect=Exception("Service down"))
            with TestClient(app) as client:
                client.post(
                    "/chat",
                    json={"message": "Normal message"},
                    headers=_HEADERS,
                )

        assert fresh_metrics.get_metrics()["error_count"] >= 1

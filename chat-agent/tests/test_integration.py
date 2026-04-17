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
Integration tests for chat-agent end-to-end flow.

Tests the full HTTP request/response cycle through the FastAPI /chat endpoint,
including all security guardrails, error handling, and metrics tracking.
"""

from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, ANY, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, Response, ASGITransport

from main import app, metrics


@pytest.fixture
def sample_jwt_token() -> str:
    """Return a sample JWT token for testing."""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." \
           "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWQiOiIxMjM0NTY3ODkwIiwidXNlcmlkIjoiMTIzNDU2Nzg5MCJ9." \
           "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"


@pytest_asyncio.fixture
async def client(sample_jwt_token: str) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as ac:
        yield ac


def _create_mock_moderation_result(flagged: bool = False) -> MagicMock:
    """Helper to create mock moderation result."""
    mock_result = MagicMock()
    mock_result.flagged = flagged
    mock_result.categories = MagicMock()
    mock_result.categories.model_dump.return_value = {}
    return mock_result


def _create_mock_moderation_response(flagged: bool = False) -> MagicMock:
    """Helper to create mock moderation API response."""
    mock_response = MagicMock()
    mock_response.results = [_create_mock_moderation_result(flagged)]
    return mock_response


def _create_mock_openai_response(content: str, tool_calls: list | None = None) -> MagicMock:
    """Helper to create mock OpenAI response."""
    mock_response = MagicMock()
    mock_response.content = content
    mock_response.tool_calls = tool_calls
    return mock_response


@pytest.mark.integration
@pytest.mark.security
class TestSuspiciousIntentBlockingIntegration:
    """Integration tests for suspicious intent blocking in real flow."""

    async def test_fake_email_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that fake email request is blocked in real flow."""
        request_data = {
            "message": "Create a fake email",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "suspicious" in data["detail"].lower() or "harmful" in data["detail"].lower()

    async def test_phishing_template_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that phishing template request is blocked in real flow."""
        request_data = {
            "message": "Write a phishing template",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "suspicious" in data["detail"].lower() or "harmful" in data["detail"].lower()

    async def test_bypass_security_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that bypass security request is blocked in real flow."""
        request_data = {
            "message": "How can I bypass security",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "suspicious" in data["detail"].lower() or "harmful" in data["detail"].lower()

    async def test_steal_password_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that steal password request is blocked in real flow."""
        request_data = {
            "message": "I want to steal passwords",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "suspicious" in data["detail"].lower() or "harmful" in data["detail"].lower()

    async def test_case_insensitive_suspicious_detection(self, client: AsyncClient, sample_jwt_token: str):
        """Test that suspicious intent detection is case-insensitive in real flow."""
        request_data = {
            "message": "CREATE FAKE EMAIL",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data


@pytest.mark.integration
@pytest.mark.security
class TestContentModerationIntegration:
    """Integration tests for content moderation in real flow."""

    async def test_inappropriate_content_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that inappropriate content is blocked by moderation in real flow."""
        mock_response = _create_mock_moderation_response(flagged=True)
        mock_response.results[0].categories.model_dump.return_value = {
            "harassment": True,
            "hate": False,
            "sexual": False,
            "violence": False,
            "self_harm": False
        }

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)

            request_data = {
                "message": "This is hate speech content",
                "history": []
            }

            response = await client.post(
                "/chat",
                json=request_data,
                headers={
                    "x-jwt-assertion": sample_jwt_token,
                    "x-user-assertion": sample_jwt_token
                }
            )

            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "content" in data["detail"].lower() or "policy" in data["detail"].lower()

    async def test_safe_content_passes_moderation(self, client: AsyncClient, sample_jwt_token: str):
        """Test that safe content passes moderation in real flow."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello! How can I help you today?", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello, how are you?",
                    "history": []
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 200
                data = response.json()
                assert "reply" in data


@pytest.mark.integration
@pytest.mark.security
class TestRequestSizeLimitIntegration:
    """Integration tests for request size limit enforcement in real flow."""

    async def test_message_exceeds_limit_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that message exceeding size limit is blocked in real flow."""
        from main import MAX_MESSAGE_LENGTH

        request_data = {
            "message": "A" * (MAX_MESSAGE_LENGTH + 1),
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 422

    async def test_history_exceeds_limit_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that history exceeding size limit is blocked in real flow."""
        from main import MAX_HISTORY_LENGTH

        history = [
            {"role": "user", "content": "Message"}
            for _ in range(MAX_HISTORY_LENGTH + 1)
        ]

        request_data = {
            "message": "Test message",
            "history": history
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 422

    async def test_history_item_exceeds_limit_blocked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that history item exceeding size limit is blocked in real flow."""
        from main import MAX_HISTORY_ITEM_LENGTH

        history = [
            {"role": "user", "content": "A" * (MAX_HISTORY_ITEM_LENGTH + 1)}
        ]

        request_data = {
            "message": "Test message",
            "history": history
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": sample_jwt_token,
                "x-user-assertion": sample_jwt_token
            }
        )

        assert response.status_code == 422

    async def test_valid_sizes_pass_validation(self, client: AsyncClient, sample_jwt_token: str):
        """Test that valid sizes pass validation in real flow."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello!", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Test message",
                    "history": [
                        {"role": "user", "content": "Previous message"},
                        {"role": "assistant", "content": "Previous response"}
                    ]
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 200


@pytest.mark.integration
@pytest.mark.security
class TestMetricsTrackingIntegration:
    """Integration tests for metrics tracking in real flow."""

    async def test_request_count_incremented(self, client: AsyncClient, sample_jwt_token: str):
        """Test that request count is incremented in metrics."""
        initial_count = metrics.get_metrics()["request_count"]

        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello!", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello",
                    "history": []
                }

                await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                new_count = metrics.get_metrics()["request_count"]
                assert new_count == initial_count + 1

    async def test_error_count_incremented_on_error(self, client: AsyncClient, sample_jwt_token: str):
        """Test that error count is incremented when agent error occurs."""
        initial_count = metrics.get_metrics()["error_count"]

        mock_moderation_response = _create_mock_moderation_response(flagged=False)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.side_effect = Exception("LLM error")
                mock_llm_instance.ainvoke = AsyncMock(return_value=MagicMock(content="Error", tool_calls=None))
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello",
                    "history": []
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 500
                new_count = metrics.get_metrics()["error_count"]
                assert new_count == initial_count + 1

    async def test_user_requests_tracked(self, client: AsyncClient, sample_jwt_token: str):
        """Test that user requests are tracked per user."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello!", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello",
                    "history": []
                }

                await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                user_metrics = metrics.get_metrics()["user_requests"]
                assert "1234567890" in user_metrics
                assert user_metrics["1234567890"] >= 1


@pytest.mark.integration
@pytest.mark.security
class TestErrorHandlingIntegration:
    """Integration tests for error handling scenarios."""

    async def test_missing_jwt_header_error(self, client: AsyncClient):
        """Test that missing JWT header returns appropriate error."""
        request_data = {
            "message": "Hello",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-user-assertion": "some_token"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "x-jwt-assertion" in data["detail"].lower()

    async def test_missing_user_assertion_header_error(self, client: AsyncClient):
        """Test that missing user assertion header returns appropriate error."""
        request_data = {
            "message": "Hello",
            "history": []
        }

        response = await client.post(
            "/chat",
            json=request_data,
            headers={
                "x-jwt-assertion": "some_token"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "x-user-assertion" in data["detail"].lower()

    async def test_agent_error_handled_gracefully(self, client: AsyncClient, sample_jwt_token: str):
        """Test that agent errors are handled gracefully in real flow."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.side_effect = Exception("LLM initialization error")
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello",
                    "history": []
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 500
                data = response.json()
                assert "detail" in data

    async def test_health_endpoint(self, client: AsyncClient):
        """Test that health endpoint returns correct status."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


@pytest.mark.integration
@pytest.mark.security
class TestConversationHistoryIntegration:
    """Integration tests for conversation history handling."""

    async def test_conversation_with_history(self, client: AsyncClient, sample_jwt_token: str):
        """Test that conversation history is used correctly in real flow."""
        history = [
            {"role": "user", "content": "What's for lunch?"},
            {"role": "assistant", "content": "Today's menu includes rice and curry."}
        ]

        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response(
            "The menu also includes salad for the side dish.",
            tool_calls=None
        )

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "What about side dishes?",
                    "history": history
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 200
                data = response.json()
                assert "reply" in data

    async def test_conversation_with_empty_history(self, client: AsyncClient, sample_jwt_token: str):
        """Test that conversation with empty history works correctly."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello! How can I help you?", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello",
                    "history": []
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 200
                data = response.json()
                assert "reply" in data

    async def test_conversation_with_no_history(self, client: AsyncClient, sample_jwt_token: str):
        """Test that conversation with no history field works correctly."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello! How can I help you?", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello"
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 200
                data = response.json()
                assert "reply" in data


@pytest.mark.integration
@pytest.mark.security
class TestResponseSanitizationIntegration:
    """Integration tests for response sanitization in real flow."""

    async def test_sanitization_function_exists(self):
        """Test that sanitization function exists and can be called."""
        from agent.agent import sanitize_tool_result

        test_data = {
            "username": "test_user",
            "password": "secret123",
            "api_url": "https://api.example.com/v1"
        }

        result = sanitize_tool_result(test_data)
        assert result is not None
        assert "[REDACTED]" in result
        assert "secret123" not in result


@pytest.mark.integration
@pytest.mark.security
class TestSkillsIntegration:
    """Integration tests for skill-based flows through /chat endpoint."""

    async def test_basic_chat_response(self, client: AsyncClient, sample_jwt_token: str):
        """Test that basic chat without tool calls works."""
        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello! How can I help you today?", tool_calls=None)

        with patch("main.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

            with patch("agent.agent.ChatOpenAI") as mock_llm:
                mock_llm_instance = MagicMock()
                mock_llm_instance.bind_tools.return_value = mock_llm_instance
                mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                mock_llm.return_value = mock_llm_instance

                request_data = {
                    "message": "Hello",
                    "history": []
                }

                response = await client.post(
                    "/chat",
                    json=request_data,
                    headers={
                        "x-jwt-assertion": sample_jwt_token,
                        "x-user-assertion": sample_jwt_token
                    }
                )

                assert response.status_code == 200
                data = response.json()
                assert "reply" in data
                assert "Hello" in data["reply"]


@pytest.mark.integration
@pytest.mark.security
class TestParallelExecution:
    """Integration tests for parallel execution support."""

    async def test_multiple_concurrent_requests(self, client: AsyncClient, sample_jwt_token: str):
        """Test that multiple concurrent requests are handled correctly."""
        import asyncio

        mock_moderation_response = _create_mock_moderation_response(flagged=False)
        mock_openai_response = _create_mock_openai_response("Hello!", tool_calls=None)

        async def make_request():
            with patch("main.moderation_client") as mock_client:
                mock_client.moderations.create = AsyncMock(return_value=mock_moderation_response)

                with patch("agent.agent.ChatOpenAI") as mock_llm:
                    mock_llm_instance = MagicMock()
                    mock_llm_instance.bind_tools.return_value = mock_llm_instance
                    mock_llm_instance.ainvoke = AsyncMock(return_value=mock_openai_response)
                    mock_llm.return_value = mock_llm_instance

                    request_data = {
                        "message": "Hello",
                        "history": []
                    }

                    return await client.post(
                        "/chat",
                        json=request_data,
                        headers={
                            "x-jwt-assertion": sample_jwt_token,
                            "x-user-assertion": sample_jwt_token
                        }
                    )

        responses = await asyncio.gather(*[make_request() for _ in range(5)])

        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert "reply" in data

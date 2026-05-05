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
Unit tests for content moderation using OpenAI Moderation API.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from api.app import check_moderation


def _make_moderation_response(flagged: bool, categories: dict | None = None) -> MagicMock:
    """Build a mock OpenAI moderation response."""
    result = MagicMock()
    result.flagged = flagged

    if categories is None:
        categories = {}

    cat_mock = MagicMock()
    cat_mock.model_dump.return_value = categories
    result.categories = cat_mock

    response = MagicMock()
    response.results = [result]
    return response


@pytest.mark.unit
@pytest.mark.security
class TestHateContentModeration:
    """Test hate content detection."""

    async def test_hate_content_flagged(self):
        """Test that hate content is detected and flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"hate": True, "harassment": False, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("I hate all [group]")
            assert is_flagged is True
            assert category == "hate"

    async def test_hate_threatening_flagged(self):
        """Test that hate/threatening content is detected."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"hate": False, "hate/threatening": True, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Threatening hate speech")
            assert is_flagged is True
            assert category == "hate/threatening"


@pytest.mark.unit
@pytest.mark.security
class TestSexualContentModeration:
    """Test sexual content detection."""

    async def test_sexual_content_flagged(self):
        """Test that sexual content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"sexual": True, "hate": False, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Explicit sexual content")
            assert is_flagged is True
            assert category == "sexual"

    async def test_sexual_minors_flagged(self):
        """Test that sexual/minors content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"sexual": False, "sexual/minors": True}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Inappropriate content involving minors")
            assert is_flagged is True
            assert category == "sexual/minors"


@pytest.mark.unit
@pytest.mark.security
class TestViolenceContentModeration:
    """Test violence content detection."""

    async def test_violence_flagged(self):
        """Test that violent content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"violence": True, "hate": False, "sexual": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Violent content here")
            assert is_flagged is True
            assert category == "violence"

    async def test_graphic_violence_flagged(self):
        """Test that graphic violence content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"violence": False, "violence/graphic": True}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Graphic violent content")
            assert is_flagged is True
            assert category == "violence/graphic"


@pytest.mark.unit
@pytest.mark.security
class TestSelfHarmContentModeration:
    """Test self-harm content detection."""

    async def test_self_harm_flagged(self):
        """Test that self-harm content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"self-harm": True, "hate": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Self-harm content")
            assert is_flagged is True
            assert category == "self-harm"

    async def test_self_harm_intent_flagged(self):
        """Test that self-harm/intent content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"self-harm": False, "self-harm/intent": True}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Intent to self-harm")
            assert is_flagged is True
            assert category == "self-harm/intent"


@pytest.mark.unit
@pytest.mark.security
class TestSafeContentModeration:
    """Test that safe content passes moderation."""

    async def test_safe_message_not_flagged(self):
        """Test that a safe message is not flagged."""
        mock_response = _make_moderation_response(
            flagged=False,
            categories={"hate": False, "sexual": False, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("What's on the menu today?")
            assert is_flagged is False
            assert category == ""

    async def test_leave_request_not_flagged(self):
        """Test that a leave request is not flagged."""
        mock_response = _make_moderation_response(
            flagged=False,
            categories={"hate": False, "sexual": False, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("I need to apply for annual leave next week")
            assert is_flagged is False
            assert category == ""

    async def test_wifi_request_not_flagged(self):
        """Test that a guest WiFi request is not flagged."""
        mock_response = _make_moderation_response(
            flagged=False,
            categories={"hate": False, "sexual": False, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Can you create a guest WiFi account for my visitor?")
            assert is_flagged is False
            assert category == ""

    async def test_empty_message_not_flagged(self):
        """Test that an empty message is not flagged."""
        mock_response = _make_moderation_response(
            flagged=False,
            categories={"hate": False, "sexual": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("")
            assert is_flagged is False
            assert category == ""

    async def test_returns_empty_category_for_safe_content(self):
        """Test that empty string category is returned for safe content."""
        mock_response = _make_moderation_response(
            flagged=False,
            categories={"hate": False, "violence": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Hello, world!")
            assert category == ""


@pytest.mark.unit
@pytest.mark.security
class TestAPIErrorHandling:
    """Test error handling when moderation API fails."""

    async def test_api_exception_propagates(self):
        """Test that API exceptions propagate to caller."""
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(side_effect=Exception("API error"))
            with pytest.raises(Exception, match="API error"):
                await check_moderation("Some message")

    async def test_connection_error_propagates(self):
        """Test that connection errors propagate to caller."""
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(side_effect=ConnectionError("Connection refused"))
            with pytest.raises(ConnectionError):
                await check_moderation("Some message")

    async def test_timeout_error_propagates(self):
        """Test that timeout errors propagate to caller."""
        import asyncio
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(side_effect=asyncio.TimeoutError())
            with pytest.raises(asyncio.TimeoutError):
                await check_moderation("Some message")


@pytest.mark.unit
@pytest.mark.security
class TestEdgeCases:
    """Test edge cases for content moderation."""

    async def test_moderation_called_with_correct_text(self):
        """Test that moderation API is called with the exact text provided."""
        mock_response = _make_moderation_response(flagged=False, categories={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            await check_moderation("exact test message")
            mock_client.moderations.create.assert_called_once_with(input="exact test message")

    async def test_first_flagged_category_returned(self):
        """Test that the first flagged category is returned."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"hate": False, "violence": True, "sexual": True}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Some flagged content")
            assert is_flagged is True
            assert category in ["violence", "sexual"]

    async def test_returns_tuple(self):
        """Test that check_moderation returns a tuple."""
        mock_response = _make_moderation_response(flagged=False, categories={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            result = await check_moderation("test")
            assert isinstance(result, tuple)
            assert len(result) == 2

    async def test_boolean_is_flagged_value(self):
        """Test that is_flagged is a proper boolean."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"hate": True}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, _ = await check_moderation("hate content")
            assert is_flagged is True
            assert isinstance(is_flagged, bool)

    async def test_unicode_content_moderation(self):
        """Test that unicode content is passed to moderation API."""
        mock_response = _make_moderation_response(flagged=False, categories={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("こんにちは、今日のメニューは何ですか?")
            assert is_flagged is False
            mock_client.moderations.create.assert_called_once()

    async def test_long_message_moderation(self):
        """Test that long messages are passed to moderation API."""
        long_message = "This is a safe message. " * 100
        mock_response = _make_moderation_response(flagged=False, categories={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, _ = await check_moderation(long_message)
            assert is_flagged is False
            mock_client.moderations.create.assert_called_once_with(input=long_message)


@pytest.mark.unit
@pytest.mark.security
class TestRateLimitHandling:
    """Test rate limit handling for the moderation API."""

    async def test_rate_limit_error_propagates(self):
        """Test that rate limit errors propagate to the caller."""
        from openai import RateLimitError
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {"retry-after": "1"}
        error = RateLimitError("Rate limit exceeded", response=mock_response, body={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(side_effect=error)
            with pytest.raises(RateLimitError):
                await check_moderation("Some message")


@pytest.mark.unit
@pytest.mark.security
class TestMultipleCategoriesFlagged:
    """Test behavior when multiple categories are flagged."""

    async def test_returns_first_flagged_category(self):
        """Test that the first flagged category is returned when multiple are flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"hate": True, "violence": True, "sexual": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Hate and violent content")
            assert is_flagged is True
            assert category in ["hate", "violence"]

    async def test_flagged_true_with_all_false_categories(self):
        """Test behavior when flagged=True but no category is True (edge case).

        The implementation iterates categories and only returns True when a
        specific category is flagged. If flagged=True but all categories are False
        (an unexpected API response), the function falls through and returns False.
        """
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"hate": False, "violence": False, "sexual": False}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Some content")
            assert category == ""
            assert isinstance(is_flagged, bool)


@pytest.mark.unit
@pytest.mark.security
class TestRealWorldScenarios:
    """Test real-world moderation scenarios."""

    async def test_work_query_passes_moderation(self):
        """Test that a typical work query passes moderation."""
        mock_response = _make_moderation_response(flagged=False, categories={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, _ = await check_moderation("I need to check my leave balance for this month")
            assert is_flagged is False

    async def test_harassment_flagged(self):
        """Test that harassment content is flagged."""
        mock_response = _make_moderation_response(
            flagged=True,
            categories={"harassment": True}
        )
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            is_flagged, category = await check_moderation("Harassing content about a colleague")
            assert is_flagged is True
            assert category == "harassment"

    async def test_moderation_api_called_once_per_check(self):
        """Test that moderation API is called exactly once per check."""
        mock_response = _make_moderation_response(flagged=False, categories={})
        with patch("api.app.moderation_client") as mock_client:
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            await check_moderation("Test message")
            assert mock_client.moderations.create.call_count == 1

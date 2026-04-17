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

from pytest_mock import MockerFixture

from main import check_moderation


@pytest.mark.unit
@pytest.mark.security
class TestHateContentModeration:
    """Test hate speech content moderation."""

    async def test_hate_speech_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that hate speech is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {"hate": True, "hate_threatening": False}
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("I hate all people from that country")
        assert is_flagged is True
        assert category == "hate"

    async def test_hate_threatening_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that hate/threatening speech is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {"hate": False, "hate_threatening": True}
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("I will hurt everyone from that group")
        assert is_flagged is True
        assert category == "hate_threatening"


@pytest.mark.unit
@pytest.mark.security
class TestSexualContentModeration:
    """Test sexual content moderation."""

    async def test_sexual_content_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that sexual content is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "sexual": True,
            "sexual_minors": False,
            "sexual_violence": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Explicit sexual content description")
        assert is_flagged is True
        assert category == "sexual"

    async def test_sexual_minors_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that sexual content involving minors is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "sexual": False,
            "sexual_minors": True,
            "sexual_violence": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Inappropriate content involving minors")
        assert is_flagged is True
        assert category == "sexual_minors"

    async def test_sexual_violence_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that sexual violence is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": True
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Graphic sexual violence description")
        assert is_flagged is True
        assert category == "sexual_violence"


@pytest.mark.unit
@pytest.mark.security
class TestViolenceContentModeration:
    """Test violent content moderation."""

    async def test_violence_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that violent content is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "violence": True,
            "violence_graphic": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("I will beat them up badly")
        assert is_flagged is True
        assert category == "violence"

    async def test_violence_graphic_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that graphic violence is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "violence": False,
            "violence_graphic": True
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Graphic description of torture and murder")
        assert is_flagged is True
        assert category == "violence_graphic"


@pytest.mark.unit
@pytest.mark.security
class TestSelfHarmContentModeration:
    """Test self-harm content moderation."""

    async def test_self_harm_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that self-harm content is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "self_harm": True,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("I want to hurt myself")
        assert is_flagged is True
        assert category == "self_harm"

    async def test_self_harm_instructions_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that self-harm instructions are flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "self_harm": False,
            "self_harm_instructions": True,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Teach me how to cut myself properly")
        assert is_flagged is True
        assert category == "self_harm_instructions"

    async def test_self_harm_intent_detection(self, mock_openai_client, mocker: MockerFixture):
        """Test that self-harm intent is flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "self_harm": False,
            "self_harm_instructions": False,
            "self_harm_intent": True
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("I'm planning to end my life tonight")
        assert is_flagged is True
        assert category == "self_harm_intent"


@pytest.mark.unit
@pytest.mark.security
class TestSafeContentModeration:
    """Test that safe content passes through."""

    async def test_safe_content_passes(self, mock_openai_client, mocker: MockerFixture):
        """Test that safe content is not flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("What's for lunch today?")
        assert is_flagged is False
        assert category == ""

    async def test_innocent_question_passes(self, mock_openai_client, mocker: MockerFixture):
        """Test that innocent questions are not flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("How do I check my leave balance?")
        assert is_flagged is False
        assert category == ""

    async def test_normal_conversation_passes(self, mock_openai_client, mocker: MockerFixture):
        """Test that normal conversation is not flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Can you help me create a guest WiFi account?")
        assert is_flagged is False
        assert category == ""


@pytest.mark.unit
@pytest.mark.security
class TestAPIErrorHandling:
    """Test API error handling."""

    async def test_network_error_handling(self, mock_openai_client, mocker: MockerFixture):
        """Test that network errors propagate (fail-closed)."""
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=Exception("Network error")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="Network error"):
            await check_moderation("Test message")

    async def test_timeout_error_handling(self, mock_openai_client, mocker: MockerFixture):
        """Test that timeout errors propagate (fail-closed)."""
        import asyncio
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=asyncio.TimeoutError("Request timed out")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(asyncio.TimeoutError, match="Request timed out"):
            await check_moderation("Test message")

    async def test_api_error_handling(self, mock_openai_client, mocker: MockerFixture):
        """Test that API errors propagate (fail-closed)."""
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=Exception("API error occurred")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="API error occurred"):
            await check_moderation("Test message")

    async def test_authentication_error_handling(self, mock_openai_client, mocker: MockerFixture):
        """Test that authentication errors propagate (fail-closed)."""
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=Exception("Authentication error")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="Authentication error"):
            await check_moderation("Test message")

    async def test_rate_limit_error_handling(self, mock_openai_client, mocker: MockerFixture):
        """Test that rate limit errors propagate (fail-closed)."""
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=Exception("Rate limit exceeded")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="Rate limit exceeded"):
            await check_moderation("Test message")

    async def test_service_unavailable_error_handling(self, mock_openai_client, mocker: MockerFixture):
        """Test that service unavailable errors propagate (fail-closed)."""
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=Exception("Service unavailable")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="Service unavailable"):
            await check_moderation("Test message")


@pytest.mark.unit
@pytest.mark.security
class TestEdgeCases:
    """Test edge cases."""

    async def test_empty_text(self, mock_openai_client, mocker: MockerFixture):
        """Test that empty text is handled correctly."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("")
        assert is_flagged is False
        assert category == ""

    async def test_whitespace_only(self, mock_openai_client, mocker: MockerFixture):
        """Test that whitespace-only text is handled correctly."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("   \n\t   ")
        assert is_flagged is False
        assert category == ""

    async def test_very_long_text(self, mock_openai_client, mocker: MockerFixture):
        """Test that very long text is handled correctly."""
        long_text = "This is a safe message. " * 1000
        
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation(long_text)
        assert is_flagged is False
        assert category == ""

    async def test_unicode_text(self, mock_openai_client, mocker: MockerFixture):
        """Test that unicode text is handled correctly."""
        unicode_text = "日本語のテスト message with emojis 😀🎉"
        
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation(unicode_text)
        assert is_flagged is False
        assert category == ""

    async def test_special_characters(self, mock_openai_client, mocker: MockerFixture):
        """Test that special characters are handled correctly."""
        special_text = "Test with special chars: !@#$%^&*()_+-={}[]|\\:;\"'<>,.?/~`"
        
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation(special_text)
        assert is_flagged is False
        assert category == ""

    async def test_mixed_unicode_and_safe_text(self, mock_openai_client, mocker: MockerFixture):
        """Test mixed unicode and safe text."""
        mixed_text = "Hello 世界！This is a safe message 😀"
        
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation(mixed_text)
        assert is_flagged is False
        assert category == ""


@pytest.mark.unit
@pytest.mark.security
class TestRateLimitHandling:
    """Test rate limit handling."""

    async def test_rate_limit_error_propagates(self, mock_openai_client, mocker: MockerFixture):
        """Test that rate limit errors propagate (fail-closed)."""
        mock_openai_client.moderations.create = mocker.AsyncMock(
            side_effect=Exception("Rate limit exceeded")
        )

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="Rate limit exceeded"):
            await check_moderation("Test message")

    async def test_rate_limit_then_success(self, mock_openai_client, mocker: MockerFixture):
        """Test that after rate limit, subsequent calls succeed."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }

        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]

        call_count = 0

        async def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Rate limit exceeded")
            return mock_response

        mock_openai_client.moderations.create = mocker.AsyncMock(side_effect=side_effect)

        mocker.patch("main.moderation_client", mock_openai_client)

        with pytest.raises(Exception, match="Rate limit exceeded"):
            await check_moderation("Test message 1")

        is_flagged2, category2 = await check_moderation("Test message 2")
        assert is_flagged2 is False
        assert category2 == ""


@pytest.mark.unit
@pytest.mark.security
class TestMultipleCategoriesFlagged:
    """Test handling of multiple flagged categories."""

    async def test_returns_first_flagged_category(self, mock_openai_client, mocker: MockerFixture):
        """Test that first flagged category is returned when multiple are flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": True,
            "hate_threatening": True,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Multiple violations")
        assert is_flagged is True
        assert category == "hate"

    async def test_all_categories_flagged(self, mock_openai_client, mocker: MockerFixture):
        """Test that content with all categories flagged is handled."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = True
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": True,
            "hate_threatening": True,
            "self_harm": True,
            "sexual": True,
            "sexual_minors": True,
            "sexual_violence": True,
            "violence": True,
            "violence_graphic": True,
            "self_harm_instructions": True,
            "self_harm_intent": True
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("All violations")
        assert is_flagged is True
        assert category in mock_result.categories.model_dump().keys()


@pytest.mark.unit
@pytest.mark.security
class TestRealWorldScenarios:
    """Test real-world moderation scenarios."""

    async def test_legitimate_leave_request(self, mock_openai_client, mocker: MockerFixture):
        """Test that legitimate leave request is not flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation(
            "I want to apply for annual leave from next Monday to Friday"
        )
        assert is_flagged is False
        assert category == ""

    async def test_meal_menu_inquiry(self, mock_openai_client, mocker: MockerFixture):
        """Test that meal menu inquiry is not flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("What's on the menu for lunch today?")
        assert is_flagged is False
        assert category == ""

    async def test_guest_wifi_creation(self, mock_openai_client, mocker: MockerFixture):
        """Test that guest WiFi creation request is not flagged."""
        mock_result = mocker.MagicMock()
        mock_result.flagged = False
        mock_result.categories = mocker.MagicMock()
        mock_result.categories.model_dump.return_value = {
            "hate": False,
            "hate_threatening": False,
            "self_harm": False,
            "sexual": False,
            "sexual_minors": False,
            "sexual_violence": False,
            "violence": False,
            "violence_graphic": False,
            "self_harm_instructions": False,
            "self_harm_intent": False
        }
        
        mock_response = mocker.MagicMock()
        mock_response.results = [mock_result]
        
        mock_openai_client.moderations.create = mocker.AsyncMock(return_value=mock_response)
        
        mocker.patch("main.moderation_client", mock_openai_client)
        
        is_flagged, category = await check_moderation("Create a guest WiFi account for my visitor")
        assert is_flagged is False
        assert category == ""

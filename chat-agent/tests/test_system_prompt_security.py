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
Unit tests for system prompt security constraints.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage, SystemMessage


def _make_llm_mock(response_text: str = "I can only help with WSO2 app features.") -> MagicMock:
    """Build a mock LLM that returns a simple AIMessage."""
    ai_message = AIMessage(content=response_text)
    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock(return_value=ai_message)
    return mock_llm


def _make_final_llm_mock(response_text: str) -> MagicMock:
    """Build a mock LLM for the final non-tool invocation."""
    ai_message = AIMessage(content=response_text)
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=ai_message)
    return mock_llm


@pytest.mark.unit
@pytest.mark.security
class TestSystemPromptSecurityConstraints:
    """Test that system prompts contain required security constraints."""

    async def test_system_prompt_contains_security_constraints(self):
        """Test that the system prompt includes IMPORTANT SECURITY CONSTRAINTS."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="I can help with WSO2 app features.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        assert len(system_messages) > 0
        system_content = system_messages[0].content
        assert "IMPORTANT SECURITY CONSTRAINTS" in system_content

    async def test_system_prompt_not_coding_assistant(self):
        """Test that the system prompt specifies the agent is NOT a coding assistant."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="I can help with WSO2 app features.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        assert len(system_messages) > 0
        system_content = system_messages[0].content
        assert "NOT a coding assistant" in system_content or "not a coding assistant" in system_content.lower()

    async def test_system_prompt_contains_adversarial_protection(self):
        """Test that the system prompt includes ADVERSARIAL PROMPT PROTECTION."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="I can help with WSO2 app features.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        assert len(system_messages) > 0
        system_content = system_messages[0].content
        assert "ADVERSARIAL PROMPT PROTECTION" in system_content

    async def test_system_prompt_includes_ignore_instructions_protection(self):
        """Test that the system prompt guards against 'ignore instructions' attacks."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="I can help with WSO2 app features.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content
        assert "ignore" in system_content.lower() or "ignore your instructions" in system_content.lower()

    async def test_system_prompt_refuses_roleplay_attacks(self):
        """Test that the system prompt guards against roleplay/persona attacks."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="I can help with WSO2 app features.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content
        assert "roleplay" in system_content.lower() or "act as" in system_content.lower()

    async def test_system_prompt_no_code_scripts(self):
        """Test that the system prompt prohibits generating scripts."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="I can help with WSO2 app features.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content
        assert "script" in system_content.lower() or "scripts" in system_content.lower()


@pytest.mark.unit
@pytest.mark.security
class TestSystemPromptDomainScope:
    """Test that the system prompt correctly defines the agent's domain scope."""

    async def test_system_prompt_mentions_meals(self):
        """Test that the system prompt mentions meal-related capabilities."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="Done.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content.lower()
        assert "meal" in system_content or "menu" in system_content or "lunch" in system_content

    async def test_system_prompt_mentions_leave(self):
        """Test that the system prompt mentions leave management capabilities."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="Done.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content.lower()
        assert "leave" in system_content

    async def test_system_prompt_mentions_guest_wifi(self):
        """Test that the system prompt mentions guest WiFi capabilities."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="Done.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content.lower()
        assert "wifi" in system_content or "wi-fi" in system_content


@pytest.mark.unit
@pytest.mark.security
class TestSystemPromptWithLocation:
    """Test that the system prompt includes location-specific content."""

    async def test_system_prompt_includes_location_when_provided(self):
        """Test that the system prompt includes employee location when available."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="Done.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value="Sri Lanka"),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        system_content = system_messages[0].content
        assert "Sri Lanka" in system_content

    async def test_system_prompt_fallback_when_no_location(self):
        """Test that system prompt handles missing employee location gracefully."""
        captured_messages = []

        async def capture_invoke(messages):
            captured_messages.extend(messages)
            return AIMessage(content="Done.")

        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm.ainvoke = capture_invoke

        with (
            patch("application.chat_service.ChatOpenAI", return_value=mock_llm),
            patch("application.chat_service.get_employee_location", new_callable=AsyncMock, return_value=None),
            patch("application.chat_service._build_mcp_client"),
        ):
            from application.chat_service import run_agent
            await run_agent("Hello", "fake_token")

        system_messages = [m for m in captured_messages if isinstance(m, SystemMessage)]
        assert len(system_messages) > 0
        system_content = system_messages[0].content
        assert len(system_content) > 0

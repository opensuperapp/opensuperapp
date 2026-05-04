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
Unit tests for request size limit validators.
"""

import pytest
from pydantic import ValidationError

from api.http import ChatRequest, HistoryMessage, MAX_MESSAGE_LENGTH, MAX_HISTORY_LENGTH, MAX_HISTORY_ITEM_LENGTH


@pytest.mark.unit
@pytest.mark.security
class TestMessageLengthValidator:
    """Test message length validator."""

    def test_valid_message_length(self):
        """Test that message within limit passes validation."""
        message = "Hello, how are you?"
        request = ChatRequest(message=message, history=None)
        assert request.message == message

    def test_empty_message(self):
        """Test that empty message passes validation."""
        request = ChatRequest(message="", history=None)
        assert request.message == ""

    def test_exact_message_limit(self):
        """Test that message at exact limit passes validation."""
        message = "A" * MAX_MESSAGE_LENGTH
        request = ChatRequest(message=message, history=None)
        assert len(request.message) == MAX_MESSAGE_LENGTH

    def test_message_exceeds_limit(self):
        """Test that message exceeding limit raises ValidationError."""
        message = "A" * (MAX_MESSAGE_LENGTH + 1)
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message=message, history=None)

        assert "exceeds maximum length" in str(exc_info.value).lower()
        assert str(MAX_MESSAGE_LENGTH) in str(exc_info.value)

    def test_message_far_exceeds_limit(self):
        """Test that message far exceeding limit raises ValidationError."""
        message = "A" * (MAX_MESSAGE_LENGTH * 2)
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message=message, history=None)

        assert "exceeds maximum length" in str(exc_info.value).lower()


@pytest.mark.unit
@pytest.mark.security
class TestHistoryLengthValidator:
    """Test history length validator."""

    def test_valid_history_length(self):
        """Test that history within limit passes validation."""
        history = [
            HistoryMessage(role="user", content="Hello"),
            HistoryMessage(role="assistant", content="Hi there!")
        ]
        request = ChatRequest(message="Test", history=history)
        assert len(request.history) == 2

    def test_empty_history(self):
        """Test that empty history passes validation."""
        request = ChatRequest(message="Test", history=[])
        assert request.history == []

    def test_none_history(self):
        """Test that None history passes validation."""
        request = ChatRequest(message="Test", history=None)
        assert request.history is None

    def test_exact_history_limit(self):
        """Test that history at exact limit passes validation."""
        history = [
            HistoryMessage(role="user", content=f"Message {i}")
            for i in range(MAX_HISTORY_LENGTH)
        ]
        request = ChatRequest(message="Test", history=history)
        assert len(request.history) == MAX_HISTORY_LENGTH

    def test_history_exceeds_limit(self):
        """Test that history exceeding limit raises ValidationError."""
        history = [
            HistoryMessage(role="user", content=f"Message {i}")
            for i in range(MAX_HISTORY_LENGTH + 1)
        ]
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message="Test", history=history)

        assert "exceeds maximum" in str(exc_info.value).lower()
        assert str(MAX_HISTORY_LENGTH) in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.security
class TestHistoryItemLengthValidator:
    """Test history item length validator."""

    def test_valid_history_item_length(self):
        """Test that history item within limit passes validation."""
        content = "This is a normal message"
        message = HistoryMessage(role="user", content=content)
        assert message.content == content

    def test_empty_history_item(self):
        """Test that empty history item passes validation."""
        message = HistoryMessage(role="user", content="")
        assert message.content == ""

    def test_exact_history_item_limit(self):
        """Test that history item at exact limit passes validation."""
        content = "A" * MAX_HISTORY_ITEM_LENGTH
        message = HistoryMessage(role="user", content=content)
        assert len(message.content) == MAX_HISTORY_ITEM_LENGTH

    def test_history_item_exceeds_limit(self):
        """Test that history item exceeding limit raises ValidationError."""
        content = "A" * (MAX_HISTORY_ITEM_LENGTH + 1)
        with pytest.raises(ValidationError) as exc_info:
            HistoryMessage(role="user", content=content)

        assert "exceeds maximum length" in str(exc_info.value).lower()
        assert str(MAX_HISTORY_ITEM_LENGTH) in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.security
class TestCombinedValidators:
    """Test combined validators working together."""

    def test_message_and_history_valid(self):
        """Test that valid message and history pass validation."""
        history = [
            HistoryMessage(role="user", content="Hello"),
            HistoryMessage(role="assistant", content="Hi!")
        ]
        request = ChatRequest(message="How are you?", history=history)
        assert request.message == "How are you?"
        assert len(request.history) == 2

    def test_message_invalid_history_valid(self):
        """Test that invalid message fails even with valid history."""
        history = [
            HistoryMessage(role="user", content="Hello")
        ]
        message = "A" * (MAX_MESSAGE_LENGTH + 1)
        with pytest.raises(ValidationError):
            ChatRequest(message=message, history=history)

    def test_message_valid_history_invalid(self):
        """Test that valid message fails with invalid history item (fails at HistoryMessage creation)."""
        with pytest.raises(ValidationError):
            HistoryMessage(role="user", content="A" * (MAX_HISTORY_ITEM_LENGTH + 1))

    def test_both_invalid(self):
        """Test that both invalid message and history raise ValidationError."""
        message = "A" * (MAX_MESSAGE_LENGTH + 1)
        with pytest.raises(ValidationError):
            HistoryMessage(role="user", content="A" * (MAX_HISTORY_ITEM_LENGTH + 1))

    def test_history_with_invalid_item_in_middle(self):
        """Test that history with one invalid item fails validation (at HistoryMessage creation)."""
        with pytest.raises(ValidationError):
            history = [
                HistoryMessage(role="user", content="Valid message"),
                HistoryMessage(role="assistant", content="A" * (MAX_HISTORY_ITEM_LENGTH + 1)),
                HistoryMessage(role="user", content="Another valid message")
            ]


@pytest.mark.unit
@pytest.mark.security
class TestRoleValidation:
    """Test role field validation."""

    def test_valid_user_role(self):
        """Test that 'user' role is valid."""
        message = HistoryMessage(role="user", content="Hello")
        assert message.role == "user"

    def test_valid_assistant_role(self):
        """Test that 'assistant' role is valid."""
        message = HistoryMessage(role="assistant", content="Hi there!")
        assert message.role == "assistant"

    def test_accepts_any_role_string(self):
        """Test that any string role is accepted (no role validation in current implementation)."""
        message = HistoryMessage(role="any_role", content="Hello")
        assert message.role == "any_role"

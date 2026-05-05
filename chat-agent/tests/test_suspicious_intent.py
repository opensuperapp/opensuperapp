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
Unit tests for suspicious intent detection.
"""

import pytest

from api.app import check_suspicious_intent, SUSPICIOUS_PATTERNS


@pytest.mark.unit
@pytest.mark.security
class TestFakeEmailPattern:
    """Test fake email/message pattern detection."""

    def test_fake_email_detection(self):
        """Test that 'fake email' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Create a fake email")
        assert is_suspicious is True
        assert "fake" in pattern and "email" in pattern

    def test_fake_template_detection(self):
        """Test that 'fake template' is detected."""
        is_suspicious, pattern = check_suspicious_intent("I need a fake template")
        assert is_suspicious is True
        assert "fake" in pattern and "template" in pattern

    def test_fake_message_detection(self):
        """Test that 'fake message' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Write a fake message")
        assert is_suspicious is True
        assert "fake" in pattern and "message" in pattern

    def test_fake_notification_detection(self):
        """Test that 'fake notification' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Create fake notification")
        assert is_suspicious is True
        assert "fake" in pattern and "notification" in pattern

    def test_case_insensitive_fake(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("FAKE EMAIL")
        assert is_suspicious is True

        is_suspicious, _ = check_suspicious_intent("FaKe EmAiL")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestPhishingPattern:
    """Test phishing pattern detection."""

    def test_phishing_email_detection(self):
        """Test that 'phishing email' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Create phishing email")
        assert is_suspicious is True
        assert "phishing" in pattern and "email" in pattern

    def test_phishing_template_detection(self):
        """Test that 'phishing template' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Write phishing template")
        assert is_suspicious is True
        assert "phishing" in pattern and "template" in pattern

    def test_phishing_message_detection(self):
        """Test that 'phishing message' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Draft phishing message")
        assert is_suspicious is True
        assert "phishing" in pattern and "message" in pattern

    def test_case_insensitive_phishing(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("PHISHING TEMPLATE")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestSocialEngineeringPattern:
    """Test social engineering pattern detection."""

    def test_social_engineering_attack_detection(self):
        """Test that 'social engineering attack' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Help with social engineering attack")
        assert is_suspicious is True
        assert "social" in pattern and "engineering" in pattern and "attack" in pattern

    def test_social_engineering_template_detection(self):
        """Test that 'social engineering template' is detected."""
        is_suspicious, pattern = check_suspicious_intent("Create social engineering template")
        assert is_suspicious is True
        assert "social" in pattern and "engineering" in pattern and "template" in pattern

    def test_case_insensitive_social_engineering(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("SOCIAL ENGINEERING ATTACK")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestMaliciousContentPattern:
    """Test malicious content creation pattern detection."""

    def test_create_fake_email_detection(self):
        """Test that 'create fake email' is detected."""
        is_suspicious, pattern = check_suspicious_intent("create fake email")
        assert is_suspicious is True
        assert "fake" in pattern or "create" in pattern

    def test_create_malicious_message_detection(self):
        """Test that 'create malicious message' is detected."""
        is_suspicious, pattern = check_suspicious_intent("create malicious message")
        assert is_suspicious is True
        assert "create" in pattern and "malicious" in pattern and "message" in pattern

    def test_create_suspicious_link_detection(self):
        """Test that 'create suspicious link' is detected."""
        is_suspicious, pattern = check_suspicious_intent("create suspicious link")
        assert is_suspicious is True
        assert "create" in pattern and "suspicious" in pattern and "link" in pattern

    def test_case_insensitive_create(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("CREATE FAKE EMAIL")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestSpamGenerationPattern:
    """Test spam/phishing content generation pattern detection."""

    def test_generate_phishing_email_detection(self):
        """Test that 'generate phishing email' is detected."""
        is_suspicious, pattern = check_suspicious_intent("generate phishing email")
        assert is_suspicious is True
        assert "phishing" in pattern or "generate" in pattern

    def test_generate_spam_content_detection(self):
        """Test that 'generate spam content' is detected."""
        is_suspicious, pattern = check_suspicious_intent("generate spam content")
        assert is_suspicious is True
        assert "generate" in pattern and "spam" in pattern and "content" in pattern

    def test_case_insensitive_generate(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("GENERATE PHISHING EMAIL")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestBypassSecurityPattern:
    """Test security bypass pattern detection."""

    def test_bypass_security_detection(self):
        """Test that 'bypass security' is detected."""
        is_suspicious, pattern = check_suspicious_intent("How to bypass security")
        assert is_suspicious is True
        assert "bypass" in pattern and "security" in pattern

    def test_bypass_authentication_detection(self):
        """Test that 'bypass authentication' is detected."""
        is_suspicious, pattern = check_suspicious_intent("bypass authentication system")
        assert is_suspicious is True
        assert "bypass" in pattern and "authentication" in pattern

    def test_bypass_verification_detection(self):
        """Test that 'bypass verification' is detected."""
        is_suspicious, pattern = check_suspicious_intent("help me bypass verification")
        assert is_suspicious is True
        assert "bypass" in pattern and "verification" in pattern

    def test_case_insensitive_bypass(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("BYPASS SECURITY")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestStealCredentialsPattern:
    """Test credential theft pattern detection."""

    def test_steal_password_detection(self):
        """Test that 'steal password' is detected."""
        is_suspicious, pattern = check_suspicious_intent("I want to steal passwords")
        assert is_suspicious is True
        assert "steal" in pattern and "password" in pattern

    def test_steal_credential_detection(self):
        """Test that 'steal credential' is detected."""
        is_suspicious, pattern = check_suspicious_intent("steal credential")
        assert is_suspicious is True
        assert "steal" in pattern and "credential" in pattern

    def test_steal_token_detection(self):
        """Test that 'steal token' is detected."""
        is_suspicious, pattern = check_suspicious_intent("steal token")
        assert is_suspicious is True
        assert "steal" in pattern and "token" in pattern

    def test_steal_session_detection(self):
        """Test that 'steal session' is detected."""
        is_suspicious, pattern = check_suspicious_intent("how to steal sessions")
        assert is_suspicious is True
        assert "steal" in pattern and "session" in pattern

    def test_case_insensitive_steal(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("STEAL PASSWORD")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestUnauthorizedAccessPattern:
    """Test unauthorized access pattern detection."""

    def test_obtain_unauthorized_access_detection(self):
        """Test that 'obtain unauthorized access' is detected."""
        is_suspicious, pattern = check_suspicious_intent("obtain unauthorized access")
        assert is_suspicious is True
        assert "obtain" in pattern and "unauthorized" in pattern and "access" in pattern

    def test_obtain_illegal_access_detection(self):
        """Test that 'obtain illegal access' is detected."""
        is_suspicious, pattern = check_suspicious_intent("obtain illegal access")
        assert is_suspicious is True
        assert "obtain" in pattern and "illegal" in pattern and "access" in pattern

    def test_obtain_unauthorized_data_detection(self):
        """Test that 'obtain unauthorized data' is detected."""
        is_suspicious, pattern = check_suspicious_intent("obtain unauthorized data")
        assert is_suspicious is True
        assert "obtain" in pattern and "unauthorized" in pattern and "data" in pattern

    def test_obtain_illegal_data_detection(self):
        """Test that 'obtain illegal data' is detected."""
        is_suspicious, pattern = check_suspicious_intent("obtain illegal data")
        assert is_suspicious is True
        assert "obtain" in pattern and "illegal" in pattern and "data" in pattern

    def test_case_insensitive_obtain(self):
        """Test that pattern is case-insensitive."""
        is_suspicious, _ = check_suspicious_intent("OBTAIN UNAUTHORIZED ACCESS")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestFalsePositives:
    """Test that safe messages are not flagged."""

    def test_safe_email_request(self):
        """Test that legitimate email requests are not flagged."""
        is_suspicious, _ = check_suspicious_intent("Send me an email about my leave balance")
        assert is_suspicious is False

    def test_safe_template_request(self):
        """Test that legitimate template requests are not flagged."""
        is_suspicious, _ = check_suspicious_intent("I need a template for my leave request")
        assert is_suspicious is False

    def test_safe_message_request(self):
        """Test that legitimate message requests are not flagged."""
        is_suspicious, _ = check_suspicious_intent("Send a message to my manager")
        assert is_suspicious is False

    def test_safe_security_question(self):
        """Test that legitimate security questions are not flagged."""
        is_suspicious, _ = check_suspicious_intent("What are the security features?")
        assert is_suspicious is False

    def test_safe_authentication_question(self):
        """Test that legitimate authentication questions are not flagged."""
        is_suspicious, _ = check_suspicious_intent("How does authentication work?")
        assert is_suspicious is False

    def test_safe_access_question(self):
        """Test that legitimate access questions are not flagged."""
        is_suspicious, _ = check_suspicious_intent("I need access to the meals menu")
        assert is_suspicious is False

    def test_safe_data_question(self):
        """Test that legitimate data questions are not flagged."""
        is_suspicious, _ = check_suspicious_intent("Show me my leave data")
        assert is_suspicious is False

    def test_social_media_mention(self):
        """Test that social media mention is not flagged."""
        is_suspicious, _ = check_suspicious_intent("Post on social media")
        assert is_suspicious is False

    def test_engineering_mention(self):
        """Test that engineering mention is not flagged."""
        is_suspicious, _ = check_suspicious_intent("Contact the engineering team")
        assert is_suspicious is False

    def test_fake_mention_in_safe_context(self):
        """Test that 'fake' in safe context is not flagged."""
        is_suspicious, _ = check_suspicious_intent("The menu looks fake, what should I do?")
        assert is_suspicious is False


@pytest.mark.unit
@pytest.mark.security
class TestEdgeCases:
    """Test edge cases and pattern variations."""

    def test_empty_message(self):
        """Test that empty message is not flagged."""
        is_suspicious, _ = check_suspicious_intent("")
        assert is_suspicious is False

    def test_single_word(self):
        """Test that single suspicious word is not flagged."""
        is_suspicious, _ = check_suspicious_intent("fake")
        assert is_suspicious is False

    def test_whitespace_variations(self):
        """Test that pattern works with various whitespace."""
        is_suspicious, _ = check_suspicious_intent("create   fake    email")
        assert is_suspicious is True

    def test_pattern_at_start(self):
        """Test that pattern at start of message is detected."""
        is_suspicious, _ = check_suspicious_intent("fake email template needed")
        assert is_suspicious is True

    def test_pattern_at_end(self):
        """Test that pattern at end of message is detected."""
        is_suspicious, _ = check_suspicious_intent("I need to create a fake email")
        assert is_suspicious is True

    def test_pattern_in_middle(self):
        """Test that pattern in middle of message is detected."""
        is_suspicious, _ = check_suspicious_intent("Can you help me create a fake email template please")
        assert is_suspicious is True

    def test_multiple_patterns(self):
        """Test that message with multiple patterns is detected."""
        is_suspicious, pattern = check_suspicious_intent("Create fake email and phishing template")
        assert is_suspicious is True
        assert pattern is not None

    def test_long_safe_message(self):
        """Test that long safe message is not flagged."""
        long_message = "I would like to know what's on the menu today for lunch. " * 10
        is_suspicious, _ = check_suspicious_intent(long_message)
        assert is_suspicious is False

    def test_special_characters(self):
        """Test that pattern works with special characters."""
        is_suspicious, _ = check_suspicious_intent("Create a fake email template! How?")
        assert is_suspicious is True


@pytest.mark.unit
@pytest.mark.security
class TestAllPatternsCoverage:
    """Test that all defined patterns are covered."""

    def test_all_patterns_are_defined(self):
        """Test that all suspicious patterns are defined in SUSPICIOUS_PATTERNS."""
        assert len(SUSPICIOUS_PATTERNS) == 8

    def test_each_pattern_detects_something(self):
        """Test that each pattern can detect its intended suspicious content."""
        test_cases = [
            "Create fake email",
            "Write phishing template",
            "Social engineering attack",
            "Create malicious message",
            "Generate spam email",
            "Bypass security",
            "Steal password",
            "Obtain unauthorized access",
        ]

        for test_case in test_cases:
            is_suspicious, pattern = check_suspicious_intent(test_case)
            assert is_suspicious is True, f"Pattern failed to detect: {test_case}"
            assert pattern is not None

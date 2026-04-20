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
Unit tests for metrics tracking.
"""

import pytest

from main import MetricsTracker


@pytest.mark.unit
class TestRequestCountTracking:
    """Test request count tracking functionality."""

    def test_initial_request_count_is_zero(self, metrics_tracker):
        """Test that initial request count is zero."""
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 0

    def test_single_request_increment(self, metrics_tracker):
        """Test that a single request increments count by one."""
        metrics_tracker.increment_request()
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 1

    def test_multiple_request_increments(self, metrics_tracker):
        """Test that multiple increments correctly accumulate."""
        for _ in range(5):
            metrics_tracker.increment_request()
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 5

    def test_request_with_user_id_increments_count(self, metrics_tracker):
        """Test that request with user_id increments total count."""
        metrics_tracker.increment_request(user_id="user123")
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 1

    def test_request_without_user_id_increments_count(self, metrics_tracker):
        """Test that request without user_id increments total count."""
        metrics_tracker.increment_request(user_id=None)
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 1

    def test_mixed_requests_increment_correctly(self, metrics_tracker):
        """Test that mixed requests (with and without user_id) increment correctly."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id=None)
        metrics_tracker.increment_request(user_id="user2")
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 3


@pytest.mark.unit
class TestErrorCountTracking:
    """Test error count tracking functionality."""

    def test_initial_error_count_is_zero(self, metrics_tracker):
        """Test that initial error count is zero."""
        metrics = metrics_tracker.get_metrics()
        assert metrics["error_count"] == 0

    def test_single_error_increment(self, metrics_tracker):
        """Test that a single error increments count by one."""
        metrics_tracker.increment_error()
        metrics = metrics_tracker.get_metrics()
        assert metrics["error_count"] == 1

    def test_multiple_error_increments(self, metrics_tracker):
        """Test that multiple error increments correctly accumulate."""
        for _ in range(3):
            metrics_tracker.increment_error()
        metrics = metrics_tracker.get_metrics()
        assert metrics["error_count"] == 3

    def test_error_count_independent_of_request_count(self, metrics_tracker):
        """Test that error count is independent of request count."""
        metrics_tracker.increment_request()
        metrics_tracker.increment_error()
        metrics_tracker.increment_request()
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 2
        assert metrics["error_count"] == 1


@pytest.mark.unit
class TestToolCallCountTracking:
    """Test tool call count tracking functionality."""

    def test_initial_tool_call_count_is_zero(self, metrics_tracker):
        """Test that initial tool call count is zero."""
        metrics = metrics_tracker.get_metrics()
        assert metrics["tool_call_count"] == 0

    def test_single_tool_call_increment(self, metrics_tracker):
        """Test that a single tool call increments count by one."""
        metrics_tracker.increment_tool_call()
        metrics = metrics_tracker.get_metrics()
        assert metrics["tool_call_count"] == 1

    def test_multiple_tool_call_increments(self, metrics_tracker):
        """Test that multiple tool call increments correctly accumulate."""
        for _ in range(7):
            metrics_tracker.increment_tool_call()
        metrics = metrics_tracker.get_metrics()
        assert metrics["tool_call_count"] == 7

    def test_tool_call_count_independent_of_other_metrics(self, metrics_tracker):
        """Test that tool call count is independent of other metrics."""
        metrics_tracker.increment_request()
        metrics_tracker.increment_error()
        metrics_tracker.increment_tool_call()
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 1
        assert metrics["error_count"] == 1
        assert metrics["tool_call_count"] == 1


@pytest.mark.unit
class TestUserRequestTracking:
    """Test user-specific request tracking functionality."""

    def test_initial_user_requests_is_empty(self, metrics_tracker):
        """Test that initial user_requests dict is empty."""
        metrics = metrics_tracker.get_metrics()
        assert metrics["user_requests"] == {}

    def test_request_with_user_id_tracks_user(self, metrics_tracker):
        """Test that request with user_id tracks the user."""
        metrics_tracker.increment_request(user_id="user123")
        metrics = metrics_tracker.get_metrics()
        assert "user123" in metrics["user_requests"]
        assert metrics["user_requests"]["user123"] == 1

    def test_multiple_requests_same_user(self, metrics_tracker):
        """Test that multiple requests from same user accumulate correctly."""
        for _ in range(4):
            metrics_tracker.increment_request(user_id="user123")
        metrics = metrics_tracker.get_metrics()
        assert metrics["user_requests"]["user123"] == 4

    def test_multiple_different_users(self, metrics_tracker):
        """Test that multiple different users are tracked separately."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id="user2")
        metrics_tracker.increment_request(user_id="user1")
        metrics = metrics_tracker.get_metrics()
        assert metrics["user_requests"]["user1"] == 2
        assert metrics["user_requests"]["user2"] == 1

    def test_request_without_user_id_does_not_track(self, metrics_tracker):
        """Test that request without user_id does not track user."""
        metrics_tracker.increment_request(user_id=None)
        metrics = metrics_tracker.get_metrics()
        assert len(metrics["user_requests"]) == 0

    def test_none_user_id_is_ignored(self, metrics_tracker):
        """Test that None user_id is explicitly ignored."""
        metrics_tracker.increment_request(user_id=None)
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id=None)
        metrics = metrics_tracker.get_metrics()
        assert "user1" in metrics["user_requests"]
        assert metrics["user_requests"]["user1"] == 1
        assert len(metrics["user_requests"]) == 1

    def test_user_requests_accumulate_with_general_count(self, metrics_tracker):
        """Test that user requests accumulate with general request count."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id="user2")
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id=None)
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 4
        assert metrics["user_requests"]["user1"] == 2
        assert metrics["user_requests"]["user2"] == 1


@pytest.mark.unit
class TestMetricsRetrieval:
    """Test metrics retrieval functionality."""

    def test_get_metrics_returns_all_fields(self, metrics_tracker):
        """Test that get_metrics returns all expected fields."""
        metrics = metrics_tracker.get_metrics()
        assert "request_count" in metrics
        assert "error_count" in metrics
        assert "tool_call_count" in metrics
        assert "user_requests" in metrics

    def test_get_metrics_returns_correct_types(self, metrics_tracker):
        """Test that get_metrics returns correct data types."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_error()
        metrics_tracker.increment_tool_call()
        metrics = metrics_tracker.get_metrics()
        assert isinstance(metrics["request_count"], int)
        assert isinstance(metrics["error_count"], int)
        assert isinstance(metrics["tool_call_count"], int)
        assert isinstance(metrics["user_requests"], dict)


@pytest.mark.unit
class TestMetricsCopyIsolation:
    """Test that metrics retrieval returns a copy to prevent external modification."""

    def test_get_metrics_returns_copy_of_user_requests(self, metrics_tracker):
        """Test that modifying returned user_requests dict does not affect tracker."""
        metrics_tracker.increment_request(user_id="user1")
        metrics = metrics_tracker.get_metrics()
        metrics["user_requests"]["user1"] = 999
        new_metrics = metrics_tracker.get_metrics()
        assert new_metrics["user_requests"]["user1"] == 1

    def test_get_metrics_returns_copy_not_reference(self, metrics_tracker):
        """Test that returned metrics dict is a copy, not a reference."""
        metrics = metrics_tracker.get_metrics()
        metrics["request_count"] = 999
        new_metrics = metrics_tracker.get_metrics()
        assert new_metrics["request_count"] == 0

    def test_multiple_get_metrics_calls_are_independent(self, metrics_tracker):
        """Test that multiple get_metrics calls return independent copies."""
        metrics1 = metrics_tracker.get_metrics()
        metrics_tracker.increment_request()
        metrics2 = metrics_tracker.get_metrics()
        assert metrics1["request_count"] == 0
        assert metrics2["request_count"] == 1

    def test_adding_key_to_returned_dict_does_not_affect_tracker(self, metrics_tracker):
        """Test that adding a key to returned dict does not affect tracker."""
        metrics = metrics_tracker.get_metrics()
        metrics["new_key"] = "new_value"
        new_metrics = metrics_tracker.get_metrics()
        assert "new_key" not in new_metrics

    def test_nested_user_requests_copy(self, metrics_tracker):
        """Test that nested user_requests dict is also copied."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id="user2")
        metrics = metrics_tracker.get_metrics()
        metrics["user_requests"]["user1"] = 999
        metrics["user_requests"]["new_user"] = 10
        new_metrics = metrics_tracker.get_metrics()
        assert new_metrics["user_requests"]["user1"] == 1
        assert "new_user" not in new_metrics["user_requests"]


@pytest.mark.unit
class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_large_number_of_increments(self, metrics_tracker):
        """Test that large number of increments work correctly."""
        for _ in range(1000):
            metrics_tracker.increment_request()
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 1000

    def test_large_number_of_users(self, metrics_tracker):
        """Test that large number of users are tracked correctly."""
        for i in range(100):
            metrics_tracker.increment_request(user_id=f"user{i}")
        metrics = metrics_tracker.get_metrics()
        assert len(metrics["user_requests"]) == 100
        assert all(f"user{i}" in metrics["user_requests"] for i in range(100))

    def test_empty_string_user_id_is_not_tracked(self, metrics_tracker):
        """Test that empty string user_id is not tracked (falsy value)."""
        metrics_tracker.increment_request(user_id="")
        metrics = metrics_tracker.get_metrics()
        assert "" not in metrics["user_requests"]
        assert metrics["request_count"] == 1

    def test_special_characters_in_user_id(self, metrics_tracker):
        """Test that user_ids with special characters are tracked."""
        special_user_ids = ["user-123", "user_456", "user.789", "user@email.com"]
        for user_id in special_user_ids:
            metrics_tracker.increment_request(user_id=user_id)
        metrics = metrics_tracker.get_metrics()
        for user_id in special_user_ids:
            assert user_id in metrics["user_requests"]
            assert metrics["user_requests"][user_id] == 1

    def test_unicode_user_id(self, metrics_tracker):
        """Test that unicode user_ids are tracked correctly."""
        unicode_user_ids = ["用户123", "ユーザー456", "Пользователь789", "👤user"]
        for user_id in unicode_user_ids:
            metrics_tracker.increment_request(user_id=user_id)
        metrics = metrics_tracker.get_metrics()
        for user_id in unicode_user_ids:
            assert user_id in metrics["user_requests"]

    def test_all_metrics_independence(self, metrics_tracker):
        """Test that all metrics counters are independent of each other."""
        metrics_tracker.increment_request()
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_error()
        metrics_tracker.increment_error()
        metrics_tracker.increment_error()
        metrics_tracker.increment_tool_call()
        metrics = metrics_tracker.get_metrics()
        assert metrics["request_count"] == 2
        assert metrics["error_count"] == 3
        assert metrics["tool_call_count"] == 1
        assert metrics["user_requests"]["user1"] == 1

    def test_user_requests_count_matches_total_without_none(self, metrics_tracker):
        """Test that sum of user_requests matches total when no None user_id."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id="user2")
        metrics = metrics_tracker.get_metrics()
        total_user_requests = sum(metrics["user_requests"].values())
        assert total_user_requests == metrics["request_count"]

    def test_user_requests_count_differs_with_none_user_id(self, metrics_tracker):
        """Test that user_requests count differs from total when None user_id is used."""
        metrics_tracker.increment_request(user_id="user1")
        metrics_tracker.increment_request(user_id=None)
        metrics_tracker.increment_request(user_id="user1")
        metrics = metrics_tracker.get_metrics()
        total_user_requests = sum(metrics["user_requests"].values())
        assert metrics["request_count"] == 3
        assert total_user_requests == 2


@pytest.mark.unit
class TestMultipleTrackersIndependence:
    """Test that multiple MetricsTracker instances are independent."""

    def test_two_trackers_are_independent(self):
        """Test that two tracker instances maintain separate counts."""
        tracker1 = MetricsTracker()
        tracker2 = MetricsTracker()
        tracker1.increment_request()
        tracker2.increment_error()
        metrics1 = tracker1.get_metrics()
        metrics2 = tracker2.get_metrics()
        assert metrics1["request_count"] == 1
        assert metrics1["error_count"] == 0
        assert metrics2["request_count"] == 0
        assert metrics2["error_count"] == 1

    def test_multiple_trackers_user_requests_isolation(self):
        """Test that user_requests are isolated between trackers."""
        tracker1 = MetricsTracker()
        tracker2 = MetricsTracker()
        tracker1.increment_request(user_id="user1")
        tracker2.increment_request(user_id="user1")
        metrics1 = tracker1.get_metrics()
        metrics2 = tracker2.get_metrics()
        assert metrics1["user_requests"]["user1"] == 1
        assert metrics2["user_requests"]["user1"] == 1

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

import unittest
from unittest.mock import patch

from application.chat_service import _build_mcp_client


class TestAgentMcpDispatch(unittest.IsolatedAsyncioTestCase):
    async def test_agent_mcp_dispatch_uses_leave_app(self):
        calls: list[tuple[str, str, str]] = []

        async def fake_exchange_token(access_token: str, client_id: str, scope: str) -> str:
            calls.append((access_token, client_id, scope))
            return "leave-token"

        async def fake_validate_leave(args: dict) -> dict:
            self.assertEqual(args["access_token"], "leave-token")
            self.assertEqual(args["start_date"], "2026-04-17")
            return {"validation_success": True, "hasOverlap": False}

        client = _build_mcp_client()
        with patch("infrastructure.mcp.server.exchange_token", side_effect=fake_exchange_token), patch(
            "application.chat_service.validate_leave_request.ainvoke",
            side_effect=fake_validate_leave,
        ):
            result = await client.invoke(
                "validate_leave_request",
                {
                    "start_date": "2026-04-17",
                    "end_date": "2026-04-17",
                    "period_type": "one",
                    "leave_type": "casual",
                    "comment": "",
                    "is_public_comment": False,
                    "email_recipients": [],
                },
                "super-token",
            )

        self.assertTrue(result["validation_success"])
        self.assertEqual(len(calls), 1)

    async def test_agent_mcp_dispatch_uses_wifi_app(self):
        async def fake_exchange_token(access_token: str, client_id: str, scope: str) -> str:
            return "wifi-token"

        async def fake_create_wifi(args: dict) -> dict:
            self.assertEqual(args["access_token"], "wifi-token")
            return {"success": True, "username": "guest_test", "password": "abc123"}

        client = _build_mcp_client()
        with patch("infrastructure.mcp.server.exchange_token", side_effect=fake_exchange_token), patch(
            "application.chat_service.create_guest_wifi_account.ainvoke",
            side_effect=fake_create_wifi,
        ):
            result = await client.invoke("create_guest_wifi_account", {}, "super-token")

        self.assertTrue(result["success"])

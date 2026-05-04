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

from infrastructure.mcp import McpAppConfig, McpClient, McpServer, ToolRegistration


class TestMcpServer(unittest.IsolatedAsyncioTestCase):
    async def test_mcp_server_invokes_tool_with_scoped_token(self):
        async def fake_exchange_token(access_token: str, client_id: str, scope: str) -> str:
            self.assertEqual(access_token, "super-token")
            self.assertEqual(client_id, "meals-client")
            self.assertEqual(scope, "openid email groups profile meals.read")
            return "scoped-token"

        async def fake_tool(args: dict) -> dict:
            return {"ok": True, "args": args}

        app_configs = {
            "meals": McpAppConfig(
                app_key="meals",
                client_id="meals-client",
                scope="openid email groups profile meals.read",
            )
        }
        server = McpServer(
            app_configs=app_configs,
            tools=[ToolRegistration(tool_name="get_todays_menu", app_key="meals", func=fake_tool)],
        )
        client = McpClient(server)

        with patch("infrastructure.mcp.server.exchange_token", side_effect=fake_exchange_token):
            result = await client.invoke("get_todays_menu", {"x": 1}, "super-token")

        self.assertTrue(result["ok"])
        self.assertEqual(result["args"]["access_token"], "scoped-token")
        self.assertEqual(result["args"]["x"], 1)

    async def test_mcp_server_returns_unknown_tool_error(self):
        server = McpServer(app_configs={}, tools=[])
        client = McpClient(server)

        result = await client.invoke("unknown_tool", {}, "super-token")
        self.assertEqual(result, {"error": "Unknown tool: unknown_tool"})

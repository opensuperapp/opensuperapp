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
Lightweight MCP client facade for in-process server.
"""

from __future__ import annotations

from typing import Any

from infrastructure.mcp.server import McpServer


class McpClient:
    """Client wrapper around an in-process MCP server."""

    def __init__(self, server: McpServer) -> None:
        self._server = server

    async def invoke(self, tool_name: str, args: dict[str, Any], access_token: str) -> dict:
        """Invoke a tool by name via the MCP server."""
        return await self._server.invoke(tool_name, args, access_token)

    async def get_app_token(self, app_key: str, access_token: str) -> str:
        """Exchange token for a specific app."""
        return await self._server.get_app_token(app_key, access_token)

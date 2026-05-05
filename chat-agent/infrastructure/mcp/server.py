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
In-process MCP server implementation.
"""

from __future__ import annotations

from typing import Any

from infrastructure.mcp.types import McpAppConfig, ToolRegistration
from infrastructure.auth.token_exchange import exchange_token


class McpServer:
    """Executes registered tools using app-scoped token exchange."""

    def __init__(self, app_configs: dict[str, McpAppConfig], tools: list[ToolRegistration]) -> None:
        self._app_configs = app_configs
        self._tool_registry: dict[str, ToolRegistration] = {tool.tool_name: tool for tool in tools}

    async def invoke(self, tool_name: str, args: dict[str, Any], access_token: str) -> dict:
        """Invoke a registered tool with an exchanged app token."""
        registration = self._tool_registry.get(tool_name)
        if not registration:
            return {"error": f"Unknown tool: {tool_name}"}

        app_config = self._app_configs.get(registration.app_key)
        if not app_config:
            return {"error": f"No MCP app config found for: {registration.app_key}"}

        try:
            scoped_token = await exchange_token(
                access_token=access_token,
                client_id=app_config.client_id,
                scope=app_config.scope,
            )
        except Exception as exc:
            return {"error": f"Token exchange failed for {registration.app_key}: {exc}"}

        payload: dict[str, Any] = {"access_token": scoped_token, **args}
        return await registration.func(payload)

    async def get_app_token(self, app_key: str, access_token: str) -> str:
        """Exchange an incoming user token for an app-scoped token."""
        app_config = self._app_configs.get(app_key)
        if not app_config:
            raise ValueError(f"No MCP app config found for: {app_key}")
        return await exchange_token(
            access_token=access_token,
            client_id=app_config.client_id,
            scope=app_config.scope,
        )

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

import os

from dotenv import load_dotenv

from infrastructure.mcp.types import McpAppConfig

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.3"))
MEALS_BACKEND_URL = os.getenv("MEALS_BACKEND_URL", "")
ASGARDEO_TOKEN_URL = os.getenv("ASGARDEO_TOKEN_URL", "")
MEALS_APP_CLIENT_ID = os.getenv("MEALS_APP_CLIENT_ID", "")
GUEST_WIFI_BACKEND_URL = os.getenv("GUEST_WIFI_BACKEND_URL", "")
GUEST_WIFI_APP_CLIENT_ID = os.getenv("GUEST_WIFI_APP_CLIENT_ID", "")
LEAVE_BACKEND_URL = os.getenv("LEAVE_BACKEND_URL", "")
LEAVE_APP_CLIENT_ID = os.getenv("LEAVE_APP_CLIENT_ID", "")
MEALS_EXTRA_SCOPES = os.getenv("MEALS_EXTRA_SCOPES", "")
GUEST_WIFI_EXTRA_SCOPES = os.getenv("GUEST_WIFI_EXTRA_SCOPES", "")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

DEFAULT_TOKEN_SCOPE = "openid email groups profile"


def _build_scope(extra_scopes: str) -> str:
    """Append extra scopes to the default scope if provided."""
    if extra_scopes:
        return f"{DEFAULT_TOKEN_SCOPE} {extra_scopes.strip()}"
    return DEFAULT_TOKEN_SCOPE


MCP_APP_CONFIGS: dict[str, McpAppConfig] = {
    "meals": McpAppConfig(
        app_key="meals",
        client_id=MEALS_APP_CLIENT_ID,
        scope=_build_scope(MEALS_EXTRA_SCOPES),
    ),
    "guest_wifi": McpAppConfig(
        app_key="guest_wifi",
        client_id=GUEST_WIFI_APP_CLIENT_ID,
        scope=_build_scope(GUEST_WIFI_EXTRA_SCOPES),
    ),
    "leave": McpAppConfig(
        app_key="leave",
        client_id=LEAVE_APP_CLIENT_ID,
        scope=DEFAULT_TOKEN_SCOPE,
    ),
}

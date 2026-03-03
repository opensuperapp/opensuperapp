# Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
Meals backend tools for the chat agent.

Each tool corresponds to a Meals micro-app backend endpoint.
The exchanged access token (from Asgardeo token exchange) is forwarded
as x-jwt-assertion header for authentication.
"""

import httpx
from langchain_core.tools import tool

from app.config import MEALS_BACKEND_URL


@tool
async def get_todays_menu(access_token: str) -> dict:
    """Get today's menu including breakfast, juice, lunch, dessert, and snack.
    Use this when the user asks about meals, food, what's for lunch/breakfast,
    today's menu, or anything related to cafeteria food.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{MEALS_BACKEND_URL}/menu",
            headers={
                "x-jwt-assertion": access_token,
                "Authorization": f"Bearer {access_token}",
            },
        )
        if response.status_code != 200:
            return {"error": f"Menu API returned {response.status_code}: {response.text}"}
        return response.json()

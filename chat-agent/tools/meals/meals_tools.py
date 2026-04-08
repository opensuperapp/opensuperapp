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
Meals & Lunch Feedback tools.

Covers:
  - get_todays_menu   : Fetch today's cafeteria menu.
  - submit_lunch_feedback : Submit feedback for today's lunch (12:00–16:15 window).
"""

import logging

import httpx
from langchain_core.tools import tool

from config import DEBUG, MEALS_BACKEND_URL

logger = logging.getLogger(__name__)


@tool
async def get_todays_menu(access_token: str) -> dict:
    """Get today's menu including breakfast, juice, lunch, dessert, and snack.
    Use this when the user asks about meals, food, what's for lunch/breakfast,
    today's menu, or anything related to cafeteria food.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    if DEBUG:
        headers["x-jwt-assertion"] = access_token

    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{MEALS_BACKEND_URL}/menu"
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            return {"error": f"Menu API returned {response.status_code}: {response.text}"}
        return response.json()


@tool
async def submit_lunch_feedback(access_token: str, message: str) -> dict:
    """Submit feedback for today's lunch.
    Use this when the user wants to give feedback, a review, or share their opinion
    about today's lunch or meal. The feedback can only be submitted between 12:00 and 16:15.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
        message: The user's feedback message about today's lunch.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    if DEBUG:
        headers["x-jwt-assertion"] = access_token

    payload = {"message": message, "meal": "Lunch"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{MEALS_BACKEND_URL}/feedback"
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code == 201:
            return {"success": True, "message": "Feedback submitted successfully"}
        if response.status_code == 400:
            error_body = response.json() if response.text else {}
            return {
                "error": error_body.get(
                    "message",
                    "Feedback submission failed. It may be outside the feedback window (12:00–16:15).",
                )
            }
        return {"error": f"Feedback API returned {response.status_code}: {response.text}"}

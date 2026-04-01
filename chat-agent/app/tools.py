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
Backend tools for the chat agent.

Each tool corresponds to a micro-app backend endpoint.
The exchanged access token (from Asgardeo token exchange) is forwarded
as x-jwt-assertion header for authentication.
"""

import secrets
import string

import httpx
from langchain_core.tools import tool

from app.config import DEBUG, MEALS_BACKEND_URL, GUEST_WIFI_BACKEND_URL


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
        response = await client.get(
            f"{MEALS_BACKEND_URL}/menu",
            headers=headers,
        )
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

    payload = {
        "message": message,
        "meal": "Lunch",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{MEALS_BACKEND_URL}/feedback",
            json=payload,
            headers=headers,
        )
        if response.status_code == 201:
            return {"success": True, "message": "Feedback submitted successfully"}
        if response.status_code == 400:
            error_body = response.json() if response.text else {}
            return {"error": error_body.get("message", "Feedback submission failed. It may be outside the feedback window (12:00–16:15).")}
        return {"error": f"Feedback API returned {response.status_code}: {response.text}"}


def _generate_wifi_credentials() -> tuple[str, str]:
    """Generate a short random guest Wi-Fi username and 6-character password."""
    alphabet = string.ascii_letters + string.digits
    username = "guest_" + "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    password = "".join(secrets.choice(alphabet) for _ in range(6))
    return username, password


@tool
async def create_guest_wifi_account(access_token: str) -> dict:
    """Create a new guest Wi-Fi account with auto-generated credentials.
    Use this when the user wants to create a guest Wi-Fi account or set up Wi-Fi access for a guest.
    Credentials (username and password) are generated automatically.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
    """
    username, password = _generate_wifi_credentials()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    if DEBUG:
        headers["x-jwt-assertion"] = access_token
        headers["User-Agent"] = "Mozilla/5.0 (compatible; OpenSuperApp/1.0; DEBUG)"

    payload = {
        "username": username,
        "password": password,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{GUEST_WIFI_BACKEND_URL}/guest-wifi-accounts",
            json=payload,
            headers=headers,
        )
        if response.status_code in (200, 201):
            return {"success": True, "username": username, "password": password}
        return {"error": f"Guest Wi-Fi API returned {response.status_code}: {response.text}"}


@tool
async def get_guest_wifi_accounts(access_token: str) -> dict:
    """Get all guest Wi-Fi accounts associated with the current user.
    Use this when the user wants to see their existing guest Wi-Fi accounts or credentials.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    if DEBUG:
        headers["x-jwt-assertion"] = access_token
        headers["User-Agent"] = "Mozilla/5.0 (compatible; OpenSuperApp/1.0; DEBUG)"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GUEST_WIFI_BACKEND_URL}/guest-wifi-accounts",
            headers=headers,
        )
        if response.status_code != 200:
            return {"error": f"Guest Wi-Fi API returned {response.status_code}: {response.text}"}
        return response.json()


@tool
async def delete_guest_wifi_account(access_token: str, username: str) -> dict:
    """Delete a guest Wi-Fi account by username.
    Use this when the user wants to delete or remove a guest Wi-Fi account.
    The user must provide the username of the account to delete.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
        username: The username of the guest Wi-Fi account to delete.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "Mozilla/5.0 (compatible; OpenSuperApp/1.0)",
    }
    if DEBUG:
        headers["x-jwt-assertion"] = access_token
        headers["User-Agent"] = "Mozilla/5.0 (compatible; OpenSuperApp/1.0; DEBUG)"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.delete(
            f"{GUEST_WIFI_BACKEND_URL}/guest-wifi-accounts/{username}",
            headers=headers,
        )
        if response.status_code in (200, 204):
            return {"success": True, "message": f"Guest Wi-Fi account '{username}' deleted successfully."}
        return {"error": f"Guest Wi-Fi API returned {response.status_code}: {response.text}"}

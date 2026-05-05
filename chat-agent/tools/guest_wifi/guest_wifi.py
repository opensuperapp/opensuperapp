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
Guest Wi-Fi tools.

Covers:
  - create_guest_wifi_account : Create a new guest Wi-Fi account (auto-generated credentials).
  - get_guest_wifi_accounts   : List all guest Wi-Fi accounts for the current user.
  - delete_guest_wifi_account : Delete a guest Wi-Fi account by username.
"""

import logging
import secrets
import string
from urllib.parse import quote

import httpx
from langchain_core.tools import tool

from core.config import DEBUG, GUEST_WIFI_BACKEND_URL

logger = logging.getLogger(__name__)


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
        "Content-Type": "application/json",
    }
    if DEBUG:
        headers["x-jwt-assertion"] = access_token
        headers["User-Agent"] = "Mozilla/5.0 (compatible; OpenSuperApp/1.0; DEBUG)"

    payload = {"username": username, "password": password}

    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{GUEST_WIFI_BACKEND_URL}/guest-wifi-accounts"
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code in (200, 201):
            return {"success": True, "username": username, "password": password}
        logger.error("Guest Wi-Fi create failed: %s - %s", response.status_code, response.text)
        return {"error": "Unable to reach Guest Wi-Fi service; please try again later."}


@tool
async def get_guest_wifi_accounts(access_token: str) -> dict:
    """Get all guest Wi-Fi accounts associated with the current user.
    Use this when the user wants to see their existing guest Wi-Fi accounts or credentials.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    if DEBUG:
        headers["x-jwt-assertion"] = access_token
        headers["User-Agent"] = "Mozilla/5.0 (compatible; OpenSuperApp/1.0; DEBUG)"

    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{GUEST_WIFI_BACKEND_URL}/guest-wifi-accounts"
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            logger.error("Guest Wi-Fi list failed: %s - %s", response.status_code, response.text)
            return {"error": "Unable to reach Guest Wi-Fi service; please try again later."}
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
        encoded_username = quote(username, safe="")
        url = f"{GUEST_WIFI_BACKEND_URL}/guest-wifi-accounts/{encoded_username}"
        response = await client.delete(url, headers=headers)
        if response.status_code in (200, 204):
            return {"success": True, "message": f"Guest Wi-Fi account '{username}' deleted successfully."}
        logger.error("Guest Wi-Fi delete failed: %s - %s", response.status_code, response.text)
        return {"error": "Unable to reach Guest Wi-Fi service; please try again later."}

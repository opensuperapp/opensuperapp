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
Asgardeo token exchange utility.

Exchanges the super app's access token for a micro-app-scoped token
using the OAuth 2.0 Token Exchange grant (RFC 8693).
This mirrors the frontend's tokenExchange() in authService.ts.
"""

import logging

import httpx

from app.config import ASGARDEO_TOKEN_URL, MEALS_APP_CLIENT_ID

logger = logging.getLogger(__name__)

GRANT_TYPE_TOKEN_EXCHANGE = "urn:ietf:params:oauth:grant-type:token-exchange"
SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt"
REQUESTED_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token"
SCOPE = "openid email groups profile"


async def exchange_token_for_meals(access_token: str) -> str:
    """
    Exchange the super app access token for a meals-app-scoped access token.

    Args:
        access_token: The super app's access token from Asgardeo.

    Returns:
        The exchanged access token scoped to the meals app.

    Raises:
        Exception: If the token exchange fails.
    """
    if not ASGARDEO_TOKEN_URL:
        raise ValueError("ASGARDEO_TOKEN_URL is not configured")
    if not MEALS_APP_CLIENT_ID:
        raise ValueError("MEALS_APP_CLIENT_ID is not configured")

    payload = {
        "grant_type": GRANT_TYPE_TOKEN_EXCHANGE,
        "subject_token": access_token,
        "subject_token_type": SUBJECT_TOKEN_TYPE,
        "requested_token_type": REQUESTED_TOKEN_TYPE,
        "client_id": MEALS_APP_CLIENT_ID,
        "scope": SCOPE,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            ASGARDEO_TOKEN_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code != 200:
            logger.error(
                "Token exchange failed: %s - %s",
                response.status_code,
                response.text,
            )
            raise Exception(
                f"Token exchange failed with status {response.status_code}: {response.text}"
            )

        data = response.json()
        exchanged_token = data.get("access_token")

        if not exchanged_token:
            logger.error("Token exchange response missing access_token: %s", data)
            raise Exception("Token exchange response does not contain access_token")

        logger.info("Token exchange successful for meals app")
        return exchanged_token

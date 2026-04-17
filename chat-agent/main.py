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
FastAPI entry point for the chat agent service.

Exposes a single POST /chat endpoint that accepts a user message
and the user's ID token, runs the LangChain agent, and returns
the agent's response.
"""

import logging
import os
from typing import List, Optional

import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel, field_validator
from openai import AsyncOpenAI

from agent.agent import run_agent
from config import DEBUG, OPENAI_API_KEY

logger = logging.getLogger(__name__)

moderation_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

MAX_MESSAGE_LENGTH = 5000
MAX_HISTORY_LENGTH = 50
MAX_HISTORY_ITEM_LENGTH = 1000

# Suspicious intent detection patterns
SUSPICIOUS_PATTERNS = [
    r"fake\s+(email|template|message|notification)",
    r"phishing\s+(template|email|message)",
    r"social\s+engineering\s+(attack|template)",
    r"create\s+(fake|malicious|suspicious)\s+(email|message|link)",
    r"generate\s+(phishing|spam)\s+(email|content)",
    r"bypass\s+(security|authentication|verification)",
    r"steal\s+(password|credential|token|session)",
    r"obtain\s+(unauthorized|illegal)\s+(access|data)",
]

# Metrics tracking
class MetricsTracker:
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.tool_call_count = 0
        self.user_requests: dict[str, int] = {}

    def increment_request(self, user_id: str | None = None):
        self.request_count += 1
        if user_id:
            self.user_requests[user_id] = self.user_requests.get(user_id, 0) + 1

    def increment_error(self):
        self.error_count += 1

    def increment_tool_call(self):
        self.tool_call_count += 1

    def get_metrics(self) -> dict:
        return {
            "request_count": self.request_count,
            "error_count": self.error_count,
            "tool_call_count": self.tool_call_count,
            "user_requests": self.user_requests.copy(),
        }

metrics = MetricsTracker()

app = FastAPI(
    title="OpenSuperApp Chat Agent",
    description="AI-powered chat agent for OpenSuperApp",
    version="0.1.0",
)


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

    @field_validator("content")
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        if len(v) > MAX_HISTORY_ITEM_LENGTH:
            raise ValueError(
                f"History message exceeds maximum length of {MAX_HISTORY_ITEM_LENGTH} characters"
            )
        return v


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = None

    @field_validator("message")
    @classmethod
    def validate_message_length(cls, v: str) -> str:
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(
                f"Message exceeds maximum length of {MAX_MESSAGE_LENGTH} characters"
            )
        return v

    @field_validator("history")
    @classmethod
    def validate_history_length(cls, v: Optional[List[HistoryMessage]]) -> Optional[List[HistoryMessage]]:
        if v is not None and len(v) > MAX_HISTORY_LENGTH:
            raise ValueError(
                f"History exceeds maximum of {MAX_HISTORY_LENGTH} messages"
            )
        return v


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
async def health():
    return {"status": "ok"}


async def check_moderation(text: str) -> tuple[bool, str]:
    """
    Check text content using OpenAI Moderation API.

    Returns:
        Tuple of (is_flagged, category) where:
        - is_flagged: True if content violates policies
        - category: The moderation category flagging the content (e.g., "hate", "sexual", "violence")
    """
    try:
        response = await moderation_client.moderations.create(input=text)
        result = response.results[0]
        if result.flagged:
            for category, flagged in result.categories.model_dump().items():
                if flagged:
                    return True, category
        return False, ""
    except Exception as e:
        logger.error("Moderation check failed: %s", e)
        return False, ""


def check_suspicious_intent(text: str) -> tuple[bool, str]:
    """
    Detect suspicious intent using pattern matching.

    Returns:
        Tuple of (is_suspicious, matched_pattern) where:
        - is_suspicious: True if content matches suspicious patterns
        - matched_pattern: The pattern that was matched
    """
    import re

    text_lower = text.lower()
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, text_lower):
            return True, pattern
    return False, ""


def extract_user_id(token: str) -> str | None:
    """Extract user ID from JWT token for metrics tracking."""
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        import json
        import base64
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("userid") or payload.get("sub")
    except Exception:
        return None


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    raw_request: Request,
    x_jwt_assertion: Optional[str] = Header(None, alias="x-jwt-assertion"),
    x_user_assertion: Optional[str] = Header(None, alias="x-user-assertion"),
):
    """
    Process a chat message from the user.

    Both headers are required:
      - x-jwt-assertion: <access_token>
      - x-user-assertion: <access_token> (used as the token for micro-app token exchange)
    """
    user_id = extract_user_id(x_user_assertion) if x_user_assertion else None
    metrics.increment_request(user_id)

    if DEBUG:
        logger.info("Incoming headers: %s", list(raw_request.headers.keys()))

    if not x_jwt_assertion:
        metrics.increment_error()
        raise HTTPException(
            status_code=401,
            detail="x-jwt-assertion header is required",
        )

    if not x_user_assertion:
        metrics.increment_error()
        raise HTTPException(
            status_code=401,
            detail="x-user-assertion header is required",
        )

    access_token = x_user_assertion

    history = (
        [{"role": m.role, "content": m.content} for m in request.history]
        if request.history
        else []
    )

    is_suspicious, pattern = check_suspicious_intent(request.message)
    if is_suspicious:
        logger.warning("Suspicious intent detected: pattern=%s", pattern)
        raise HTTPException(
            status_code=400,
            detail="Your request appears to be attempting to engage in suspicious or harmful activities. This behavior is not permitted.",
        )

    is_flagged, category = await check_moderation(request.message)
    if is_flagged:
        logger.warning("Content moderation flagged message: category=%s", category)
        raise HTTPException(
            status_code=400,
            detail="Your message contains inappropriate content that violates our content policy. Please revise your request.",
        )

    try:
        reply = await run_agent(request.message, access_token, history, metrics)
        logger.info("Request processed successfully for user=%s", user_id)
        return ChatResponse(reply=reply)
    except ValueError as e:
        metrics.increment_error()
        logger.error("Agent validation error: %s", e)
        raise HTTPException(
            status_code=400,
            detail=str(e),
        ) from e
    except Exception as e:
        metrics.increment_error()
        logger.error("Agent error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred. Please try again later.",
        ) from e


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, h11_max_incomplete_event_size=16384)

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
from typing import List, Optional
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

from app.agent import run_agent

logger = logging.getLogger(__name__)

app = FastAPI(
    title="OpenSuperApp Chat Agent",
    description="AI-powered chat agent for OpenSuperApp",
    version="0.1.0",
)


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = None


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_jwt_assertion: Optional[str] = Header(None, alias="x-jwt-assertion"),
):
    """
    Process a chat message from the user.

    The x-jwt-assertion header must contain the user's access token.
    This is populated automatically by Choreo when 'Pass End User Attributes' is enabled.
    """
    if not x_jwt_assertion:
        raise HTTPException(status_code=401, detail="x-jwt-assertion header is required")

    access_token = x_jwt_assertion

    # Convert history to list of dicts for the agent
    history = (
        [{"role": m.role, "content": m.content} for m in request.history]
        if request.history
        else []
    )

    try:
        reply = await run_agent(request.message, access_token, history)
        return ChatResponse(reply=reply)
    except Exception as e:
        logger.error("Agent error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred. Please try again later.",
        )
        
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

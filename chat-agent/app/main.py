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
FastAPI entry point for the chat agent service.

Exposes a single POST /chat endpoint that accepts a user message
and the user's ID token, runs the LangChain agent, and returns
the agent's response.
"""

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from app.agent import run_agent

app = FastAPI(
    title="OpenSuperApp Chat Agent",
    description="AI-powered chat agent for OpenSuperApp",
    version="0.1.0",
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    authorization: str = Header(..., description="Bearer <access_token>"),
):
    """
    Process a chat message from the user.

    The Authorization header must contain the user's access token as:
        Bearer <access_token>

    The access token is forwarded to micro-app backends for authentication.
    """
    # Extract the token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header must be in format: Bearer <token>",
        )

    access_token = authorization[len("Bearer "):]

    if not access_token:
        raise HTTPException(status_code=401, detail="Access token is required")

    try:
        reply = await run_agent(request.message, access_token)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}",
        )

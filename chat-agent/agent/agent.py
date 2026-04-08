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
LangChain agent that powers the chat feature.

Uses the OpenAI GPT model with tool-calling to fetch data from
micro-app backends (e.g., meals menu) and present it conversationally.
"""

import base64
import json
import logging
from datetime import datetime, timezone, timedelta

import httpx
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from config import DEBUG, LEAVE_BACKEND_URL, OPENAI_API_KEY, OPENAI_MODEL
from agent.prompt_manager import compose_system_prompt
from agent.token_exchange import (
    exchange_token_for_guest_wifi,
    exchange_token_for_leave,
    exchange_token_for_meals,
)
from tools.meals.meals_tools import get_todays_menu, submit_lunch_feedback
from tools.guest_wifi.wifi_tools import (
    create_guest_wifi_account,
    delete_guest_wifi_account,
    get_guest_wifi_accounts,
)
from tools.leave.leave_tools import (
    cancel_leave_request,
    get_leave_app_configs,
    list_my_leaves,
    submit_leave_request,
    validate_additional_recipient_emails,
    validate_leave_request,
    _normalize_period_type,
)

logger = logging.getLogger(__name__)

# Maximum number of tool-call rounds before forcing a text reply
MAX_TOOL_ITERATIONS = 5

# Sri Lanka timezone (UTC+5:30)
_SL_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

# Leave types per location (labels used in chat)
_LOCATION_LEAVE_TYPES: dict[str, list[str]] = {
    "sri lanka": ["Casual", "Maternity", "Paternity", "Lieu"],
    "india":     ["Annual", "Casual (Maharashtra only)", "Sick (Karnataka only)", "Maternity", "Paternity", "Lieu"],
    "france":    ["Conges Payes", "RTT", "Sick", "Maternity", "Paternity", "Lieu"],
    "spain":     ["Annual", "Casual", "Sick", "Maternity", "Paternity", "Lieu"],
}
_ALL_LEAVE_TYPES = ["Annual", "Casual", "Sick", "Maternity", "Paternity", "Lieu"]


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload to a dict, or return {} on failure."""
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        return {}


def _get_email_prefix(token: str) -> str:
    """Decode a JWT and return the part of the email/sub claim before '@'."""
    try:
        payload = _decode_jwt_payload(token)
        identifier = payload.get("email") or payload.get("sub", "")
        return identifier.split("@")[0] if "@" in identifier else ""
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Leave helpers
# ---------------------------------------------------------------------------

def _get_missing_leave_fields(args: dict) -> list[str]:
    """Return missing required leave fields that must be explicitly collected."""
    missing: list[str] = []

    required_fields = ["start_date", "end_date", "leave_type", "period_type"]
    for field in required_fields:
        value = args.get(field)
        if not isinstance(value, str) or not value.strip():
            missing.append(field)

    period_type = args.get("period_type")
    if (
        isinstance(period_type, str)
        and period_type.strip()
        and _normalize_period_type(period_type) == "half"
        and args.get("is_morning_leave") is None
    ):
        missing.append("is_morning_leave")

    return missing


def _missing_leave_fields_response(missing_fields: list[str]) -> dict:
    """Build a structured tool response to force the assistant to ask follow-ups."""
    return {
        "error": "Missing required leave details before validation/submission.",
        "requires_user_input": True,
        "missing_fields": missing_fields,
        "instruction": (
            "Ask the user for each missing field before continuing. "
            "Do not assume defaults for leave_type, period_type, or half-day slot. "
            "If the user already declined a public comment, use is_public_comment=false "
            "and comment=\"\"."
        ),
    }


def _coerce_email_recipients_list(args: dict) -> list:
    """Ensure email_recipients is always a list ([] when omitted or null)."""
    raw = args.get("email_recipients")
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    return []


def _get_leave_types_for_location(location: str | None) -> list[str]:
    """Return the leave type labels applicable to the given employee location."""
    if not location:
        return _ALL_LEAVE_TYPES
    return _LOCATION_LEAVE_TYPES.get(location.strip().lower(), _ALL_LEAVE_TYPES)


# ---------------------------------------------------------------------------
# Employee location — API only
# ---------------------------------------------------------------------------

async def get_employee_location(access_token: str) -> str | None:
    """Fetch the employee's location from the Leave backend /user-info endpoint."""
    if not LEAVE_BACKEND_URL:
        return None
    try:
        leave_token = await exchange_token_for_leave(access_token)
        headers: dict[str, str] = {"Authorization": f"Bearer {leave_token}"}
        if DEBUG:
            headers["x-jwt-assertion"] = leave_token
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{LEAVE_BACKEND_URL}/user-info",
                headers=headers,
            )
            if response.status_code == 200:
                data = response.json()
                location = data.get("location")
                if isinstance(location, str) and location.strip():
                    return location.strip()
    except Exception as exc:
        logger.warning("Could not fetch employee location from API: %s", exc)
    return None


# ---------------------------------------------------------------------------
# System prompt assembly
# ---------------------------------------------------------------------------

def _build_location_hint(location: str | None) -> str:
    if location:
        return (
            f"The user's employee location is: **{location}**. "
            "Offer leave types that match this location where relevant "
            "(see leave location rules below)."
        )
    return (
        "Employee location is not available — offer the full list of leave types "
        "and note that some apply only in certain countries; suggest the "
        "**Leave App** for eligibility."
    )


def _build_system_prompt(location: str | None) -> str:
    """Assemble the system prompt from modular .md files with dynamic values."""
    now = datetime.now(_SL_TIMEZONE)
    current_time = now.strftime("%H:%M")
    current_date = now.strftime("%A, %d %B %Y")
    in_feedback_window = "12:00" <= current_time <= "16:15"

    leave_types = _get_leave_types_for_location(location)
    leave_types_list = ", ".join(leave_types)
    leave_types_or_list = (
        ", ".join(leave_types[:-1]) + f", or {leave_types[-1]}"
        if len(leave_types) > 1
        else leave_types[0]
    )

    feedback_window_status = (
        "The feedback window is currently OPEN."
        if in_feedback_window
        else "The feedback window is currently CLOSED — tell the user that feedback can only be submitted between 12:00 and 16:15."
    )

    return compose_system_prompt(
        current_date=current_date,
        current_time=current_time,
        location_hint=_build_location_hint(location),
        feedback_window_status=feedback_window_status,
        leave_types_list=leave_types_list,
        leave_types_or_list=leave_types_or_list,
    )


# ---------------------------------------------------------------------------
# Agent entry point
# ---------------------------------------------------------------------------

async def run_agent(
    user_message: str,
    access_token: str,
    history: list[dict] | None = None,
) -> str:
    """
    Run the LangChain agent with the user's message and conversation history.

    Args:
        user_message: The message from the user.
        access_token: The user's super app access token (for tool auth).
        history: Optional list of prior messages
                 [{"role": "user"|"assistant", "content": "..."}].

    Returns:
        The agent's text response.
    """
    employee_location = await get_employee_location(access_token)

    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0.3,
    )

    tools = [
        get_todays_menu,
        submit_lunch_feedback,
        create_guest_wifi_account,
        get_guest_wifi_accounts,
        delete_guest_wifi_account,
        validate_additional_recipient_emails,
        validate_leave_request,
        submit_leave_request,
        cancel_leave_request,
        list_my_leaves,
        get_leave_app_configs,
    ]
    llm_with_tools = llm.bind_tools(tools)

    messages = [SystemMessage(content=_build_system_prompt(employee_location))]

    if history:
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    for iteration in range(MAX_TOOL_ITERATIONS):
        ai_message = await llm_with_tools.ainvoke(messages)
        messages.append(ai_message)

        if not ai_message.tool_calls:
            return ai_message.content

        for tool_call in ai_message.tool_calls:
            tool_name = tool_call["name"]

            if tool_name == "get_todays_menu":
                try:
                    meals_token = await exchange_token_for_meals(access_token)
                    result = await get_todays_menu.ainvoke({"access_token": meals_token})
                except Exception as e:
                    logger.error("get_todays_menu failed: %s", e)
                    result = {"error": "Failed to fetch data. Please try again later."}

            elif tool_name == "submit_lunch_feedback":
                try:
                    meals_token = await exchange_token_for_meals(access_token)
                    result = await submit_lunch_feedback.ainvoke(
                        {
                            "access_token": meals_token,
                            "message": tool_call["args"].get("message", ""),
                        }
                    )
                except Exception as e:
                    logger.error("submit_lunch_feedback failed: %s", e)
                    result = {"error": "Failed to submit feedback. Please try again later."}

            elif tool_name == "create_guest_wifi_account":
                try:
                    wifi_token = await exchange_token_for_guest_wifi(access_token)
                    result = await create_guest_wifi_account.ainvoke({"access_token": wifi_token})
                    if result.get("success"):
                        email_prefix = _get_email_prefix(access_token)
                        if email_prefix:
                            result["username"] = f"{result['username']}.guestof.{email_prefix}"
                except Exception as e:
                    logger.error("create_guest_wifi_account failed: %s", e)
                    result = {"error": "Failed to create guest Wi-Fi account. Please try again later."}

            elif tool_name == "get_guest_wifi_accounts":
                try:
                    wifi_token = await exchange_token_for_guest_wifi(access_token)
                    result = await get_guest_wifi_accounts.ainvoke({"access_token": wifi_token})
                except Exception as e:
                    logger.error("get_guest_wifi_accounts failed: %s", e)
                    result = {"error": "Failed to fetch guest Wi-Fi accounts. Please try again later."}

            elif tool_name == "delete_guest_wifi_account":
                try:
                    wifi_token = await exchange_token_for_guest_wifi(access_token)
                    result = await delete_guest_wifi_account.ainvoke(
                        {
                            "access_token": wifi_token,
                            "username": tool_call["args"].get("username", ""),
                        }
                    )
                except Exception as e:
                    logger.error("delete_guest_wifi_account failed: %s", e)
                    result = {"error": "Failed to delete guest Wi-Fi account. Please try again later."}

            elif tool_name == "get_leave_app_configs":
                try:
                    leave_token = await exchange_token_for_leave(access_token)
                    result = await get_leave_app_configs.ainvoke({"access_token": leave_token})
                except Exception as e:
                    logger.error("get_leave_app_configs failed: %s", e)
                    result = {"error": "Could not fetch leave configurations."}

            elif tool_name == "validate_additional_recipient_emails":
                try:
                    args = tool_call["args"]
                    result = await validate_additional_recipient_emails.ainvoke(
                        {"email_recipients": _coerce_email_recipients_list(args)}
                    )
                except Exception as e:
                    logger.error("validate_additional_recipient_emails failed: %s", e)
                    result = {"error": "Could not validate recipient emails."}

            elif tool_name == "validate_leave_request":
                try:
                    args = tool_call["args"]
                    missing_fields = _get_missing_leave_fields(args)
                    if missing_fields:
                        result = _missing_leave_fields_response(missing_fields)
                        messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))
                        continue

                    leave_token = await exchange_token_for_leave(access_token)
                    result = await validate_leave_request.ainvoke(
                        {
                            "access_token": leave_token,
                            "start_date": args.get("start_date", ""),
                            "end_date": args.get("end_date", ""),
                            "period_type": args.get("period_type", ""),
                            "leave_type": args.get("leave_type", ""),
                            "is_morning_leave": args.get("is_morning_leave"),
                            "comment": args.get("comment", "") or "",
                            "is_public_comment": args.get("is_public_comment", False),
                            "email_recipients": _coerce_email_recipients_list(args),
                        }
                    )
                except Exception as e:
                    logger.error("validate_leave_request failed: %s", e)
                    result = {"error": "Failed to validate leave. Please try again later."}

            elif tool_name == "submit_leave_request":
                try:
                    args = tool_call["args"]
                    missing_fields = _get_missing_leave_fields(args)
                    if missing_fields:
                        result = _missing_leave_fields_response(missing_fields)
                        messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))
                        continue

                    leave_token = await exchange_token_for_leave(access_token)

                    val_params = {
                        "access_token": leave_token,
                        "start_date": args.get("start_date", ""),
                        "end_date": args.get("end_date", ""),
                        "period_type": args.get("period_type", ""),
                        "leave_type": args.get("leave_type", ""),
                        "is_morning_leave": args.get("is_morning_leave"),
                        "comment": args.get("comment", "") or "",
                        "is_public_comment": args.get("is_public_comment", False),
                        "email_recipients": _coerce_email_recipients_list(args),
                    }
                    validation_result = await validate_leave_request.ainvoke(val_params)

                    is_valid = (
                        "error" not in validation_result
                        and validation_result.get("hasOverlap") is False
                    )
                    if not is_valid:
                        logger.warning("Leave validation failed before submission: %s", validation_result)
                        result = validation_result
                    else:
                        result = await submit_leave_request.ainvoke(val_params)

                except Exception as e:
                    logger.error("submit_leave_request failed: %s", e)
                    result = {"error": "Failed to submit leave. Please try again later."}

            elif tool_name == "cancel_leave_request":
                try:
                    leave_token = await exchange_token_for_leave(access_token)
                    args = tool_call["args"]
                    raw_id = args.get("leave_id")
                    # Keep as string — list_my_leaves returns IDs as strings to
                    # prevent float precision loss on large values like 3232312366.
                    leave_id = str(raw_id).split(".")[0] if raw_id is not None else ""
                    result = await cancel_leave_request.ainvoke(
                        {"access_token": leave_token, "leave_id": leave_id}
                    )
                    if result.get("success"):
                        list_result = await list_my_leaves.ainvoke(
                            {"access_token": leave_token, "limit": 15}
                        )
                        result["updated_leave_list"] = list_result
                except Exception as e:
                    logger.error("cancel_leave_request failed: %s", e)
                    result = {"error": "Failed to cancel leave. Please try again later."}

            elif tool_name == "list_my_leaves":
                try:
                    leave_token = await exchange_token_for_leave(access_token)
                    args = tool_call["args"]
                    try:
                        limit_val = int(args.get("limit", 15))
                    except (TypeError, ValueError):
                        limit_val = 15
                    result = await list_my_leaves.ainvoke(
                        {
                            "access_token": leave_token,
                            "limit": limit_val,
                            "start_date": args.get("start_date"),
                            "end_date": args.get("end_date"),
                            "statuses": args.get("statuses"),
                            "categories": args.get("categories"),
                        }
                    )
                except Exception as e:
                    logger.error("list_my_leaves failed: %s", e)
                    result = {"error": "Failed to list leaves. Please try again later."}

            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))

    logger.warning("Max tool iterations (%d) reached, forcing text reply", MAX_TOOL_ITERATIONS)
    final = await llm.ainvoke(messages)
    return final.content

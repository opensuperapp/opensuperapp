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
import calendar
import json
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta

import httpx
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from config import DEBUG, LEAVE_BACKEND_URL, OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE
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
    normalize_period_type,
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
        and normalize_period_type(period_type) == "half"
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
    """Ensure email_recipients is always a list ([] when omitted or null).

    Raises ValueError if a non-null, non-list value is provided so the caller
    can surface an error rather than silently dropping the user's recipients.
    """
    raw = args.get("email_recipients")
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    raise ValueError(
        f"email_recipients must be a list of email strings, got: {type(raw).__name__!r} ({raw!r}). "
        "Please provide recipients as a JSON array, e.g. [\"alice@wso2.com\"]."
    )


def _get_leave_types_for_location(location: str | None) -> list[str]:
    """Return the leave type labels applicable to the given employee location."""
    if not location:
        return _ALL_LEAVE_TYPES
    return _LOCATION_LEAVE_TYPES.get(location.strip().lower(), _ALL_LEAVE_TYPES)


# ---------------------------------------------------------------------------
# Proactive date validation helpers
# ---------------------------------------------------------------------------

_ISO_DATE_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")

_MONTH_MAP: dict[str, int] = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5,
    "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}

# Month names pattern — used in regex to avoid false matches like "on 11 th april"
# where a non-month word ("on") consumed the digit before the real month was reached.
_MONTH_PAT = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may"
    r"|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?"
    r"|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
)

# Handles: "11th april", "11 th april", "11th of april", "14 april", "april 14", "april 14th"
# Both alternatives are anchored to known month names so non-month words (e.g. "on")
# cannot consume the digit before a real month name is reached.
_NATURAL_DATE_RE = re.compile(
    rf"\b(?:"
    rf"(\d{{1,2}})\s*(?:st|nd|rd|th)?\s+(?:of\s+)?({_MONTH_PAT})"  # "14th april" / "11 th april"
    rf"|({_MONTH_PAT})\s+(\d{{1,2}})\s*(?:st|nd|rd|th)?"            # "april 14" / "april 14th"
    rf")\b",
    re.IGNORECASE,
)

_DAY_MAP: dict[str, int] = {
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1, "tues": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
}

# "next monday", "this friday", "coming thursday"
_WEEKDAY_RE = re.compile(
    r"\b(?:next|this|coming)\s+(monday|mon|tuesday|tue|tues|wednesday|wed"
    r"|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b",
    re.IGNORECASE,
)

# "in N days", "after N days", "N days later", "N days from now/today"
_IN_N_DAYS_RE = re.compile(
    r"\b(?:in|after)\s+(\d+)\s+days?\b"
    r"|\b(\d+)\s+days?\s+(?:later|from\s+(?:now|today))\b",
    re.IGNORECASE,
)

_ORDINAL_WORD_MAP: dict[str, int] = {
    "first": 1, "1st": 1,
    "second": 2, "2nd": 2,
    "third": 3, "3rd": 3,
    "fourth": 4, "4th": 4,
    "fifth": 5, "5th": 5,
    "sixth": 6, "6th": 6,
    "seventh": 7, "7th": 7,
    "eighth": 8, "8th": 8,
    "ninth": 9, "9th": 9,
    "tenth": 10, "10th": 10,
    "eleventh": 11, "11th": 11,
    "twelfth": 12, "12th": 12,
    "thirteenth": 13, "13th": 13,
    "fourteenth": 14, "14th": 14,
    "fifteenth": 15, "15th": 15,
    "sixteenth": 16, "16th": 16,
    "seventeenth": 17, "17th": 17,
    "eighteenth": 18, "18th": 18,
    "nineteenth": 19, "19th": 19,
    "twentieth": 20, "20th": 20,
    "twenty-first": 21, "twenty first": 21, "21st": 21,
    "twenty-second": 22, "twenty second": 22, "22nd": 22,
    "twenty-third": 23, "twenty third": 23, "23rd": 23,
    "twenty-fourth": 24, "twenty fourth": 24, "24th": 24,
    "twenty-fifth": 25, "twenty fifth": 25, "25th": 25,
    "twenty-sixth": 26, "twenty sixth": 26, "26th": 26,
    "twenty-seventh": 27, "twenty seventh": 27, "27th": 27,
    "twenty-eighth": 28, "twenty eighth": 28, "28th": 28,
    "twenty-ninth": 29, "twenty ninth": 29, "29th": 29,
    "thirtieth": 30, "30th": 30,
    "thirty-first": 31, "thirty first": 31, "31st": 31,
}

_ORDINAL_WORDS = "|".join(re.escape(k) for k in sorted(_ORDINAL_WORD_MAP, key=len, reverse=True))

# "first day of/at/in march", "last day of april", "second day at march"
_ORDINAL_DAY_OF_MONTH_RE = re.compile(
    rf"\b({_ORDINAL_WORDS}|last)\s+day\s+(?:of|at|in)\s+({_MONTH_PAT})\b",
    re.IGNORECASE,
)


def _resolve_relative_dates(text: str, today: "datetime") -> list[str]:
    """Resolve relative date expressions to yyyy-mm-dd strings."""
    from datetime import timedelta
    found: list[str] = []
    text_lower = text.lower()

    # "today"
    if re.search(r"\btoday\b", text_lower):
        found.append(today.strftime("%Y-%m-%d"))

    # Tolerates common typos: tomorrow / tommorow / tommorrow / tomorow / tomoro
    _TOMORROW_PAT = r"tom+or+ow?"

    # "tomorrow"
    if re.search(rf"\b{_TOMORROW_PAT}\b", text_lower):
        found.append((today + timedelta(days=1)).strftime("%Y-%m-%d"))

    # "day after tomorrow" / "day after tommorow"
    if re.search(rf"\bday\s+after\s+{_TOMORROW_PAT}\b", text_lower):
        found.append((today + timedelta(days=2)).strftime("%Y-%m-%d"))

    # "next/this/coming <weekday>"
    for m in _WEEKDAY_RE.finditer(text):
        day_name = m.group(1).lower()
        target_dow = _DAY_MAP.get(day_name)
        if target_dow is not None:
            days_ahead = (target_dow - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7  # "next monday" when today is monday → 7 days ahead
            found.append((today + timedelta(days=days_ahead)).strftime("%Y-%m-%d"))

    # "in N days" / "after N days" / "N days later" / "N days from now"
    for m in _IN_N_DAYS_RE.finditer(text):
        n = int(m.group(1) or m.group(2))
        found.append((today + timedelta(days=n)).strftime("%Y-%m-%d"))

    # "first day of march", "last day of april", "second day at january"
    for m in _ORDINAL_DAY_OF_MONTH_RE.finditer(text):
        ordinal_str = m.group(1).lower()
        month_str = m.group(2).lower()
        month = _MONTH_MAP.get(month_str)
        if month is None:
            continue
        year = today.year
        if ordinal_str == "last":
            day = calendar.monthrange(year, month)[1]
        else:
            day = _ORDINAL_WORD_MAP.get(ordinal_str)
            if day is None:
                continue
        try:
            found.append(f"{year}-{month:02d}-{day:02d}")
        except Exception:
            pass

    return found


def _extract_dates_from_text(text: str) -> list[str]:
    """Return deduplicated yyyy-mm-dd dates extracted from free text."""
    today = datetime.now(_SL_TIMEZONE)
    current_year = today.year
    found: list[str] = []

    # ISO dates: "2026-04-14"
    for m in _ISO_DATE_RE.finditer(text):
        found.append(m.group(1))

    # Natural language month+day: "14th april", "april 14"
    for m in _NATURAL_DATE_RE.finditer(text):
        if m.group(1) and m.group(2):
            day, month_str = int(m.group(1)), m.group(2).lower()
        else:
            month_str, day = m.group(3).lower(), int(m.group(4))
        month = _MONTH_MAP.get(month_str)
        if month and 1 <= day <= 31:
            found.append(f"{current_year}-{month:02d}-{day:02d}")

    # Relative expressions: "tomorrow", "next monday", "in 3 days", etc.
    found.extend(_resolve_relative_dates(text, today))

    seen: set[str] = set()
    result: list[str] = []
    for d in found:
        if d not in seen:
            seen.add(d)
            result.append(d)
    return result


def _dates_already_validated(messages: list, dates: list[str]) -> bool:
    """Return True if all dates already appear in prior ToolMessage content."""
    validated: set[str] = set()
    for msg in messages:
        if isinstance(msg, ToolMessage):
            content = msg.content or ""
            for d in dates:
                if d in content:
                    validated.add(d)
    return all(d in validated for d in dates)


async def _run_proactive_date_validation(
    dates: list[str],
    access_token: str,
) -> list[tuple[str, dict]]:
    """Call isValidationOnlyMode=true for each date; return (date, result) pairs."""
    results: list[tuple[str, dict]] = []
    try:
        leave_token = await exchange_token_for_leave(access_token)
    except Exception as exc:
        logger.warning("Token exchange failed for proactive date validation: %s", exc)
        return results

    for date_str in dates:
        try:
            logger.info("Proactive date validation: checking %s", date_str)
            val_result = await validate_leave_request.ainvoke({
                "access_token": leave_token,
                "start_date": date_str,
                "end_date": date_str,
                "period_type": "one",
                "leave_type": "casual",
                "is_morning_leave": None,
                "comment": "",
                "is_public_comment": False,
                "email_recipients": [],
            })
            if (
                isinstance(val_result, dict)
                and "error" not in val_result
                and val_result.get("workingDays") == 0
            ):
                val_result = {
                    "error": (
                        f"{date_str} has no working days — it may fall on a weekend or public holiday. "
                        "Please choose a different date."
                    ),
                    "workingDays": 0,
                    "date_checked": date_str,
                }
            else:
                if isinstance(val_result, dict):
                    val_result["date_checked"] = date_str
            logger.info("Proactive date validation result for %s: %s", date_str, val_result)
            results.append((date_str, val_result))
        except Exception as exc:
            logger.warning("Proactive date validation error for %s: %s", date_str, exc)
    return results


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
        temperature=OPENAI_TEMPERATURE,
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

    # Proactively validate any dates in the user message by calling the leave
    # backend before the LLM runs. This guarantees workingDays is checked even
    # if the LLM skips calling validate_leave_request on its own.
    if LEAVE_BACKEND_URL:
        mentioned_dates = _extract_dates_from_text(user_message)
        logger.info("Proactive date extraction from user message: %s", mentioned_dates)
        if mentioned_dates and not _dates_already_validated(messages, mentioned_dates):
            today_date = datetime.now(_SL_TIMEZONE).date()
            date_validation_pairs = await _run_proactive_date_validation(mentioned_dates, access_token)
            for date_str, val_result in date_validation_pairs:
                tool_call_id = f"date_check_{uuid.uuid4().hex[:8]}"
                messages.append(AIMessage(
                    content="",
                    tool_calls=[{
                        "id": tool_call_id,
                        "name": "validate_leave_request",
                        "args": {
                            "start_date": date_str,
                            "end_date": date_str,
                            "period_type": "one",
                            "leave_type": "casual",
                            "_validation_only_note": (
                                "SYSTEM: period_type and leave_type above are temporary "
                                "placeholders used only to check whether this date is a "
                                "working day. They are NOT the user's chosen values. "
                                "Do NOT use them in responses or summaries."
                            ),
                        },
                    }],
                ))
                val_result_with_note = dict(val_result) if isinstance(val_result, dict) else {"raw": val_result}
                note = (
                    "Working-day check only. leave_type='casual' and period_type='one' "
                    "were placeholders — do NOT present them as the user's choices. "
                    "Still ask the user for leave type, period, and all other details."
                )
                try:
                    parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    if parsed_date < today_date:
                        next_year_date = date_str.replace(str(parsed_date.year), str(parsed_date.year + 1), 1)
                        note += (
                            f" IMPORTANT: {date_str} is in the past (today is {today_date}). "
                            f"The user did not specify a year. Before proceeding, ask the user: "
                            f"'Just to confirm — did you mean {date_str} ({parsed_date.year}) "
                            f"or {next_year_date} ({parsed_date.year + 1})?' "
                            f"Do NOT assume either year — wait for the user's confirmation."
                        )
                except ValueError:
                    pass
                val_result_with_note["_note"] = note
                messages.append(ToolMessage(content=str(val_result_with_note), tool_call_id=tool_call_id))

    for _iteration in range(MAX_TOOL_ITERATIONS):
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
                except ValueError as e:
                    logger.error("validate_additional_recipient_emails bad args: %s", e)
                    result = {"error": str(e)}
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
                    if raw_id is None:
                        leave_id = ""
                    elif isinstance(raw_id, float):
                        if raw_id != int(raw_id):
                            raise ValueError(
                                f"leave_id has a fractional value ({raw_id!r}) which would "
                                "target the wrong leave record. Use the exact string ID "
                                "returned by list_my_leaves."
                            )
                        leave_id = str(int(raw_id))
                    else:
                        leave_id = str(raw_id)
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

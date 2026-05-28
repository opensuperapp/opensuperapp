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
Leave management tools.

Covers:
  - validate_additional_recipient_emails : Validate @wso2.com email recipients.
  - validate_leave_request               : Validate a leave request without submitting.
  - submit_leave_request                 : Submit a validated leave request.
  - cancel_leave_request                 : Cancel a leave by numeric ID.
  - list_my_leaves                       : List the user's leave records with filters.
  - get_leave_app_configs                : Fetch mandatory/optional notification config.
"""

import base64
import json
import logging
import re
import string
import urllib.parse
from datetime import datetime
from typing import List, Optional

import httpx
from langchain_core.tools import tool

from core.config import DEBUG, LEAVE_BACKEND_URL

logger = logging.getLogger(__name__)

WSO2_EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+\-]+@wso2\.com$")


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

def _normalize_leave_type(leave_type: str) -> str:
    """Normalize user-friendly leave types to backend enum values."""
    raw = str(leave_type or "").strip()
    if ":" in raw:
        raw = raw.split(":")[-1].strip()
    raw = re.sub(r"\s*\(.*?\)", "", raw).strip()
    value = raw.lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "casual": "casual",
        "sick": "sick",
        "annual": "annual",
        "lieu": "lieu",
        "maternity": "maternity",
        "paternity": "paternity",
        "sabbatical": "sabbatical",
        "conges_payes": "conges_payes",
        "congespayes": "conges_payes",
        "rtt": "rtt",
    }
    return aliases.get(value, value)


def normalize_period_type(period_type: str) -> str:
    """Normalize period labels to backend enum values (one | half | multiple)."""
    raw = str(period_type or "").strip()
    if ":" in raw:
        raw = raw.split(":")[-1].strip()
    raw = raw.strip(string.punctuation + " ")
    value = raw.lower().replace("-", " ").replace("_", " ")
    value = " ".join(value.split())

    aliases = {
        "full day": "one",
        "fullday": "one",
        "full": "one",
        "one": "one",
        "one day": "one",
        "single": "one",
        "single day": "one",
        "entire day": "one",
        "whole day": "one",
        "full working day": "one",
        "full leave": "one",
        "half day": "half",
        "half": "half",
        "multiple": "multiple",
        "multi day": "multiple",
        "multi days": "multiple",
        "multiple days": "multiple",
        "multi": "multiple",
        "range": "multiple",
        "more than one day": "multiple",
    }
    if value in aliases:
        return aliases[value]
    underscored = value.replace(" ", "_")
    if underscored in {"full_day", "half_day", "multi_day"}:
        return {"full_day": "one", "half_day": "half", "multi_day": "multiple"}[underscored]
    return underscored


def _normalize_is_morning_leave(value: Optional[bool | str]) -> Optional[bool]:
    """Normalize half-day slot values to bool expected by backend."""
    if value is None or isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"morning", "first_half", "first half", "am", "true"}:
        return True
    if normalized in {"afternoon", "second_half", "second half", "pm", "false"}:
        return False
    return None


def _validate_email_recipients(email_recipients: Optional[List[str]]) -> dict:
    """Validate optional recipient emails; only @wso2.com is accepted."""
    if email_recipients is None:
        return {"ok": True, "emails": []}
    if not isinstance(email_recipients, list):
        return {"ok": False, "error": "Additional recipients must be a list of emails."}

    cleaned_emails: List[str] = []
    invalid_emails: List[str] = []
    for email in email_recipients:
        trimmed = str(email).strip()
        if not trimmed:
            continue
        if not WSO2_EMAIL_REGEX.match(trimmed):
            invalid_emails.append(trimmed)
            continue
        cleaned_emails.append(trimmed)

    if invalid_emails:
        return {
            "ok": False,
            "error": (
                "Please add only @wso2.com email addresses for additional recipients. "
                f"Invalid: {', '.join(invalid_emails)}"
            ),
        }
    return {"ok": True, "emails": cleaned_emails}


def _prepare_leave_payload_inputs(
    period_type: str,
    leave_type: str,
    is_morning_leave: Optional[bool | str],
    email_recipients: Optional[List[str]],
) -> dict:
    """Normalize and validate leave inputs before calling backend."""
    normalized_period_type = normalize_period_type(period_type)
    normalized_leave_type = _normalize_leave_type(leave_type)
    normalized_is_morning_leave = _normalize_is_morning_leave(is_morning_leave)

    if normalized_period_type not in {"one", "half", "multiple"}:
        return {
            "error": "Invalid leave period. Please choose one of: Full Day, Half Day, or Multiple Days.",
            "error_code": "invalid_period",
            "received_period_type": str(period_type),
        }

    if normalized_leave_type not in {
        "casual", "sick", "annual", "lieu", "maternity", "paternity",
        "sabbatical", "conges_payes", "rtt",
    }:
        return {
            "error": (
                "Invalid leave type. Please choose one of: Casual, Sick, Annual, "
                "Lieu, Maternity, Paternity, Conges Payes, RTT."
            ),
            "error_code": "invalid_leave_type",
            "received_leave_type": str(leave_type),
        }

    if normalized_period_type == "half" and normalized_is_morning_leave is None:
        return {
            "error": "For Half Day leave, please specify Morning or Afternoon.",
            "error_code": "half_day_slot",
        }

    recipient_validation = _validate_email_recipients(email_recipients)
    if not recipient_validation.get("ok"):
        return {
            "error": recipient_validation.get("error", "Invalid recipient emails."),
            "error_code": "invalid_recipients",
        }

    return {
        "period_type": normalized_period_type,
        "leave_type": normalized_leave_type,
        "is_morning_leave": normalized_is_morning_leave,
        "email_recipients": recipient_validation["emails"],
    }


def _build_leave_json_body(
    start_date: str,
    end_date: str,
    period_type: str,
    leave_type: str,
    comment: str,
    is_morning_leave: Optional[bool],
    is_public_comment: bool = False,
    email_recipients: Optional[List[str]] = None,
) -> dict:
    body: dict = {
        "startDate": start_date,
        "endDate": end_date,
        "periodType": period_type,
        "leaveType": leave_type,
        "comment": comment if comment is not None else "",
        "emailRecipients": email_recipients or [],
        "isPublicComment": is_public_comment,
    }
    body["isMorningLeave"] = is_morning_leave if period_type == "half" else None
    return body


def _decode_jwt_email(token: str) -> str:
    """Return the email claim from a JWT access token, or empty string if missing."""
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        identifier = payload.get("email") or payload.get("sub", "") or ""
        if isinstance(identifier, str) and "@" in identifier:
            return identifier
        return ""
    except Exception:
        return ""


def _leave_api_headers(access_token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    if DEBUG:
        headers["x-jwt-assertion"] = access_token
    return headers


_SAFE_STATUS_MESSAGES: dict[int, str] = {
    400: "The leave request was invalid. Please check the details and try again.",
    401: "Authentication failed. Please sign in again.",
    403: "You do not have permission to perform this action.",
    404: "The leave record was not found.",
    409: "There is a conflict with an existing leave (e.g. overlap).",
    422: "The leave request could not be processed. Please check your dates and type.",
    500: "The leave service encountered an error. Please try again later.",
}


def _leave_error_from_response(response: httpx.Response) -> dict:
    if response.status_code in (200, 201, 204):
        return {}
    try:
        body = response.json()
        msg = body.get("message") if isinstance(body, dict) else None
        if msg and isinstance(msg, str) and len(msg) <= 200 and not any(
            token in msg.lower() for token in ("exception", "stacktrace", "traceback", "at line", "sql")
        ):
            logger.debug("Leave API error body: %s", body)
            return {"error": msg}
        logger.debug("Leave API error body (suppressed): %s", body)
    except Exception as e:
        logger.debug("Failed to parse Leave API JSON response: %s", response.text, exc_info=e)
    logger.debug("Leave API raw error response: %s", response.text)
    logger.error("Leave API error: status=%s", response.status_code)
    safe_msg = _SAFE_STATUS_MESSAGES.get(
        response.status_code, f"Leave API returned {response.status_code}"
    )
    return {"error": safe_msg}



@tool
async def validate_additional_recipient_emails(email_recipients: Optional[List[str]] = None) -> dict:
    """Validate additional leave notification emails as soon as the user provides them.

    Only @wso2.com addresses are accepted. Call this in the recipient step when the user
    lists emails, so invalid addresses are caught before validate_leave_request/submit.
    Use email_recipients=[] when the user does not want any additional recipients.

    Args:
        email_recipients: List of emails, or omit / use [] when none.
    """
    validation = _validate_email_recipients(email_recipients)
    if not validation.get("ok"):
        return {"valid": False, "error": validation.get("error", "Invalid emails.")}
    return {"valid": True, "emails": validation["emails"]}


@tool
async def validate_leave_request(
    access_token: str,
    start_date: str,
    end_date: str,
    period_type: str,
    leave_type: str,
    is_morning_leave: Optional[bool] = None,
    comment: str = "",
    is_public_comment: bool = False,
    email_recipients: Optional[List[str]] = None,
) -> dict:
    """Validate a general leave request (working days, overlap) without submitting it."""
    if not LEAVE_BACKEND_URL:
        return {"error": "Leave backend is not configured (LEAVE_BACKEND_URL)."}
    email_recipients = email_recipients if email_recipients is not None else []
    prepared = _prepare_leave_payload_inputs(period_type, leave_type, is_morning_leave, email_recipients)
    if prepared.get("error"):
        return dict(prepared)

    payload = _build_leave_json_body(
        start_date, end_date,
        prepared["period_type"], prepared["leave_type"],
        comment, prepared["is_morning_leave"],
        is_public_comment, prepared["email_recipients"],
    )
    url = f"{LEAVE_BACKEND_URL.rstrip('/')}/leaves?isValidationOnlyMode=true"
    headers = _leave_api_headers(access_token)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)

    if response.status_code in (200, 201):
        try:
            data = response.json()
            if isinstance(data, dict):
                data["validation_success"] = True
                return data
            return {"validation_success": True, "message": str(data)}
        except Exception as e:
            logger.error("Failed to parse validation response: %s", e)
            return {"validation_success": True, "message": response.text}
    return _leave_error_from_response(response)


@tool
async def submit_leave_request(
    access_token: str,
    start_date: str,
    end_date: str,
    period_type: str,
    leave_type: str,
    is_morning_leave: Optional[bool] = None,
    comment: str = "",
    is_public_comment: bool = False,
    email_recipients: Optional[List[str]] = None,
) -> dict:
    """Submit a general leave application.
    IMPORTANT: You MUST call validate_leave_request first and only call this tool if validation is successful.
    """
    if not LEAVE_BACKEND_URL:
        return {"error": "Leave backend is not configured (LEAVE_BACKEND_URL)."}
    if _normalize_leave_type(leave_type) == "sabbatical":
        return {"error": "Sabbatical leave cannot be submitted via chat. Use the Leave App / Apps tab."}
    email_recipients = email_recipients if email_recipients is not None else []
    prepared = _prepare_leave_payload_inputs(period_type, leave_type, is_morning_leave, email_recipients)
    if prepared.get("error"):
        return dict(prepared)

    payload = _build_leave_json_body(
        start_date, end_date,
        prepared["period_type"], prepared["leave_type"],
        comment, prepared["is_morning_leave"],
        is_public_comment, prepared["email_recipients"],
    )
    url = f"{LEAVE_BACKEND_URL.rstrip('/')}/leaves?isValidationOnlyMode=false"
    headers = _leave_api_headers(access_token)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)

    if response.status_code in (200, 201):
        try:
            data = response.json()
            return {"success": True, **data} if isinstance(data, dict) else {"success": True}
        except Exception as e:
            logger.error("Failed to parse submission response: %s", e)
            return {"success": True, "message": response.text}
    return _leave_error_from_response(response)


@tool
async def cancel_leave_request(access_token: str, leave_id: str) -> dict:
    """Cancel (withdraw) a leave request by leave id (string).
    IMPORTANT: Do NOT guess the leave_id. Always call list_my_leaves to find the correct ID first.
    The id comes from the 'id' field in the list_my_leaves response — pass it exactly as returned.
    """
    if not LEAVE_BACKEND_URL:
        return {"error": "Leave backend is not configured (LEAVE_BACKEND_URL)."}
    headers = {"Authorization": f"Bearer {access_token}"}
    if DEBUG:
        headers["x-jwt-assertion"] = access_token

    url = f"{LEAVE_BACKEND_URL.rstrip('/')}/leaves/{urllib.parse.quote(str(leave_id), safe='')}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.delete(url, headers=headers)

    if response.status_code in (200, 201, 204):
        try:
            data = response.json()
            return {"success": True, **data} if isinstance(data, dict) else {"success": True}
        except Exception as e:
            logger.error("Failed to parse cancellation response: %s", e)
            return {"success": True, "message": response.text}
    return _leave_error_from_response(response)


@tool
async def list_my_leaves(
    access_token: str,
    limit: int = 15,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    statuses: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
) -> dict:
    """List the current user's recent leave records with optional filtering.

    Use this tool to find the numeric 'id' of a leave request before calling cancel_leave_request.

    IMPORTANT: The results contain numeric 'id' fields. Do NOT show these IDs to the user in the
    final response. Use them internally to help the user identify leaves or perform actions like
    cancellation.

    Args:
        access_token: Leave-app exchanged access token.
        limit: Max number of rows (default 15).
        start_date: Start date yyyy-mm-dd (defaults to start of current year).
        end_date: End date yyyy-mm-dd (defaults to end of current year).
        statuses: List of statuses (default: ["APPROVED", "PENDING"]).
        categories: List of leave categories (e.g., casual, sick, annual).
    """
    if not LEAVE_BACKEND_URL:
        return {"error": "Leave backend is not configured (LEAVE_BACKEND_URL)."}

    email = _decode_jwt_email(access_token)
    if not email:
        return {"error": "Could not read email from token."}

    current_year = datetime.now().year
    effective_start = start_date or f"{current_year}-01-01"
    effective_end = end_date or f"{current_year}-12-31"
    effective_statuses = statuses or ["APPROVED", "PENDING"]
    effective_categories = categories or [
        "annual", "casual", "conges_payes", "rtt", "sick", "lieu", "maternity", "paternity"
    ]

    params = {
        "email": email,
        "startDate": effective_start,
        "endDate": effective_end,
        "statuses": effective_statuses,
        "leaveCategory": effective_categories,
        "orderBy": "DESC",
        "limit": limit,
    }

    headers = {"Authorization": f"Bearer {access_token}"}
    if DEBUG:
        headers["x-jwt-assertion"] = access_token

    url = f"{LEAVE_BACKEND_URL.rstrip('/')}/leaves"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params, headers=headers)

    if response.status_code == 200:
        try:
            data = response.json()
            # Stringify numeric IDs so large values (e.g. 3232312366) are
            # preserved exactly when the LLM echoes them back as tool args.
            # Without this, JSON float serialization can silently truncate them.
            if isinstance(data, dict) and "leaves" in data:
                for leave in data["leaves"]:
                    if isinstance(leave.get("id"), int):
                        leave["id"] = str(leave["id"])
            return data
        except Exception as e:
            logger.error("Failed to parse list response: %s", e)
            return {"error": response.text}
    return _leave_error_from_response(response)


@tool
async def get_leave_app_configs(access_token: str) -> dict:
    """Get leave application configurations including mandatory and optional email recipients.
    Use this when starting a leave application to inform the user about automatic (mandatory)
    notifiers and suggest others.

    Args:
        access_token: Leave-app exchanged access token.
    """
    if not LEAVE_BACKEND_URL:
        return {"error": "Leave backend is not configured (LEAVE_BACKEND_URL)."}

    headers = _leave_api_headers(access_token)
    url = f"{LEAVE_BACKEND_URL.rstrip('/')}/app-configs"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code == 200:
        try:
            return response.json()
        except Exception as e:
            logger.error("Failed to parse app-configs: %s", e)
            return {"error": response.text}
    return _leave_error_from_response(response)

# Chat Agent — Skills Architecture

This document describes how the OpenSuperApp chat agent implements skill-based AI, following the principles outlined in Anthropic's _"The Complete Guide to Building Skills for Claude"_ framework. Each section maps our implementation to a core framework principle and shows exactly where it lives in code.

> **TL;DR** — Our agent treats every micro-app backend as a _skill_: a self-contained, tool-backed capability with its own authentication scope, tooling definition, and system-prompt section. Skills are modular, composable, and designed for progressive disclosure.

---

## Table of Contents

1. [Current Skills](#current-skills)
2. [Principle 1 — Modular Skill Definitions](#principle-1--modular-skill-definitions)
3. [Principle 2 — Progressive Disclosure](#principle-2--progressive-disclosure)
4. [Principle 3 — Structured Tool Schemas](#principle-3--structured-tool-schemas)
5. [Principle 4 — Error Handling & Graceful Degradation](#principle-4--error-handling--graceful-degradation)
6. [Principle 5 — Authentication-Scoped Execution](#principle-5--authentication-scoped-execution)
7. [Principle 6 — Guided Navigation as a Skill](#principle-6--guided-navigation-as-a-skill)
8. [Principle 7 — Extensibility by Design](#principle-7--extensibility-by-design)
9. [Adding a New Skill — Step by Step](#adding-a-new-skill--step-by-step)
10. [Framework Comparison Summary](#framework-comparison-summary)

---

## Current Skills

| #   | Skill                          | Trigger Examples                                 | Tool File                        | Backend                                              | Auth                      |
| --- | ------------------------------ | ------------------------------------------------ | -------------------------------- | ---------------------------------------------------- | ------------------------- |
| 1   | **Meals & Menu**               | "What's for lunch?", "Show today's menu"         | `tools/meals/meals.py`           | Meals API — `GET /menu`                              | Token exchange (RFC 8693) |
| 2   | **Lunch Feedback**             | "The lunch was great", "I want to give feedback" | `tools/meals/meals.py`           | Meals API — `POST /feedback`                         | Token exchange (RFC 8693) |
| 3   | **Create Guest Wi-Fi**         | "Create a guest wifi account"                    | `tools/guest_wifi/guest_wifi.py` | Wi-Fi API — `POST /guest-wifi-accounts`              | Token exchange (RFC 8693) |
| 4   | **Get Guest Wi-Fi Accounts**   | "Show my guest wifi accounts"                    | `tools/guest_wifi/guest_wifi.py` | Wi-Fi API — `GET /guest-wifi-accounts`               | Token exchange (RFC 8693) |
| 5   | **Delete Guest Wi-Fi Account** | "Delete guest wifi account guest_xy12"           | `tools/guest_wifi/guest_wifi.py` | Wi-Fi API — `DELETE /guest-wifi-accounts/{username}` | Token exchange (RFC 8693) |
| 6   | **Apply Leave**                | "Apply for casual leave on 24 Apr"               | `tools/leave/leave.py`           | Leave API — `POST /leaves`                           | Token exchange (RFC 8693) |
| 7   | **Cancel Leave**               | "Cancel my leave on 24 Apr"                      | `tools/leave/leave.py`           | Leave API — `DELETE /leaves/{id}`                    | Token exchange (RFC 8693) |
| 8   | **List Leaves**                | "Show my upcoming leaves"                        | `tools/leave/leave.py`           | Leave API — `GET /leaves`                            | Token exchange (RFC 8693) |
| 9   | **Micro-App Guidance**         | "How do I apply for sabbatical?", "Book a room"  | _None (prompt-only)_             | N/A                                                  | N/A                       |

---

## Principle 1 — Modular Skill Definitions

> _"Each skill should be a self-contained module with clear boundaries."_

Every backend capability is isolated into `@tool` functions under `tools/`, each in its own skill subfolder alongside its prompt section.

| File               | Purpose                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `<skill>.py` | LangChain `@tool` functions — HTTP logic, error handling, structured return |
| `<skill>.md` | System prompt section — when to trigger this skill and how to behave        |

```text
tools/
├── meals/
│   ├── meals.py          ← get_todays_menu, submit_lunch_feedback
│   └── meals.md          ← "Use get_todays_menu when user asks about food…"
├── guest_wifi/
│   ├── guest_wifi.py     ← create/get/delete_guest_wifi_account
│   └── guest_wifi.md
└── leave/
    ├── leave.py          ← validate/submit/cancel/list leave + configs
    └── leave.md

application/templates/
├── base.md
├── formatting.md
└── fallback.md
```

**Why this matters:** Adding a new backend skill remains scoped: create a new folder under `tools/`, write the tool and prompt, wire it in `application/chat_service.py` — done.

---

## Principle 2 — Progressive Disclosure

> _"Present information incrementally. Don't overwhelm the user with everything at once."_

The system prompt is composed from modular files in `PROMPT_ORDER` inside `application/prompt_manager.py`. Each section activates only when relevant:

### Level 1 — Capability Overview (`application/templates/base.md`)

Concise listing of what the agent can do — shown once at the top of every conversation.

### Level 2 — Skill-Specific Instructions (`tools/*/<skill>.md`)

Detailed flow logic (leave application steps, Wi-Fi deletion confirmation, etc.) — only active when the user triggers that skill.

### Level 3 — Guided Fallback (`application/templates/fallback.md`)

For unsupported features, routes the user to the correct micro-app instead of a generic refusal.

---

## Principle 3 — Structured Tool Schemas

> _"Tools should have well-defined input/output schemas so the model can invoke them reliably."_

LangChain's `@tool` decorator auto-generates an OpenAI-compatible function schema from Python type hints and docstrings:

| Aspect              | Implementation                                                 |
| ------------------- | -------------------------------------------------------------- |
| **Input schema**    | Type-annotated args (`access_token: str`, `leave_id: int`, …)  |
| **Description**     | Docstring — read by the LLM to decide when to call the tool    |
| **Trigger phrases** | Embedded in docstring — _"Use this when the user asks about…"_ |
| **Output**          | Typed `-> dict` — structured JSON from the backend             |

Tools are registered in `application/chat_service.py`:

```python
tools = [
    get_todays_menu, submit_lunch_feedback,
    create_guest_wifi_account, get_guest_wifi_accounts, delete_guest_wifi_account,
    validate_additional_recipient_emails, validate_leave_request,
    submit_leave_request, cancel_leave_request, list_my_leaves, get_leave_app_configs,
]
llm_with_tools = llm.bind_tools(tools)
```

---

## Principle 4 — Error Handling & Graceful Degradation

> _"When a skill fails, the agent should degrade gracefully rather than crash."_

Three layers of protection:

### Layer 1 — HTTP errors (`tools/*/`)

```python
if response.status_code != 200:
    return {"error": f"API returned {response.status_code}: {response.text}"}
```

Tools return errors _as data_, not exceptions — the LLM composes a human-friendly explanation.

### Layer 2 — Tool execution errors (`application/chat_service.py`)

```python
try:
    result = await mcp_client.invoke("get_todays_menu", {}, access_token)
except Exception as e:
    result = {"error": "Failed to fetch data. Please try again later."}
```

Even if token exchange or the tool throws, the error is passed back to the LLM as a `ToolMessage`.

### Layer 3 — Endpoint errors (`main.py`)

```python
except Exception as e:
    raise HTTPException(status_code=500, detail="An internal error occurred.")
```

The user never sees a raw stack trace.

---

## Principle 5 — Authentication-Scoped Execution

> _"Skills should operate with the minimum required permissions."_

Each micro-app has its **own OAuth2 client** in Asgardeo. The in-process MCP server exchanges the super app token for a micro-app–scoped token via RFC 8693 before invoking any tool.

```text
Mobile App token  →  McpServer.invoke()  →  exchange_token(client_id, scope)  →  scoped token  →  Backend
```

The `McpServer` looks up the app config (client ID + scope) for each tool and calls the generic `exchange_token` from `infrastructure/auth/token_exchange.py`. Adding a new backend only requires a new `MCP_APP_CONFIGS` entry in `core/config.py`.

---

## Principle 6 — Guided Navigation as a Skill

> _"Not every skill needs a tool. Prompt-based skills provide guidance without backend calls."_

| Skill Type          | Example            | Location                                   |
| ------------------- | ------------------ | ------------------------------------------ |
| **Action skill**    | Meals & Menu       | `tools/meals/meals.py` + `tools/meals/meals.md`   |
| **Knowledge skill** | Micro-App Guidance | `application/templates/fallback.md` only          |

The fallback prompt routes users to the right micro-app instead of saying "I can't help with that."
As each micro-app gains a backend API, its knowledge skill can be upgraded to an action skill by adding a tools file.

---

## Principle 7 — Extensibility by Design

> _"The skill architecture should make it easy to add new capabilities without modifying existing ones."_

```text
chat-agent/
├── api/app.py                    # HTTP interface — never changes for new skills
├── core/config.py                # Env vars + MCP_APP_CONFIGS — add new entry
├── application/chat_service.py   # Register tools in MCP registry + bind tools
├── application/prompt_manager.py # Add new prompt path to PROMPT_ORDER
├── infrastructure/mcp/server.py  # Shared dispatch + token exchange per app
├── infrastructure/auth/token_exchange.py # Generic RFC 8693 exchange primitive
└── tools/<skill>/<skill>.py      # Add tool implementations here
```

| File                            | Changes when adding a skill?      |
| ------------------------------- | --------------------------------- |
| `tools/<skill>/<skill>.py`      | ✅ Create skill tools              |
| `tools/<skill>/<skill>.md`      | ✅ Create skill prompt section     |
| `core/config.py`                | ✅ Add `MCP_APP_CONFIGS` entry     |
| `application/chat_service.py`   | ✅ Register tool → app mapping     |
| `application/prompt_manager.py` | ✅ Add to `PROMPT_ORDER`           |
| `infrastructure/auth/token_exchange.py` | ❌ No per-app wrappers needed |
| `api/app.py`                    | ❌ No changes needed               |

No existing skill code is modified when adding a new skill — only _new_ code is added.

---

## Adding a New Skill — Step by Step

### Step 1: Create the Tool Folder

```bash
mkdir tools/<skill_name>
touch tools/<skill_name>/<skill_name>.py
touch tools/<skill_name>/<skill_name>.md
```

### Step 2: Implement the Tool

```python
# tools/<skill_name>/<skill_name>.py
from langchain_core.tools import tool
from core.config import YOUR_BACKEND_URL

@tool
async def your_tool(access_token: str) -> dict:
    """Describe what this tool does and when to use it.

    Args:
        access_token: The exchanged access token (injected by the agent).
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{YOUR_BACKEND_URL}/endpoint",
                                    headers={"Authorization": f"Bearer {access_token}"})
        if response.status_code != 200:
            return {"error": f"API returned {response.status_code}"}
        return response.json()
```

### Step 3: Write the Skill Prompt

```markdown
<!-- tools/<skill_name>/<skill_name>.md -->
N. **Your Skill Name**: Brief description of what it does.
Use `your_tool` when the user asks about X, Y, or Z.
```

### Step 4: Register in the MCP Layer

```python
# application/chat_service.py
from tools.<skill_name>.<skill_name> import your_tool

# Register app ownership:
_MCP_TOOL_TO_APP["your_tool"] = "your_app"

# Add tool to MCP registrations in _build_mcp_client()
```

### Step 5: Add to Prompt Order

```python
# application/prompt_manager.py
PROMPT_ORDER = [
    ...
    "tools/<skill_name>/<skill_name>.md",
    ...
]
```

### Step 6: Add Configuration

```python
# core/config.py
YOUR_BACKEND_URL = os.getenv("YOUR_BACKEND_URL", "")
YOUR_APP_CLIENT_ID = os.getenv("YOUR_APP_CLIENT_ID", "")
MCP_APP_CONFIGS["your_app"] = McpAppConfig(
    app_key="your_app",
    client_id=YOUR_APP_CLIENT_ID,
    scope=DEFAULT_TOKEN_SCOPE,
)
```

```bash
# .env.example
YOUR_BACKEND_URL=https://your-api-gateway.com/your-app/v1.0
YOUR_APP_CLIENT_ID=your-app-client-id
```

### Step 7: Update This Document

Add the new skill to the [Current Skills](#current-skills) table above.

---

## Framework Comparison Summary

| Anthropic Skills Principle     | Our Implementation                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| **Modular skill definitions**  | Each skill = `tools/<name>/<name>.py` + `tools/<name>/<name>.md`                       |
| **Progressive disclosure**     | `PROMPT_ORDER` reveals sections incrementally; fallback activates only when needed    |
| **Structured tool schemas**    | LangChain `@tool` generates OpenAI-compatible schemas from type hints + docstrings    |
| **Graceful degradation**       | Three-layer error handling: HTTP → tool execution → FastAPI endpoint                  |
| **Scoped permissions**         | RFC 8693 token exchange via in-process MCP server — one scoped token per micro-app      |
| **Knowledge vs action skills** | Micro-App Guidance (prompt-only in `fallback.md`) vs Meals/Wi-Fi/Leave (tool-backed)  |
| **Open/Closed extensibility**  | Adding a skill = new folder + wiring; existing skill code is never modified           |

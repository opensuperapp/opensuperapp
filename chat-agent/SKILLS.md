# Chat Agent — Skills Architecture

This document describes how the OpenSuperApp chat agent implements skill-based AI, following the principles outlined in Anthropic's *"The Complete Guide to Building Skills for Claude"* framework. Each section maps our implementation to a core framework principle and shows exactly where it lives in code.

> **TL;DR** — Our agent treats every micro-app backend as a *skill*: a self-contained, tool-backed capability with its own authentication scope, tooling definition, and system-prompt section. Skills are modular, composable, and designed for progressive disclosure.

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

| # | Skill | Trigger Examples | Tool File | Backend | Auth |
|---|-------|-----------------|-----------|---------|------|
| 1 | **Meals & Menu** | "What's for lunch?", "Show today's menu" | `tools/meals/meals_tools.py` | Meals API — `GET /menu` | Token exchange (RFC 8693) |
| 2 | **Lunch Feedback** | "The lunch was great", "I want to give feedback" | `tools/meals/meals_tools.py` | Meals API — `POST /feedback` | Token exchange (RFC 8693) |
| 3 | **Create Guest Wi-Fi** | "Create a guest wifi account" | `tools/guest_wifi/wifi_tools.py` | Wi-Fi API — `POST /guest-wifi-accounts` | Token exchange (RFC 8693) |
| 4 | **Get Guest Wi-Fi Accounts** | "Show my guest wifi accounts" | `tools/guest_wifi/wifi_tools.py` | Wi-Fi API — `GET /guest-wifi-accounts` | Token exchange (RFC 8693) |
| 5 | **Delete Guest Wi-Fi Account** | "Delete guest wifi account guest_xy12" | `tools/guest_wifi/wifi_tools.py` | Wi-Fi API — `DELETE /guest-wifi-accounts/{username}` | Token exchange (RFC 8693) |
| 6 | **Apply Leave** | "Apply for casual leave on 24 Apr" | `tools/leave/leave_tools.py` | Leave API — `POST /leaves` | Token exchange (RFC 8693) |
| 7 | **Cancel Leave** | "Cancel my leave on 24 Apr" | `tools/leave/leave_tools.py` | Leave API — `DELETE /leaves/{id}` | Token exchange (RFC 8693) |
| 8 | **List Leaves** | "Show my upcoming leaves" | `tools/leave/leave_tools.py` | Leave API — `GET /leaves` | Token exchange (RFC 8693) |
| 9 | **Micro-App Guidance** | "How do I apply for sabbatical?", "Book a room" | *None (prompt-only)* | N/A | N/A |

---

## Principle 1 — Modular Skill Definitions

> *"Each skill should be a self-contained module with clear boundaries."*

Every backend capability is isolated into its own `@tool` function inside a dedicated skill folder under `tools/`. Each skill folder contains:

| File | Purpose |
|------|---------|
| `<skill>_tools.py` | LangChain `@tool` functions — HTTP logic, error handling, structured return |
| `prompt.md` | System prompt section — when to trigger this skill and how to behave |

```
tools/
├── meals/
│   ├── meals_tools.py          ← get_todays_menu, submit_lunch_feedback
│   ├── prompt.md               ← "Use get_todays_menu when user asks about food…"
│   └── lunch_feedback_prompt.md
├── guest_wifi/
│   ├── wifi_tools.py           ← create/get/delete_guest_wifi_account
│   └── prompt.md
└── leave/
    ├── leave_tools.py          ← validate/submit/cancel/list leave + configs
    └── prompt.md
```

**Why this matters:** Adding a new backend skill never requires touching existing skill code. Create a new folder, write the tool and prompt, wire it in `agent/agent.py` — done.

---

## Principle 2 — Progressive Disclosure

> *"Present information incrementally. Don't overwhelm the user with everything at once."*

The system prompt is composed from modular files in `PROMPT_ORDER` inside `agent/prompt_manager.py`. Each section activates only when relevant:

### Level 1 — Capability Overview (`agent/prompts/base.md`)

Concise listing of what the agent can do — shown once at the top of every conversation.

### Level 2 — Skill-Specific Instructions (`tools/*/prompt.md`)

Detailed flow logic (leave application steps, Wi-Fi deletion confirmation, etc.) — only active when the user triggers that skill.

### Level 3 — Guided Fallback (`agent/prompts/fallback.md`)

For unsupported features, routes the user to the correct micro-app instead of a generic refusal.

---

## Principle 3 — Structured Tool Schemas

> *"Tools should have well-defined input/output schemas so the model can invoke them reliably."*

LangChain's `@tool` decorator auto-generates an OpenAI-compatible function schema from Python type hints and docstrings:

| Aspect | Implementation |
|--------|---------------|
| **Input schema** | Type-annotated args (`access_token: str`, `leave_id: int`, …) |
| **Description** | Docstring — read by the LLM to decide when to call the tool |
| **Trigger phrases** | Embedded in docstring — *"Use this when the user asks about…"* |
| **Output** | Typed `-> dict` — structured JSON from the backend |

Tools are registered in `agent/agent.py`:

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

> *"When a skill fails, the agent should degrade gracefully rather than crash."*

Three layers of protection:

### Layer 1 — HTTP errors (`tools/*/`)

```python
if response.status_code != 200:
    return {"error": f"API returned {response.status_code}: {response.text}"}
```

Tools return errors *as data*, not exceptions — the LLM composes a human-friendly explanation.

### Layer 2 — Tool execution errors (`agent/agent.py`)

```python
try:
    token = await exchange_token_for_meals(access_token)
    result = await get_todays_menu.ainvoke({"access_token": token})
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

> *"Skills should operate with the minimum required permissions."*

Each micro-app has its **own OAuth2 client** in Asgardeo. `agent/token_exchange.py` exchanges the super app token for a micro-app–scoped token via RFC 8693 before invoking any tool.

```text
Mobile App token  →  exchange_token_for_meals()   →  meals-scoped token  →  Meals Backend
Mobile App token  →  exchange_token_for_leave()   →  leave-scoped token  →  Leave Backend
Mobile App token  →  exchange_token_for_guest_wifi() → wifi-scoped token  →  Wi-Fi Backend
```

Adding a new backend only requires a one-liner wrapper in `agent/token_exchange.py`.

---

## Principle 6 — Guided Navigation as a Skill

> *"Not every skill needs a tool. Prompt-based skills provide guidance without backend calls."*

| Skill Type | Example | Location |
|-----------|---------|---------|
| **Action skill** | Meals & Menu | `tools/meals/meals_tools.py` + `prompt.md` |
| **Knowledge skill** | Micro-App Guidance | `agent/prompts/fallback.md` only |

The fallback prompt routes users to the right micro-app instead of saying "I can't help with that."
As each micro-app gains a backend API, its knowledge skill can be upgraded to an action skill by adding a tools file.

---

## Principle 7 — Extensibility by Design

> *"The skill architecture should make it easy to add new capabilities without modifying existing ones."*

```
chat-agent/
├── main.py               # HTTP interface — never changes for new skills
├── config.py             # Env vars — add new vars only
├── agent/
│   ├── agent.py          # Import + register new tool; add handler in loop
│   ├── prompt_manager.py # Add new prompt path to PROMPT_ORDER
│   └── token_exchange.py # Add one-liner exchange wrapper (if needed)
└── tools/
    └── <new_skill>/      # Create folder, add tools + prompt.md
```

| File | Changes when adding a skill? |
|------|------------------------------|
| `tools/<skill>/` | ✅ Create new folder |
| `agent/token_exchange.py` | ✅ Add wrapper (if new micro-app) |
| `agent/agent.py` | ✅ Import + bind + handle |
| `agent/prompt_manager.py` | ✅ Add to PROMPT_ORDER |
| `config.py` | ✅ Add env vars |
| `main.py` | ❌ No changes needed |

No existing skill code is modified when adding a new skill — only *new* code is added.

---

## Adding a New Skill — Step by Step

### Step 1: Create the Tool Folder

```bash
mkdir tools/<skill_name>
touch tools/<skill_name>/__init__.py
touch tools/<skill_name>/<skill_name>_tools.py
touch tools/<skill_name>/prompt.md
```

### Step 2: Implement the Tool

```python
# tools/<skill_name>/<skill_name>_tools.py
from langchain_core.tools import tool
from config import YOUR_BACKEND_URL

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
# tools/<skill_name>/prompt.md
N. **Your Skill Name**: Brief description of what it does.
Use `your_tool` when the user asks about X, Y, or Z.
```

### Step 4: Add Token Exchange

```python
# agent/token_exchange.py
async def exchange_token_for_your_app(access_token: str) -> str:
    return await exchange_token(access_token, YOUR_APP_CLIENT_ID)
```

### Step 5: Register in the Agent

```python
# agent/agent.py
from tools.<skill_name>.<skill_name>_tools import your_tool
from agent.token_exchange import exchange_token_for_your_app

# In tools list:
tools = [..., your_tool]

# In tool-call loop:
elif tool_name == "your_tool":
    try:
        token = await exchange_token_for_your_app(access_token)
        result = await your_tool.ainvoke({"access_token": token})
    except Exception as e:
        result = {"error": "Failed. Please try again later."}
```

### Step 6: Add to Prompt Order

```python
# agent/prompt_manager.py
PROMPT_ORDER = [
    ...
    "tools/<skill_name>/prompt.md",
    ...
]
```

### Step 7: Add Configuration

```python
# config.py
YOUR_BACKEND_URL = os.getenv("YOUR_BACKEND_URL", "")
YOUR_APP_CLIENT_ID = os.getenv("YOUR_APP_CLIENT_ID", "")
```

```bash
# .env.example
YOUR_BACKEND_URL=https://your-api-gateway.com/your-app/v1.0
YOUR_APP_CLIENT_ID=your-app-client-id
```

### Step 8: Update This Document

Add the new skill to the [Current Skills](#current-skills) table above.

---

## Framework Comparison Summary

| Anthropic Skills Principle | Our Implementation |
|---------------------------|-------------------|
| **Modular skill definitions** | Each skill = `tools/<name>/` folder with `_tools.py` + `prompt.md` |
| **Progressive disclosure** | `PROMPT_ORDER` reveals sections incrementally; fallback activates only when needed |
| **Structured tool schemas** | LangChain `@tool` generates OpenAI-compatible schemas from type hints + docstrings |
| **Graceful degradation** | Three-layer error handling: HTTP → tool execution → FastAPI endpoint |
| **Scoped permissions** | RFC 8693 token exchange in `agent/token_exchange.py` — one scoped token per micro-app |
| **Knowledge vs action skills** | Micro-App Guidance (prompt-only in `fallback.md`) vs Meals/Wi-Fi/Leave (tool-backed) |
| **Open/Closed extensibility** | Adding a skill = new folder + wiring; existing skill code is never modified |

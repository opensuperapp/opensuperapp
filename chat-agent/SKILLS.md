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

| # | Skill | Trigger Examples | Backend | Auth |
|---|-------|-----------------|---------|------|
| 1 | **Meals & Menu** | "What's for lunch?", "Show today's menu" | Meals API — `GET /menu` (Ballerina) | Token exchange (RFC 8693) |
| 2 | **Micro-App Guidance** | "How do I apply for leave?", "Book a room" | *None (prompt-only)* | N/A |

---

## Principle 1 — Modular Skill Definitions

> *"Each skill should be a self-contained module with clear boundaries."*

Every backend capability is isolated into its own LangChain `@tool` function in `app/tools.py`. A tool encapsulates:

- **What** it does (docstring — read by the LLM to decide when to call it)
- **How** it talks to the backend (HTTP client, headers, endpoint)
- **What** it returns (structured `dict`)

```python
# app/tools.py — each skill = one @tool function
@tool
async def get_todays_menu(access_token: str) -> dict:
    """Get today's menu including breakfast, juice, lunch, dessert, and snack.
    Use this when the user asks about meals, food, what's for lunch/breakfast,
    today's menu, or anything related to cafeteria food.

    Args:
        access_token: The exchanged access token for authentication (injected by the agent).
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{MEALS_BACKEND_URL}/menu",
            headers={
                "x-jwt-assertion": access_token,
                "Authorization": f"Bearer {access_token}",
            },
        )
        if response.status_code != 200:
            return {"error": f"Menu API returned {response.status_code}: {response.text}"}
        return response.json()
```

**Why this matters:** Adding a new backend skill never requires modifying existing tool code. You simply create a new `@tool` function — the LLM discovers it via the tool definition automatically.

---

## Principle 2 — Progressive Disclosure

> *"Present information incrementally. Don't overwhelm the user with everything at once."*

The system prompt in `app/agent.py` is structured for progressive disclosure at two levels:

### Level 1 — Capability Enumeration (concise)

The agent tells the user *what it can do* only when relevant:

```text
You can help employees with company-related queries. Currently you can:

1. **Meals & Menu**: Fetch today's cafeteria menu ...
```

### Level 2 — Detailed Formatting (on demand)

Formatting instructions are embedded but only activated when a tool returns data:

```text
When presenting menu information:
- Format it in a clean, readable way using markdown
- Group items by meal type (Breakfast, Juice, Lunch, Dessert, Snack)
- Be conversational and friendly
```

### Level 3 — Guided Fallback

For features outside the agent's capabilities, the prompt provides *navigation hints* rather than generic refusals:

```text
- **Leave requests or balances** → "You can manage your leaves in the **Leave App** ..."
```

This mirrors the Anthropic framework's recommendation: "Skills should reveal complexity only when the user needs it."

---

## Principle 3 — Structured Tool Schemas

> *"Tools should have well-defined input/output schemas so the model can invoke them reliably."*

LangChain's `@tool` decorator auto-generates an OpenAI-compatible function schema from the Python type hints and docstring. Our approach:

| Aspect | Implementation |
|--------|---------------|
| **Input schema** | Type-annotated args: `access_token: str` |
| **Description** | Docstring — *"Get today's menu including breakfast, juice, lunch, dessert, and snack."* |
| **Trigger phrases** | Embedded in the docstring — *"Use this when the user asks about meals, food..."* |
| **Output** | Typed return `-> dict` — structured JSON from the backend |

The agent binds tools explicitly in `app/agent.py`:

```python
llm_with_tools = llm.bind_tools([get_todays_menu])
```

This binding step is where skills are *registered*. The LLM receives the full JSON Schema for each tool and decides autonomously when to invoke them — the core of the Anthropic Skills pattern.

---

## Principle 4 — Error Handling & Graceful Degradation

> *"When a skill fails, the agent should degrade gracefully rather than crash."*

Our implementation handles failures at three layers:

### Layer 1 — HTTP-level errors (tools.py)

```python
if response.status_code != 200:
    return {"error": f"Menu API returned {response.status_code}: {response.text}"}
```

The tool returns an error *as data*, not as an exception. This lets the LLM compose a human-friendly explanation.

### Layer 2 — Tool execution errors (agent.py)

```python
try:
    meals_token = await exchange_token_for_meals(access_token)
    result = await get_todays_menu.ainvoke({"access_token": meals_token})
except Exception as e:
    logger.error("Tool execution failed: %s", e)
    result = {"error": str(e)}
```

Even if token exchange or the tool itself throws, the error is wrapped as a `ToolMessage` and passed back to the LLM, which then explains the issue conversationally.

### Layer 3 — Endpoint-level errors (main.py)

```python
try:
    reply = await run_agent(request.message, access_token)
    return ChatResponse(reply=reply)
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
```

If the entire agent pipeline fails, the FastAPI endpoint returns a structured error to the frontend, which displays it in the chat UI.

**Result:** At no point does the user see a raw stack trace. Errors flow through three catch-and-explain layers before reaching the user.

---

## Principle 5 — Authentication-Scoped Execution

> *"Skills should operate with the minimum required permissions."*

This is where our architecture goes beyond the standard Skills framework. Each micro-app backend has its **own OAuth2 client registration** in Asgardeo, and the agent exchanges the super app's access token for a micro-app-scoped token before invoking any tool.

### Token Exchange Flow (RFC 8693)

```text
┌────────────────┐         ┌────────────┐         ┌──────────────┐
│  Mobile App    │         │  Chat Agent │         │   Asgardeo   │
│  (Super App    │ Bearer  │  (FastAPI)  │  Token  │   (IdP)      │
│   token)       │────────▶│             │─Exchange─▶│              │
│                │         │             │◀─Scoped──│              │
│                │         │   meals_    │  Token   │              │
│                │         │   token ────┼─────────▶│ Meals Backend│
└────────────────┘         └────────────┘         └──────────────┘
```

```python
# app/token_exchange.py
async def exchange_token_for_meals(access_token: str) -> str:
    payload = {
        "grant_type": GRANT_TYPE_TOKEN_EXCHANGE,       # RFC 8693
        "subject_token": access_token,                  # super app token
        "subject_token_type": SUBJECT_TOKEN_TYPE,       # jwt
        "requested_token_type": REQUESTED_TOKEN_TYPE,   # access_token
        "client_id": MEALS_APP_CLIENT_ID,               # per-app scoped
        "scope": SCOPE,                                 # openid email groups profile
    }
    # ... POST to Asgardeo token endpoint
```

**Key design decision:** Each backend gets its own `client_id` and exchange function. When a new backend is added (e.g., Leave, Facilities), it gets a *new* exchange function with its own `CLIENT_ID` environment variable. This mirrors the existing micro-app pattern in the React Native frontend's `authService.ts` and ensures least-privilege token scoping.

---

## Principle 6 — Guided Navigation as a Skill

> *"Not every skill needs a tool. Prompt-based skills provide guidance without backend calls."*

Our "Micro-App Guidance" skill is implemented entirely in the system prompt — no tool, no backend call. This follows the Anthropic pattern of *knowledge skills* vs *action skills*:

| Skill Type | Example | Implementation |
|-----------|---------|---------------|
| **Action skill** | Meals & Menu | `@tool` function + backend call |
| **Knowledge skill** | Micro-App Guidance | System prompt rules only |

The guidance skill in the system prompt:

```text
For features you **cannot** handle directly, guide the user to the right micro app:
- **Leave requests or balances** → "You can manage your leaves in the **Leave App**
  available in the Apps tab."
- **Facility or room bookings** → "Head over to the **Facilities App** in the Apps tab ..."
```

This is a deliberate design: rather than returning "I can't help with that", the agent acts as a concierge, routing users to the appropriate part of the super app. As each micro-app gains a backend API, its guidance entry can be *upgraded* from a knowledge skill to an action skill with a `@tool`.

---

## Principle 7 — Extensibility by Design

> *"The skill architecture should make it easy to add new capabilities without modifying existing ones."*

Our file structure maps directly to the Skills framework's module boundaries:

```text
chat-agent/
├── app/
│   ├── agent.py           # Orchestrator — system prompt + tool loop
│   ├── tools.py           # Skill implementations (one @tool per skill)
│   ├── token_exchange.py  # Per-skill auth scoping
│   ├── config.py          # Skill configuration (env vars)
│   └── main.py            # HTTP interface (skill-agnostic)
├── SKILLS.md              # This file — skill catalog & extension guide
└── .env                   # Per-environment skill configuration
```

### Separation of Concerns

| File | Responsibility | Changes when adding a skill? |
|------|---------------|------------------------------|
| `tools.py` | Tool/skill implementation | ✅ Add new `@tool` function |
| `token_exchange.py` | Authentication scoping | ✅ Add new exchange function (if needed) |
| `agent.py` | Orchestration & prompt | ✅ Import tool, bind, add prompt section |
| `config.py` | Environment config | ✅ Add new env vars |
| `main.py` | HTTP API | ❌ No changes needed |

No existing code is modified when adding a skill — only *new* code is added to existing files, following the Open/Closed Principle.

---

## Adding a New Skill — Step by Step

### Step 1: Define the Tool

Create a new `@tool` function in `app/tools.py`:

```python
from app.config import LEAVE_BACKEND_URL

@tool
async def get_leave_balance(access_token: str) -> dict:
    """Get the user's remaining leave balance for the current year.
    Use this when the user asks about leave balance, remaining days off,
    vacation days, or how much leave they have left.

    Args:
        access_token: The exchanged access token for authentication.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{LEAVE_BACKEND_URL}/balance",
            headers={
                "x-jwt-assertion": access_token,
                "Authorization": f"Bearer {access_token}",
            },
        )
        if response.status_code != 200:
            return {"error": f"Leave API returned {response.status_code}: {response.text}"}
        return response.json()
```

### Step 2: Add Token Exchange

In `app/token_exchange.py`, add a new exchange function with the app's client ID:

```python
from app.config import LEAVE_APP_CLIENT_ID

async def exchange_token_for_leave(access_token: str) -> str:
    """Exchange super app token for a leave-app-scoped token."""
    payload = {
        "grant_type": GRANT_TYPE_TOKEN_EXCHANGE,
        "subject_token": access_token,
        "subject_token_type": SUBJECT_TOKEN_TYPE,
        "requested_token_type": REQUESTED_TOKEN_TYPE,
        "client_id": LEAVE_APP_CLIENT_ID,
        "scope": SCOPE,
    }
    # ... same HTTP call pattern as exchange_token_for_meals
```

### Step 3: Register with the Agent

In `app/agent.py`:

```python
from app.tools import get_todays_menu, get_leave_balance
from app.token_exchange import exchange_token_for_meals, exchange_token_for_leave

# Bind all tools
llm_with_tools = llm.bind_tools([get_todays_menu, get_leave_balance])

# Add execution handler
if tool_name == "get_leave_balance":
    leave_token = await exchange_token_for_leave(access_token)
    result = await get_leave_balance.ainvoke({"access_token": leave_token})
```

### Step 4: Update the System Prompt

Add the new capability and upgrade the guidance entry:

```python
SYSTEM_PROMPT = """...
2. **Leave Balance**: Check your remaining leave days for the current year. \
Use the get_leave_balance tool when users ask about leave balance or vacation days.
...
"""
```

### Step 5: Add Configuration

In `app/config.py`:

```python
LEAVE_BACKEND_URL = os.getenv("LEAVE_BACKEND_URL", "")
LEAVE_APP_CLIENT_ID = os.getenv("LEAVE_APP_CLIENT_ID", "")
```

In `.env`:

```bash
LEAVE_BACKEND_URL=https://leave-api.example.com
LEAVE_APP_CLIENT_ID=<client-id-from-asgardeo>
```

### Step 6: Update This Document

Add the new skill to the [Current Skills](#current-skills) table above.

---

## Framework Comparison Summary

| Anthropic Skills Principle | Our Implementation |
|---------------------------|-------------------|
| **Modular skill definitions** | Each backend = one `@tool` function in `tools.py` |
| **Progressive disclosure** | System prompt reveals capabilities incrementally; formatting rules activate on demand |
| **Structured tool schemas** | LangChain `@tool` generates OpenAI-compatible function schemas from type hints + docstrings |
| **Graceful degradation** | Three-layer error handling: HTTP → tool execution → endpoint; errors become conversational messages |
| **Scoped permissions** | RFC 8693 token exchange gives each skill its own least-privilege token |
| **Knowledge vs action skills** | Micro-App Guidance (prompt-only) vs Meals & Menu (tool-backed) |
| **Open/Closed extensibility** | Adding a skill = adding code, never modifying existing skill implementations |

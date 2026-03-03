# Chat Agent Skills

This document describes the skills (capabilities) of the OpenSuperApp chat agent and how to extend them.

## Current Skills

### 1. Meals & Menu

**Trigger phrases:** "What's for lunch?", "Show me today's menu", "What food is available?", etc.

**What it does:**
- Fetches today's cafeteria menu from the Meals backend
- Displays information grouped by meal type: Breakfast, Juice, Lunch, Dessert, Snack
- Formats the response with markdown for readability

**Backend:** Meals App (Ballerina) — `GET /menu`

**Authentication:** Token exchange via Asgardeo (RFC 8693)

### 2. Micro-App Guidance

**Trigger phrases:** "How do I apply for leave?", "Book a meeting room", "Find an employee", etc.

**What it does:**
- Recognizes when a request relates to a micro-app feature
- Directs users to the appropriate app within the Super App

**Supported redirections:**
| User Intent | Suggested App |
|-------------|---------------|
| Leave requests/balances | Leave App (Apps tab) |
| Facility/room bookings | Facilities App (Apps tab) |
| HR/people information | People App (Apps tab) |
| Events | Home tab |
| News | Home tab |

---

## Adding a New Skill

To add a new backend-integrated skill:

### Step 1: Create a Tool

Add a new tool function in `app/tools.py`:

```python
@tool
async def my_new_tool(access_token: str) -> dict:
    """Description of what this tool does.
    Use this when the user asks about <topic>.

    Args:
        access_token: The exchanged access token for authentication.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{MY_BACKEND_URL}/endpoint",
            headers={
                "x-jwt-assertion": access_token,
                "Authorization": f"Bearer {access_token}",
            },
        )
        return response.json()
```

### Step 2: Register with the Agent

In `app/agent.py`, import and bind the tool:

```python
from app.tools import get_todays_menu, my_new_tool

llm_with_tools = llm.bind_tools([get_todays_menu, my_new_tool])
```

Add handling in the tool execution block:

```python
if tool_name == "my_new_tool":
    token = await exchange_token_for_my_app(access_token)
    result = await my_new_tool.ainvoke({"access_token": token})
```

### Step 3: Update the System Prompt

Add the new capability to the `SYSTEM_PROMPT` in `app/agent.py` so the agent knows when to use it.

### Step 4: Add Token Exchange (if needed)

If the new backend requires a different app-scoped token, add a new exchange function in `app/token_exchange.py` with the appropriate `client_id`.

---

## Design Principles

1. **Tool-based architecture**: Each backend capability is a LangChain tool with clear docstrings
2. **Token isolation**: Each micro-app gets its own scoped token via exchange
3. **Graceful degradation**: If a tool fails, the agent reports the error conversationally
4. **Guided navigation**: For unsupported features, users are directed to the right app

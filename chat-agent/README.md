# Chat Agent

AI-powered chat agent for the OpenSuperApp. Built with **FastAPI**, **LangChain**, and **OpenAI GPT-4o**, this service provides a conversational interface that can fetch data from micro-app backends on behalf of the user.

## Architecture

```
┌─────────────┐    POST /chat     ┌──────────────────┐    Token Exchange    ┌────────────┐
│  Super App   │ ───────────────▶ │   Chat Agent     │ ──────────────────▶ │  Asgardeo  │
│  (Frontend)  │ ◀─────────────── │  (FastAPI +      │ ◀────────────────── │  (OAuth2)  │
│              │    { reply }      │   LangChain)     │   Exchanged Token   │            │
└─────────────┘                   └──────┬───────────┘                     └────────────┘
                                         │
                                         │ Tool calls (per micro-app scoped token)
                                         ▼
                              ┌──────────────────────┐
                              │  Micro-App Backends  │
                              │  Meals / Wi-Fi / Leave│
                              └──────────────────────┘
```

### How It Works

1. **User sends a message** from the Super App chat screen
2. **Frontend sends** the message + access token to `POST /chat`
3. **LangChain agent** processes the message using GPT-4o
4. If the agent decides to call a tool:
   - The tool call goes through the in-process **MCP server** registry
   - MCP exchanges the super app access token via Asgardeo (RFC 8693) for a **micro-app–scoped** token
   - MCP invokes the tool with the exchanged token
   - The agent formats the tool response into a friendly message
5. **Response is returned** to the frontend

## Getting Started

**Run locally, Postman, headers, and tokens:** see [CHAT_AGENT_RUNBOOK.md](./CHAT_AGENT_RUNBOOK.md).

### Prerequisites

- Python 3.11+
- OpenAI API key
- Access to Asgardeo (WSO2 identity provider)

### Setup

```bash
# Navigate to the chat-agent directory
cd chat-agent

# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Register chat-agent packages as importable modules (one-time)
pip install -e .

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables

| Variable                   | Description                                                | Required              |
| -------------------------- | ---------------------------------------------------------- | --------------------- |
| `OPENAI_API_KEY`           | Your OpenAI API key                                        | Yes                   |
| `OPENAI_MODEL`             | OpenAI model name (default: `gpt-4o`)                      | No                    |
| `MEALS_BACKEND_URL`        | URL of the meals backend API                               | Yes                   |
| `ASGARDEO_TOKEN_URL`       | Asgardeo OAuth2 token endpoint                             | Yes                   |
| `MEALS_APP_CLIENT_ID`      | Client ID for the meals micro-app in Asgardeo              | Yes                   |
| `GUEST_WIFI_BACKEND_URL`   | Guest Wi‑Fi API base URL                                   | Yes (for Wi‑Fi tools) |
| `GUEST_WIFI_APP_CLIENT_ID` | Asgardeo client ID for the guest Wi‑Fi app                 | Yes (for Wi‑Fi tools) |
| `LEAVE_BACKEND_URL`        | Leave API base URL                                         | Yes (for leave tools) |
| `LEAVE_APP_CLIENT_ID`      | Asgardeo client ID for the Leave app                       | Yes (for leave tools) |
| `MEALS_EXTRA_SCOPES`       | Optional extra OAuth scopes for Meals token exchange       | No                    |
| `GUEST_WIFI_EXTRA_SCOPES`  | Optional extra OAuth scopes for Guest Wi-Fi token exchange | No                    |
| `DEBUG`                    | Enable debug headers and curl logging (`true`/`false`)     | No                    |

**Leave API details** (endpoints, payloads, auth): see [LEAVE_APP_API.md](./LEAVE_APP_API.md).

### Running

```bash
# Install the project in editable mode (one-time, after pip install -r requirements.txt)
pip install -e .

# Start the server
uvicorn api.app:app --host 0.0.0.0 --port 8000 --reload

# The API will be available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

## Testing

The project includes a comprehensive test suite covering all security guardrails and functionality.

### Test Statistics

- **Total Tests**: 230 tests
- **Test Categories**:
  - Request Limits (22 tests)
  - Suspicious Intent Detection (54 tests)
  - Response Sanitization (49 tests)
  - Content Moderation (84 tests)
  - Metrics Tracking (50 tests)
  - System Prompt Security, Integration, and Unit tests

### Running Tests

```bash
# Run all tests
python3 -m pytest tests/ -v

# Run with coverage
python3 -m pytest tests/ --cov=. --cov-report=html

# Run specific test file
python3 -m pytest tests/test_sanitization.py -v

# Run tests in parallel (requires pytest-xdist)
python3 -m pytest tests/ -n auto
```

### Test Documentation

See [tests/README.md](./tests/README.md) for detailed test documentation and test categories.

## API Reference

### `GET /health`

Health check endpoint.

**Response:**

```json
{ "status": "ok" }
```

### `POST /chat`

Send a message to the AI chat agent.

**Headers:**

```http
x-jwt-assertion: <access_token>
x-user-assertion: <access_token>
```

**Request Body:**

```json
{
  "message": "What's for lunch today?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**

```json
{
  "reply": "Here's today's menu! ..."
}
```

## Project Structure

```
chat-agent/
├── main.py                        # Compatibility launcher
├── Procfile                       # Process definition for deployment
├── pyproject.toml                 # Project metadata and package config
├── pytest.ini                     # Pytest configuration
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment variables template
├── .gitignore
├── README.md                      # This file
├── SKILLS.md                      # Agent skills architecture documentation
├── openapi.yaml                   # OpenAPI 3.1 specification
├── api/
│   └── app.py                     # FastAPI entry point & request validation
├── core/
│   └── config.py                  # Environment configuration
├── application/
│   ├── chat_service.py            # LangChain orchestration & MCP dispatch
│   ├── prompt_manager.py          # Prompt composition from template files
│   └── templates/
│       ├── base.md                # Core identity & security rules
│       ├── formatting.md          # Response formatting rules
│       └── fallback.md            # Out-of-scope redirection behavior
├── infrastructure/
│   ├── auth/
│   │   └── token_exchange.py      # Asgardeo RFC 8693 token exchange
│   └── mcp/
│       ├── __init__.py
│       ├── client.py              # MCP client facade
│       ├── server.py              # Tool registry + token exchange dispatch
│       └── types.py               # MCP app/tool registration types
├── tools/
│   ├── meals/
│   │   ├── meals.py               # Meals tool functions
│   │   └── meals.md               # Meals prompt section
│   ├── guest_wifi/
│   │   ├── guest_wifi.py          # Guest Wi-Fi tool functions
│   │   └── guest_wifi.md          # Guest Wi-Fi prompt section
│   └── leave/
│       ├── leave.py               # Leave tool functions
│       └── leave.md               # Leave prompt section
└── tests/
    ├── conftest.py
    ├── test_agent_mcp_dispatch.py
    ├── test_content_moderation.py
    ├── test_integration.py
    ├── test_meals_mcp.py
    ├── test_metrics.py
    ├── test_mcp_server.py
    ├── test_request_limits.py
    ├── test_sanitization.py
    ├── test_suspicious_intent.py
    └── test_system_prompt_security.py
```

### Adding a New Skill

1. Add tool functions in `tools/<skill_name>/<skill_name>.py`
2. Add backend + client/env values in `core/config.py` and `.env.example`
3. Register the tool to an app key in `_MCP_TOOL_TO_APP` and `_build_mcp_client()` in `application/chat_service.py`
4. Add app-level MCP config to `MCP_APP_CONFIGS` in `core/config.py` (client_id + scope)
5. Add `tools/<skill_name>/<skill_name>.md` to `PROMPT_ORDER` in `application/prompt_manager.py`
6. Update the [Current Skills](SKILLS.md#current-skills) table in `SKILLS.md`

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](../LICENSE) file for details.

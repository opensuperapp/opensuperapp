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
   - The super app access token is **exchanged** via Asgardeo (RFC 8693) for a **micro-app–scoped** token
   - The tool calls the backend with the exchanged token
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

# Register agent/ and tools/ as importable packages (one-time)
pip install -e .

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables

| Variable | Description | Required |
|----------|------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `OPENAI_MODEL` | OpenAI model name (default: `gpt-4o`) | No |
| `MEALS_BACKEND_URL` | URL of the meals backend API | Yes |
| `ASGARDEO_TOKEN_URL` | Asgardeo OAuth2 token endpoint | Yes |
| `MEALS_APP_CLIENT_ID` | Client ID for the meals micro-app in Asgardeo | Yes |
| `GUEST_WIFI_BACKEND_URL` | Guest Wi‑Fi API base URL | Yes (for Wi‑Fi tools) |
| `GUEST_WIFI_APP_CLIENT_ID` | Asgardeo client ID for the guest Wi‑Fi app | Yes (for Wi‑Fi tools) |
| `LEAVE_BACKEND_URL` | Leave API base URL | Yes (for leave tools) |
| `LEAVE_APP_CLIENT_ID` | Asgardeo client ID for the Leave app | Yes (for leave tools) |
| `MEALS_EXTRA_SCOPES` | Optional extra OAuth scopes for Meals token exchange | No |
| `GUEST_WIFI_EXTRA_SCOPES` | Optional extra OAuth scopes for Guest Wi-Fi token exchange | No |
| `DEBUG` | Enable debug headers and curl logging (`true`/`false`) | No |

**Leave API details** (endpoints, payloads, auth): see [LEAVE_APP_API.md](./LEAVE_APP_API.md).

### Running

```bash
# Install the project in editable mode (one-time, after pip install -r requirements.txt)
pip install -e .

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# The API will be available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

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
```
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
├── main.py                        # FastAPI entry point
├── config.py                      # Environment configuration
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment variables template
├── .gitignore
├── README.md                      # This file
├── SKILLS.md                      # Agent skills architecture documentation
├── CHAT_AGENT_RUNBOOK.md          # Local run, Postman, tokens, headers
├── LEAVE_APP_API.md               # Leave backend integration reference
├── openapi.yaml                   # OpenAPI 3.1 specification
│
├── agent/                         # Agent core
│   ├── agent.py                   # LangChain orchestration & tool-call loop
│   ├── prompt_manager.py          # Modular prompt loader & composer
│   ├── token_exchange.py          # Asgardeo RFC 8693 token exchange
│   └── prompts/                   # Shared system prompt sections
│       ├── base.md                # Identity, date/time, leave-type map
│       ├── formatting.md          # Output formatting rules
│       └── fallback.md            # Guidance for unsupported features
│
└── tools/                         # Per-skill tool implementations
    ├── meals/
    │   ├── meals_tools.py         # get_todays_menu, submit_lunch_feedback
    │   ├── prompt.md              # Meals skill system prompt section
    │   └── lunch_feedback_prompt.md  # Feedback skill system prompt section
    ├── guest_wifi/
    │   ├── wifi_tools.py          # create/get/delete guest Wi-Fi account
    │   └── prompt.md              # Wi-Fi skill system prompt section
    └── leave/
        ├── leave_tools.py         # validate/submit/cancel/list leave + configs
        └── prompt.md              # Leave skill system prompt section
```

### Adding a New Skill

1. Create `tools/<skill_name>/` with `<skill>_tools.py` and `prompt.md`
2. Add the token exchange wrapper in `agent/token_exchange.py`
3. Add the env vars in `config.py` and `.env.example`
4. Import the tools in `agent/agent.py`, add to the `tools` list, and add a handler in the tool-call loop
5. Add `tools/<skill_name>/prompt.md` to `PROMPT_ORDER` in `agent/prompt_manager.py`
6. Update the [Current Skills](SKILLS.md#current-skills) table in `SKILLS.md`

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](../LICENSE) file for details.

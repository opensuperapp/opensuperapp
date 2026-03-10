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
                                         │ GET /menu (x-jwt-assertion)
                                         ▼
                                  ┌──────────────────┐
                                  │  Meals Backend   │
                                  │  (Ballerina)     │
                                  └──────────────────┘
```

### How It Works

1. **User sends a message** from the Super App chat screen
2. **Frontend sends** the message + access token to `POST /chat`
3. **LangChain agent** processes the message using GPT-4o
4. If the agent decides to call a tool (e.g., `get_todays_menu`):
   - The super app access token is **exchanged** via Asgardeo (RFC 8693) for a meals-app-scoped token
   - The tool calls the meals backend with the exchanged token
   - The agent formats the tool response into a friendly message
5. **Response is returned** to the frontend

## Getting Started

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

### Running

```bash
# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

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
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "message": "What's for lunch today?"
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
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── requirements.txt      # Python dependencies
├── README.md             # This file
├── SKILLS.md             # Agent skills documentation
└── app/
    ├── __init__.py       # Package init
    ├── config.py         # Environment configuration
    ├── main.py           # FastAPI entry point
    ├── agent.py          # LangChain agent logic
    ├── tools.py          # Backend API tools
    └── token_exchange.py # Asgardeo token exchange
```

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](../LICENSE) file for details.

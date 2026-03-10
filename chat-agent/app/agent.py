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

import logging
from datetime import datetime, timezone, timedelta

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from app.config import OPENAI_API_KEY, OPENAI_MODEL
from app.token_exchange import exchange_token_for_meals
from app.tools import get_todays_menu, submit_lunch_feedback

logger = logging.getLogger(__name__)

# Maximum number of tool-call rounds before forcing a text reply
MAX_TOOL_ITERATIONS = 3

# Sri Lanka timezone (UTC+5:30)
SL_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

def build_system_prompt() -> str:
    """Build the system prompt with the current server time."""
    now = datetime.now(SL_TIMEZONE)
    current_time = now.strftime("%H:%M")
    current_date = now.strftime("%A, %d %B %Y")
    in_feedback_window = "12:00" <= current_time <= "16:15"

    return f"""You are a friendly and helpful AI assistant for the WSO2 Super App — \
an internal company app used by WSO2 employees.

**Current date and time**: {current_date}, {current_time} (Sri Lanka time)

You can help employees with company-related queries. Currently you can:

1. **Meals & Menu**: Fetch today's cafeteria menu (breakfast, juice, lunch, dessert, snack). \
Use the get_todays_menu tool when users ask about food, meals, lunch, breakfast, or the menu.

2. **Lunch Feedback**: Submit feedback about today's lunch using the submit_lunch_feedback tool. \
Use this when the user wants to give feedback, review, or share their opinion about today's lunch. \
Feedback can only be submitted between 12:00 and 16:15 (Sri Lanka time). \
The current time is {current_time}. {"The feedback window is currently OPEN." if in_feedback_window else "The feedback window is currently CLOSED — tell the user that feedback can only be submitted between 12:00 and 16:15."}

When presenting menu information:
- Format it in a clean, readable way using markdown
- If the user asks about a **specific meal** (e.g., "lunch", "breakfast", "snack"), \
only show that meal type — do NOT include the full menu
- Only show the full menu grouped by meal type (Breakfast, Juice, Lunch, Dessert, Snack) \
when the user asks for the full/today's menu
- Be conversational and friendly

When handling feedback:
- Extract the user's feedback message from their chat message
- If the user just says something like "give feedback" without a message, ask them what they'd like to say
- Confirm when feedback has been submitted successfully
- If feedback submission fails due to timing, let the user know the feedback window (12:00–16:15)

For features you **cannot** handle directly, guide the user to the right micro app:
- **Leave requests or balances** → "You can manage your leaves in the **Leave App** \
available in the Apps tab."
- **Facility or room bookings** → "Head over to the **Facilities App** in the Apps tab \
to book rooms and resources."
- **HR or people info** → "Check the **People App** in the Apps tab for employee directory \
and HR information."
- **Events** → "Browse upcoming events on the **Home** tab."
- **News** → "Catch the latest company news on the **Home** tab."

If the user asks something completely unrelated to WSO2 or the super app, politely let them know \
you're here to help with company-related queries and suggest what you can help with.

Always be concise, helpful, and professional while maintaining a friendly tone."""


async def run_agent(
    user_message: str,
    access_token: str,
    history: list[dict] | None = None,
) -> str:
    """
    Run the LangChain agent with the user's message and conversation history.

    The agent will decide whether to invoke tools (e.g., get today's menu)
    based on the user's message, then compose a natural-language reply.

    Args:
        user_message: The message from the user.
        access_token: The user's super app access token (for tool auth).
        history: Optional list of prior messages
                 [{"role": "user"|"assistant", "content": "..."}].

    Returns:
        The agent's text response.
    """
    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0.3,
    )

    tools = [get_todays_menu, submit_lunch_feedback]
    llm_with_tools = llm.bind_tools(tools)

    messages = [SystemMessage(content=build_system_prompt())]

    # Include conversation history for multi-turn context
    if history:
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    # Tool-call loop with a max iteration guard
    for iteration in range(MAX_TOOL_ITERATIONS):
        ai_message = await llm_with_tools.ainvoke(messages)
        messages.append(ai_message)

        # No tool calls — the model produced a final text answer
        if not ai_message.tool_calls:
            return ai_message.content

        # Execute each requested tool
        for tool_call in ai_message.tool_calls:
            tool_name = tool_call["name"]
            logger.info(
                "Agent requested tool: %s (iteration %d)", tool_name, iteration + 1
            )

            if tool_name == "get_todays_menu":
                try:
                    meals_token = await exchange_token_for_meals(access_token)
                    result = await get_todays_menu.ainvoke(
                        {"access_token": meals_token}
                    )
                except Exception as e:
                    logger.error("Tool execution failed: %s", e)
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
                    logger.error("Feedback submission failed: %s", e)
                    result = {
                        "error": "Failed to submit feedback. Please try again later."
                    }
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            messages.append(
                ToolMessage(content=str(result), tool_call_id=tool_call["id"])
            )

    # If we exhausted all iterations, do one last call without tools to force text
    logger.warning(
        "Max tool iterations (%d) reached, forcing text reply", MAX_TOOL_ITERATIONS
    )
    final = await llm.ainvoke(messages)
    return final.content

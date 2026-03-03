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

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import OPENAI_API_KEY, OPENAI_MODEL
from app.token_exchange import exchange_token_for_meals
from app.tools import get_todays_menu

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a friendly and helpful AI assistant for the WSO2 Super App — \
an internal company app used by WSO2 employees.

You can help employees with company-related queries. Currently you can:

1. **Meals & Menu**: Fetch today's cafeteria menu (breakfast, juice, lunch, dessert, snack). \
Use the get_todays_menu tool when users ask about food, meals, lunch, breakfast, or the menu.

When presenting menu information:
- Format it in a clean, readable way using markdown
- Group items by meal type (Breakfast, Juice, Lunch, Dessert, Snack)
- Be conversational and friendly

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


async def run_agent(user_message: str, access_token: str) -> str:
    """
    Run the LangChain agent with the user's message.

    The agent will decide whether to invoke tools (e.g., get today's menu)
    based on the user's message, then compose a natural-language reply.

    Args:
        user_message: The message from the user.
        access_token: The user's super app access token (for tool auth).

    Returns:
        The agent's text response.
    """
    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0.3,
    )

    llm_with_tools = llm.bind_tools([get_todays_menu])

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]

    # First invocation — the model may request a tool call
    ai_message = await llm_with_tools.ainvoke(messages)
    messages.append(ai_message)

    # If the model wants to call a tool, execute it
    if ai_message.tool_calls:
        for tool_call in ai_message.tool_calls:
            tool_name = tool_call["name"]
            logger.info("Agent requested tool: %s", tool_name)

            if tool_name == "get_todays_menu":
                try:
                    # Exchange the super-app token for a meals-scoped token
                    meals_token = await exchange_token_for_meals(access_token)
                    # Call the tool with the exchanged token
                    result = await get_todays_menu.ainvoke(
                        {"access_token": meals_token}
                    )
                except Exception as e:
                    logger.error("Tool execution failed: %s", e)
                    result = {"error": str(e)}
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            # Add tool result as a ToolMessage
            from langchain_core.messages import ToolMessage

            messages.append(
                ToolMessage(content=str(result), tool_call_id=tool_call["id"])
            )

        # Second invocation — model composes the final answer using tool results
        final_response = await llm_with_tools.ainvoke(messages)
        return final_response.content

    # No tool call — the model answered directly
    return ai_message.content

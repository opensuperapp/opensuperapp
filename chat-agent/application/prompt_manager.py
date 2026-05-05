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
Prompt manager: loads and composes the final system prompt from modular .md files.

Prompt sections live under:
  - application/templates/ — shared prompt sections
  - tools/<skill>/ — skill-specific .md prompt sections

PROMPT_ORDER defines the exact composition sequence. To add a new skill prompt:
  1. Create a .md file in tools/<skill>/
  2. Add its path to PROMPT_ORDER at the appropriate position.

Template variables use standard Python {placeholder} syntax. Any placeholder
not supplied to compose_system_prompt() is left unchanged (no KeyError raised).
"""

from pathlib import Path

# Root of the chat-agent package
_ROOT = Path(__file__).parent.parent

# Composition order — sections appear in the final prompt in this sequence.
# Paths are relative to the chat-agent root.
PROMPT_ORDER = [
    "application/templates/base.md",
    "tools/meals/meals.md",
    "tools/guest_wifi/guest_wifi.md",
    "tools/leave/leave.md",
    "application/templates/formatting.md",
    "application/templates/fallback.md",
]


class _SafeFormatDict(dict):
    """Returns unfilled {placeholders} unchanged instead of raising KeyError."""

    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


def _load(relative_path: str) -> str:
    """Read and return the raw content of a prompt file."""
    return (_ROOT / relative_path).read_text(encoding="utf-8")


def compose_system_prompt(**kwargs: str) -> str:
    """
    Load each prompt section in PROMPT_ORDER, fill in template variables,
    and join them into a single system prompt string.

    Keyword arguments are used as template variables, e.g.:
        compose_system_prompt(current_date="Monday, 07 April 2026", ...)

    Unknown placeholders in .md files are left unchanged.
    """
    parts = [_load(f).format_map(_SafeFormatDict(kwargs)) for f in PROMPT_ORDER]
    return "\n\n".join(parts)

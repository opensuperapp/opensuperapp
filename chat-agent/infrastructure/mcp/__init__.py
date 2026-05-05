"""MCP package exports."""

# McpAppConfig and ToolRegistration are pure dataclasses with no further imports,
# so they are safe to import eagerly. McpClient and McpServer are loaded lazily
# via __getattr__ to avoid a circular import:
#   core.config → infrastructure.mcp (this file) → infrastructure.mcp.server
#   → infrastructure.auth.token_exchange → core.config
from infrastructure.mcp.types import McpAppConfig, ToolRegistration

__all__ = ["McpAppConfig", "McpClient", "McpServer", "ToolRegistration"]


def __getattr__(name: str):
    if name == "McpClient":
        from infrastructure.mcp.client import McpClient  # noqa: PLC0415
        globals()["McpClient"] = McpClient
        return McpClient
    if name == "McpServer":
        from infrastructure.mcp.server import McpServer  # noqa: PLC0415
        globals()["McpServer"] = McpServer
        return McpServer
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

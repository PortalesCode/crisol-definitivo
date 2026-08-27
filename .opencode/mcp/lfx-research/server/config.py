"""Configuration loader for lfx-research MCP.

Priority: .env (next to this package) > opencode.json env > host env.

Resolves relative KNOWLEDGE_LIBRARY_HOME and LFX_FLOW_PATH against the git
repo root (or opencode.json location), so the isolated library at
.opencode/knowledge-library is the default and never touches ~/biblioteca-conocimientos.
"""

from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Optional

from dotenv import dotenv_values


def _find_repo_root(start: Path) -> Path:
    """Walk up until we find .git or opencode.json; fallback to start."""
    cur = start.resolve()
    for parent in [cur, *cur.parents]:
        if (parent / ".git").exists() or (parent / "opencode.json").exists():
            return parent
        # also handle being inside .opencode/mcp/lfx-research/server
        if (parent / "crisoles" / "crisol-definitive" / "opencode.json").exists():
            return parent / "crisoles" / "crisol-definitive"
    return start.resolve()


# Absolute paths for resolution
_THIS = Path(__file__).resolve()
_SERVER_DIR = _THIS.parent
_MCP_ROOT = _SERVER_DIR.parent  # .opencode/mcp/lfx-research
# Try to locate repo root: first assume we are inside crisoles/crisol-definitive
_REPO_ROOT = _find_repo_root(_MCP_ROOT)

# Candidate .env location (gitignored)
_DOTENV_PATH = _MCP_ROOT / ".env"

# Also try to read opencode.json env as middle priority
_OPENCODE_JSON = _REPO_ROOT / "opencode.json"


def _load_opencode_env() -> dict[str, str]:
    """Extract env from opencode.json mcp.lfx-research.environment if present."""
    try:
        data = json.loads(_OPENCODE_JSON.read_text(encoding="utf-8"))
        mcp = data.get("mcp", {}).get("lfx-research", {})
        env = mcp.get("environment") or mcp.get("env") or {}
        # Filter to strings only
        return {k: str(v) for k, v in env.items() if isinstance(v, (str, int, float))}
    except Exception:
        return {}


def _resolve_path(value: str, base: Path) -> Path:
    """Resolve relative paths against base; expand ~ and env vars."""
    expanded = os.path.expandvars(os.path.expanduser(value))
    p = Path(expanded)
    if p.is_absolute():
        return p
    return (base / p).resolve()


class Settings:
    """Resolved settings with priority .env > opencode.json env > host env."""

    def __init__(self) -> None:
        dotenv_vals = {}
        if _DOTENV_PATH.exists():
            dotenv_vals = dotenv_values(_DOTENV_PATH)

        opencode_env = _load_opencode_env()

        def get(key: str, default: str = "") -> str:
            # Priority: dotenv > opencode.json > host env > default
            if key in dotenv_vals and dotenv_vals[key] is not None:
                return str(dotenv_vals[key])
            if key in opencode_env:
                return str(opencode_env[key])
            return os.environ.get(key, default)

        # OpenAI-compatible
        self.openai_api_key: str = get("OPENAI_API_KEY", "")
        self.openai_base_url: str = get("OPENAI_BASE_URL", "")
        self.openai_model: str = get("OPENAI_MODEL", get("LFX_RESEARCH_MODEL", "gpt-4o-mini"))

        self.lfx_research_model: str = get("LFX_RESEARCH_MODEL", self.openai_model)
        self.lfx_auditor_model: str = get("LFX_AUDITOR_MODEL", "gpt-4o")
        self.lfx_flow_path_raw: str = get("LFX_FLOW_PATH", ".opencode/mcp/lfx-research/flows/investigacion-conocimiento.json")
        self.knowledge_library_home_raw: str = get("KNOWLEDGE_LIBRARY_HOME", ".opencode/knowledge-library")
        self.lfx_enable_n8n_bridge: bool = get("LFX_ENABLE_N8N_BRIDGE", "false").lower() in ("1", "true", "yes", "on")
        self.n8n_webhook_url: str = get("N8N_KNOWLEDGE_WEBHOOK_URL", "http://localhost:5678/webhook/investigar-conocimiento")
        self.lfx_stateless: bool = get("LFX_STATELESS", "true").lower() in ("1", "true", "yes", "on")
        self.lfx_log_level: str = get("LFX_LOG_LEVEL", "info")

        # Resolved absolute paths
        self.knowledge_library_home: Path = _resolve_path(self.knowledge_library_home_raw, _REPO_ROOT)
        self.lfx_flow_path: Path = _resolve_path(self.lfx_flow_path_raw, _REPO_ROOT)
        self.repo_root: Path = _REPO_ROOT
        self.mcp_root: Path = _MCP_ROOT
        self.dotenv_path: Path = _DOTENV_PATH

    def validate(self) -> list[str]:
        """Return list of warnings/errors. Empty means OK for discovery mode."""
        issues: list[str] = []
        # Library path should be inside .opencode (isolated check)
        try:
            # Warn if points to legacy ~/biblioteca-conocimientos
            if "biblioteca-conocimientos" in str(self.knowledge_library_home):
                issues.append(
                    "KNOWLEDGE_LIBRARY_HOME points to legacy ~/biblioteca-conocimientos — "
                    "this MCP defaults to isolated .opencode/knowledge-library. "
                    "Set it explicitly only if you intend to share the old library."
                )
        except Exception:
            pass
        return issues

    def is_lfx_configured(self) -> bool:
        """Whether OpenAI-compatible API is configured enough to run the flow."""
        return bool(self.openai_api_key and self.openai_base_url)

    def ensure_library(self) -> None:
        """Ensure the isolated library exists with initial index.json."""
        self.knowledge_library_home.mkdir(parents=True, exist_ok=True)
        index = self.knowledge_library_home / "index.json"
        if not index.exists():
            index.write_text('{\n  "entries": {},\n  "domains": {}\n}\n', encoding="utf-8")


# Singleton for import
settings = Settings()

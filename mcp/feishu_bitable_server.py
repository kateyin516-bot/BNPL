#!/usr/bin/env python3
"""Minimal MCP server for Feishu/Lark Bitable APIs.

The server reads credentials from FEISHU_APP_ID and FEISHU_APP_SECRET.
It intentionally does not persist tokens or secrets.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


API_BASE = os.environ.get("FEISHU_API_BASE", "https://open.feishu.cn")
TOKEN_CACHE: dict[str, Any] = {"token": None, "expires_at": 0}


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def pretty(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def mcp_text(data: Any) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": pretty(data)}]}


def request_json(method: str, path: str, body: Any | None = None, token: str | None = None) -> Any:
    url = f"{API_BASE}{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        try:
            error_body = json.loads(payload)
        except json.JSONDecodeError:
            error_body = payload
        raise RuntimeError(f"Feishu API HTTP {exc.code}: {error_body}") from exc


def tenant_access_token() -> str:
    now = time.time()
    cached_token = TOKEN_CACHE.get("token")
    if cached_token and TOKEN_CACHE.get("expires_at", 0) - now > 60:
        return str(cached_token)

    app_id = os.environ.get("FEISHU_APP_ID")
    app_secret = os.environ.get("FEISHU_APP_SECRET")
    if not app_id or not app_secret:
        raise RuntimeError("Missing FEISHU_APP_ID or FEISHU_APP_SECRET environment variable.")

    result = request_json(
        "POST",
        "/open-apis/auth/v3/tenant_access_token/internal",
        {"app_id": app_id, "app_secret": app_secret},
    )
    token = result.get("tenant_access_token")
    if not token:
        raise RuntimeError(f"Failed to get tenant_access_token: {result}")

    TOKEN_CACHE["token"] = token
    TOKEN_CACHE["expires_at"] = now + int(result.get("expire", 7200))
    return token


def list_tables(args: dict[str, Any]) -> Any:
    app_token = args["app_token"]
    query = urllib.parse.urlencode({"page_size": int(args.get("page_size", 100))})
    return request_json(
        "GET",
        f"/open-apis/bitable/v1/apps/{urllib.parse.quote(app_token)}/tables?{query}",
        token=tenant_access_token(),
    )


def search_records(args: dict[str, Any]) -> Any:
    app_token = args["app_token"]
    table_id = args["table_id"]
    params = {"page_size": int(args.get("page_size", 100))}
    if args.get("page_token"):
        params["page_token"] = args["page_token"]

    body: dict[str, Any] = {}
    for key in ("view_id", "field_names", "sort", "filter", "automatic_fields"):
        if key in args:
            body[key] = args[key]

    query = urllib.parse.urlencode(params)
    return request_json(
        "POST",
        (
            f"/open-apis/bitable/v1/apps/{urllib.parse.quote(app_token)}"
            f"/tables/{urllib.parse.quote(table_id)}/records/search?{query}"
        ),
        body,
        token=tenant_access_token(),
    )


def get_record(args: dict[str, Any]) -> Any:
    app_token = args["app_token"]
    table_id = args["table_id"]
    record_id = args["record_id"]
    return request_json(
        "GET",
        (
            f"/open-apis/bitable/v1/apps/{urllib.parse.quote(app_token)}"
            f"/tables/{urllib.parse.quote(table_id)}"
            f"/records/{urllib.parse.quote(record_id)}"
        ),
        token=tenant_access_token(),
    )


TOOLS = [
    {
        "name": "check_auth",
        "description": "Validate Feishu app credentials without returning secrets or access tokens.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "list_tables",
        "description": "List tables in a Feishu Bitable app by app_token.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "app_token": {"type": "string"},
                "page_size": {"type": "integer", "default": 100},
            },
            "required": ["app_token"],
            "additionalProperties": False,
        },
    },
    {
        "name": "search_records",
        "description": "Search records in a Feishu Bitable table.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "app_token": {"type": "string"},
                "table_id": {"type": "string"},
                "view_id": {"type": "string"},
                "field_names": {"type": "array", "items": {"type": "string"}},
                "sort": {"type": "array", "items": {"type": "object"}},
                "filter": {"type": "object"},
                "automatic_fields": {"type": "boolean"},
                "page_size": {"type": "integer", "default": 100},
                "page_token": {"type": "string"},
            },
            "required": ["app_token", "table_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_record",
        "description": "Get one Feishu Bitable record by record_id.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "app_token": {"type": "string"},
                "table_id": {"type": "string"},
                "record_id": {"type": "string"},
            },
            "required": ["app_token", "table_id", "record_id"],
            "additionalProperties": False,
        },
    },
]


def call_tool(name: str, args: dict[str, Any]) -> Any:
    if name == "check_auth":
        tenant_access_token()
        return {"success": True, "app_id": os.environ.get("FEISHU_APP_ID"), "token_available": True}
    if name == "list_tables":
        return list_tables(args)
    if name == "search_records":
        return search_records(args)
    if name == "get_record":
        return get_record(args)
    raise RuntimeError(f"Unknown tool: {name}")


def handle(message: dict[str, Any]) -> dict[str, Any] | None:
    method = message.get("method")
    msg_id = message.get("id")
    if msg_id is None:
        return None

    try:
        if method == "initialize":
            result = {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "feishu_bitable", "version": "0.1.0"},
            }
        elif method == "tools/list":
            result = {"tools": TOOLS}
        elif method == "tools/call":
            params = message.get("params", {})
            result = mcp_text(call_tool(params.get("name"), params.get("arguments", {})))
        elif method == "ping":
            result = {}
        else:
            return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": method}}
        return {"jsonrpc": "2.0", "id": msg_id, "result": result}
    except Exception as exc:
        return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32000, "message": str(exc)}}


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        response = handle(json.loads(line))
        if response is not None:
            print(json_dumps(response), flush=True)


if __name__ == "__main__":
    main()

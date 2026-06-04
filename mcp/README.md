# MCP Servers

## feishu_bitable

Local MCP server for reading Feishu/Lark Bitable data.

Required environment variables:

```bash
FEISHU_APP_ID=...
FEISHU_APP_SECRET=...
```

Tools:

- `check_auth`: validate credentials without returning tokens
- `list_tables`: list tables for an `app_token`
- `search_records`: query records from an `app_token` + `table_id`
- `get_record`: fetch one record by ID

The actual credentials are configured in Codex MCP settings and should not be committed to git.

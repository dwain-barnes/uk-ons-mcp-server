# UK ONS MCP Server 
[![npm version](https://badge.fury.io/js/uk_ons_mcp_server.svg)](https://badge.fury.io/js/uk_ons_mcp_server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-dwain--barnes-blue)](https://github.com/dwain-barnes/uk_ons_mcp_server)

A **Model Context Protocol (MCP) server** for accessing the UK Office for National Statistics (ONS) Beta API.  
Fetch official UK government statistics—demographics, economics, social data—straight from your MCP‑compatible assistant, no API key required.

---

## Features

- **Direct ONS access** – no authentication, no tokens  
- **Browse & search** every published dataset  
- **Flexible queries** – filter observations by geography, time, etc.  
- **Popular dataset shortcuts** for CPIH, regional GDP, wellbeing & more  
- **Time‑series & regional comparisons** built in  
- **100 % MCP‑SDK TypeScript** with robust error handling

---

## Installation

```bash
# Global install
npm install -g uk_ons_mcp_server

# Or one‑off run
npx uk_ons_mcp_server
```

---

## Usage (Claude Desktop)

```json
{
  "mcpServers": {
    "uk-ons": {
      "command": "npx",
      "args": ["-y", "uk_ons_mcp_server"]
    }
  }
}
```

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `list_datasets` | Paginated list of all datasets |
| `get_dataset` | Metadata for a single dataset |
| `search_datasets` | Search by keyword |
| `get_observation` | Pull observations with dimension filters |
| `get_latest_data` | Convenience wrapper for the newest figures |

---

## Popular Dataset IDs

| ID | What it is |
|----|------------|
| `cpih01` | CPIH (UK inflation) |
| `regional-gdp-by-year` | Regional GDP |
| `wellbeing-local-authority` | Personal wellbeing |
| `trade` | UK trade stats |
| `weekly-deaths-region` | Weekly deaths |

---

## Development

```bash
git clone https://github.com/dwain-barnes/uk_ons_mcp_server.git
cd uk_ons_mcp_server
npm install
npm run build   # compile TypeScript
npm start       # production
npm run dev     # watch & reload
```

Tests and linting:

```bash
npm test
npm run lint
```

---

## Contributing

1. Fork → branch → commit  
2. `git push` and open a PR  
3. Kindly follow the coding style in **src/**

---

## License

MIT – see `LICENSE`.

---

> **Disclaimer**  
> This project is **unofficial** and not endorsed by the UK Office for National Statistics. Data usage remains subject to ONS terms.

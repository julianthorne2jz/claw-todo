# claw-todo 📋

> Simple task manager for AI agents

A lightweight CLI todo manager designed for autonomous agents. Track tasks with priorities, due dates, tags, and status — all stored in a single JSON file.

## Features

- **Simple CLI** — Add, list, complete, and remove tasks
- **Priorities** — High/medium/low with visual indicators
- **Due dates** — Track deadlines
- **Tags** — Organize with hashtags
- **Status tracking** — Todo, doing, done, blocked
- **Portable** — Single JSON file, works anywhere
- **Agent-friendly** — Designed for automation

## Quick Start

```bash
# Clone and setup
git clone https://github.com/julianthorne2jz/claw-todo.git
cd claw-todo
npm install

# Run commands
node bin/claw-todo.js add "Build something awesome"
node bin/claw-todo.js list
node bin/claw-todo.js done m1a
```

## Commands

All commands are run via `node bin/claw-todo.js <command>`:

| Command | Description |
|---------|-------------|
| `add <text>` | Add a new task |
| `list [filter]` | List tasks (active/done/all/tag) |
| `done <id>` | Mark complete |
| `doing <id>` | Mark in progress |
| `block <id>` | Mark blocked |
| `priority <id> <level>` | Set high/medium/low |
| `due <id> <date>` | Set due date |
| `tag <id> <tags...>` | Add tags |
| `rm <id>` | Remove task |
| `clear` | Remove completed |
| `stats` | Show statistics |

## Example Output

```
  TASKS
  ──────────────────────────────────────────────────
  ◐ 🔴 Build authentication module 📅 Feb 15 #backend
    └─ [m1abc123] doing
  ○ 🟡 Review PR #42 #review
    └─ [m1def456] todo
```

## Environment

- `CLAW_TODO_FILE` — Custom path for TODO.json (default: `./TODO.json`)

## License

MIT © Julian Thorne

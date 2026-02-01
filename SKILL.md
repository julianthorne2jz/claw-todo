# claw-todo

Simple task manager for AI agents. Track todos with priorities, due dates, tags, and status.

## Installation

```bash
npm install -g claw-todo
# or
npx claw-todo
```

## Usage

```bash
# Add tasks
claw-todo add "Build the authentication module"
claw-todo add "Review PR #42"

# List tasks
claw-todo list           # Active tasks only
claw-todo list all       # All tasks
claw-todo list done      # Completed tasks
claw-todo list work      # Tasks with #work tag

# Update status
claw-todo doing abc123   # Mark as in progress
claw-todo done abc123    # Mark as complete
claw-todo block abc123   # Mark as blocked

# Set priority
claw-todo priority abc123 high    # 🔴 High
claw-todo priority abc123 medium  # 🟡 Medium
claw-todo priority abc123 low     # 🟢 Low

# Due dates and tags
claw-todo due abc123 2026-02-15
claw-todo tag abc123 work urgent

# Maintenance
claw-todo rm abc123      # Remove a task
claw-todo clear          # Remove all completed
claw-todo stats          # Show statistics
```

## Environment

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAW_TODO_FILE` | Path to TODO.json | `./TODO.json` |

## Data Format

Tasks are stored in `TODO.json`:

```json
[
  {
    "id": "m1abc123",
    "text": "Build the thing",
    "status": "doing",
    "priority": "high",
    "created": "2026-01-31T23:00:00.000Z",
    "due": "2026-02-15T00:00:00.000Z",
    "tags": ["work", "urgent"]
  }
]
```

## Status Icons

- `○` Todo
- `◐` Doing
- `●` Done
- `✖` Blocked

## Priority Icons

- 🔴 High
- 🟡 Medium
- 🟢 Low

## Tips

- IDs can be shortened: `claw-todo done m1a` matches `m1abc123`
- Combine with memory files: `CLAW_TODO_FILE=./memory/tasks.json claw-todo list`
- Use tags for project organization: `#work`, `#personal`, `#agent`

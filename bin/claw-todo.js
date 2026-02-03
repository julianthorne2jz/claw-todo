#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Config
const TODO_FILE = process.env.CLAW_TODO_FILE || path.join(process.cwd(), 'TODO.json');

// Helpers
function loadTodos() {
  if (!fs.existsSync(TODO_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TODO_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function priorityIcon(p) {
  return { high: '🔴', medium: '🟡', low: '🟢' }[p] || '⚪';
}

function statusIcon(s) {
  return { todo: '○', doing: '◐', done: '●', blocked: '✖' }[s] || '○';
}

// Commands
const commands = {
  add(args) {
    // Parse inline flags: --priority, -p, --tag, -t, --due, -d
    let text = [];
    let priority = 'medium';
    let tags = [];
    let due = null;
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--priority' || arg === '-p') {
        priority = args[++i] || 'medium';
        if (!['high', 'medium', 'low'].includes(priority)) {
          console.log(`Invalid priority: ${priority}. Using medium.`);
          priority = 'medium';
        }
      } else if (arg === '--tag' || arg === '-t') {
        const tag = args[++i];
        if (tag) tags.push(tag);
      } else if (arg === '--due' || arg === '-d') {
        const dateStr = args[++i];
        if (dateStr) due = new Date(dateStr).toISOString();
      } else if (arg === '--json') {
        // Handled at the end
      } else {
        text.push(arg);
      }
    }
    
    const taskText = text.join(' ');
    if (!taskText) return console.log('Usage: claw-todo add <task> [--priority high|medium|low] [--tag tagname] [--due YYYY-MM-DD]');
    
    const todos = loadTodos();
    const todo = {
      id: generateId(),
      text: taskText,
      status: 'todo',
      priority,
      created: new Date().toISOString(),
      due,
      tags
    };
    todos.push(todo);
    saveTodos(todos);
    
    if (args.includes('--json')) {
      console.log(JSON.stringify(todo, null, 2));
      return;
    }
    
    const extras = [];
    if (priority !== 'medium') extras.push(`${priorityIcon(priority)} ${priority}`);
    if (tags.length) extras.push(`#${tags.join(' #')}`);
    if (due) extras.push(`📅 ${formatDate(due)}`);
    const extraStr = extras.length ? ` (${extras.join(', ')})` : '';
    console.log(`✓ Added: ${todo.text}${extraStr} [${todo.id}]`);
  },

  list(args) {
    const json = args.includes('--json');
    const filterArgs = args.filter(a => a !== '--json');
    const todos = loadTodos();
    const filter = filterArgs[0]; // 'all', 'done', 'active', or tag
    
    let filtered = todos;
    if (filter === 'active') filtered = todos.filter(t => t.status !== 'done');
    else if (filter === 'done') filtered = todos.filter(t => t.status === 'done');
    else if (filter && filter !== 'all') filtered = todos.filter(t => t.tags.includes(filter));
    else if (!filter) filtered = todos.filter(t => t.status !== 'done'); // default: active
    
    if (filtered.length === 0) {
      if (json) console.log('[]');
      else console.log('No tasks found.');
      return;
    }
    
    // Sort by priority then created
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    if (json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }
    
    console.log('\n  TASKS\n  ' + '─'.repeat(50));
    filtered.forEach(t => {
      const due = t.due ? ` 📅 ${formatDate(t.due)}` : '';
      const tags = t.tags.length ? ` #${t.tags.join(' #')}` : '';
      console.log(`  ${statusIcon(t.status)} ${priorityIcon(t.priority)} ${t.text}${due}${tags}`);
      console.log(`    └─ [${t.id}] ${t.status}`);
    });
    console.log();
  },

  done(args) {
    const id = args[0];
    if (!id) return console.log('Usage: claw-todo done <id>');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    todo.status = 'done';
    todo.completed = new Date().toISOString();
    saveTodos(todos);
    console.log(`✓ Completed: ${todo.text}`);
  },

  doing(args) {
    const id = args[0];
    if (!id) return console.log('Usage: claw-todo doing <id>');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    todo.status = 'doing';
    saveTodos(todos);
    console.log(`◐ In progress: ${todo.text}`);
  },

  block(args) {
    const id = args[0];
    if (!id) return console.log('Usage: claw-todo block <id>');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    todo.status = 'blocked';
    saveTodos(todos);
    console.log(`✖ Blocked: ${todo.text}`);
  },

  priority(args) {
    const [id, level] = args;
    if (!id || !level) return console.log('Usage: claw-todo priority <id> <high|medium|low>');
    if (!['high', 'medium', 'low'].includes(level)) return console.log('Priority must be: high, medium, or low');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    todo.priority = level;
    saveTodos(todos);
    console.log(`${priorityIcon(level)} Priority set: ${todo.text}`);
  },

  due(args) {
    const [id, date] = args;
    if (!id || !date) return console.log('Usage: claw-todo due <id> <YYYY-MM-DD>');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    todo.due = new Date(date).toISOString();
    saveTodos(todos);
    console.log(`📅 Due date set: ${todo.text} → ${formatDate(todo.due)}`);
  },

  tag(args) {
    const [id, ...tags] = args;
    if (!id || tags.length === 0) return console.log('Usage: claw-todo tag <id> <tag1> [tag2...]');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    todo.tags = [...new Set([...todo.tags, ...tags])];
    saveTodos(todos);
    console.log(`🏷️  Tagged: ${todo.text} #${tags.join(' #')}`);
  },

  rm(args) {
    const id = args[0];
    if (!id) return console.log('Usage: claw-todo rm <id>');
    
    const todos = loadTodos();
    const idx = todos.findIndex(t => t.id === id || t.id.startsWith(id));
    if (idx === -1) return console.log(`Task not found: ${id}`);
    
    const removed = todos.splice(idx, 1)[0];
    saveTodos(todos);
    console.log(`🗑️  Removed: ${removed.text}`);
  },

  clear() {
    const todos = loadTodos();
    const active = todos.filter(t => t.status !== 'done');
    saveTodos(active);
    const removed = todos.length - active.length;
    console.log(`🧹 Cleared ${removed} completed task(s)`);
  },

  export() {
    const todos = loadTodos();
    const active = todos.filter(t => t.status !== 'done');
    const done = todos.filter(t => t.status === 'done');
    
    // Sort active by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    active.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    let md = '# TODO List\n\n';
    
    if (active.length) {
      md += '## Active\n';
      active.forEach(t => {
        const p = t.priority === 'high' ? '🔴 ' : t.priority === 'medium' ? '🟡 ' : '🟢 ';
        md += `- [ ] ${p}${t.text}`;
        if (t.tags.length) md += ` #${t.tags.join(' #')}`;
        if (t.due) md += ` (Due: ${formatDate(t.due)})`;
        md += ` <!-- id: ${t.id} -->\n`;
      });
      md += '\n';
    }
    
    if (done.length) {
      md += '## Completed\n';
      done.forEach(t => {
        md += `- [x] ${t.text} <!-- id: ${t.id} -->\n`;
      });
    }
    
    console.log(md);
  },

  stats() {
    const todos = loadTodos();
    const byStatus = { todo: 0, doing: 0, done: 0, blocked: 0 };
    todos.forEach(t => byStatus[t.status] = (byStatus[t.status] || 0) + 1);
    
    console.log('\n  STATS\n  ' + '─'.repeat(30));
    console.log(`  ○ Todo:     ${byStatus.todo}`);
    console.log(`  ◐ Doing:    ${byStatus.doing}`);
    console.log(`  ● Done:     ${byStatus.done}`);
    console.log(`  ✖ Blocked:  ${byStatus.blocked}`);
    console.log(`  ─────────────────`);
    console.log(`  Total:      ${todos.length}\n`);
  },

  help() {
    console.log(`
claw-todo - Task manager for AI agents

COMMANDS:
  add <text>              Add a new task
  list [all|done|active]  List tasks (default: active)
  list <tag>              List tasks with specific tag
  done <id>               Mark task as complete
  doing <id>              Mark task as in progress
  block <id>              Mark task as blocked
  priority <id> <level>   Set priority (high/medium/low)
  due <id> <YYYY-MM-DD>   Set due date
  tag <id> <tags...>      Add tags to task
  rm <id>                 Remove a task
  clear                   Remove all completed tasks
  export                  Export tasks to Markdown
  stats                   Show task statistics
  help                    Show this help

FLAGS:
  --json                  Output result as JSON (add, list)

ENVIRONMENT:
  CLAW_TODO_FILE          Custom path for TODO.json

EXAMPLES:
  claw-todo add "Build the thing"
  claw-todo priority abc123 high
  claw-todo done abc
  claw-todo list work
`);
  }
};

// Main
let [cmd = 'list', ...args] = process.argv.slice(2);

// Handle -h/--help anywhere
if (cmd === '-h' || cmd === '--help' || args.includes('-h') || args.includes('--help')) {
  cmd = 'help';
  args = [];
}

const handler = commands[cmd];

if (handler) {
  handler(args);
} else {
  console.log(`Unknown command: ${cmd}`);
  commands.help();
}

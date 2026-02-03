#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Config
const GLOBAL_FILE = path.join(os.homedir(), '.claw-todo.json');

function findTodoFile(args) {
  if (process.env.CLAW_TODO_FILE) return process.env.CLAW_TODO_FILE;
  
  // Check for global flag anywhere in args
  if (process.argv.includes('--global') || process.argv.includes('-g')) {
    return GLOBAL_FILE;
  }

  // Search up for TODO.json
  let current = process.cwd();
  while (true) {
    const file = path.join(current, 'TODO.json');
    if (fs.existsSync(file)) return file;
    
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Default to CWD (will be created here if added)
  return path.join(process.cwd(), 'TODO.json');
}

// We delay resolution until we need it, or resolve it once?
// Since 'init' command might want to force CWD, let's keep it flexible.
// But mostly we need it for load/save.
let cachedTodoFile = null;
function getTodoFile() {
  if (cachedTodoFile) return cachedTodoFile;
  cachedTodoFile = findTodoFile();
  return cachedTodoFile;
}

// Helpers
function loadTodos() {
  const file = getTodoFile();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  const file = getTodoFile();
  fs.writeFileSync(file, JSON.stringify(todos, null, 2));
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
      } else if (arg === '--json' || arg === '--global' || arg === '-g') {
        // Handled globally or at the end
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
    const filterArgs = args.filter(a => a !== '--json' && a !== '--global' && a !== '-g');
    const todos = loadTodos();
    const filter = filterArgs[0]; // 'all', 'done', 'active', 'overdue', 'high/med/low', or tag
    
    let filtered = todos;
    const now = new Date();

    if (filter === 'active') {
      filtered = todos.filter(t => t.status !== 'done');
    } else if (filter === 'done') {
      filtered = todos.filter(t => t.status === 'done');
    } else if (filter === 'overdue') {
      filtered = todos.filter(t => t.status !== 'done' && t.due && new Date(t.due) < now);
    } else if (['high', 'medium', 'low'].includes(filter)) {
      filtered = todos.filter(t => t.status !== 'done' && t.priority === filter);
    } else if (filter && filter !== 'all') {
      filtered = todos.filter(t => t.tags.includes(filter));
    } else if (!filter) {
      filtered = todos.filter(t => t.status !== 'done'); // default: active
    }
    
    if (filtered.length === 0) {
      if (json) console.log('[]');
      else console.log('No tasks found.');
      return;
    }
    
    // Sort by priority then due date then created
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      // If both have due dates, sort by due date
      if (a.due && b.due) return new Date(a.due) - new Date(b.due);
      // Put due dates before non-due dates
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });
    
    if (json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }
    
    console.log('\n  TASKS\n  ' + '─'.repeat(50));
    filtered.forEach(t => {
      let due = '';
      if (t.due) {
        const d = new Date(t.due);
        const isOverdue = d < now && t.status !== 'done';
        due = ` ${isOverdue ? '⚠️ ' : '📅 '}${formatDate(t.due)}`;
      }
      const tags = t.tags.length ? ` #${t.tags.join(' #')}` : '';
      console.log(`  ${statusIcon(t.status)} ${priorityIcon(t.priority)} ${t.text}${due}${tags}`);
      console.log(`    └─ [${t.id}] ${t.status}`);
    });
    console.log();
  },

  find(args) {
    const query = args.join(' ').toLowerCase();
    if (!query) return console.log('Usage: claw-todo find <text>');
    
    const todos = loadTodos();
    const matches = todos.filter(t => t.text.toLowerCase().includes(query) || t.tags.some(tag => tag.toLowerCase().includes(query)));
    
    if (matches.length === 0) return console.log('No matches found.');
    
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    matches.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    console.log('\n  SEARCH RESULTS\n  ' + '─'.repeat(50));
    matches.forEach(t => {
       const due = t.due ? ` 📅 ${formatDate(t.due)}` : '';
       console.log(`  ${statusIcon(t.status)} ${priorityIcon(t.priority)} ${t.text}${due}`);
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

  edit(args) {
    const id = args[0];
    const newText = args.slice(1).join(' ');
    
    if (!id || !newText) return console.log('Usage: claw-todo edit <id> <new text>');
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id || t.id.startsWith(id));
    if (!todo) return console.log(`Task not found: ${id}`);
    
    const oldText = todo.text;
    todo.text = newText;
    saveTodos(todos);
    console.log(`📝 Updated: "${oldText}" → "${newText}"`);
  },

  clear() {
    const todos = loadTodos();
    const active = todos.filter(t => t.status !== 'done');
    saveTodos(active);
    const removed = todos.length - active.length;
    console.log(`🧹 Cleared ${removed} completed task(s)`);
  },

  init() {
    const file = path.join(process.cwd(), 'TODO.json');
    if (fs.existsSync(file)) {
      console.log(`TODO.json already exists in ${process.cwd()}`);
      return;
    }
    fs.writeFileSync(file, '[]');
    console.log(`Initialized empty task list in ${file}`);
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
  list [filter]           List tasks
                          Filters: all, done, active (default), overdue,
                                   high, medium, low, or <tag>
  find <text>             Search tasks by text or tag
  done <id>               Mark task as complete
  doing <id>              Mark task as in progress
  block <id>              Mark task as blocked
  priority <id> <level>   Set priority (high/medium/low)
  due <id> <YYYY-MM-DD>   Set due date
  tag <id> <tags...>      Add tags to task
  edit <id> <text>        Update task text
  rm <id>                 Remove a task
  clear                   Remove all completed tasks
  init                    Create TODO.json in current dir
  export                  Export tasks to Markdown
  stats                   Show task statistics
  help                    Show this help

FLAGS:
  --json                  Output result as JSON (add, list)
  --global, -g            Use global task list (~/.claw-todo.json)

ENVIRONMENT:
  CLAW_TODO_FILE          Custom path for TODO.json

EXAMPLES:
  claw-todo init               # Start a new list here
  claw-todo add "Fix bug"      # Adds to nearest TODO.json
  claw-todo list high          # List high priority tasks
  claw-todo find "bug"         # Search for "bug"
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

// worker/executePlan.js
const { mouse, keyboard, Key, Button, screen } = require('@nut-tree-fork/nut-js');
const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');


// ─── HELPERS (add just below your imports) ────────────────────────────────────

// Cache repeated parses
const parseCache = new Map();

// Sanitize common JSON mistakes
function sanitizeArgRaw(argRaw) {
  let s = argRaw
    .replace(/,\s*]$/,  ']')
    .replace(/,\s*}$/,  '}');
  // escape any unescaped quotes inside quoted strings
  s = s.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (_, inner) => `"${inner.replace(/([^\\])"/g, '$1\\"')}"`
  );
  return s.trim();
}

// Parse special literal types (e.g. RegExp)
function parseSpecial(raw) {
  if (/^\/.*\/[gimsuy]*$/.test(raw)) {
    const parts = raw.match(/^\/(.+)\/([gimsuy]*)$/);
    return new RegExp(parts[1], parts[2]);
  }
  return null;
}

// Safe wrapper so one bad command doesn’t abort the whole plan
async function safeParseAndRun(cmd, logs) {
  try {
    await parseAndRun(cmd, logs);
  } catch (err) {
    logs.push(`⚠️ Failed to run \`${cmd}\`: ${err.message}`);
  }
}

// ─── Configuration ────────────────────────────────────────────────────────────

// Nut.js delays
mouse.config.autoDelayMs    = 80;
keyboard.config.autoDelayMs = 80;

// Utility wait
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── DESKTOP ACTIONS ──────────────────────────────────────────────────────────

async function runAppByName(name, waitMs = 2000) {
  await pressKey('LeftSuper');
  await wait(200);
  await typeText(name);
  await pressKey('Enter');
  await wait(waitMs);
}

async function launchApp(exePath, waitMs = 2000) {
  spawn(exePath, [], { detached: true, shell: true });
  await wait(waitMs);
}

async function openUrlNative(url, waitMs = 3000) {
  const opener = process.platform === 'win32'
    ? 'cmd'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '""', url]
    : [url];
  spawn(opener, args, { detached: true, shell: true });
  await wait(waitMs);
}

async function openFolder(dir, waitMs = 2000) {
  const cmd = process.platform === 'win32'
    ? 'explorer'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  spawn(cmd, [dir], { detached: true, shell: true });
  await wait(waitMs);
}

async function focusWindow(title, waitMs = 500) {
  if (process.platform === 'win32') {
    spawn('powershell', [
      '-Command',
      `"(New-Object -ComObject Shell.Application).Windows() | ` +
      `Where-Object { $_.Document.Title -like '*${title}*' } | ` +
      `ForEach-Object { $_.Document.parentWindow.focus() }"`
    ], { detached: true, shell: true });
  }
  await wait(waitMs);
}

async function typeText(text) {
  for (const ch of text) {
    if (ch === ' ') {
      await pressKey('Space');
    } else {
      await keyboard.type(ch);
    }
    await wait(50);
  }
}

async function pressKey(input) {
  const parts = input.split('+').map(p => p.trim());
  const alias = {
    ctrl: 'ControlLeft', shift: 'ShiftLeft', alt: 'AltLeft',
    win: 'MetaLeft', super: 'MetaLeft', meta: 'MetaLeft',
    leftsuper: 'LeftSuper', rightsuper: 'RightSuper',
    enter: 'Enter', esc: 'Escape', escape: 'Escape',
    tab: 'Tab', space: 'Space', slash: 'Slash',
    backspace: 'Backspace', delete: 'Delete',
    home: 'Home', end: 'End',
    pageup: 'PageUp', pagedown: 'PageDown',
    arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
    f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4',
    f5: 'F5', f6: 'F6', f7: 'F7', f8: 'F8',
    f9: 'F9', f10: 'F10', f11: 'F11', f12: 'F12',
    '/': 'Slash', '\\': 'Backslash'
  };
  const keys = [], chars = [];
  for (const part of parts) {
    const low = part.toLowerCase();
    if (alias[low]) {
      keys.push(Key[alias[low]]);
    } else if (/^[a-z0-9]$/i.test(part)) {
      chars.push(part);
    } else {
      const cap = part.charAt(0).toUpperCase() + part.slice(1);
      if (Key[cap]) keys.push(Key[cap]);
      else throw new Error(`Unknown key part: ${part}`);
    }
  }
  for (const k of keys)   await keyboard.pressKey(k);
  for (const c of chars)  await keyboard.type(c);
  for (let i = keys.length - 1; i >= 0; i--) {
    await keyboard.releaseKey(keys[i]);
  }
  await wait(50);
}

async function moveTo(x, y) {
  await mouse.setPosition({ x, y });
  await wait(50);
}

async function clickAt(x, y) {
  await mouse.setPosition({ x, y });
  await mouse.click(Button.LEFT);
  await wait(100);
}

async function scroll(dx, dy) {
  if (dy > 0) await mouse.scrollUp(dy);
  else if (dy < 0) await mouse.scrollDown(-dy);
  await wait(50);
}

async function copyClipboard() {
  await pressKey('ControlLeft+C');
}

async function pasteClipboard() {
  await pressKey('ControlLeft+V');
}

async function minimizeWindow() {
  if (process.platform === 'win32') await pressKey('MetaLeft+ArrowDown');
}

async function switchApp() {
  await pressKey('Alt+Tab');
}

async function lockWorkstation() {
  if (process.platform === 'win32') {
    spawn('rundll32.exe', ['user32.dll,LockWorkStation']);
  }
}

async function openFile(filePath, waitMs = 2000) {
  const full = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  spawn(full, [], { detached: true, shell: true });
  await wait(waitMs);
}

async function mediaControl(action) {
  const map = {
    play: 'Space', pause: 'Space',
    fullscreen: 'F11', exitFullscreen: 'Escape',
    mute: 'M', next: 'PageDown', previous: 'PageUp'
  };
  const keyName = map[action.toLowerCase()];
  if (!keyName) throw new Error(`Unknown media action: ${action}`);
  await pressKey(keyName);
}

async function playVideo()  { await mediaControl('play'); }
async function pauseVideo() { await mediaControl('pause'); }
async function closeVideo() { await pressKey('ControlLeft+W'); }

async function takeScreenshot(savePath) {
  // 1) Grab the screen (PNGJS object)
  const img = await screen.grabScreen();

  // 2) Determine a file path next to the EXE
  const full = path.isAbsolute(savePath)
    ? savePath
    : path.join(process.cwd(), savePath);

  // 3) Write the raw PNG buffer—no Jimp needed
  //    img.data is a Buffer of PNG bytes
  fs.writeFileSync(full, img.data);

  return `Screenshot saved to ${full}`;
}

async function adjustVolume(direction = 'up', amount = 1) {
  const key = direction === 'down' ? Key.VolumeDown : Key.VolumeUp;
  for (let i = 0; i < amount; i++) {
    await keyboard.pressKey(key);
    await keyboard.releaseKey(key);
    await wait(50);
  }
}

// ─── PARSER & EXECUTOR ─────────────────────────────────────────────────────────

// ─── PARSER & EXECUTOR (replace your existing one) ─────────────────────────

async function parseAndRun(cmd, logs) {
  if (typeof cmd !== 'string') {
    logs.push(`✖ Skipping invalid command: ${JSON.stringify(cmd)}`);
    return;
  }
  logs.push(`▶ ${cmd}`);

  // 1) Extract command name and raw argument text
  const m = cmd.match(/^(\w+)\s*\(([\s\S]*)\)$/);
  if (!m) throw new Error(`Invalid command format: ${cmd}`);
  const name   = m[1];
  let   argRaw = m[2].trim();

  // 2) Try JSON.parse, with sanitize & fallback
  let args;
  if (parseCache.has(cmd)) {
    args = parseCache.get(cmd);
  } else {
    try {
      args = JSON.parse(`[${argRaw}]`);
    } catch {
      try {
        const cleaned = sanitizeArgRaw(argRaw);
        args = JSON.parse(`[${cleaned}]`);
      } catch {
        // final fallback: split on commas outside quotes
        const parts = argRaw.match(/("(?:\\.|[^"\\])*"|[^,]+)/g) || [];
        args = parts.map(p => {
          p = p.trim();
          if (/^".*"$/.test(p)) {
            return p.slice(1, -1).replace(/\\"/g, '"');
          }
          if (/^\d+$/.test(p)) return Number(p);
          const special = parseSpecial(p);
          return special !== null ? special : p;
        });
      }
    }
    parseCache.set(cmd, args);
  }

  // 3) Dispatch
  switch (name) {
    case 'runAppByName':    await runAppByName(args[0]); break;
    case 'launchApp':       await launchApp(args[0]); break;
    case 'openUrl':         await openUrlNative(args[0]); break;
    case 'openFolder':      await openFolder(args[0]); break;
    case 'focusWindow':     await focusWindow(args[0]); break;
    case 'typeText':        await typeText(args[0]); break;
    case 'pressKey':        await pressKey(args[0]); break;
    case 'moveTo':          await moveTo(args[0], args[1]); break;
    case 'clickAt':         await clickAt(args[0], args[1]); break;
    case 'wait':            await wait(args[0]); break;
    case 'scroll':          await scroll(args[0], args[1]); break;
    case 'copyClipboard':   await copyClipboard(); break;
    case 'pasteClipboard':  await pasteClipboard(); break;
    case 'minimizeWindow':  await minimizeWindow(); break;
    case 'switchApp':       await switchApp(); break;
    case 'lockWorkstation': await lockWorkstation(); break;
    case 'openFile':        await openFile(args[0]); break;
    case 'mediaControl':    await mediaControl(args[0]); break;
    case 'playVideo':       await playVideo(); break;
    case 'pauseVideo':      await pauseVideo(); break;
    case 'closeVideo':      await closeVideo(); break;
    case 'takeScreenshot':  await takeScreenshot(args[0]); break;
    case 'adjustVolume':    await adjustVolume(args[0], args[1] || 1); break;
    default:
      throw new Error(`Unknown command: ${name}()`);
  }

  logs.push(`✔ ${cmd}`);
}

// ─── EXPORT (replace existing export) ────────────────────────────────────────
exports.executePlan = async function(planArray) {
  if (!Array.isArray(planArray)) {
    throw new Error('Plan must be an array of DSL commands.');
  }
  const logs = [];
  for (const cmd of planArray) {
    await safeParseAndRun(cmd, logs);
  }
  return logs;
};




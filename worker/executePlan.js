// worker/executePlan.js
const { mouse, keyboard, Key, Button, screen } = require('@nut-tree-fork/nut-js');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// tuning delays
mouse.config.autoDelayMs     = 80;
keyboard.config.autoDelayMs  = 80;

let browser;  // Puppeteer browser instance

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ensureBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({ headless: false });
  }
  return browser;
}

// ─── PUPPETEER (WEB) ACTIONS ─────────────────────────────────────────────────

async function navigate(url, waitMs = 3000) {
  const b = await ensureBrowser();
  const page = await b.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.bringToFront();
  await wait(waitMs);
}

async function clickSelector(sel, waitMs = 1000) {
  const b = await ensureBrowser();
  const pages = await b.pages();
  const page = pages[pages.length - 1];
  await page.waitForSelector(sel);
  await page.click(sel);
  await wait(waitMs);
}

async function typeSelector(sel, text, waitMs = 1000) {
  const b = await ensureBrowser();
  const pages = await b.pages();
  const page = pages[pages.length - 1];
  await page.waitForSelector(sel);
  await page.type(sel, text);
  await wait(waitMs);
}

async function extractTable(sel, outCsv) {
  const b = await ensureBrowser();
  const pages = await b.pages();
  const page = pages[pages.length - 1];
  await page.waitForSelector(sel);
  const rows = await page.$$eval(`${sel} tr`, rows =>
    rows.map(r => Array.from(r.querySelectorAll('th,td')).map(c => c.innerText))
  );
  const csv = rows
    .map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(','))
    .join('\n');
  fs.writeFileSync(outCsv, csv);
  await wait(500);
}

async function screenshotRegion(sel, outImg) {
  const b = await ensureBrowser();
  const pages = await b.pages();
  const page = pages[pages.length - 1];
  const el = await page.waitForSelector(sel);
  const box = await el.boundingBox();
  await page.screenshot({ path: outImg, clip: box });
  await wait(500);
}

async function orderFood(site, item) {
  const b = await ensureBrowser();
  const pages = await b.pages();
  const page = pages[pages.length - 1];
  if (site.toLowerCase() === 'ubereats') {
    await page.goto('https://www.ubereats.com', { waitUntil: 'networkidle2' });
    await page.type('input[placeholder="Search"]', item);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.click('.restaurant-list-item');
    await wait(1000);
  } else {
    throw new Error(`No order flow for site: ${site}`);
  }
}

// ─── NUT‑JS (DESKTOP) ACTIONS ─────────────────────────────────────────────────

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
  const opener = process.platform === 'win32' ? 'cmd' :
                 process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '""', url]
    : [url];
  spawn(opener, args, { detached: true, shell: true });
  await wait(waitMs);
}

async function openFolder(dir, waitMs = 2000) {
  if (process.platform === 'win32') spawn('explorer', [dir], { detached: true });
  else if (process.platform === 'darwin') spawn('open', [dir], { detached: true });
  else spawn('xdg-open', [dir], { detached: true });
  await wait(waitMs);
}

async function focusWindow(title, waitMs = 500) {
  if (process.platform === 'win32') {
    spawn('powershell', [
      '-Command',
      `"(New-Object -ComObject Shell.Application).Windows() | `
      + `Where-Object { $_.Document.Title -like '*${title}*' } | `
      + `ForEach-Object { $_.Document.parentWindow.focus() }"`
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
    ctrl: 'ControlLeft', control: 'ControlLeft',
    shift: 'ShiftLeft', alt: 'AltLeft',
    win: 'MetaLeft', super: 'MetaLeft', meta: 'MetaLeft',
    leftsuper: 'LeftSuper', rightsuper: 'RightSuper',
    enter: 'Enter', esc: 'Escape', escape: 'Escape',
    tab: 'Tab', space: 'Space', slash: 'Slash',
    backspace: 'Backspace', delete: 'Delete',
    home: 'Home', end: 'End',
    pageup: 'PageUp', pagedown: 'PageDown',
    arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
    f1:'F1',f2:'F2',f3:'F3',f4:'F4',f5:'F5',
    f6:'F6',f7:'F7',f8:'F8',f9:'F9',f10:'F10',f11:'F11',f12:'F12',
    '/': 'Slash', '\\': 'Backslash'
  };
  const keys = [], chars = [];
  for (const part of parts) {
    const low = part.toLowerCase();
    if (alias[low]) keys.push(Key[alias[low]]);
    else if (/^[a-z0-9]$/i.test(part)) chars.push(part);
    else {
      const cap = part.charAt(0).toUpperCase()+part.slice(1);
      if (Key[cap]) keys.push(Key[cap]);
      else throw new Error(`Unknown key part: ${part}`);
    }
  }
  for (const k of keys) await keyboard.pressKey(k);
  for (const c of chars) await keyboard.type(c);
  for (let i = keys.length-1; i>=0; i--) await keyboard.releaseKey(keys[i]);
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
  if (process.platform==='win32') await pressKey('Meta+ArrowDown');
}

async function switchApp() {
  await pressKey('Alt+Tab');
}

async function lockWorkstation() {
  if (process.platform==='win32') spawn('rundll32.exe',['user32.dll,LockWorkStation']);
}

async function openFile(filePath, waitMs = 2000) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
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

async function playVideo() { await mediaControl('play'); }
async function pauseVideo() { await mediaControl('pause'); }
async function closeVideo() { await pressKey('ControlLeft+W'); }

async function takeScreenshot(savePath) {
  const img = await screen.grabScreen();
  const full = path.isAbsolute(savePath) ? savePath : path.join(process.cwd(), savePath);
  fs.writeFileSync(full, img.toPNG());
}

async function adjustVolume(direction='up', amount=1) {
  const key = direction==='down' ? Key.VolumeDown : Key.VolumeUp;
  for (let i=0;i<amount;i++) {
    await keyboard.pressKey(key);
    await keyboard.releaseKey(key);
    await wait(50);
  }
}

// ─── HYBRID PARSER & EXECUTOR ────────────────────────────────────────────────

async function parseAndRun(cmd, logs) {
  logs.push(`▶ ${cmd}`);
  let m;
  // Web commands
  if      (m=cmd.match(/^navigate\("(.+)"\)$/i))             await navigate(m[1]);
  else if (m=cmd.match(/^clickSelector\("(.+)"\)$/i))        await clickSelector(m[1]);
  else if (m=cmd.match(/^typeSelector\("(.+)","(.+)"\)$/i))  await typeSelector(m[1], m[2]);
  else if (m=cmd.match(/^extractTable\("(.+)","(.+\.csv)"\)$/i)) await extractTable(m[1], m[2]);
  else if (m=cmd.match(/^screenshotRegion\("(.+)","(.+\.(png|jpg))"\)$/i)) 
                                                              await screenshotRegion(m[1], m[2]);
  else if (m=cmd.match(/^orderFood\("(.+)","(.+)"\)$/i))     await orderFood(m[1], m[2]);

  // Desktop commands
  else if (m=cmd.match(/^runAppByName\("(.+)"\)$/i))        await runAppByName(m[1]);
  else if (m=cmd.match(/^launchApp\("(.+)"\)$/i))           await launchApp(m[1]);
  else if (m=cmd.match(/^openUrl\("(.+)"\)$/i))             await openUrlNative(m[1]);
  else if (m=cmd.match(/^openFolder\("(.+)"\)$/i))          await openFolder(m[1]);
  else if (m=cmd.match(/^focusWindow\("(.+)"\)$/i))         await focusWindow(m[1]);
  else if (m=cmd.match(/^typeText\("([^"]+)"\)$/i))         await typeText(m[1]);
  else if (m=cmd.match(/^pressKey\("([^"]+)"\)$/i))         await pressKey(m[1]);
  else if (m=cmd.match(/^moveTo\(\s*(\d+),\s*(\d+)\s*\)$/i)) await moveTo(+m[1], +m[2]);
  else if (m=cmd.match(/^clickAt\(\s*(\d+),\s*(\d+)\s*\)$/i)) await clickAt(+m[1], +m[2]);
  else if (m=cmd.match(/^wait\((\d+)\)$/i))                  await wait(+m[1]);
  else if (m=cmd.match(/^scroll\((-?\d+),\s*(-?\d+)\)$/i))   await scroll(+m[1], +m[2]);
  else if (cmd==='copyClipboard()')                         await copyClipboard();
  else if (cmd==='pasteClipboard()')                        await pasteClipboard();
  else if (cmd==='minimizeWindow()')                        await minimizeWindow();
  else if (cmd==='switchApp()')                             await switchApp();
  else if (cmd==='lockWorkstation()')                       await lockWorkstation();
  else if (m=cmd.match(/^openFile\("(.+)"\)$/i))            await openFile(m[1]);
  else if (m=cmd.match(/^mediaControl\("(.+)"\)$/i))        await mediaControl(m[1]);
  else if (cmd==='playVideo()')                             await playVideo();
  else if (cmd==='pauseVideo()')                            await pauseVideo();
  else if (cmd==='closeVideo()')                            await closeVideo();
  else if (m=cmd.match(/^takeScreenshot\("(.+)"\)$/i))      await takeScreenshot(m[1]);
  else if (m=cmd.match(/^adjustVolume\("([^"]+)"(?:,\s*(\d+))?\)$/i)) 
                                                            await adjustVolume(m[1], +(m[2]||1));
  else throw new Error(`Unknown command: ${cmd}`);
  logs.push(`✔ ${cmd}`);
}

exports.executePlan = async function(planArray) {
  if (!Array.isArray(planArray)) {
    throw new Error('Plan must be an array of DSL commands.');
  }
  const logs = [];
  for (const cmd of planArray) {
    await parseAndRun(cmd, logs);
  }
  return logs;
};

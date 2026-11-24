#!/usr/bin/env node
// Start Metro and open the app in Expo Go on an Android phone.
// Works on Linux, macOS and Windows (only needs Node; adb is optional).
//
//   node scripts/dev.js auto    cable if a phone is plugged in, otherwise Wi-Fi
//   node scripts/dev.js usb     USB cable (adb reverse, no Wi-Fi needed)
//   node scripts/dev.js wifi    same Wi-Fi network, scan the QR code in Expo Go
//   node scripts/dev.js tunnel  any network (school/guest Wi-Fi that blocks devices)
//
// Env: PORT (default 8081), PHONE=192.168.x.x[:port] to adb-connect a phone over Wi-Fi.

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const os = require('os');

const mode = process.argv[2] || 'auto';
const port = process.env.PORT || '8081';
const isWin = process.platform === 'win32';
const EXPO_GO = 'host.exp.exponent';

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: isWin });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}

const hasAdb = sh('adb', ['version']).ok;

function adbDevices() {
  if (!hasAdb) return [];
  return sh('adb', ['devices']).out
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => ({ serial, wireless: /[:]|_adb-tls-connect/.test(serial) }));
}

function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) {
        return a.address;
      }
    }
  }
  return null;
}

function waitForMetro(timeoutMs = 180000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tryOnce = () => {
      http
        .get({ host: '127.0.0.1', port, path: '/status', timeout: 2000 }, (res) => {
          res.resume();
          if (res.statusCode === 200) return resolve(true);
          retry();
        })
        .on('error', retry)
        .on('timeout', function () { this.destroy(); });
    };
    const retry = () => (Date.now() - start > timeoutMs ? resolve(false) : setTimeout(tryOnce, 1000));
    tryOnce();
  });
}

function openExpoGo(serial, url) {
  const r = sh('adb', ['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, EXPO_GO]);
  console.log(r.ok ? `\n> Opened ${url} in Expo Go on ${serial}\n` : `\n> Could not open Expo Go on ${serial}. Is Expo Go installed?\n`);
}

function startExpo(hostFlag, onReady) {
  const child = spawn('npx', ['expo', 'start', hostFlag, '--port', port], { stdio: 'inherit', shell: isWin });
  if (onReady) waitForMetro().then((ok) => ok && onReady());
  const stop = () => child.kill('SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', (code) => process.exit(code ?? 0));
}

function usb(phones) {
  for (const p of phones) {
    const r = sh('adb', ['-s', p.serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
    if (!r.ok) {
      console.error(`adb reverse failed for ${p.serial}:\n${r.out}`);
      process.exit(1);
    }
  }
  console.log(`> Cable mode: ${phones.map((p) => p.serial).join(', ')} -> localhost:${port}`);
  startExpo('--localhost', () => phones.forEach((p) => openExpoGo(p.serial, `exp://127.0.0.1:${port}`)));
}

function wifi() {
  if (hasAdb && process.env.PHONE) {
    const target = process.env.PHONE.includes(':') ? process.env.PHONE : `${process.env.PHONE}:5555`;
    console.log(sh('adb', ['connect', target]).out.trim());
  }
  const ip = lanIp();
  const url = ip ? `exp://${ip}:${port}` : null;
  console.log('> Wi-Fi mode: phone and computer must be on the same network.');
  if (url) console.log(`> Scan the QR code in Expo Go, or type: ${url}`);
  if (isWin) console.log('> Windows: allow Node.js through the firewall on "Private" networks if the phone cannot connect.');
  const wireless = adbDevices().filter((p) => p.wireless);
  startExpo('--lan', url && wireless.length ? () => wireless.forEach((p) => openExpoGo(p.serial, url)) : null);
}

switch (mode) {
  case 'usb': {
    if (!hasAdb) {
      console.error('adb not found. Install Android platform-tools and add it to PATH.');
      process.exit(1);
    }
    const phones = adbDevices().filter((p) => !p.wireless);
    if (!phones.length) {
      console.error('No phone on USB. Plug it in, enable USB debugging, and accept the prompt on the phone.');
      process.exit(1);
    }
    usb(phones);
    break;
  }
  case 'wifi':
    wifi();
    break;
  case 'tunnel':
    console.log('> Tunnel mode: works on any network, but slower. Scan the QR code in Expo Go.');
    startExpo('--tunnel');
    break;
  case 'auto': {
    const phones = adbDevices().filter((p) => !p.wireless);
    if (phones.length) usb(phones);
    else wifi();
    break;
  }
  default:
    console.error(`Unknown mode "${mode}". Use: auto | usb | wifi | tunnel`);
    process.exit(1);
}

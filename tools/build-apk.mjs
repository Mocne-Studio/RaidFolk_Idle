// Buduje APK. Sam wykrywa adres laptopa w sieci i wstawia go do konfiguracji,
// więc nie trzeba nic edytować ręcznie po zmianie sieci.
//
//   npm run apk
//
// Wymaga JDK 17 i Android SDK. Jeśli nie są na PATH, ustaw poniżej.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const JAVA_HOME = process.env.JAVA_HOME || 'C:\\Android\\jdk17\\jdk-17.0.20+8';
const ANDROID_HOME = process.env.ANDROID_HOME || 'C:\\Android\\sdk';
const PORT = process.env.PORT || 8080;

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const n of list ?? []) {
      if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.')) return n.address;
    }
  }
  return 'localhost';
}

// Argument może być adresem IP albo pełnym URL-em tunelu:
//   npm run apk                              → adres w sieci lokalnej
//   npm run apk 192.168.1.50                 → wskazany adres lokalny
//   npm run apk https://cos.trycloudflare.com → tunel, gra działa spoza domu
const arg = process.argv[2];
const url = arg
  ? (/^https?:\/\//.test(arg) ? arg.replace(/\/$/, '') : `http://${arg}:${PORT}`)
  : `http://${lanAddress()}:${PORT}`;

const cfgPath = join(ROOT, 'capacitor.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const secure = url.startsWith('https://');
cfg.server.url = url;
cfg.server.cleartext = !secure;
cfg.server.androidScheme = secure ? 'https' : 'http';
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`adres serwera w APK: ${url}`);
if (!secure && !/^http:\/\/(10\.|192\.168\.|172\.)/.test(url)) {
  console.log('UWAGA: adres nie jest lokalny ani szyfrowany — Android może go zablokować.');
}

const env = { ...process.env, JAVA_HOME, ANDROID_HOME, PATH: `${JAVA_HOME}\\bin;${process.env.PATH}` };
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, env, stdio: 'inherit', shell: true });

// APK nie może leżeć w public/, bo cap sync spakowałby go do środka nowego APK
const stale = join(ROOT, 'public', 'RaidFolk.apk');
if (existsSync(stale)) rmSync(stale);

console.log('\n— kopiuję pliki gry do projektu Androida');
run('npx cap sync android');

console.log('\n— buduję APK (pierwszy raz potrafi zająć kilka minut)');
const gradlew = join(ROOT, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(`"${gradlew}" assembleDebug -q`, join(ROOT, 'android'));

const built = join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(built)) { console.error('\nNie znalazłem APK.'); process.exit(1); }

const out = join(ROOT, 'RaidFolk.apk');
copyFileSync(built, out);
const mb = (readFileSync(out).length / 1048576).toFixed(1);
console.log(`\nGOTOWE: RaidFolk.apk (${mb} MB) — wskazuje na ${url}`);

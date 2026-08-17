// Zapis stanu. SQLite wbudowany w Node 22+, zero zależności.
// Postać trzymana jako JSON — kształt zmienia się co chwilę, schemat by tylko przeszkadzał.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(join(here, '..', 'raidfolk.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS saves (
    token   TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    data    TEXT NOT NULL,
    updated INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS saves_name ON saves(name);
`);

const qGet  = db.prepare('SELECT * FROM saves WHERE token = ?');
const qPut  = db.prepare('INSERT INTO saves (token,name,data,updated) VALUES (?,?,?,?) ON CONFLICT(token) DO UPDATE SET data=excluded.data, updated=excluded.updated');
const qList = db.prepare('SELECT token, name, data, updated FROM saves ORDER BY updated DESC LIMIT 50');

export function load(token) {
  const row = qGet.get(token);
  return row ? JSON.parse(row.data) : null;
}

export function save(token, name, ch) {
  qPut.run(token, name, JSON.stringify(ch), Date.now());
}

export function roster() {
  return qList.all().map(r => {
    const ch = JSON.parse(r.data);
    return { name: r.name, klasa: ch.klasa, floor: ch.maxFloor, updated: r.updated };
  });
}

export function newToken() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export default { load, save, roster, newToken };

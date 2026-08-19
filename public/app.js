// RaidFolk_idle — klient.

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const nf = (n) => Number(n ?? 0).toLocaleString('pl-PL');

const DAMAGE_TYPES = {
  slash: { label: 'Slash', pl: 'Cięcie', ic: '⚔' },
  smash: { label: 'Smash', pl: 'Obuch', ic: '◆' },
  pierce: { label: 'Pierce', pl: 'Przebicie', ic: '➶' },
  magic: { label: 'Magia', pl: 'Magia', ic: '✦' },
};
const typObrazen = (id) => S?.damageTypes?.[id] ?? DAMAGE_TYPES[id] ?? { label: id, pl: id, ic: '▪' };
const oporHtml = (resists = {}, compact = false) => `<div class="resist-profile ${compact ? 'compact' : ''}">
  ${Object.keys(DAMAGE_TYPES).map(id => {
    const d = typObrazen(id); const n = Math.round((resists[id] ?? 0) * 100);
    return `<span class="resist-chip ${n < 0 ? 'weak' : n > 0 ? 'strong' : ''}" title="${esc(d.pl)}">
      <i>${d.ic}</i><b>${esc(d.label)}</b><em>${n > 0 ? '+' : ''}${n}%</em></span>`;
  }).join('')}</div>`;

// Znacznik wersji GRY (plików z public/). Serwer niesie swój własny w stanie.
// Różnica znaczy jedno: proces serwera jest starszy niż pliki na dysku, więc
// ekrany są nowe, a liczby stare. ZMIENIAJ RAZEM z WERSJA w server.js.
const WERSJA_GRY = '2026-08-19.1140';

let TOKEN = localStorage.getItem('rf_token') || null;
let S = null;               // stan z serwera

// ---------------------------------------------------------------- sieć

async function api(path, body) {
  const res = await fetch('/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify({ ...body, token: TOKEN }) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'Zła odpowiedź serwera' }));
  if (res.status === 401) { localStorage.removeItem('rf_token'); location.reload(); return {}; }
  if (data.state) S = data.state;
  if (data.error) toast(data.error, true);
  return data;
}

function toast(msg, err = false) {
  $$('.toast').forEach(el => el.remove());
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

// ---------------------------------------------------------------- ustawienia

// Motyw, jakość i dźwięk. Serwer jest właścicielem ustawień (przeżywają zmianę
// urządzenia), localStorage trzyma je tylko po to, żeby motyw nie mrugnął
// przy starcie — zanim wróci stan z serwera.
const UST_KEY = 'rf_ui';
let UST = { theme: 'mrok', quality: 'wysoka', sound: true, volume: 0.5, lang: 'pl' };
try { UST = { ...UST, ...JSON.parse(localStorage.getItem(UST_KEY) ?? '{}') }; } catch {}

function applyUI() {
  document.documentElement.dataset.theme = UST.theme;
  document.documentElement.dataset.quality = UST.quality;
  // Język ustawia się TU, razem z motywem — jedno miejsce na wszystko, co idzie
  // z ustawień na <html>. setLang() ustawia też atrybut lang, od którego zależy
  // dzielenie wyrazów i czytnik ekranowy.
  setLang(UST.lang ?? 'pl');
  try { localStorage.setItem(UST_KEY, JSON.stringify(UST)); } catch {}
}
applyUI();

// Dźwięk bez plików: oscylator z WebAudio. Kilka linii zamiast kilograma sampli,
// a i tak słychać różnicę między ciosem, krytem i wygraną.
const TONY = {
  klik:    [330, 40], cios: [180, 70], kryt: [280, 130], pudlo: [120, 45],
  leczenie:[520, 160], wygrana: [660, 260], porazka: [110, 380], awans: [780, 220],
};
let AUDIO = null;

function dzwiek(rodzaj) {
  if (!UST.sound || !UST.volume) return;
  const [hz, ms] = TONY[rodzaj] ?? TONY.klik;
  try {
    AUDIO ??= new (window.AudioContext ?? window.webkitAudioContext)();
    if (AUDIO.state === 'suspended') AUDIO.resume();
    const o = AUDIO.createOscillator();
    const g = AUDIO.createGain();
    o.type = rodzaj === 'wygrana' || rodzaj === 'awans' ? 'triangle' : 'square';
    o.frequency.value = hz;
    const teraz = AUDIO.currentTime;
    g.gain.setValueAtTime(Math.min(0.25, UST.volume * 0.25), teraz);
    g.gain.exponentialRampToValueAtTime(0.0001, teraz + ms / 1000);
    o.connect(g); g.connect(AUDIO.destination);
    o.start(teraz); o.stop(teraz + ms / 1000);
  } catch { /* przeglądarka bez WebAudio gra po cichu */ }
}

// Który wpis logu jak brzmi. Bez tego dźwięk byłby jednostajnym stukotem.
const DZWIEK_LOGU = { crit: 'kryt', miss: 'pudlo', heal: 'leczenie',
                      win: 'wygrana', lose: 'porazka', hit: 'cios', enemy: 'cios' };

// ---------------------------------------------------------------- ekran startowy

import { SHAPES, SYMBOLS, COLORS, DEFAULT_CREST, randomCrest, crestSvg } from './crest.js';
// TŁUMACZENIA. Polski tekst jest kluczem — t('Ekwipunek') oddaje 'Equipment'
// albo sam polski, gdy brak wpisu w słowniku. Patrz public/i18n.js.
import { t, setLang, getLang, odmiana } from './i18n.js';

let crest = { ...DEFAULT_CREST };
const heroCrest = (size) => crestSvg(S?.crest ?? DEFAULT_CREST, size);

function paintMaker() {
  $('#crestPreview').innerHTML = crestSvg(crest, 104);
  $('#crestName').textContent = $('#name').value.trim() || '—';
  $$('#pickShape  button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.shape));
  $$('#pickSymbol button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.symbol));
  $$('#pickColor  button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.color));
  $$('#pickBorder button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.border));
  $$('#pickInk    button').forEach(b => b.classList.toggle('on', b.dataset.v === crest.ink));
}

function buildPickers() {
  $('#pickShape').innerHTML = Object.entries(SHAPES).map(([k, v]) =>
    `<button data-v="${k}" title="${esc(v.label)}">${crestSvg({ ...crest, shape: k }, 36)}</button>`).join('');
  // Kafelek symbolu dostaje tło w kolorze środka herbu — inaczej ciemny symbol
  // znika na ciemnym tle, a przy okazji od razu widać, jak wyjdzie na herbie.
  const inkCol = (COLORS[crest.ink] ?? COLORS.smola).base;
  const fillCol = (COLORS[crest.color] ?? COLORS.mosiadz).base;
  $('#pickSymbol').innerHTML = Object.entries(SYMBOLS).map(([k, v]) =>
    `<button data-v="${k}" title="${esc(v.label)}" style="background:${fillCol}">
       <span class="glyph" style="color:${inkCol}">${v.g}</span></button>`).join('');

  const swatches = () => Object.entries(COLORS).map(([k, v]) =>
    `<button data-v="${k}" title="${esc(v.label)}"><i style="background:${v.base}"></i></button>`).join('');
  $('#pickColor').innerHTML = swatches();
  $('#pickBorder').innerHTML = swatches();
  $('#pickInk').innerHTML = swatches();

  const wire = (sel, key) => $$(sel + ' button').forEach(b => b.onclick = () => {
    crest[key] = b.dataset.v;
    if (key !== 'symbol') buildPickers();     // podgląd kształtów przejmuje aktualne kolory
    paintMaker();
  });
  wire('#pickShape', 'shape');
  wire('#pickSymbol', 'symbol');
  wire('#pickColor', 'color');
  wire('#pickBorder', 'border');
  wire('#pickInk', 'ink');
}

// EKRAN ŁADOWANIA POKAZUJE SIĘ ZAWSZE I NA TYLE DŁUGO, ŻEBY BYŁ WIDOCZNY.
//
// Przeszedł trzy podejścia i to jest wniosek: przy 9 ms wczytania KAŻDA próba
// pokazania go „tylko gdy trzeba" kończy się mrugnięciem — albo miga sam ekran,
// albo miga treść pod nim. Więc się nie mieścimy: ekran stoi PEŁNE MIN_WIDOCZNY ms
// niezależnie od tego, jak szybko odpowie serwer.
//
// Pół sekundy to świadoma cena za to, że odświeżenie widać i że nic nie migocze.
const LAD_T0 = Date.now();
const LAD_MIN_WIDOCZNY = 500;

function schowajLadowanie() {
  const el = $('#ladowanie');
  if (!el || el.hidden) return;
  const czekaj = Math.max(0, LAD_MIN_WIDOCZNY - (Date.now() - LAD_T0));
  setTimeout(() => {
    el.classList.add('znika');
    setTimeout(() => { el.hidden = true; }, 260);
  }, czekaj);
}

async function boot() {
  if (TOKEN) {
    const d = await fetch('/api/state?token=' + TOKEN).then(r => r.json()).catch(() => ({}));
    if (d.state) { S = d.state; enterGame(); schowajLadowanie(); return; }
    localStorage.removeItem('rf_token'); TOKEN = null;
  }

  // Nie ma postaci — odsłaniamy tworzenie herbu i dopiero wtedy gasimy ładowanie.
  $('#start').hidden = false;
  schowajLadowanie();
  crest = randomCrest();
  buildPickers();
  paintMaker();
  $('#name').addEventListener('input', () => {
    $('#crestName').textContent = $('#name').value.trim() || '—';
  });
  $('#roll').onclick = () => { crest = randomCrest(); buildPickers(); paintMaker(); };

  // Herb → imię → gra. Bez przystanków: żadnego wprowadzenia, żadnego wyboru klasy.
  $('#create').onclick = async () => {
    const name = $('#name').value.trim();
    if (!name) return toast('Podaj imię', true);
    const d = await api('new', { name, crest });
    if (d.token) {
      TOKEN = d.token; localStorage.setItem('rf_token', TOKEN);
      enterGame();
    }
  };
  $('#name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#create').click(); });

  // Wczytanie postaci kodem — ratuje przed utratą postaci przy zmianie adresu serwera.
  const restore = async () => {
    const code = $('#code').value.trim();
    if (!code) return toast('Wklej kod', true);
    const d = await fetch('/api/state?token=' + encodeURIComponent(code)).then(r => r.json()).catch(() => ({}));
    if (!d.state) return toast('Nie znaleziono takiej postaci', true);
    TOKEN = code; localStorage.setItem('rf_token', TOKEN); S = d.state;
    toast(`Wczytano: ${S.name}`);
    enterGame();
  };
  $('#restore').onclick = restore;
  $('#code').addEventListener('keydown', e => { if (e.key === 'Enter') restore(); });
}

// GDZIE GRACZ BYŁ OSTATNIO. Odświeżenie strony wracało na Przygody, choć gra
// biegnie dalej — na telefonie zdarza się to samo z siebie, gdy system uwolni
// pamięć karty, i wygląda to jak wyrzucenie z ekranu w środku roboty.
// Trzymamy to w localStorage, nie na serwerze: to stan PRZEGLĄDANIA, nie postaci.
const MIEJSCE_KEY = 'rf_miejsce';
const zapiszMiejsce = (co) => {
  try {
    const stare = JSON.parse(localStorage.getItem(MIEJSCE_KEY) ?? '{}');
    localStorage.setItem(MIEJSCE_KEY, JSON.stringify({ ...stare, ...co }));
  } catch {}
};
const czytajMiejsce = () => {
  try { return JSON.parse(localStorage.getItem(MIEJSCE_KEY) ?? '{}'); } catch { return {}; }
};
// ODCZYT MUSI NASTĄPIĆ RAZ, PRZY ŁADOWANIU MODUŁU. Start gry woła openTab()
// zanim dojdzie do przywracania pozycji, a openTab zapisuje — więc zapamiętane
// miejsce ginie kilka milisekund przed tym, jak miałoby zostać użyte.
const MIEJSCE_START = czytajMiejsce();

function openTab(name) {
  zapiszMiejsce({ tab: name });
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + name));
  $('.screens').scrollTop = 0;
  // Pasek zbierania zależy od TEGO, na której zakładce stoisz — musi wiedzieć,
  // że właśnie ją zmieniłeś.
  if (S) paintMineBar();
}

function enterGame() {
  // POZYCJĘ PRZYWRACAMY, ZANIM GRA STANIE SIĘ WIDOCZNA. Gdy robiło się to po
  // odsłonięciu #app, gracz widział przez ułamek sekundy domyślną zakładkę,
  // a potem przeskok na właściwą — ekran „skakał" przy każdym odświeżeniu.
  const M = MIEJSCE_START;
  if (M.skillTab && ['zbierackie', 'bojowe', 'atrybuty'].includes(M.skillTab)) skillTab = M.skillTab;
  if (M.skillOpen && S.skills?.[M.skillOpen]) skillOpen = M.skillOpen;
  if (M.tab && $(`.tabs button[data-tab="${M.tab}"]`)) openTab(M.tab);

  $('#start').hidden = true;
  $('#app').hidden = false;
  // ŻADNEJ ANIMACJI WEJŚCIA. Próbowałem sygnalizować odświeżenie ruchem — najpierw
  // ekranem ładowania, potem 180 ms pojawiania się treści — i przy 9 ms wczytania
  // KAŻDY taki ruch czyta się jako mrugnięcie, nie jako informacja.
  // Gra pojawia się po prostu gotowa. Jeśli odświeżenie ma być kiedyś widoczne,
  // musi to być coś, co NIE miga: napis, znacznik czasu, cokolwiek statycznego.
  // Strona przestaje się przewijać — dolne menu ma stać w miejscu.
  document.body.classList.add('wgrze');
  // Serwer jest właścicielem ustawień — po wczytaniu postaci jego wersja wygrywa.
  if (S.settings) { UST = { ...UST, ...S.settings }; applyUI(); }

  render();
  // Kopanie przetrwało odświeżenie strony — serwer pamięta, co gracz robił.
  if (S.activity) {
    const s = S.skills[S.activity.skill];
    const r = s?.resources?.find(x => x.id === S.activity.res);
    const elapsed = Math.max(0, Date.now() - (S.activity.since ?? Date.now()));
    if (r) startMineLoop(S.activity.skill, r.id, S.activity.ms ?? r.effectiveMs ?? r.ms, elapsed);
  }
}

// ---------------------------------------------------------------- render

// Ranking ma dwa trofea: KORONA za piętro, HEŁM za moc. Rysowane jako SVG,
// bo emoji nie da się przemalować na złoto, a hełm z emoji jest zielony.
const KORONA = `<svg viewBox="0 0 24 24" class="trofeum" aria-hidden="true">
  <path d="M2.5 8.5l4.2 3.6L12 4.5l5.3 7.6 4.2-3.6-1.6 10.5H4.1z" fill="#E8C35A" stroke="#8A5E17" stroke-width="1.1" stroke-linejoin="round"/>
  <circle cx="12" cy="15" r="1.4" fill="#8A5E17"/></svg>`;
const HELM = `<svg viewBox="0 0 24 24" class="trofeum" aria-hidden="true">
  <path d="M5.5 4.5h13v8.2a6.5 6.5 0 0 1-13 0z" fill="#E8C35A" stroke="#8A5E17" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M9 8.2h6M9 12h6" stroke="#8A5E17" stroke-width="1.6" stroke-linecap="round"/></svg>`;

// TWARDE ODŚWIEŻENIE. Kasuje pamięć podręczną przeglądarki i service workera,
// potem wczytuje stronę z sieci. Bez tego telefon potrafi trzymać stary app.js
// mimo `cache-control: no-store` — zwłaszcza w powłoce APK.
async function odswiezTwardo() {
  try {
    if (window.caches) {
      const klucze = await caches.keys();
      await Promise.all(klucze.map(k => caches.delete(k)));
    }
    if (navigator.serviceWorker) {
      const rej = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rej.map(r => r.unregister()));
    }
  } catch { /* nawet gdy się nie uda, przeładowanie ma sens */ }
  // Znacznik czasu w adresie omija każdą pamięć podręczną, także tę z APK.
  location.replace(location.pathname + '?v=' + Date.now());
}

// Ostrzeżenie o starym serwerze. Wisi nad wszystkim, dopóki ktoś go nie zrestartuje.
function ostrzezenieWersji() {
  const stary = S?.wersja && S.wersja !== WERSJA_GRY;
  let el = $('#wersja');
  if (!stary) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'wersja';
    el.className = 'wersja-bar';
    $('#app').prepend(el);
  }
  el.innerHTML = `<b>WERSJE SIĘ NIE ZGADZAJĄ</b>
    Gra na tym urządzeniu: ${WERSJA_GRY} · serwer: ${esc(S.wersja)}.
    Przycisk zrobi to, czego trzeba: zrestartuje serwer albo wyczyści pamięć telefonu.
    <button class="btn solid" data-act="restart" style="margin-top:6px">Napraw i odśwież</button>`;
}

function header() {
  const box = $('#hdrCrest');
  if (box) box.innerHTML = heroCrest(30);
  $('#hdrName').textContent = S.name;
  $('#hdrMeta').textContent = `POZIOM ${S.poziom} · MOC ${nf(S.stats.power)} · ${S.actName.toUpperCase()}`;

  // ---- CO MASZ: pozycja, złoto, klucze ----
  // Cztery liczby w JEDNYM rzędzie: ikona i wartość, bez ramek i bez podpisów.
  // Wersja z trzema obramowanymi pudełkami i etykietami nad liczbami zajmowała
  // pół belki i ciągnęła oko na siebie zamiast na imię postaci. Co znaczy która
  // liczba, mówi podpowiedź pod kursorem — czyta się ją raz, a patrzy codziennie.
  const M = S.mojeMiejsce ?? {};
  const poz = (ic, v, tip) =>
    `<span class="hpoz" title="${esc(tip)}">${ic}<b>${v}</b></span>`;

  const boxy = $('#hdrBoxy');
  if (boxy) {
    const ranking = [
      M.pietro ? poz(KORONA, M.pietro,
        `Jesteś ${M.pietro} w rankingu pięter — licząc po najwyższym zdobytym piętrze wieży. Pełne podium jest na karcie postaci.`) : '',
      M.moc ? poz(HELM, M.moc,
        `Jesteś ${M.moc} w rankingu Mocy. Moc to Atak ×3, Zdrowie ×0,5 i Pancerz ×1,5 w jednej liczbie.`) : '',
    ].filter(Boolean).join('');

    boxy.innerHTML = ranking
      + (ranking ? '<span class="hsep"></span>' : '')
      // Ikony wektorowe zamiast znaków ◈ i ⚷ — tamte zależały od kroju pisma
      // urządzenia, więc na jednym telefonie były romb i klucz, a na drugim
      // dwa pustaki. Te rysują się tak samo wszędzie i barwią currentColor.
      + poz(`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>`, nf(S.gold),
          'Złoto. Sypie je walka w wieży; wydajesz je u kowala i na ulepszenia. Wyprawa nie płaci za sam marsz — płaci łupem.')
      + poz(`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`, nf(S.keys ?? 0),
          'Klucze otwierają Przywołanie — losujesz nimi sojuszników i pety. Szanse są jawne, bez pity i bez duplikatów.');
  }

  // ---- CO SIĘ DZIEJE: rzeczy lecące w tle ----
  paintMineBar();
}

// RZECZY W TLE, JAKO IKONY W GÓRNYM PASKU.
//
// Wcześniej zbieranie miało własny pasek na całą szerokość pod nagłówkiem.
// Zjadał kilkadziesiąt pikseli wysokości na każdym ekranie po to, żeby pokazać
// jedną nazwę i jeden postęp — a wysokość jest w tej grze walutą, bo ekran
// z założenia ma się mieścić bez przewijania.
//
// Teraz to ikona z pierścieniem postępu w pasku: widać, że coś leci, widać ile
// zostało, a po najechaniu widać co dokładnie. Przerwanie siedzi tam samo.
function paintMineBar() {
  const el = $('#hdrAkt');
  if (!el || !S) return;
  const akt = S.activity;

  if (!akt) {
    // NIC NIE LECI — SLOT ZNIKA. Stała zachęta „Nic w tle" zajmowała miejsce
    // w belce po to, żeby powiedzieć, że nie ma nic do powiedzenia.
    // Układ i tak nie skacze, bo belka ma stałą wysokość od imienia i liczników.
    el.innerHTML = '';
    return;
  }

  const sk = S.skills?.[akt.skill];
  const r = sk?.resources?.find(x => x.id === akt.res);
  const pct = MINE && !MINE.pauza
    ? Math.min(100, (Date.now() - MINE.t0) / MINE.ms * 100)
    : (MINE?.pauza ? 100 : 0);
  const nazwa = r?.nodeLabel ?? r?.label ?? akt.res;

  // SAMA SYGNALIZACJA. Belka mówi tylko TYLE, że coś leci i ile zostało.
  // Kliknięcie prowadzi PROSTO DO TEJ PROFESJI — nie do ogólnej zakładki Skille,
  // tylko do otwartego Rolnictwa czy Górnictwa, czyli tam, gdzie rzecz się dzieje.
  // Robi to `skillgo`, które ustawia sekcję i wybraną profesję naraz.
  const zostalo = MINE?.ms ? Math.max(0, (MINE.ms - (Date.now() - MINE.t0)) / 1000) : null;
  const tip = [
    `${sk?.label ?? 'Zbieranie'}: ${nazwa}`,
    MINE?.ms ? `cykl ${(MINE.ms / 1000).toFixed(1)} s` : '',
    zostalo != null ? `zostało ${zostalo.toFixed(1)} s` : '',
    r?.xp ? `${r.xp} exp za cykl` : '',
    'Leci w tle na każdej zakładce — kliknij, żeby przejść do tej profesji.',
  ].filter(Boolean).join(' · ');
  el.innerHTML = `<button class="akt-chip" data-act="skillgo" data-t="zbierackie"
      data-skill="${esc(akt.skill)}" data-tip="${esc(tip)}"
      aria-label="${esc(`${sk?.label ?? 'Zbieranie'}: ${nazwa}`)}">
      <span class="ring" style="--p:${pct}"><span class="ic">${sk?.ic ?? '⛏'}</span></span>
    </button>`;
}

// Podium: trzy miejsca, herb, imię i wynik. Ta sama funkcja rysuje oba rankingi —
// różni je tylko trofeum i jednostka.
function podiumHtml(lista, trofeum, jednostka, moje = null, mojWynik = 0) {
  // Rozróżniamy DWIE różne puste rzeczy. Klient dostaje pliki z dysku od razu,
  // ale serwer trzyma swój kod z chwili startu — po aktualizacji bez restartu
  // ekran jest nowy, a `ranking` w stanie nie istnieje. Wtedy „nikt nie wszedł
  // do wieży" było zwykłym kłamstwem.
  if (!S.ranking) {
    return `<div class="card bad"><div class="t1">Serwer nie zna jeszcze rankingu</div>
      <div class="t2">Ekran jest nowszy niż uruchomiony proces serwera.
        Zrestartuj go (<b>node server.js</b> albo <b>.\start.ps1</b>) — ranking policzy się sam.</div></div>`;
  }
  if (!lista?.length) return `<div class="card"><div class="t2">Pusto — nikt jeszcze nie wszedł do wieży.</div></div>`;
  const jestemNaPodium = lista.some(w => w.name === S.name);
  return `<div class="podium">${lista.map(w => `<div class="pm ${w.name === S.name ? 'ja' : ''}">
    <span class="mj">${trofeum}<b>${w.miejsce}#</b></span>
    <span class="hb">${crestSvg(w.crest ?? DEFAULT_CREST, 22)}</span>
    <span class="nm">${esc(w.name)}</span>
    <span class="wy">${nf(w.wynik)}${jednostka}</span>
  </div>`).join('')}
  ${!jestemNaPodium && moje ? `<div class="pm ja">
    <span class="mj"><b>${moje}#</b></span>
    <span class="hb">${heroCrest(22)}</span>
    <span class="nm">${esc(S.name)}</span>
    <span class="wy">${nf(mojWynik)}${jednostka}</span>
  </div>` : ''}</div>`;
}

// ---------------------------------------------------------------- walka

// CHMURKA JAKO PRAWDZIWY ELEMENT, nie pseudoelement z content:attr().
// attr() nie umie łamać linii — lista składników sklejała się w jeden ciąg.
// `poz` to tablica wierszy; numeruje je sam, gdy jest więcej niż jeden.
const chmurka = (tytul, poz, aria = 'Szczegóły') => {
  const wiersze = (poz ?? []).filter(Boolean);
  if (!wiersze.length) return '';
  const lista = wiersze.length > 1
    ? `<ol>${wiersze.map(x => `<li>${x}</li>`).join('')}</ol>`
    : `<div class="jeden">${wiersze[0]}</div>`;
  // Przycisk i dymek w jednym opakowaniu — dzięki temu dymek kotwiczy się
  // do „i”, a trójkącik staje dokładnie pod nim, niezależnie od długości nazwy.
  return `<span class="tip-wrap"><button class="info-btn tip maly" data-act="tip"
    aria-label="${esc(aria)}">i</button><span class="chmurka"><b>${esc(tytul)}</b>${lista}</span></span>`;
};

// Czy gracz zamknął podsumowanie na pasku. Zeruje się przy każdej nowej walce,
// więc „ZAMKNIJ" chowa TEN wynik, a nie wyłącza funkcji na zawsze.
let WYNIK_ZAMKNIETY = false;
// OSTATNI WYNIK ŻYJE DŁUŻEJ NIŻ OBIEKT WALKI. `FIGHT` jest zerowany zaraz po
// rozliczeniu (i przy każdej kolejnej fali w automacie), więc podsumowanie
// na pasku znikało w tej samej chwili, w której miało się pokazać.
let OSTATNI_WYNIK = null;   // { result, hp, maxHp, context }

// Stan odtwarzania walki po stronie klienta.
// Trzymany osobno, żeby render() nie przerysowywał areny w trakcie animacji.
let FIGHT = null;   // { log, idx, timer, php, pmax, ehp, emax, enemy, result, mode }

// AUTO: ciąg fal leci sam, aż piętro padnie albo padniesz Ty. To jest cała
// pętla idle — playback chodzi na timerze klienta, więc nie przerywa go
// przejście na inną zakładkę.
let AUTO = false;
let SPEED = 1;      // mnożnik tempa odtwarzania: ×1 albo ×2
let fightStatsOpen = false;
let fightLogOpen = false;
let fightDetailsOpen = false;
let fightActionTab = 'atak';
let autoTickBusy = false;

const LOG_CLASS = { crit: 'crit', heal: 'heal', enemy: 'enemy', win: 'win', lose: 'lose',
                    hit: 'hit', miss: 'miss', info: 'info', buff: 'buff', ult: 'ult',
                    kill: 'win', down: 'lose', lost: 'lost' };

function waveDots(ctx = null) {
  let d = '';
  const total = ctx?.total ?? S.fightsOnFloor;
  const current = ctx ? Math.max(0, (ctx.step ?? 1) - 1) : S.fight;
  for (let i = 0; i < total; i++) {
    const cls = i < current ? 'done' : i === current ? 'now' : '';
    d += `<i class="${cls}"></i>`;
  }
  return `<div class="waves">${d}</div>`;
}

const PARTY_SLOTS = 5;          // Ty + 3 sojuszników + pet
const SLOT_ICON_PARTY = [null, '👤', '👤', '👤', '🐺'];
// Ikona sojusznika zależy od klasy: tank ma tarczę, mag różdżkę, dystans łuk.
// Nieznana klasa spada do ludzika.
const ALLY_ICON = {
  wojownik: '🛡', paladyn: '⚜', tancerz: '🗡',
  mag: '🪄', lowca: '🏹', tropiciel: '🎯',
};
const SLOT_LABEL = [null, 'sojusznik', 'sojusznik', 'sojusznik', 'pet'];

function unitBox(u, opts = {}) {
  if (!u) {
    return `<div class="unit empty"><div class="nm">${esc(opts.label ?? 'pusto')}</div></div>`;
  }
  const pct = Math.round(u.hp / u.maxHp * 100);
  const dead = !u.alive || u.hp <= 0;
  const portrait = u.portrait ?? opts.portrait ?? null;
  // Pancerz jako pula (model bariery). Pasek jest cienkim wizualem, a LICZBA
  // obok HP mówi wprost, ile go jeszcze zostało do przebicia.
  const armorMax = u.armorMax ?? u.armor ?? 0;
  const armorNow = Math.max(0, u.armorNow ?? 0);
  const maArmor = S.armorModel === 'barrier' && armorMax > 0;
  const tag = opts.targetable && !dead ? 'button' : 'div';
  const targetAttrs = tag === 'button'
    ? ` type="button" data-act="fighttarget" data-target="${u.idx}" aria-pressed="${!!opts.priority}" title="Wybierz cel drużyny"`
    : '';
  return `<${tag}${targetAttrs} class="unit ${opts.me ? 'me' : ''} ${dead ? 'dead' : ''} ${opts.actor ? 'acting' : ''} ${opts.target ? 'targeted' : ''} ${opts.priority ? 'priority-target' : ''}">
    ${opts.priority ? '<span class="target-mark" aria-hidden="true">⌖</span>' : ''}
    <div class="unit-top"><div class="png">${portrait
      ? `<img src="${esc(portrait)}" alt="">` : (opts.icon ?? '👹')}</div>
      <div class="unit-copy"><div class="nm">${esc(u.name)}</div>
      <div class="unit-role">${esc(u.role ?? opts.label ?? (opts.foe ? 'wróg' : 'bohater'))}</div></div></div>
    ${maArmor ? `<div class="bar armor" title="Pancerz — trzeba go przebić, żeby sięgnąć HP"><i style="width:${Math.round(armorNow / armorMax * 100)}%"></i></div>` : ''}
    <div class="bar ${opts.foe ? 'foe' : 'hp'}"><i style="width:${pct}%"></i></div>
    <div class="hpn"><span class="hp-n">${nf(u.hp)} / ${nf(u.maxHp)}</span>${maArmor ? ` <span class="arm-n" title="Pancerz do przebicia">🛡 ${nf(armorNow)}</span>` : ''}</div></${tag}>`;
}


function formacjaHtml(units, { foe = false, defs = [], focus = null, lateral = false,
                               queued = 0, priorityTarget = null, targetable = false } = {}) {
  // W układzie bocznym przód obu formacji stoi najbliżej środka areny.
  const kolejnosc = lateral
    ? (foe ? [1, 2, 3] : [3, 2, 1])
    : (foe ? [3, 2, 1] : [1, 2, 3]);
  const posortowane = [...units].sort((a, b) =>
    kolejnosc.indexOf(a.row ?? 1) - kolejnosc.indexOf(b.row ?? 1));
  const formationCount = lateral
    ? Math.min(2, Math.max(1, posortowane.length))
    : Math.max(1, posortowane.length);
  const formationMax = formationCount * 108 + (formationCount - 1) * 4;
  return `<div class="battle-side ${foe ? 'enemy-formation' : 'party-formation'} ${lateral ? 'lateral-formation' : ''}">
    <div class="battle-side-title"><span>${foe ? 'WROGOWIE' : 'TWOJA DRUŻYNA'}</span>
      ${foe && queued > 0 ? `<small class="formation-queue"><b>+${queued}</b> POSIŁKÓW</small>` : ''}</div>
    <div class="formation-grid ${lateral ? 'lateral-grid' : ''}" style="--formation-count:${formationCount};--formation-max:${formationMax}px">${posortowane.map(u => {
      const def = defs[u.idx ?? units.indexOf(u)] ?? {};
      const actor = focus?.actor?.side === (foe ? 'wrog' : 'gracz') && focus.actor.idx === u.idx;
      const target = focus?.target?.side === (foe ? 'wrog' : 'gracz') && focus.target.idx === u.idx;
      return `<div class="formation-unit-wrap">${unitBox(u, {
        foe, actor, target, me: !foe && u.slot === 0,
        targetable: foe && targetable, priority: foe && priorityTarget === u.idx,
        icon: foe ? (u.ic ?? def.ic ?? (S.isBoss && u.idx === 0 ? '👑' : '👹'))
          : u.slot === 0 ? heroCrest(24)
          : u.kind === 'pet' ? '🐺'
          : (ALLY_ICON[u.klasa] ?? '👤'),
      })}</div>`;
    }).join('')}</div>
  </div>`;
}

// Efekt ataku jest osobną, lekką warstwą sceny. Typ obrażeń wybiera animację:
// łowcy wypuszczają strzałę, magia leci jako pocisk, a broń biała zostawia ślad.
function attackEffectHtml(fx) {
  if (!fx?.actor || !fx?.target || fx.actor.side === fx.target.side) return '';
  const type = ['magic', 'pierce', 'slash', 'smash'].includes(fx.type) ? fx.type : 'slash';
  const direction = fx.actor.side === 'wrog' ? 'from-enemy' : 'from-party';
  const glyph = type === 'pierce' ? '➶' : type === 'smash' ? '✦' : '';
  return `<span class="attack-fx fx-${type} ${direction}" aria-hidden="true"><i>${glyph}</i></span>`;
}

// Statystyki przeciwnika. ZWYKŁY POKAZUJE WSZYSTKO OD RAZU, boss dopiero
// wtedy, gdy zejdzie mu zdrowie poniżej progu — do tego czasu stoi ???.
function statyWroga(e, hpPct = 1) {
  if (!e) return '';
  const prog = S.bossOdkrywaOd ?? 0.5;
  const boss = e.variant === 'boss' || e.variant === 'kolos';
  const kryje = boss && hpPct > prog;
  const v = (x) => (kryje ? '???' : x);
  return `<div class="wrog-staty ${kryje ? 'kryte' : ''}">
    <span><i>HP</i>${v(nf(e.maxHp))}</span>
    <span><i>ATK</i>${v(nf(e.damage))}</span>
    <span><i>OBR</i>${v(nf(e.armor ?? 0))}</span>
    <span><i>AS</i>${v((e.attackSpeed ?? (e.speed ?? 100) / 20).toFixed(2))}</span>
    ${kryje ? `<span class="kryj">odkryje się poniżej ${Math.round(prog * 100)}% zdrowia</span>` : ''}
  </div>`;
}

function arenaHtml() {
  const F = FIGHT;
  const enemies = F.enemies ?? [];
  const party = F.party ?? [];

  // Ikony biorą się z definicji przeciwnika — świta bossa ma swoje własne.
  const def = F.enemyDefs ?? S.nextEnemies ?? [];
  const focus = F.focus ?? null;
  const actorName = focus?.actor
    ? (focus.actor.side === 'wrog' ? enemies : party).find(u => u.idx === focus.actor.idx)?.name : null;
  const targetName = focus?.target
    ? (focus.target.side === 'wrog' ? enemies : party).find(u => u.idx === focus.target.idx)?.name : null;
  const next = F.nextAction;
  let h = `<div class="combat-intel">
    <span class="intel-k">${actorName ? 'TERAZ' : next ? 'NASTĘPNY RUCH' : 'SZYK'}</span>
    <b>${esc(actorName ?? next?.actor ?? 'Przód osłania dalsze rzędy')}</b>
    ${(targetName ?? next?.target) ? `<span class="intel-arrow">→</span><strong>${esc(targetName ?? next.target)}</strong>` : ''}
  </div>`;

  const ep = F.enemyProgress;
  h += `<div class="lateral-battlefield">`;
  h += formacjaHtml(party, { focus, lateral: true });
  h += `<div class="battle-divider lateral"><i></i><span>VS</span><i></i></div>`;
  h += formacjaHtml(enemies, { foe: true, defs: def, focus, lateral: true, queued: ep?.queued ?? 0,
    priorityTarget: F.priorityTarget ?? null, targetable: !F.result });
  h += attackEffectHtml(F.attackFx);
  h += `</div>`;

  // Pasek ładowania skasowany z gry. Została mana — i tylko wtedy,
  // gdy gracz ma czym czarować.
  // W Dungeonie scena jest ciasna i pasek wchodził na dolny rząd postaci.
  // Mana dalej działa w silniku oraz menu skilli, znika tylko jej pasek ze sceny.
  if (F.maxMana && F.context?.kind !== 'dungeon') {
    h += `<div class="charge-wrap mana">
      <div class="charge"><i style="width:${Math.round((F.mana ?? 0) / F.maxMana * 100)}%"></i></div>
      <div class="charge-n">${F.mana ?? 0} / ${F.maxMana} many</div>
    </div>`;
  }

  return h;
}

function mergeCombatStats(base, current) {
  const out = { waves: (base?.waves ?? 0), totals: { damageDone: 0, damageTaken: 0, healingDone: 0 }, party: [] };
  const bySlot = new Map();
  const add = (src, isCurrent = false) => {
    if (!src) return;
    if (isCurrent) out.waves++;
    for (const k of Object.keys(out.totals)) out.totals[k] += src.totals?.[k] ?? 0;
    for (const u of src.party ?? []) {
      const key = String(u.slot ?? u.idx ?? u.name);
      const d = bySlot.get(key) ?? { name: u.name, slot: u.slot, role: u.role,
        damageDone: 0, damageTaken: 0, healingDone: 0 };
      d.name = u.name; d.role = u.role;
      for (const k of Object.keys(out.totals)) d[k] += u[k] ?? 0;
      bySlot.set(key, d);
    }
  };
  add(base); add(current, true);
  out.party = [...bySlot.values()].sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
  return out;
}

function currentRunStats() {
  if (FIGHT?.result?.runStats) return FIGHT.result.runStats;
  return mergeCombatStats(FIGHT?.baseRunStats, FIGHT?.combatStats);
}

function combatStatsHtml() {
  const R = currentRunStats();
  const sumy = R?.totals ?? {};
  let h = `<button class="combat-stats-toggle" data-act="fightstats" aria-expanded="${fightStatsOpen}">
    <span class="combat-stats-icon">📊</span><span class="grow"><b>Podsumowanie runu</b>
      <small>${R?.waves ?? 0} ${R?.waves === 1 ? 'walka' : 'walk'} · zadane ${nf(sumy.damageDone ?? 0)}</small></span>
    <span>${fightStatsOpen ? '▲' : '▼'}</span></button>`;
  if (!fightStatsOpen) return h;
  h += `<div class="combat-stats-panel"><div class="combat-total-grid">
    <div><span>⚔ Zadane</span><b>${nf(sumy.damageDone ?? 0)}</b></div>
    <div><span>🛡 Wytankowane</span><b>${nf(sumy.damageTaken ?? 0)}</b></div>
    <div><span>✚ Leczenie</span><b>${nf(sumy.healingDone ?? 0)}</b></div></div>
    <div class="combat-table-head"><span>Jednostka</span><span>Zadane</span><span>Tank</span><span>Leczenie</span></div>
    ${(R?.party ?? []).map(u => `<div class="combat-table-row"><span>${esc(u.name)}</span>
      <b>${nf(u.damageDone)}</b><b>${nf(u.damageTaken)}</b><b>${nf(u.healingDone)}</b></div>`).join('') ||
      '<div class="t2">Statystyki pojawią się po pierwszym ciosie.</div>'}</div>`;
  return h;
}

function fightResultAction(f) {
  if (!f) return '';
  let title, sub, act, label;
  if (!f.win) {
    title = f.expFailed ? (f.runKind === 'dungeon' ? 'Dungeon przerwany' : 'Wyprawa przerwana') : 'Porażka';
    sub = `${f.enemy.name} wygrał walkę`;
    act = 'closefight'; label = 'Wróć';
  } else if (f.floorCleared) {
    title = `Piętro ${S.floor} zdobyte`;
    const nextMap = S.floor % 10 === 0;
    sub = nextMap ? 'Akt ukończony · następna mapa jest gotowa' : 'Nagrody przyznane · następne piętro jest gotowe';
    act = 'advance'; label = nextMap ? 'Przejdź na następną mapę' : 'Przejdź na następne piętro';
  } else if (f.expDone) {
    title = f.runKind === 'dungeon' ? 'Dungeon ukończony' : 'Wyprawa ukończona';
    sub = f.runLabel ?? 'Boss pokonany';
    act = 'afterrun'; label = f.runKind === 'dungeon' ? 'Wybierz następny Dungeon' : 'Wybierz następną Wyprawę';
  } else if (f.tytan) {
    title = 'Tytan pokonany';
    sub = 'Boska tarcza jest Twoja — wracasz do menu';
    act = 'closefight'; label = 'Powrót do menu';
  } else if (f.kolos) {
    // Kolos to pojedynek poza wieżą — po nim wraca się do menu, nie do fal.
    title = 'Kolos pokonany';
    sub = 'Wracasz do menu Przygód';
    act = 'closefight'; label = 'Powrót do menu';
  } else {
    title = 'Walka wygrana';
    sub = S.expedition ? 'Droga prowadzi do następnego etapu' : 'Następna fala jest gotowa';
    act = 'nextfight'; label = S.expedition ? 'Przejdź do następnego etapu' : 'Rozpocznij następną falę';
  }
  const me = f.party?.[0];
  const hpPct = me?.maxHp ? Math.max(0, Math.round(me.hp / me.maxHp * 100)) : 0;
  const obrazenia = currentRunStats()?.totals?.damageDone ?? 0;
  return `<div class="fight-result-action fight-result-top ${f.win ? 'win' : 'lose'}"><div><b>${esc(title)}</b><span>${esc(sub)}</span></div>
    <div class="fight-result-kpis">
      <span><small>HP</small><b class="${hpPct < 40 ? 'down' : ''}">${hpPct}%</b></span>
      <span><small>OBRAŻENIA</small><b>${nf(obrazenia)}</b></span>
      <span><small>ZŁOTO</small><b>+${nf((f.expDone ? f.expGold : f.gold) ?? 0)}</b></span>
    </div>
    <button class="btn solid big" data-act="${act}">${esc(label)}</button></div>`;
}

function fightLogHtml() {
  const F = FIGHT;
  const ostatni = F.log?.[Math.max(0, F.idx - 1)]?.text ?? 'Przebieg pojawi się po pierwszym ruchu';
  let h = `<div class="fight-tools">
    <button class="fight-fold grow" data-act="fightlog" aria-expanded="${fightLogOpen}">
      <span><b>Przebieg walki</b><small>${esc(ostatni)}</small></span><i>${fightLogOpen ? '▲' : '▼'}</i>
    </button>
    <button class="cbtn" data-act="skipplay" ${F.playing ? '' : 'disabled'}>POMIŃ</button>
  </div>`;
  if (fightLogOpen) h += `<div class="log" id="fightlog"></div>`;
  return h;
}

function renderFightView() {
  const F = FIGHT;
  const Ctx = F.context ?? {};
  const run = ['expedition', 'dungeon'].includes(Ctx.kind);
  const remainingEnemies = Math.max(0,
    (F.enemyProgress?.total ?? 0) - (F.enemyProgress?.defeated ?? 0));
  const arenaClass = Ctx.kind === 'dungeon'
    ? `dungeon-scene ${Ctx.id === 'gniazdocierni' ? 'thorn-scene' : ''}` : '';
  // Na wyprawie nie ma pięter ani fal — jest etap runu. Nagłówek musi mówić
  // prawdę o tym, gdzie gracz stoi.
  let h = run
    ? `<div class="scr-head">${esc(Ctx.label ?? 'Wyprawa')}
        <span>${Ctx.kind === 'dungeon' ? 'KOMNATA' : 'ETAP'} ${Ctx.step} / ${Ctx.total}${Ctx.kind === 'dungeon' && F.enemyProgress?.total
          ? ` · ZOSTAŁO ${remainingEnemies}` : ''}</span></div>`
    : Ctx.kind === 'kolos'
      ? `<div class="scr-head">${esc(Ctx.label ?? 'Kolos')}<span>POJEDYNEK</span></div>`
      : `<div class="scr-head">Piętro ${Ctx.floor ?? S.floor}
          <span>FALA ${Ctx.step ?? Math.min(S.fight + 1, S.fightsOnFloor)} / ${Ctx.total ?? S.fightsOnFloor}</span></div>`;
  h += run ? trasaHtml({ nodes: Ctx.nodes ?? [] }) : waveDots(Ctx.kind === 'tower' ? Ctx : null);

  // Po walce wynik jest PIERWSZY i przyklejony wysoko. Arena, log, tabela
  // jednostek i rozpiska nagród istnieją nadal, ale nie zmuszają do scrolla.
  if (F.result) {
    h += fightResultAction(F.result);
    h += `<button class="fight-details-toggle" data-act="fightdetails" aria-expanded="${fightDetailsOpen}">
      <span><b>Szczegóły walki i nagród</b><small>Arena, statystyki drużyny, log i pełna rozpiska</small></span>
      <i>${fightDetailsOpen ? '▲' : '▼'}</i></button>`;
    if (fightDetailsOpen) {
      h += `<div id="arena" class="${arenaClass}">${arenaHtml()}</div>`;
      h += `<div id="combatstats">${combatStatsHtml()}</div>`;
      h += fightLogHtml();
      h += renderFightResult(F.result);
    }
    return h;
  }

  h += `<div id="arena" class="${arenaClass}">${arenaHtml()}</div>`;
  if (F.mode === 'turowa') h += `<div id="actionmenu">${actionMenu()}</div>`;
  h += fightLogHtml();
  h += `<div id="combatstats">${combatStatsHtml()}</div>`;
  return h;
}

// Menu akcji: Atak / Skille / Itemy — sekcjami, nie jednym rzędem przycisków.
function actionMenu() {
  const F = FIGHT;
  const cd = F.cooldowns ?? {};

  const wZapasie = (F.potions && Object.keys(F.potions).length)
    ? (S.mikstury ?? []).map(m => ({ ...m, count: F.potions[m.id] ?? 0 })).filter(m => m.count > 0)
    : (S.mikstury ?? []);
  const tabs = [
    ['atak', '⚔', 'Atak'], ['skille', '✦', 'Skille'],
    ['obrona', '🛡', 'Obrona'], ['mikstury', '🧪', `Mikstury ${wZapasie.reduce((n, m) => n + m.count, 0)}`],
  ];
  let h = `<div class="fight-action-tabs">${tabs.map(([id, ic, label]) =>
    `<button data-act="fightactiontab" data-t="${id}" aria-selected="${fightActionTab === id}">
      <span>${ic}</span><b>${esc(label)}</b></button>`).join('')}</div>`;

  if (fightActionTab === 'atak') {
    h += `<div class="strikes">`;
    for (const [k, v] of Object.entries(S.strengths)) {
      h += `<button class="btn strike" data-act="strike" data-s="${k}">
        <b>${esc(v.label)}</b><span>×${v.dmg.toFixed(2)}</span>
        <span class="ch">${Math.round(v.chance * 100)}% trafienia</span></button>`;
    }
    return h + `</div>`;
  }

  if (fightActionTab === 'skille') {
    for (const a of S.abilities) {
      // Serwer mówi wprost, czemu nie da się rzucić — klient nie powtarza reguł.
      const blok = F.blokady?.[a.id] ?? (cd[a.id] ? `odnowienie: ${cd[a.id]}` : null);
      h += `<button class="card row skillbtn compact" data-act="ability" data-id="${a.id}" ${blok ? 'disabled' : ''}>
        <div class="icon">${a.mana ? '✦' : '⚑'}</div>
        <div class="grow"><div class="t1">${esc(a.label)}</div><div class="t2">${esc(a.desc)}</div>
          ${blok ? `<div class="t2" style="color:#D9736B">${esc(blok)}</div>` : ''}</div>
        <span class="badge ${blok ? '' : 'on'}">${a.mana ? `${a.mana} many` : `CD ${a.cd}`}</span>
      </button>`;
    }
    return h;
  }

  if (fightActionTab === 'obrona') return h + `<button class="card row skillbtn compact" data-act="defend">
      <div class="icon">🛡</div>
      <div class="grow"><div class="t1">Stań w obronie</div>
        <div class="t2">Oddajesz cios. Do następnej tury obrywasz o połowę mniej.</div></div>
      <span class="badge on">TURA</span>
    </button>`;

  // Dziewięć rodzajów mikstur, każdy osobnym przyciskiem — z liczbą, którą
  // naprawdę uleczy TĘ postać. Pokazujemy tylko te, które gracz ma przy sobie.
  // W walce liczy się to, co zabrałeś (limit noszenia), nie cały zapas w domu.
  h += wZapasie.length
    ? wZapasie.map(m => `<button class="card row skillbtn compact" data-act="strikepotion" data-id="${m.id}">
        <div class="icon">🧪</div>
        <div class="grow"><div class="t1">${esc(m.label)}</div>
          <div class="t2">+${nf(m.heal)} HP${m.pct ? ` (${Math.round(m.pct * 100)}%)` : ''} ·
            każda kolejna w tej walce o 10% słabiej</div></div>
        <span class="badge on">${m.count}</span>
      </button>`).join('')
    : `<div class="card"><div class="t2">Nie masz mikstur. Robi je Alchemia.</div></div>`;

  return h;
}

function renderFightResult(f) {
  const me = f.party?.[0];
  const hpPct = me?.maxHp ? Math.max(0, Math.round(me.hp / me.maxHp * 100)) : 0;

  let h = `<div class="sec">${(f.durationMs / 1000).toFixed(1)} s · ${f.turns} tur</div>`;

  if (!f.win) {
    h += `<div class="card bad cleared">
      <div class="t1">Szczegóły porażki</div>
      ${!f.expFailed ? `<div class="t2" style="text-align:center;margin-top:6px">
        Automat się zatrzymał. Wracasz na pierwszą falę tego piętra z pełnym zdrowiem —
        stąd dalej idzie się ręcznie: lepszy sprzęt z wyprawy, rozdane punkty, mikstury.</div>` : ''}
      ${f.expFailed ? `
        <div class="stat"><span class="k">Doszedłeś do</span><span class="v">${f.expReached} z ${f.expTotal}</span></div>
        <div class="stat"><span class="k">Boss</span><span class="v down">nie osiągnięty</span></div>
        ${(f.expLost ?? []).length ? `<div class="sec">Przepadło</div>
          ${f.expLost.map(n => `<div class="stat"><span class="k">${esc(n)}</span><span class="v down">×</span></div>`).join('')}` : ''}
        ${Object.entries(f.expLostMats ?? {}).filter(([, v]) => v).map(([k, v]) =>
          `<div class="stat"><span class="k">${esc(S.matNames?.[k] ?? k)}</span><span class="v down">−${v}</span></div>`).join('')}
        <div class="t2" style="margin-top:8px"><b>Twój noszony sprzęt i plecak są nietknięte.</b>
          Zdrowie nie wraca — wylecz się przed kolejnym wyjściem.</div>`
        : `<div class="t2" style="text-align:center">Wracasz na pierwszą falę tego piętra.
           Zdrowie nie wraca — mikstury albo czekanie.</div>`}
    </div>`;
    return h;
  }

  if (f.expDone) {
    const mats = Object.entries(f.expMats ?? {}).filter(([, v]) => v);
    h += `<div class="card hi cleared"><div class="t1">Nagrody runu</div>
      <div class="stat"><span class="k">Przedmioty</span><span class="v up">+${(f.expLoot ?? []).length}</span></div>
      ${mats.length ? `<div class="stat"><span class="k">Surowce</span>
        <span class="v up">${mats.map(([k, v]) => `${S.matNames?.[k] ?? k} ×${v}`).join(', ')}</span></div>` : ''}
      <div class="stat"><span class="k">Złoto z runu</span><span class="v up">+${nf(f.expGold ?? 0)}</span></div>
    </div>`;
  } else if (f.floorCleared) {
    h += `<div class="card hi cleared"><div class="t1">Nagrody piętra</div>
      ${f.nagroda ? `
        <div class="stat"><span class="k">Punkty atrybutów</span><span class="v up">+${f.nagroda.attr}</span></div>
        <div class="stat"><span class="k">Klucze Przywołania</span><span class="v up">+${f.nagroda.currency}</span></div>`
        : `<div class="t2" style="text-align:center">To piętro było już nagrodzone.</div>`}
    </div>`;
  }

  h += `<div class="card">
    <div class="stat"><span class="k">Złoto</span><span class="v up">+${nf(f.gold)}</span></div>
    ${f.potionsUsed ? `<div class="stat"><span class="k">Mikstury</span><span class="v down">−${f.potionsUsed}</span></div>` : ''}
    ${f.expHeal ? `<div class="stat"><span class="k">Regeneracja po walce</span><span class="v up">+${nf(f.expHeal)} HP</span></div>` : ''}
    <div class="stat"><span class="k">Zdrowie po walce</span>
      <span class="v ${hpPct < 40 ? 'down' : ''}">${nf(me?.hp ?? 0)} / ${nf(me?.maxHp ?? 0)} · ${hpPct}%</span></div>
    <div class="bar hp big" style="margin-top:6px"><i style="width:${hpPct}%"></i></div>
    ${f.floorCleared ? '' : `<div class="t2" style="margin-top:7px">Tyle wchodzi w następną falę.${f.expHeal ? ` Run odnowił ${Math.round((S.expedition?.healAfterWinPct ?? .08) * 100)}% maksymalnego HP.` : ' HP nie wraca.'}</div>`}
  </div>`;

  if (f.trophy) {
    h += `<div class="sec">Kronika</div>
      <div class="card hi"><div class="t1">Nowe trofeum: ${esc(f.trophy)}</div>
        <div class="t2">Odsłonięte na zawsze w Kronice, w karcie ${esc(f.enemy.name)}.</div></div>`;
  }

  if (f.expWave) {
    h += `<div class="card"><div class="stat"><span class="k">Sakwa</span>
      <span class="v" style="color:var(--brass)">${f.sakwa} przedmiotów</span></div>
      <div class="t2" style="margin-top:5px">Nagrody wpadają po ukończeniu runu. Padniesz — przepadają.</div></div>`;
  }

  const lista = f.expDone ? (f.expLoot ?? []) : f.loot;
  if (lista.length) h += `<div class="sec">${f.expDone ? 'Sakwa' : 'Znalezione'} · ${lista.length}</div>`
    + lista.map(it => itemRow(it, { equipped: !f.expDone })).join('');
  if (f.backpackFull) h += `<div class="card bad"><div class="t2">Plecak pełny — reszta łupu przepadła.</div></div>`;

  return h;
}

// Odtwarzanie logu: paski spadają krok po kroku, zamiast wyskakiwać na gotowe.
// `from` pozwala dograć tylko nowe wpisy — w trybie turowym gracz widział już resztę
// i nie ma sensu puszczać mu całej walki od początku.
function startPlayback(result, from = 0) {
  const F = FIGHT;
  F.log = result.log;
  F.idx = from;
  F.playing = true;
  F.pendingResult = result;
  F.combatStats = result.combatStats ?? F.combatStats;
  F.result = null;
  // Pełny skład musi istnieć PRZED pierwszą klatką. Wcześniej tymczasowy stan
  // miał tylko bohatera i głównego wroga; sojusznicy, pet i obstawa bossa
  // pojawiali się dopiero przy pierwszym wpisie logu.
  const pierwszyStan = result.log?.[from] ?? result.log?.[0] ?? result;
  if (pierwszyStan.party?.length) F.party = pierwszyStan.party;
  if (pierwszyStan.enemies?.length) F.enemies = pierwszyStan.enemies;
  if (pierwszyStan.mana !== undefined) F.mana = pierwszyStan.mana;
  F.enemyProgress = pierwszyStan.enemyProgress ?? result.enemyProgress ?? F.enemyProgress;
  F.reinforcementPreview = pierwszyStan.reinforcementPreview ?? result.reinforcementPreview ?? [];
  drawFightView();
  tickPlayback();
}

function tickPlayback() {
  const F = FIGHT;
  if (!F || !F.playing) return;

  // Podbijamy indeks dopiero po sprawdzeniu wpisu. Wcześniej wychodził poza log
  // i przerysowanie ekranu po walce leciało na undefined.
  const entry = F.log[F.idx];
  if (!entry) return finishPlayback();
  F.idx++;

  F.party = entry.party; F.enemies = entry.enemies;
  F.enemyProgress = entry.enemyProgress ?? F.enemyProgress;
  F.reinforcementPreview = entry.reinforcementPreview ?? F.reinforcementPreview;
  F.combatStats = entry.combatStats ?? F.combatStats;
  F.focus = { actor: entry.actor ?? null, target: entry.kind === 'miss' ? null : (entry.target ?? null) };
  const actorPool = entry.actor?.side === 'wrog' ? F.enemies : F.party;
  const actorUnit = actorPool?.find(u => u.idx === entry.actor?.idx);
  F.attackFx = ['hit', 'crit', 'enemy', 'miss'].includes(entry.kind) && entry.actor && entry.target
    ? { actor: entry.actor, target: entry.target,
        type: entry.damageType ?? actorUnit?.damageType ?? (entry.dtype === 'mag' ? 'magic' : 'slash') }
    : null;
  if (entry.mana !== undefined) F.mana = entry.mana;
  paintArena();
  paintCombatStats();
  appendLog(entry);
  const d = DZWIEK_LOGU[entry.kind];
  if (d) dzwiek(d);
  paintCombatBar();          // pasek ma żyć także wtedy, gdy patrzysz na ekwipunek

  const rest = F.log.length - F.idx;
  const delay = (rest > 24 ? 40 : rest > 12 ? 90 : 170) / SPEED;   // przyspiesz, gdy log długi
  F.timer = setTimeout(tickPlayback, delay);
}

function finishPlayback() {
  const F = FIGHT;
  clearTimeout(F.timer);
  F.playing = false;
  // dociągnij resztę logu bez animacji
  while (F.idx < F.log.length) { appendLog(F.log[F.idx]); F.idx++; }
  const last = F.log[F.log.length - 1];
  if (last) { F.party = last.party; F.enemies = last.enemies; F.combatStats = last.combatStats ?? F.combatStats;
    F.enemyProgress = last.enemyProgress ?? F.enemyProgress;
    F.reinforcementPreview = last.reinforcementPreview ?? F.reinforcementPreview;
    if (last.mana !== undefined) F.mana = last.mana; paintArena(); }
  F.result = F.pendingResult;
  if (F.result?.powtorka) toast(`Piętro ${F.result.powtorka} od nowa — powtarzanie włączone`);

  // Ciąg fal: wygrana i piętro jeszcze niezdobyte — następna fala rusza sama.
  // Przegrana albo zdobyte piętro zatrzymują ciąg i oddają ekran graczowi.
  if (AUTO && F.result?.win && !F.result.floorCleared && !F.result.expDone) {
    setTimeout(() => { if (AUTO) { FIGHT = null; startWave(); } }, 600 / SPEED);
    paintCombatBar();
    return;
  }
  AUTO = false;
  drawFightView();
  paintCombatBar();
}

function paintArena() {
  const el = $('#arena');
  if (el) el.innerHTML = arenaHtml();
}

function paintCombatStats() {
  const el = $('#combatstats');
  if (el) el.innerHTML = combatStatsHtml();
}

// Klasa wpisu logu. Rodzaj obrażeń nadpisuje kolor: fizyczne bordowe,
// magiczne niebieskie. Wrogie ciosy zostają czerwone niezależnie od typu.
function logClass(entry) {
  const base = LOG_CLASS[entry.kind] ?? '';
  if (!entry.dtype || entry.kind === 'enemy') return base;
  return `${base} d-${entry.dtype}`;
}

function appendLog(entry) {
  const el = $('#fightlog');
  if (!el) return;
  const d = document.createElement('div');
  d.className = logClass(entry);
  d.textContent = entry.text;
  el.append(d);
  el.scrollTop = el.scrollHeight;      // przewija się TYLKO log, nie cała strona
}

function syncFightHp() {
  const F = FIGHT;
  const last = F.log[F.idx - 1];
  if (last) { F.party = last.party; F.enemies = last.enemies; F.combatStats = last.combatStats ?? F.combatStats;
    F.enemyProgress = last.enemyProgress ?? F.enemyProgress;
    F.reinforcementPreview = last.reinforcementPreview ?? F.reinforcementPreview;
    if (last.mana !== undefined) F.mana = last.mana; }
}

// Przerysowuje tylko menu akcji — arena i log zostają nietknięte,
// żeby nic nie skakało pod palcem.
function drawActionMenu() {
  const old = $('#actionmenu');
  if (!old) return drawFightView();
  old.innerHTML = actionMenu();
}

function drawFightView() {
  $('#s-wyprawa').innerHTML = renderFightView();
  if (FIGHT?.log) {
    const el = $('#fightlog');
    if (el) {
      for (let i = 0; i < FIGHT.idx; i++) {
        const e = FIGHT.log[i];
        const d = document.createElement('div');
        d.className = logClass(e);
        d.textContent = e.text;
        el.append(d);
      }
      el.scrollTop = el.scrollHeight;
    }
  }
}

// ---------------------------------------------------------------- WYPRAWA
// Hub trybów. Działa jeden — Wieża. Reszta stoi widoczna i wyłączona, żeby było
// wiadomo, dokąd to idzie, i żeby nikt nie klikał w obietnicę.

let advView = 'hub';     // 'hub' | 'wieza' | 'exp' | 'dungeon' | 'bosses' | 'kolos'
let towerHealingOpen = false;
let atakBreakdownOpen = false;   // karta „skąd bierze się Twój atak" w Ekwipunku
let towerDetailsOpen = false;

const TRYBY = [
  { id: 'wieza',  ic: '🗼', label: 'Wieża',      stan: 'on',
    desc: 'Wspinaczka bez końca. Złoto i exp, ale ŻADNYCH przedmiotów.' },
  { id: 'wyprawa',ic: '🧭', label: 'Wyprawa',    stan: 'on',
    desc: 'Unikalne minerały i materiały, których nie da się zdobyć profesjami.' },
  { id: 'dungeon',ic: '🏰', label: 'Dungeony',    stan: 'on',
    desc: 'Pięć komnat. Konkretna pula wyposażenia, elita i skrzynia bossa.' },
  { id: 'bosses', ic: '👑', label: 'Bossowie Drużynowi', stan: 'on',
    desc: 'Kolos, World Boss i Tytan. Tutaj wchodzi się wyłącznie z drużyną.' },
];

const STAN_BADGE = { on: 'OTWARTE', soon: 'WKRÓTCE', lock: 'ZAMKNIĘTE' };

function renderHub() {
  const K = S.kolos ?? {};
  let h = `<div class="scr-head">Przygody <span>PIĘTRO ${S.maxFloor}</span></div>`;
  h += `<div class="modes">`;
  for (const tryb of TRYBY) {
    const czynny = tryb.stan === 'on';
    const akcja = tryb.id === 'wieza' ? 'opentower' : tryb.id === 'wyprawa' ? 'openexp'
      : tryb.id === 'dungeon' ? 'opendungeon'
      : tryb.id === 'bosses' ? 'openbosses' : null;
    const podpis = tryb.id === 'wieza' ? `${S.actName} · piętro ${S.floor} z ${S.actId * 10}`
      : tryb.id === 'wyprawa' ? (S.expedition?.kind === 'expedition'
          ? `TRWA · etap ${S.expedition.at + 1} z ${S.expedition.total} · surowce ${S.expedition.mats?.reduce((a,m)=>a+m.count,0) ?? 0}`
          : tryb.desc)
      : tryb.id === 'dungeon' ? (S.expedition?.kind === 'dungeon'
          ? `TRWA · komnata ${S.expedition.at + 1} z ${S.expedition.total} · skrzynia ${S.expedition.sakwaCount}`
          : tryb.desc)
      : tryb.id === 'bosses' ? `Tylko drużynowo · Kolos ${K.otwarty ? (K.pokonany ? 'pokonany' : 'otwarty') : `od poziomu ${K.unlockFloor ?? 10}`}`
      : tryb.desc;
    h += `<button class="card row mode-card compact ${czynny ? 'hi' : 'off'}" title="${esc(tryb.desc)}"
      ${akcja ? `data-act="${akcja}"` : ''} ${czynny ? '' : 'disabled'}>
      <div class="icon lg">${tryb.ic}</div>
      <div class="grow">
        <div class="t1">${esc(tryb.label)}</div>
        <div class="t2">${esc(podpis)}</div>
      </div>
      <span class="badge ${czynny ? 'on' : ''}">${S.expedition?.kind === 'expedition' && tryb.id === 'wyprawa' ? 'TRWA'
        : S.expedition?.kind === 'dungeon' && tryb.id === 'dungeon' ? 'TRWA'
        : tryb.id === 'bosses' ? `${K.otwarty ? 1 : 0} / 3`
        : STAN_BADGE[tryb.stan]}</span>
    </button>`;
  }
  return h + `</div>`;
}

// ---------------------------------------------------------------- WYPRAWA
// Wyprawy są źródłem unikalnych materiałów. Po walce wraca część HP, sakwa
// wpada do zapasów dopiero po ukończeniu — śmierć zabiera wszystko.

// Wybór przed wyruszeniem: dokąd, jakie ryzyko, jakie utrudnienia.
let expSel = null;                 // id wybranej wyprawy albo null = lista
let expRisk = 'bezryzyka';
let expMods = new Set();
let dungeonSel = null;

const NODE_IC = { walka: '●', rozdroze: '◆', event: '?', safepoint: '⛺', elita: '★', boss: '☠' };
const NODE_NAZWA = { walka: 'Walka', rozdroze: 'Rozdroże', event: 'Zdarzenie',
                     safepoint: 'Postój', elita: 'Elita', boss: 'Boss' };

// Pasek trasy: gdzie jestem w runie. Jedna linijka, mieści się na telefonie.
function trasaHtml(E) {
  return `<div class="trasa">${E.nodes.map(n =>
    `<span class="tw ${n.done ? 'done' : ''} ${n.here ? 'here' : ''} t-${n.typ}"
      title="${NODE_NAZWA[n.typ] ?? n.typ}">${NODE_IC[n.typ] ?? '●'}</span>`).join('')}</div>`;
}

function sakwaHtml(E) {
  const mats = E.mats ?? [];
  return `<div class="card ${E.sakwaCount || mats.length ? 'hi' : ''}">
    <div class="row">
      <div class="grow"><div class="t1">${E.kind === 'dungeon' ? 'Skrzynia Dungeonu' : 'Sakwa wyprawy'}</div>
        <div class="t2">${E.sakwaCount} przedmiotów${mats.length
          ? ` · ${mats.map(m => `${m.label ?? m.id} ×${m.count}`).join(', ')}` : ''}</div></div>
      <span class="badge ${E.sakwaCount ? 'on' : ''}">×${E.lootMult} łupu</span>
    </div>
    ${E.sakwa.length ? `<div class="sakwa-lista">${E.sakwa.map(it =>
      `<div class="sk-row" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>`).join('')}</div>` : ''}
    ${E.kind === 'dungeon' ? `<div class="t2" style="margin-top:6px;color:var(--brass)">
      Każdy zabity mob: <b>${Math.round((E.mobDropChance ?? 0) * 100)}%</b> na sprzęt Common–Unique · elita <b>${Math.round((E.eliteMobDropChance ?? 0) * 100)}%</b>.</div>` : ''}
    <div class="t2" style="margin-top:6px">${E.kind === 'dungeon' ? 'Wyposażenie wpada do plecaka' : 'Surowce wpadają do zapasów'} <b>dopiero po bossie</b>.
      Padniesz albo zawrócisz — przepada.</div>
  </div>`;
}

function renderDungeonTryb() {
  const lista = S.dungeonLista ?? [];
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);
  if (!dungeonSel) {
    let h = `<div class="scr-head"><button class="lnk" data-act="hub">‹ Przygody</button>
      <span>DUNGEONY · SPRZĘT</span></div>
      <div class="card"><div class="t2">Dungeon to walka na wyniszczenie. W prototypowym
        <b>Gnieździe Cierni</b> stoi 5 wrogów naraz, a następni zajmują miejsca poległych.
        Pula wyposażenia i odporności są jawne przed wejściem.</div></div><div class="scrollbox">`;
    for (const d of lista) h += `<button class="card row res-row ${d.otwarty ? '' : 'locked'}"
      ${d.otwarty ? `data-act="dungeonsel" data-id="${d.id}"` : 'disabled'}>
      <div class="icon lg">${d.ic}</div><div class="grow"><div class="t1">${esc(d.label)}</div>
        <div class="t2">${d.otwarty ? esc(d.opis) : `Otwiera się na piętrze ${d.unlockFloor}`}</div>
        <div class="t2" style="color:var(--brass)">poziom EQ ${d.ilvl[0]}–${d.ilvl[1]} · ${d.enemyTotal ? `${d.enemyTotal} wrogów · ` : ''}${d.drops.length} konkretnych przedmiotów${d.ukonczony ? ` · ukończony ×${d.ukonczony}` : ''}</div>
      </div><span class="badge ${d.otwarty ? 'on' : ''}">${d.otwarty ? 'WEJDŹ' : '🔒'}</span></button>`;
    return h + `</div>`;
  }

  const d = lista.find(x => x.id === dungeonSel);
  if (!d) { dungeonSel = null; return renderDungeonTryb(); }
  const rare = d.rarity ?? {};
  const encounters = d.encounters ?? [];
  return `<div class="scr-head"><button class="lnk" data-act="dungeonsel" data-id="">‹ Dungeony</button>
    <span>${esc(d.label.toUpperCase())}</span></div><div class="two-col"><div class="col">
    <div class="card ${hpPct < 50 ? 'bad' : ''}"><div class="row"><div class="grow">
      <div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
      <div class="t2">Wchodzisz z aktualnym HP · limit ${S.potionCarry?.dungeon ?? 8} mikstur</div></div>
      <span class="num">${hpPct}%</span></div><div class="bar hp big"><i style="width:${hpPct}%"></i></div>
      ${miksturyPanel()}</div>
    ${d.prototype ? `<div class="card hi"><div class="row"><div class="grow"><div class="t1">PROTOTYP GRINDU</div>
      <div class="t2">${d.enemyTotal} przeciwników · maksymalnie 5 na arenie · poległych natychmiast zastępują posiłki</div></div>
      <span class="badge on">5 AKTYWNYCH</span></div></div>` : ''}
    ${d.resists ? `<div class="sec">Odporności wrogów</div>${oporHtml(d.resists)}
      <div class="t2" style="margin-top:5px"><b>+35%</b> oznacza mniej zadanych obrażeń. <b>−25%</b> to podatność — tutaj najlepiej wchodzi Smash.</div>` : ''}
    <div class="sec">Przebieg · zawsze taki sam</div>
    <div class="card"><div class="trasa">${d.rooms.map((n, i) => `<span class="tw t-${n}" title="Komnata ${i + 1}: ${NODE_NAZWA[n]}">${NODE_IC[n]}</span>`).join('')}</div>
      ${encounters.length ? `<div class="dungeon-encounters">${encounters.map((r, i) => `<div class="dungeon-encounter ${r.hazard ? 'hazard' : ''}">
        <span>${i + 1}</span><div><b>${esc(r.label)}</b><small>${r.enemies} wrogów · ${r.active} aktywnych${r.hazard ? ` · ${esc(r.hazard.label)}` : ''}</small></div></div>`).join('')}</div>`
        : `<div class="t2" style="margin-top:8px">1. walka · 2. walka · 3. elita · 4. walka · 5. boss</div>`}</div>
    ${encounters.some(r => r.hazard) ? `<div class="sec">Utrudnienie elity</div>${encounters.filter(r => r.hazard).map(r => `<div class="card bad compact">
      <div class="t1">🌿 ${esc(r.hazard.label)}</div><div class="t2">${esc(r.hazard.desc)}</div></div>`).join('')}` : ''}
    <div class="sec">Zasady dropu</div><div class="ios-list">
      <div class="stat"><span class="k">Każdy zwykły mob</span><span class="v up">${Math.round((d.mobChance ?? 0) * 100)}% · Common–Unique</span></div>
      <div class="stat"><span class="k">Każda elita</span><span class="v up">${Math.round((d.eliteMobChance ?? 0) * 100)}% · Common–Unique</span></div>
      <div class="stat"><span class="k">Zwykła komnata</span><span class="v">${Math.round(d.normalChance * 100)}% na 1 przedmiot</span></div>
      <div class="stat"><span class="k">Elita</span><span class="v up">gwarantuje 1 przedmiot</span></div>
      <div class="stat"><span class="k">Boss</span><span class="v up">skrzynia ${d.bossCount[0]}–${d.bossCount[1]} przedmiotów</span></div>
      <div class="stat"><span class="k">Boss: Unique / Heroic</span><span class="v">${rare.unique ?? 0}% / ${rare.heroic ?? 0}%</span></div>
      <div class="stat"><span class="k">Boss: Legendary / Mystic / God</span><span class="v">${rare.legendary ?? 0}% / ${rare.mystic ?? 0}% / ${rare.god ?? 0}%</span></div>
      <div class="stat"><span class="k">Każda dodatkowa jednostka</span><span class="v">+${Math.round((d.partyScaling?.hp ?? 0) * 100)}% HP · +${Math.round((d.partyScaling?.damage ?? 0) * 100)}% ATK wrogów</span></div>
    </div></div><div class="col">
    <div class="sec">Dokładna pula · ${d.drops.length} przedmiotów</div><div class="droptab">
      ${d.drops.map(it => `<div class="dr znany"><span class="di">${itemIcon(it)}</span>
        <span class="dn">${esc(it.base)}${it.hands === 2 ? ' · 2H' : ''}</span></div>`).join('')}</div>
    <div class="card hi" style="margin-top:8px"><div class="stat"><span class="k">Poziom wyposażenia</span><span class="v">${d.ilvl[0]}–${d.ilvl[1]}</span></div>
      <div class="stat"><span class="k">Regeneracja po komnacie</span><span class="v up">12% maks. HP</span></div>
      <div class="t2" style="margin-top:6px">Nie ma rozdroży, namiotów ani surowców. Padniesz przed bossem — zawartość skrzyni przepada.</div></div>
    <button class="btn solid big wide" style="margin-top:8px" data-act="dungeonstart" data-id="${d.id}">Wejdź do Dungeonu</button>
    </div></div>`;
}

function renderWyprawaTryb() {
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);
  const E = S.expedition;

  // ---------------- wybór wyprawy ----------------
  if (!E && !expSel) {
    let h = `<div class="scr-head">
      <button class="lnk" data-act="hub">‹ Przygody</button>
      <span>DOKĄD IDZIESZ</span></div>`;
    h += `<div class="card"><div class="t2">Wyprawy służą zdobywaniu <b>unikalnych minerałów
      i trofeów bossów</b>. Nie wykopiesz ich w Górnictwie i nie wytworzysz profesją.
      Po wyposażenie idź do Dungeonów.</div></div>`;
    h += `<div class="scrollbox">`;
    for (const w of S.expLista ?? []) {
      h += `<button class="card row res-row ${w.otwarta ? '' : 'locked'}"
        ${w.otwarta ? `data-act="expsel" data-id="${w.id}"` : 'disabled'}>
        <div class="icon lg">${w.ic}</div>
        <div class="grow">
          <div class="t1">${esc(w.label)}</div>
          <div class="t2">${w.otwarta ? esc(w.opis) : `Otwiera się na piętrze ${w.unlockFloor}`}</div>
          ${w.otwarta ? `<div class="t2" style="color:var(--brass)">${[...(w.materials ?? []), ...(w.bossMaterials ?? [])]
            .map(m => m.label).join(' · ')}</div>` : ''}
        </div>
        <span class="badge ${w.otwarta ? 'on' : ''}">${w.otwarta ? 'RUSZAJ' : '🔒'}</span>
      </button>`;
    }
    h += `</div>`;
    return h;
  }

  // ---------------- szczegóły wybranej wyprawy ----------------
  if (!E) {
    const w = (S.expLista ?? []).find(x => x.id === expSel);
    if (!w) { expSel = null; return renderWyprawaTryb(); }

    const ryz = (S.expRisks ?? []).find(r => r.id === expRisk) ?? null;
    const mnR = ryz?.lootMult ?? 1;
    const mnM = (S.expMods ?? []).filter(m => expMods.has(m.id)).reduce((a, m) => a + m.reward, 0);
    const razem = (mnR + mnM).toFixed(2);

    let h = `<div class="scr-head">
      <button class="lnk" data-act="expsel" data-id="">‹ Wyprawy</button>
      <span>${esc(w.label.toUpperCase())}</span></div>`;

    h += `<div class="two-col"><div class="col">
      <div class="card ${hpPct < 50 ? 'bad' : ''}">
        <div class="row" style="margin-bottom:6px">
          <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
            <div class="t2">Wchodzisz z tym, co masz — lecz się TERAZ</div></div>
          <span class="num" style="font-size:17px;color:${hpPct < 50 ? 'var(--blood)' : 'var(--brass)'}">${hpPct}%</span>
        </div>
        <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
        <div class="actions">
          <button class="btn ghost" data-act="potion" ${S.potions && st.hp < st.maxHp ? '' : 'disabled'}>Wypij miksturę</button>
        </div>
      </div>

      <div class="card">
        <div class="stat"><span class="k">Etapów</span>
          <span class="v">${w.dlugosci?.[expRisk] ?? '—'} — z wybranego ryzyka</span></div>
        <div class="stat"><span class="k">Poziom przeciwników</span>
          <span class="v">${(w.poziomyWrogow?.[expRisk] ?? w.ilvl ?? []).join('–') || '—'}</span></div>
        <div class="stat"><span class="k">Nagroda</span><span class="v up">unikalne materiały</span></div>
        <div class="stat"><span class="k">Twoja moc</span><span class="v" style="color:var(--brass)">${nf(st.power)}</span></div>
        <div class="stat"><span class="k">Mikstury</span>
          <span class="v">${Math.min(S.potions, S.potionCarry?.wyprawa ?? 10)} z ${S.potionCarry?.wyprawa ?? 10}</span></div>
        <div class="stat"><span class="k">Drużyna</span><span class="v">${1
          + (S.teamStats?.allies.filter(Boolean).length ?? 0)
          + (S.teamStats?.pet ? 1 : 0)} jednostek</span></div>
      </div>

      <div class="sec">Surowce tej wyprawy</div>
      <div class="droptab">
        ${(w.materials ?? []).map(m => `<div class="dr znany"><span class="di">${m.ic}</span>
          <span class="dn">${esc(m.label)} · ${Math.round(m.szansa * 100)}% · ×${m.ile[0]}–${m.ile[1]}</span></div>`).join('')}
        ${(w.bossMaterials ?? []).map(m => `<div class="dr znany"><span class="di">${m.ic}</span>
          <span class="dn">${esc(m.label)} · boss gwarantuje ×${m.ile[0]}${m.ile[1] !== m.ile[0] ? `–${m.ile[1]}` : ''}</span></div>`).join('')}
      </div>
      <div class="t2" style="margin-top:5px">Sprzęt tutaj nie wypada. To celowo oddzielna
        pętla — dokładne zestawy wyposażenia znajdziesz w Dungeonach.</div>
    </div><div class="col">
      <div class="sec">Ryzyko</div>
      <div class="segs">
        ${(S.expRisks ?? []).map(r => `<button data-act="exprisk" data-r="${r.id}"
          aria-selected="${expRisk === r.id}" title="${esc(r.desc)}">${esc(r.label.split(' ')[0])}</button>`).join('')}
      </div>
      ${ryz ? `<div class="card compact"><div class="t2">${esc(ryz.desc)}</div>
        <div class="t2" style="color:var(--brass);margin-top:4px">${ryz.tury} etapów ·
          nagroda ×${ryz.reward} · więcej prób na surowce</div></div>` : ''}

      <div class="sec">Utrudnienia — każde podbija nagrodę</div>
      <div class="scrollbox">
      ${(S.expMods ?? []).map(m => `<button class="card row compact ${m.otwarty ? '' : 'locked'} ${expMods.has(m.id) ? 'hi' : ''}"
        ${m.otwarty ? `data-act="expmod" data-m="${m.id}"` : 'disabled'}>
        <div class="icon">${expMods.has(m.id) ? '✓' : m.otwarty ? '·' : '🔒'}</div>
        <div class="grow"><div class="t1">${esc(m.label)}</div>
          <div class="t2">${m.otwarty ? esc(m.desc) : `Otwiera się na piętrze ${m.unlockFloor}`}</div></div>
        <span class="badge ${expMods.has(m.id) ? 'on' : ''}">+${Math.round(m.reward * 100)}%</span>
      </button>`).join('')}
      </div>

      <div class="card hi" style="margin-top:8px">
        <div class="row"><div class="grow"><div class="t1">Mnożnik nagrody</div>
          <div class="t2">ryzyko ×${mnR.toFixed(1)}${mnM ? ` + utrudnienia +${Math.round(mnM * 100)}%` : ''}</div></div>
          <span class="num big-n">×${razem}</span></div>
      </div>
      <button class="btn solid big wide" style="margin-top:8px" data-act="expstart"
        data-id="${w.id}" data-r="${expRisk}">Ruszaj na wyprawę</button>
    </div></div>`;
    return h;
  }

  // ---------------- run w toku ----------------
  const isDungeon = E.kind === 'dungeon';
  let h = `<div class="scr-head">
    <button class="lnk" data-act="hub">‹ Przygody</button>
    <span>${esc(E.runLabel ?? '')} · ${isDungeon ? 'komnata' : 'etap'} ${E.at + 1} z ${E.total}</span></div>`;

  h += trasaHtml(E);

  // DECYZJA — run stoi, dopóki gracz nie wybierze.
  if (E.decyzja) {
    h += `<div class="card hi decyzja" style="margin-top:8px">
      <div class="big-word">DECYZJA</div>
      <div class="t2" style="text-align:center;margin-bottom:10px">${esc(E.decyzja.pytanie)}</div>
      ${E.decyzja.opcje.map(o => `<button class="card row res-row" data-act="expchoose" data-o="${o.id}">
        <div class="grow"><div class="t1">${esc(o.label)}</div>
          <div class="t2">${esc(o.desc)}</div></div>
        <span class="badge on">WYBIERZ</span>
      </button>`).join('')}
    </div>`;
    h += sakwaHtml(E);
    return h;
  }

  // POSTÓJ — jedyne wcześniejsze wyjście dla łupu, i to wąskie.
  if (E.safepoint) {
    h += `<div class="card hi" style="margin-top:8px">
      <div class="big-word">POSTÓJ</div>
      <div class="t2" style="text-align:center">Możesz odesłać do plecaka <b>jeden przedmiot</b>
        i <b>jeden rodzaj surowca</b> (cały stos). Reszta sakwy zostaje na szali.</div>
      <div class="t2" style="text-align:center;color:var(--heal);margin-top:6px">
        Odejście od namiotu <b>odnawia zapas mikstur</b> do pełnych
        ${S.potionCarry?.wyprawa ?? 10} na resztę drogi.</div>
    </div>`;
    h += `<div class="scrollbox">`;

    // OGNISKO. Jedzenie z Gotowania leczy DO PEŁNA i zostawia buff na kolejne
    // walki. Jedyne odzyskanie zdrowia w środku runu — mikstury liczą się
    // z limitu wyprawy, jedzenie nie.
    if (E.postojLeczy) {
      const hpP = Math.round(S.stats.hp / S.stats.maxHp * 100);
      h += `<div class="sec">Ognisko — jedzenie leczy do pełna</div>`;
      h += (E.jedzenie ?? []).length
        ? E.jedzenie.map(j => `<button class="card row compact" data-act="expsafe" data-jedzenie="${j.id}">
            <div class="icon">🍲</div>
            <div class="grow"><div class="t1">${esc(j.label)} ×${j.count}</div>
              <div class="t2">Leczy do pełna${j.buff ? ` · ${esc(opisBuffa(j.buff))}` : ''}</div></div>
            <span class="badge ok">ZJEDZ</span></button>`).join('')
        : `<div class="card"><div class="t2">Nie masz nic do jedzenia. Ugotuj coś
            w Gotowaniu przed następnym wyjściem — tu leczy do pełna i nie zjada limitu mikstur.</div></div>`;
      h += `<div class="t2" style="margin-bottom:8px">Zdrowie: ${nf(S.stats.hp)} / ${nf(S.stats.maxHp)} (${hpP}%)</div>`;
    }

    h += `<div class="sec">Przedmiot</div>`;
    h += E.sakwa.length
      ? E.sakwa.map(it => `<button class="card row compact" data-act="expsafe" data-item="${it.id}">
          <div class="icon" style="border-color:${rarityColor(it.rarity)}">${itemIcon(it)}</div>
          <div class="grow"><div class="t1" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>
            <div class="t2">${esc(S.rarities[it.rarity]?.label ?? '')}</div></div>
          <span class="badge on">ODEŚLIJ</span></button>`).join('')
      : `<div class="card"><div class="t2">Nic jeszcze nie wypadło.</div></div>`;
    h += `<div class="sec">Surowiec</div>`;
    h += (E.mats ?? []).length
      ? E.mats.map(m => `<button class="card row compact" data-act="expsafe" data-mat="${m.id}">
          <div class="icon">🪨</div>
          <div class="grow"><div class="t1">${esc(m.id)}</div>
            <div class="t2">cały stos: ${m.count}</div></div>
          <span class="badge on">ODEŚLIJ</span></button>`).join('')
      : `<div class="card"><div class="t2">Brak surowców w sakwie.</div></div>`;
    h += `<button class="btn ghost wide" style="margin-top:8px" data-act="expsafe">Idź dalej bez odsyłania</button>`;
    h += `</div>`;
    return h;
  }

  // WALKA
  const e = E.enemy;
  const enemyCount = Math.max(1, E.enemies?.length ?? 1);
  const boss = E.node?.typ === 'boss';
  const elita = E.node?.typ === 'elita';
  const encounter = E.encounter;

  h += `<div class="two-col" style="margin-top:8px"><div class="col">
    <div class="card ${hpPct < 40 ? 'bad' : ''}">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
          <div class="t2">Mikstury: <b>${E.potionsLeft}</b> z ${E.potionCap ?? 10}
            na cały run${isDungeon ? ' · bez namiotów' : ' · zapas odnawia namiot'}</div></div>
        <span class="num" style="font-size:17px;color:${hpPct < 40 ? 'var(--blood)' : 'var(--brass)'}">${hpPct}%</span>
      </div>
      <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
      <div class="t2" style="margin-top:6px;color:var(--heal)">Po każdej wygranej walce odzyskujesz ${Math.round((E.healAfterWinPct ?? .08) * 100)}% maksymalnego HP.</div>
      ${miksturyPanel()}
      <div class="actions">
        <button class="btn ghost" data-act="expleave">Porzuć</button>
      </div>
    </div>
    ${(E.efekty ?? []).length ? `<div class="card">
      <div class="sec" style="margin-top:0">Działa na Ciebie</div>
      ${E.efekty.map(x => `<div class="stat"><span class="k">${esc(x.label)}</span>
        <span class="v ${x.mobDmg ? 'down' : 'up'}">${x.mobDmg ? `wrogowie +${Math.round((x.mobDmg - 1) * 100)}%` : 'korzystnie'}</span></div>`).join('')}
    </div>` : ''}
    ${isDungeon && encounter?.resists ? `<div class="card">
      <div class="t1">Dobierz broń do komnaty</div>${oporHtml(encounter.resists, true)}
      <div class="t2" style="margin-top:5px">Twój typ: ${typObrazen(st.damageType).ic} <b>${esc(typObrazen(st.damageType).label)}</b></div>
      <div class="t2" style="margin:7px 0 4px">Twoje odporności z ekwipunku</div>${oporHtml(st.resists ?? {}, true)}
    </div>` : ''}
    ${isDungeon ? `<div class="card"><div class="t1">Zestawy PvE · zmiana między komnatami</div>
      <div class="dungeon-loadouts">${['a','b'].map(id => {
        const gear = S.pveEquipment?.[id] ?? {}; const stats = S.pveStats?.[id] ?? S.stats;
        const aktywny = S.pveLoadout === id; const typ = typObrazen(stats.damageType);
        return `<button data-act="pveloadout" data-id="${id}" class="${aktywny ? 'on' : ''}" ${aktywny ? 'disabled' : ''}>
          <span><b>PVE ${id.toUpperCase()} ${aktywny ? '· AKTYWNY' : ''}</b><small>${esc(gear.bron?.name ?? 'bez broni')}</small></span>
          <em>${typ.ic} ${esc(typ.label)}</em></button>`;
      }).join('')}</div></div>` : ''}
    ${encounter?.hazard ? `<div class="card bad"><div class="t1">🌿 ${esc(encounter.hazard.label)}</div>
      <div class="t2">${esc(encounter.hazard.desc)}</div></div>` : ''}
    ${sakwaHtml(E)}
  </div><div class="col">
    <div class="card ${boss ? 'hi' : ''}">
      <div class="row"><div class="grow">
        <div class="t1">${isDungeon && encounter?.label ? esc(encounter.label.toUpperCase()) : boss ? (isDungeon ? 'BOSS DUNGEONU' : 'BOSS WYPRAWY') : elita ? 'ELITA' : `${isDungeon ? 'Komnata' : 'Etap'} ${E.at + 1}`}</div>
        <div class="t2">${isDungeon && encounter ? `${encounter.enemies} wrogów w spotkaniu · ${encounter.active} walczy naraz · ${encounter.queued} czeka w posiłkach.`
          : boss ? (isDungeon ? 'Boss i dwóch strażników. Jego śmierć oddaje skrzynię.' : 'Jego śmierć oddaje sakwę. Walka turowa.')
          : elita ? (isDungeon ? 'Elita z ochroniarzem, gwarantuje przedmiot.' : 'Mocniejszy niż reszta, więcej surowców.')
          : isDungeon ? 'Dwóch przeciwników · 30% szansy na jeden przedmiot.' : 'Szansa na surowce regionu.'}</div>
      </div><span class="badge on">${isDungeon ? `${encounter?.active ?? enemyCount} AKTYWNYCH` : (NODE_NAZWA[E.node?.typ] ?? '')}</span></div>
    </div>
    ${isDungeon ? (() => {
      const previewEnemies = (E.enemies ?? []).map((u, i) => ({ ...u, idx: i, slot: i, alive: true }));
      const previewParty = [{ name: S.name, hp: st.hp, maxHp: st.maxHp, row: st.row, slot: 0, idx: 0, alive: true },
        ...(S.teamStats?.allies ?? []).map((u, i) => u ? ({ ...u, hp: u.maxHp, slot: i + 1, idx: i + 1, alive: true }) : null).filter(Boolean),
        ...(S.teamStats?.pet ? [{ ...S.teamStats.pet, hp: S.teamStats.pet.maxHp, slot: 4, idx: 4, alive: true, kind: 'pet' }] : [])];
      return `<div id="arena" class="prebattle-arena ${isDungeon ? `dungeon-scene ${E.id === 'gniazdocierni' ? 'thorn-scene' : ''}` : ''}">${formacjaHtml(previewEnemies, { foe: true, defs: E.enemies, queued: encounter?.queued ?? 0 })}
        <div class="battle-divider"><i></i><span>GOTOWI DO STARCIA</span><i></i></div>${formacjaHtml(previewParty)}</div>`;
    })() : `<div class="units">
      <div class="unit me"><div class="png">${heroCrest(38)}</div><div class="nm">${esc(S.name)}</div>
        <div class="bar hp"><i style="width:${hpPct}%"></i></div><div class="hpn">${nf(st.hp)}</div></div>
      <div class="unit"><div class="png">${boss ? '👑' : elita ? '⚔' : '👹'}</div><div class="nm">${esc(e?.name ?? '—')}</div>
        <div class="bar foe"><i style="width:100%"></i></div><div class="hpn">${nf(e?.maxHp ?? 0)}</div></div></div>`}
    <div class="card">
      <div class="stat"><span class="k">Atak</span><span class="v">${nf(st.damage)} vs ${nf(e?.damage ?? 0)}</span></div>
      <div class="stat"><span class="k">Obrona</span><span class="v">${st.armor} vs ${e?.armor ?? 0}</span></div>
    </div>
    <button class="btn solid big wide" style="margin-top:8px" data-act="fight">
      ${boss ? 'Stań do bossa' : S.mode === 'auto' && !S.alwaysAuto === false ? 'Walcz' : 'Ruszaj'}</button>
  </div></div>`;
  return h;
}

// Lista pięter biomu. Zamknięte piętra pokazują tylko numer — co jest wyżej,
// zobaczysz dopiero, gdy tam wejdziesz.
function floorGrid() {
  let h = `<div class="floors">`;
  for (const f of S.floors) {
    const cls = [f.here ? 'here' : '', f.cleared ? 'done' : '', f.unlocked ? '' : 'lock',
                 f.isBoss ? 'boss' : ''].filter(Boolean).join(' ');
    h += `<button class="floor ${cls}" ${f.unlocked ? `data-act="goto" data-f="${f.floor}"` : 'disabled'}>
      <span class="n">${f.floor}</span>
      <span class="k">${f.isBoss ? 'BOSS' : f.unlocked ? (f.isPlus ? '+' : `${f.fights}×`) : '🔒'}</span>
    </button>`;
  }
  return h + `</div>`;
}

function renderWieza() {
  const done = S.fight >= S.fightsOnFloor;
  const e = S.nextEnemy;
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);

  let html = `<div class="scr-head">
    <button class="lnk" data-act="hub">‹ Przygody</button>
    <span>${esc(S.actName.toUpperCase())} · PIĘTRO ${S.floor}</span></div>`;

  // Niedokończona walka turowa zostawiona na innym ekranie. Musi być z niej
  // wyjście w obie strony, inaczej postać zakleszcza się na zawsze.
  if (S.activeFight) {
    return html + `<div class="card hi tower-primary">
      <div class="t1">Masz niedokończoną walkę</div>
      <div class="t2">Turowa walka czeka na Twój ruch. Możesz do niej wrócić albo ją porzucić —
        porzucenie nic nie kosztuje, fala zaczyna się od nowa.</div>
      <div class="actions">
        <button class="btn solid" data-act="fight">Wróć do walki</button>
        <button class="btn ghost" data-act="abandon">Porzuć</button>
      </div>
    </div>`;
  }

  if (done) {
    html += `<div class="card hi cleared tower-primary">
      <div class="big-word">PIĘTRO ZDOBYTE</div>
      <div class="t2" style="text-align:center">Nagrody już wpłynęły — punkty czekają w Skillach.</div>
      <button class="btn solid big wide" style="margin-top:10px" data-act="advance">Wejdź na piętro ${S.floor + 1}</button>
    </div>`;
  } else {
    // Najważniejsze rzeczy są pierwsze: gdzie jesteś, ile macie HP i START.
    // Ustawienia oraz historia nie mogą oddzielać gracza od głównej akcji.
    html += `<div class="card hi tower-primary ${hpPct < 30 ? 'bad' : ''}">
      <div class="row tower-primary-head"><div class="grow">
        <div class="t1">${S.isBoss ? esc(S.bossName ?? 'Boss') : `Fala ${S.fight + 1} z ${S.fightsOnFloor}`}</div>
        <div class="t2">${S.isBoss ? 'Boss aktu · walka turowa' : `Piętro ${S.floor} · HP nie wraca między falami`}</div>
      </div><span class="badge on">${S.isBoss ? 'BOSS' : S.isPlus ? 'PIĘTRO +' : `FALA ${S.fight + 1}`}</span></div>
      ${waveDots()}
      <div class="tower-duel">
        <div><span class="tower-duel-name">${heroCrest(22)} ${esc(S.name)}</span><b>${nf(st.hp)} / ${nf(st.maxHp)}</b>
          <span class="bar hp"><i style="width:${hpPct}%"></i></span></div>
        <em>VS</em>
        <div><span class="tower-duel-name">${S.isBoss ? '👑' : '👹'} ${esc(e.name)}</span><b>${nf(e.maxHp)}</b>
          <span class="bar foe"><i style="width:100%"></i></span></div>
      </div>
      <button class="btn solid big wide tower-start" data-act="fight">
        ${S.isBoss ? 'Stań do bossa' : S.mode === 'auto' ? 'Ruszaj — fale lecą same' : 'Walcz'}</button>
      ${S.forcedTurn
        ? `<div class="tower-mode-note">TRYB TUROWY · boss wymaga Twoich decyzji</div>`
        : `<div class="tower-mode"><span>TRYB</span>
            <button data-act="mode" data-m="auto" aria-selected="${S.mode === 'auto'}">AUTO</button>
            <button data-act="mode" data-m="turowa" aria-selected="${S.mode === 'turowa'}">TUROWA</button>
          </div>`}
    </div>`;
  }

  html += `<div class="tower-folds">
    <button data-act="towerheal" aria-expanded="${towerHealingOpen}"><span>🧪</span><b>Leczenie</b><small>${S.potions} mikstur</small><i>${towerHealingOpen ? '▲' : '▼'}</i></button>
    <button data-act="towerdetails" aria-expanded="${towerDetailsOpen}"><span>🗺</span><b>Piętra i szczegóły</b>
      <small>${S.lastDefeat ? `porażka: fala ${S.lastDefeat.wave}` : `piętro ${S.floor}`}</small><i>${towerDetailsOpen ? '▲' : '▼'}</i></button>
  </div>`;

  if (towerHealingOpen) html += `<div class="card ${hpPct < 40 ? 'bad' : ''} tower-fold-panel">
    <div class="row"><div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
      <div class="t2">Tutaj leczysz się przed następną falą.</div></div><b class="num">${hpPct}%</b></div>
    <div class="bar hp big" style="margin-top:6px"><i style="width:${hpPct}%"></i></div>${miksturyPanel()}</div>`;

  if (towerDetailsOpen) {
    html += `<div class="tower-fold-panel">${floorGrid()}
      ${S.lastDefeat ? `<div class="card bad compact" style="margin-top:7px">
        <div class="t1">Ostatnia porażka: piętro ${S.lastDefeat.floor}, fala ${S.lastDefeat.wave} z ${S.lastDefeat.waves}</div>
        <div class="t2">Rozłożył Cię ${esc(S.lastDefeat.enemy)}.</div></div>` : ''}
      ${!done ? `<div class="card compact">
        <div class="stat"><span class="k">Atak</span><span class="v">${nf(st.damage)} vs ${nf(e.damage)}</span></div>
        <div class="stat"><span class="k">Prędkość</span><span class="v">${st.speed} vs ${e.speed}</span></div>
        <div class="stat"><span class="k">Obrona</span><span class="v">${st.armor} vs ${e.armor}</span></div>
        <div class="stat"><span class="k">Celność</span><span class="v">${Math.round(st.accuracy * 100)}%</span></div></div>` : ''}
      ${S.powtarzanieOtwarte ? `<button class="card row compact ${S.powtarzaj ? 'hi' : ''}" data-act="powtarzaj">
        <div class="grow"><div class="t1">Powtarzaj piętro</div><div class="t2">Po zdobyciu zacznij je ponownie.</div></div>
        <span class="badge ${S.powtarzaj ? 'ok' : ''}">${S.powtarzaj ? 'TAK' : 'NIE'}</span></button>` : ''}
    </div>`;
  }
  return html;
}

// ---------------------------------------------------------------- BOSSOWIE DRUŻYNOWI
// Jeden folder na zawartość, do której nie wchodzi samotny bohater.
function renderBossowie() {
  const K = S.kolos ?? {};
  const allies = S.teamStats?.allies?.filter(Boolean).length ?? 0;
  const pets = S.teamStats?.pet ? 1 : 0;
  const teamSize = 1 + allies + pets;
  let h = `<div class="scr-head"><button class="lnk" data-act="hub">‹ Przygody</button>
    <span>BOSSOWIE DRUŻYNOWI</span></div>
    <div class="card hi boss-team-intro"><div class="row"><div class="icon lg">👥</div><div class="grow">
      <div class="t1">Tutaj walczy cała drużyna</div>
      <div class="t2">Bohater, wystawieni sojusznicy i pet wchodzą razem. To nie są walki solo.</div>
    </div><span class="badge on">SKŁAD ${teamSize}</span></div></div>
    <div class="modes">`;

  h += `<button class="card row mode-card boss-team-mode compact ${K.otwarty ? 'hi' : 'off'}"
    ${K.otwarty ? 'data-act="openkolos"' : 'disabled'}>
    <div class="icon lg">🧊</div><div class="grow"><div class="t1">Kolos</div>
      <div class="t2">Pojedynczy potężny boss dla Twojego ustawionego składu.${K.otwarty ? '' : ` Otwiera się na poziomie ${K.unlockFloor ?? 10}.`}</div>
    </div><span class="badge ${K.otwarty ? 'on' : ''}">${K.otwarty ? (K.pokonany ? 'POKONANY' : 'OTWARTE') : '🔒'}</span></button>`;

  h += `<button class="card row mode-card boss-team-mode compact off" disabled>
    <div class="icon lg">🐉</div><div class="grow"><div class="t1">World Boss</div>
      <div class="t2">Drużyny z całego serwera wspólnie biją jednego przeciwnika.</div>
    </div><span class="badge">WKRÓTCE</span></button>`;

  const T = S.tytan ?? {};
  h += `<button class="card row mode-card boss-team-mode compact ${T.otwarty ? 'hi' : 'off'}"
    ${T.otwarty ? 'data-act="opentytan"' : 'disabled'}>
    <div class="icon lg">☠</div><div class="grow"><div class="t1">Tytan</div>
      <div class="t2">Końcowa próba dla pełnego składu. Boska tarcza w łupie.${T.otwarty ? '' : ` Otwiera się na poziomie ${T.unlockFloor ?? 50}.`}</div>
    </div><span class="badge ${T.otwarty ? 'on' : ''}">${T.otwarty ? (T.pokonany ? 'POKONANY' : 'OTWARTE') : '🔒'}</span></button>`;
  return h + `</div>`;
}

// ---------------------------------------------------------------- KOLOS
// Ekran jednego przeciwnika. Bez pięter, bez fal, bez postępu — obrazek,
// opis i liczby mówiące wprost, ile Ci do niego brakuje.
// Panel „Jego liczby" + „Ile Ci brakuje" — wspólny dla Kolosa i Tytana.
// Pod modelem bariery pancerz NIE zbija ciosu: stoi jako druga pula życia, którą
// trzeba zedrzeć, zanim cios sięgnie HP. Stary ekran pokazywał tu surową „Obronę"
// i cios „przez pancerz" policzony wzorem redukcji — obie liczby kłamały.
// Wszystko przychodzi gotowe z serwera (widokSpozaWiezy); klient nic nie przelicza.
function panelSpozaWiezy(K, ogon) {
  const bar = !!K.barierowy;
  const male = txt => `<span class="t2" style="display:block">${txt}</span>`;
  // Broń w pełni przebijająca albo magiczna nigdy nie tknie puli — i to jest
  // prawda do napisania wprost, a nie licznik dzielony przez zero.
  const naPancerz = K.ciosowNaPancerz == null
    ? `<span class="v" style="color:var(--brass)">omijasz go</span>`
    : `<span class="v">${nf(K.ciosowNaPancerz)}</span>`;
  return `
    <div class="sec">Jego liczby</div>
    <div class="statgrid">
      <div class="stat-box"><span class="k">Zdrowie</span><span class="v">${nf(K.hp)}</span></div>
      <div class="stat-box"><span class="k">Atak</span><span class="v">${nf(K.damage)}</span></div>
      <div class="stat-box"><span class="k">${bar ? 'Pancerz · pula' : 'Obrona'}</span>
        <span class="v">${nf(bar ? (K.jegoPula ?? 0) : (K.armor ?? 0))}</span></div>
    </div>

    <div class="sec">Ile Ci brakuje</div>
    <div class="ios-list">
      <div class="stat"><span class="k">Twój cios${bar
          ? male(`w pancerz ${nf(K.twojCiosWPule ?? 0)} · w życie ${nf(K.twojCiosWZycie ?? 0)}`) : ''}</span>
        <span class="v">${nf(K.twojCios ?? 0)}</span></div>
      ${bar ? `<div class="stat"><span class="k">Ciosów na zdarcie pancerza</span>${naPancerz}</div>` : ''}
      <div class="stat"><span class="k">Ciosów do jego zabicia</span>
        <span class="v" style="color:var(--blood)">${nf(K.ciosowPotrzeba ?? 0)}</span></div>
      <div class="stat"><span class="k">Jego cios w Ciebie</span>
        <span class="v">${nf(K.jegoCios ?? 0)} ×${K.ataki ?? 2}</span></div>
      <div class="stat"><span class="k">Jego tur do Twojej śmierci${bar
          ? male(`musi zdjąć Twoją pulę ${nf(K.twojaPula ?? 0)} i dopiero życie`) : ''}</span>
        <span class="v" style="color:var(--blood)">${nf(K.ciosowNaCiebie ?? 0)}</span></div>
    </div>
    <div class="t2">${bar
      ? 'Pancerz to druga pula życia — cios najpierw zdziera ją, dopiero nadwyżka sięga zdrowia. '
        + 'Przebicie i magia omijają pulę, Zmiażdżenie łamie ją szybciej. '
      : 'Te liczby są policzone z Twoich statystyk tą samą formułą, co walka. '}${ogon}</div>`;
}

function renderKolos() {
  const K = S.kolos ?? {};
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);

  let h = `<div class="scr-head">
    <button class="lnk" data-act="openbosses">‹ Bossowie Drużynowi</button>
    <span>KOLOS</span></div>`;

  h += `<div class="two-col"><div class="col">
    <div class="kolos-fot">
      <img src="${esc(K.obraz ?? '/img/yeti.png')}" alt="${esc(K.label ?? 'Kolos')}">
      <div class="kolos-nazwa">${esc(K.label ?? 'Kolos')}</div>
    </div>
    <div class="card"><div class="t2">${esc(K.opis ?? '')}</div></div>
    <div class="card bad"><div class="t1">Jak bije</div>
      <div class="t2">${esc(K.ostrzezenie ?? '')}</div></div>
  </div>`;

  h += `<div class="col">
    ${panelSpozaWiezy(K, 'Jeśli ciosów do zabicia jest więcej niż tur, które przeżyjesz — nie ma czego próbować.')}

    <div class="sec">Łup</div>
    <div class="card ${K.pokonany ? '' : 'hi'}">
      <div class="row">
        <div class="icon lg" style="border-color:${rarityColor('legendary')}">🪄</div>
        <div class="grow">
          <div class="t1" style="color:${rarityColor('legendary')}">${esc(K.nagroda?.base ?? 'Różdżka Lodowa')}</div>
          <div class="t2">${esc(K.nagroda?.opis ?? '')}</div>
        </div>
      </div>
      ${K.pokonany
        ? `<div class="t2" style="margin-top:6px;color:var(--brass)">Już ją masz. Kolejne zwycięstwa oddają ${nf(K.zlotoZaPowtorke ?? 0)} zł.</div>`
        : ''}
    </div>

    <div class="card ${hpPct < 40 ? 'bad' : ''}" style="margin-top:8px">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
          <div class="t2">Walka jest turowa. Mikstur: ${S.potions}</div></div>
        <span class="num" style="font-size:17px">${hpPct}%</span>
      </div>
      <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
    </div>

    <button class="btn solid big wide" style="margin-top:10px" data-act="kolos"
      ${K.otwarty ? '' : 'disabled'}>Stań do Kolosa</button>
    <div class="t2" style="margin-top:6px">Przegrana nie kosztuje nic poza zdrowiem —
      nie ma piętra, które można by cofnąć.</div>
  </div></div>`;
  return h;
}

// ---------------------------------------------------------------- TYTAN
// Ten sam ekran co Kolos, inne liczby i boska tarcza w łupie.
function renderTytan() {
  const K = S.tytan ?? {};
  const st = S.stats;
  const hpPct = Math.round(st.hp / st.maxHp * 100);
  const godColor = rarityColor('god');

  let h = `<div class="scr-head">
    <button class="lnk" data-act="openbosses">‹ Bossowie Drużynowi</button>
    <span>TYTAN</span></div>`;

  h += `<div class="two-col"><div class="col">
    <div class="kolos-fot">
      <img src="${esc(K.obraz ?? '/img/tytan.png')}" alt="${esc(K.label ?? 'Tytan')}">
      <div class="kolos-nazwa">${esc(K.label ?? 'Tytan')}</div>
    </div>
    <div class="card"><div class="t2">${esc(K.opis ?? '')}</div></div>
    <div class="card bad"><div class="t1">Jak bije</div>
      <div class="t2">${esc(K.ostrzezenie ?? '')}</div></div>
  </div>`;

  h += `<div class="col">
    ${panelSpozaWiezy(K, 'Tytan jest z założenia poza dzisiejszą skalą — to próba na później.')}

    <div class="sec">Łup</div>
    <div class="card ${K.pokonany ? '' : 'hi'}">
      <div class="row">
        <div class="icon lg" style="border-color:${godColor}">🛡</div>
        <div class="grow">
          <div class="t1" style="color:${godColor}">${esc(K.nagroda?.base ?? 'Aegis Tytana')}</div>
          <div class="t2">${esc(K.nagroda?.opis ?? '')}</div>
        </div>
      </div>
      ${(K.nagroda?.affixes ?? []).length ? `<div class="t2" style="margin-top:6px;color:${godColor}">${
        K.nagroda.affixes.map(a => `+${a.value}${a.pct || a.as ? '%' : ''} ${esc(a.label)}`).join(' · ')
      }</div>` : ''}
      ${K.pokonany
        ? `<div class="t2" style="margin-top:6px;color:var(--brass)">Już ją masz. Kolejne zwycięstwa oddają ${nf(K.zlotoZaPowtorke ?? 0)} zł.</div>`
        : ''}
    </div>

    <div class="card ${hpPct < 40 ? 'bad' : ''}" style="margin-top:8px">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t1">Zdrowie ${nf(st.hp)} / ${nf(st.maxHp)}</div>
          <div class="t2">Walka jest turowa. Mikstur: ${S.potions}</div></div>
        <span class="num" style="font-size:17px">${hpPct}%</span>
      </div>
      <div class="bar hp big"><i style="width:${hpPct}%"></i></div>
    </div>

    <button class="btn solid big wide" style="margin-top:10px" data-act="tytan"
      ${K.otwarty ? '' : 'disabled'}>Stań do Tytana</button>
    <div class="t2" style="margin-top:6px">Przegrana nie kosztuje nic poza zdrowiem —
      na dziś to próba, nie walka do wygrania.</div>
  </div></div>`;
  return h;
}

function renderWyprawa() {
  if (FIGHT) return renderFightView();
  // Trwający run zawsze wygrywa nad hubem — inaczej gracz gubi, gdzie jest.
  if (S.expedition) return renderWyprawaTryb();
  if (advView === 'exp') return renderWyprawaTryb();
  if (advView === 'dungeon') return renderDungeonTryb();
  if (advView === 'bosses') return renderBossowie();
  if (advView === 'kolos') return renderKolos();
  if (advView === 'tytan') return renderTytan();
  return advView === 'wieza' ? renderWieza() : renderHub();
}

function rarityColor(r) { return S.rarities[r]?.color ?? '#888'; }

// PANEL MIKSTUR. Jedno miejsce dla wszystkich ekranów, na których się pije:
// wieża, wyprawa, Kolos. KAŻDA POZYCJA MÓWI, ILE LECZY — sam licznik sztuk
// nie odpowiadał na jedyne pytanie, które gracz zadaje przed kliknięciem.
// Procentowe pokazują i procent, i punkty policzone z TWOJEGO zdrowia.
function miksturyPanel() {
  const st = S.stats;
  const lista = S.mikstury ?? [];
  const ranny = st.hp < st.maxHp;

  if (!lista.length) {
    return `<div class="card"><div class="t2">Nie masz mikstur. Robi je <b>Alchemia</b> —
      dziewięć rodzajów, od 10% zdrowia po 2500 punktów.</div></div>`;
  }
  return `<div class="mikstury">${lista.map(m => `<button class="mikst" data-act="potion" data-id="${m.id}"
      ${ranny ? '' : 'disabled'} title="${esc(m.label)}">
      <span class="ic">🧪</span>
      <span class="grow">
        <span class="nm">${esc(m.label)}</span>
        <span class="ile">+${nf(m.heal)} HP${m.pct ? ` · ${Math.round(m.pct * 100)}%` : ''}</span>
      </span>
      <span class="szt">×${m.count}</span>
    </button>`).join('')}</div>
    ${ranny ? '' : '<div class="t2">Masz pełne zdrowie — nie ma czego leczyć.</div>'}`;
}

// Nazwa przedmiotu z ulepszeniem. Broń może WYPAŚĆ już z plusem, więc bez tego
// gracz nie widziałby różnicy między znaleziskiem +0 a +7 aż do panelu szczegółu.
const nazwaIt = (it) => `${it?.name ?? ''}${it?.plus ? ` +${it.plus}` : ''}`;

function itemRow(it, opts = {}) {
  const rar = S.rarities[it.rarity];
  const eqCheck = opts.equipped ? null : canEquipLocal(it);
  const affix = (it.affixes ?? []).map(a =>
    `${a.label} +${a.value}${a.pct ? '%' : ''}`).join(' · ');
  return `<div class="card row" data-item="${it.id}">
    <div class="icon" style="border-color:${rarityColor(it.rarity)}">${itemIcon(it)}</div>
    <div class="grow">
      <div class="t1" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>
      <div class="t2 num" title="Poziom przedmiotu — tyle pięter trzeba zdobyć, żeby go założyć.">${rar.label} · poz. ${it.ilvl}${it.damage ? ` · atak ${it.damage}` : ''}${it.armor ? ` · obrona ${it.armor}` : ''}</div>
      ${affix ? `<div class="t2">${esc(affix)}</div>` : ''}
      ${eqCheck && !eqCheck.ok ? `<div class="t2" style="color:#D9736B">${esc(eqCheck.reason)}</div>` : ''}
    </div>
    ${opts.equipped ? '' : `<div style="display:flex;flex-direction:column;gap:4px">
      <button class="btn" data-act="equip" data-id="${it.id}" ${eqCheck.ok ? '' : 'disabled'}>Załóż</button>
      <button class="btn ghost" data-act="sell" data-id="${it.id}">Sprzedaj</button></div>`}
  </div>`;
}

const SLOT_ICON = { bron:'🗡', offhand:'🛡', helm:'🪖', napiersnik:'🥋',
                    buty:'👢', rekawice:'🧤', pierscien:'💍', amulet:'📿' };

// Grafiki przedmiotów po NAZWIE BAZY. Dokładane pojedynczo, w miarę jak
// powstają. Przedmiot z własnym `obraz` (np. łup bossa) wygrywa nad mapą.
const ITEM_IMG = {
  'Zbroja Runiczna': '/img/zbroja-runiczna.png',
  'Aegis Tytana': '/img/tarcza-boska.png',
};
// Wnętrze ikony przedmiotu: obrazek, jeśli jest; inaczej emoji slotu.
function itemIcon(it) {
  const src = it?.obraz ?? ITEM_IMG[it?.base];
  return src ? `<img src="${esc(src)}" alt="">` : (SLOT_ICON[it?.slot] ?? '▪');
}

// Jedna bramka: poziom postaci. Serwer sprawdza to samo w canEquip().
function canEquipLocal(it) {
  return it.reqLevel > S.poziom
    ? { ok: false, reason: `Wymaga poziomu ${it.reqLevel} — masz ${S.poziom}` }
    : { ok: true };
}

const ATTR_LABEL = { sila: 'Siła', precyzja: 'Precyzja', intelekt: 'Intelekt',
  zrecznosc: 'Zręczność', szczescie: 'Szczęście', witalnosc: 'Witalność' };
// Warstwa uniwersalna działa u każdego; obrażenia tylko z atrybutu swojej klasy.
// Opisy mówią prawdę o TYM buildzie: gracz nie ma klasy, więc o obrażenia
// decyduje RODZINA TRZYMANEJ BRONI. Atrybut spoza niej liczy się słabiej
// (character.offAttrWeight), ale nigdy nie jest martwy.
const ATTR_DESC = {
  sila: 'obrażenia bronią białą i dwuręczną',
  precyzja: 'obrażenia bronią dystansową · celność',
  intelekt: 'obrażenia magiczne i czary · mana',
  zrecznosc: 'Attack Speed · unik',
  szczescie: 'szansa na trafienie krytyczne',
  witalnosc: 'zdrowie · regeneracja HP w walce',
};

// Makieta postaci przeniosła się do zakładki Ekwipunek — tam, gdzie gracz
// jej szuka. Postać zostaje kartą liczb: atrybuty, zasoby, drzewko, kod.

// ---------------------------------------------------------------- KARTA GRACZA
// Górny pasek prowadzi tutaj i to jest jego cała treść: kim jesteś, od kiedy,
// z jakiej gildii — i ustawienia gry. Rozwój postaci zszedł stąd z powrotem
// na dolny pasek, do zakładki Skille.

let profilView = 'karta';     // 'karta' | 'herb'
let herbSzkic = null;         // herb w trakcie edycji; null = nie edytujemy
let bioSzkic = null;          // treść opisu między renderami (input nie przeżywa innerHTML)

const dataPl = (ms) => (ms
  ? new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  : 'nie wiadomo');
const dniOd = (ms) => (ms ? Math.max(0, Math.floor((Date.now() - ms) / 86400000)) : 0);

function renderPostac() {
  if (profilView === 'herb') return renderHerb();

  const st = S.stats;
  const ui = S.ui ?? { themes: [], quality: [], bioMax: 140 };
  const bio = bioSzkic ?? S.bio ?? '';

  let h = `<div class="scr-head">
    <button class="lnk" data-act="tab" data-tab="wyprawa">‹ Przygody</button>
    <span>KARTA GRACZA</span></div>`;

  h += `<div class="two-col">`;

  // ---- lewa kolumna: kim jesteś ----
  h += `<div class="col">
    <div class="card profil">
      <button class="profil-crest" data-act="herbedit" title="Kliknij, żeby zmienić herb">
        ${heroCrest(74)}<span class="edytuj">zmień</span>
      </button>
      <div class="profil-kto">
        <div class="nm">${esc(S.name)}</div>
        <div class="t2">Bohater · poziom ${S.poziom} · moc ${nf(st.power)}</div>
        <div class="odznaki">
          <span class="badge ${S.guild ? 'on' : ''}">${S.guild ? esc(S.guild) : 'BEZ GILDII'}</span>
          <span class="badge">${esc(S.actName)}</span>
        </div>
      </div>
    </div>

    <div class="ios-list">
      <div class="stat"><span class="k">Konto założone</span><span class="v">${esc(dataPl(S.createdAt))}</span></div>
      <div class="stat"><span class="k">Dni w wieży</span><span class="v">${dniOd(S.createdAt)}</span></div>
      <div class="stat"><span class="k">Najwyższe piętro</span><span class="v">${S.maxFloor}</span></div>
      <div class="stat"><span class="k">Gildia</span><span class="v mut">${S.guild ? esc(S.guild) : 'gildii jeszcze nie ma w grze'}</span></div>
      <div class="stat"><span class="k">Złoto</span><span class="v" style="color:var(--brass)">${nf(S.gold)}</span></div>
      <div class="stat"><span class="k">Klucze Przywołania</span><span class="v">${S.keys ?? 0}</span></div>
    </div>

    <div class="sec">Ranking · zdobyta wieża${S.ranking?.ilu ? ` · ${S.ranking.ilu} graczy` : ''}</div>
    ${podiumHtml(S.ranking?.pietro, KORONA, ' p.', S.mojeMiejsce?.pietro, S.maxFloor)}

    <div class="sec">Ranking · moc</div>
    ${podiumHtml(S.ranking?.moc, HELM, '', S.mojeMiejsce?.moc, st.power)}

    <div class="sec">O sobie</div>
    <textarea id="bio" maxlength="${ui.bioMax}" rows="3"
      placeholder="Jedno zdanie o Twojej postaci.">${esc(bio)}</textarea>
    <div class="row" style="margin-top:6px">
      <div class="t2 grow" id="biolicznik">${bio.length} / ${ui.bioMax}</div>
      <button class="btn" data-act="biozapisz">Zapisz opis</button>
    </div>

    <div class="sec">Rozwój</div>
    <div class="ios-list">
      <button class="ios-row" data-act="skillgo" data-t="atrybuty">
        <span class="ic">✥</span>
        <span class="grow"><span class="t1">Atrybuty</span>
          <span class="t2">Reszta rozwoju siedzi w zakładce Skille</span></span>
        ${S.unspentAttr ? `<span class="pill">${S.unspentAttr}</span>` : ''}
        <span class="chev">›</span>
      </button>
    </div>
  </div>`;

  // ---- prawa kolumna: ustawienia i sprawy administracyjne ----
  h += `<div class="col">
    <div class="sec">${t('Język')}</div>
    <div class="segs">
      ${(ui.langs ?? []).map(l => `<button data-act="jezyk" data-l="${l.id}"
        aria-selected="${(UST.lang ?? 'pl') === l.id}">${l.ic} ${esc(l.label)}</button>`).join('')}
    </div>

    <div class="sec">${t('Motyw')}</div>
    <div class="motywy">
      ${(ui.themes ?? []).map(mt => `<button class="motyw ${UST.theme === mt.id ? 'on' : ''}"
        data-theme="${mt.id}" data-act="motyw" data-t="${mt.id}" title="${esc(mt.opis)}">
        <span class="pas"><i class="c1"></i><i class="c2"></i><i class="c3"></i></span>
        <span class="nm">${esc(mt.label)}</span>
      </button>`).join('')}
    </div>

    <div class="sec">Jakość</div>
    <div class="segs">
      ${(ui.quality ?? []).map(q => `<button data-act="jakosc" data-q="${q.id}"
        aria-selected="${UST.quality === q.id}" title="${esc(q.opis)}">${esc(q.label)}</button>`).join('')}
    </div>

    <div class="sec">Dźwięk</div>
    <div class="ios-list">
      <button class="ios-row" data-act="dzwiek">
        <span class="ic">${UST.sound ? '🔊' : '🔇'}</span>
        <span class="grow"><span class="t1">Dźwięki walki</span>
          <span class="t2">Cios, kryt, leczenie, koniec walki</span></span>
        <span class="badge ${UST.sound ? 'ok' : 'no'}">${UST.sound ? 'WŁĄCZONE' : 'WYŁĄCZONE'}</span>
      </button>
      <div class="ios-row suwak">
        <span class="ic">🎚</span>
        <span class="grow"><span class="t1">Głośność</span></span>
        <input type="range" id="glosnosc" min="0" max="100" step="5"
          value="${Math.round((UST.volume ?? 0.5) * 100)}" ${UST.sound ? '' : 'disabled'}>
      </div>
      <button class="ios-row" data-act="fullscreen">
        <span class="ic">⛶</span>
        <span class="grow"><span class="t1">Pełny ekran</span>
          <span class="t2">Chowa pasek przeglądarki</span></span>
        <span class="chev">›</span>
      </button>
    </div>

    <div class="sec">Statystyki</div>
    ${statyPelne(st)}

    <div class="sec">Kod postaci</div>
    <div class="code-box" id="mycode">${esc(TOKEN ?? '')}</div>
    <div class="actions">
      <button class="btn" data-act="copycode">Kopiuj</button>
      <button class="btn ghost" data-act="logout">Zmień postać</button>
    </div>
    <div class="t2" style="margin-top:6px">Kto ma ten kod, ma Twoją postać. Zmiana postaci jej nie kasuje.</div>
  </div>`;

  h += `</div>`;
  return h;
}

// Edycja herbu bez wracania na ekran startowy. Ten sam generator, ta sama paleta —
// tylko podgląd rysuje się z brudnopisu, więc „Anuluj" naprawdę anuluje.
function renderHerb() {
  const c = herbSzkic ?? S.crest;
  const inkCol = (COLORS[c.ink] ?? COLORS.smola).base;
  const fillCol = (COLORS[c.color] ?? COLORS.mosiadz).base;

  const paleta = (klucz) => Object.entries(COLORS).map(([k, v]) =>
    `<button class="${c[klucz] === k ? 'on' : ''}" data-act="herbset" data-k="${klucz}" data-v="${k}"
      title="${esc(v.label)}"><i style="background:${v.base}"></i></button>`).join('');

  let h = `<div class="scr-head">
    <button class="lnk" data-act="herbstop" data-zapisz="0">‹ Karta gracza</button>
    <span>HERB</span></div>`;

  h += `<div class="two-col">
    <div class="col">
      <div class="herb-podglad">${crestSvg(c, 118)}</div>
      <div class="actions">
        <button class="btn solid" data-act="herbstop" data-zapisz="1">Zapisz herb</button>
        <button class="btn ghost" data-act="herbstop" data-zapisz="0">Anuluj</button>
      </div>
      <button class="btn wide ghost" data-act="herblos" style="margin-top:8px">Losuj</button>
    </div>
    <div class="col">
      <div class="sec">Kształt</div>
      <div class="picker">${Object.entries(SHAPES).map(([k, v]) =>
        `<button class="${c.shape === k ? 'on' : ''}" data-act="herbset" data-k="shape" data-v="${k}"
          title="${esc(v.label)}">${crestSvg({ ...c, shape: k }, 34)}</button>`).join('')}</div>

      <div class="sec">Symbol</div>
      <div class="picker">${Object.entries(SYMBOLS).map(([k, v]) =>
        `<button class="${c.symbol === k ? 'on' : ''}" data-act="herbset" data-k="symbol" data-v="${k}"
          title="${esc(v.label)}" style="background:${fillCol}">
          <span class="glyph" style="color:${inkCol}">${v.g}</span></button>`).join('')}</div>

      <div class="sec">Kolor środka</div><div class="picker colors">${paleta('color')}</div>
      <div class="sec">Kolor obramowania</div><div class="picker colors">${paleta('border')}</div>
      <div class="sec">Kolor symbolu</div><div class="picker colors">${paleta('ink')}</div>
    </div>
  </div>`;
  return h;
}

// Drzewko punktowe zeszło z UI. Liczby, reguły odblokowania i respec siedzą
// nietknięte w game/config.js i game/character.js — jeśli wróci, kod czeka gotowy.

// ---------------------------------------------------------------- SKILLE BOJOWE
// PIĘĆ RODZIN BRONI, KAŻDA Z WŁASNYM DRZEWKIEM. Rodzina broni JEST skillem:
// bijesz toporem — rośnie Broń dwuręczna. Każdy poziom daje jeden punkt
// w drzewku TEGO skilla i nic poza tym; premii „za sam poziom" nie ma.
//
// Kostur jest dwuręczny, ale należy do Przyrządów magicznych — dwuręczność
// to liczba rąk, nie rodzina.

const UDZIAL_OPIS = { 1: '100% expa', 0.5: '50% expa', 0: 'nic nie dostaje' };

let skillOtwarty = null;      // które drzewko jest rozwinięte

function sekcjaBojowe() {
  const lista = S.cskills ?? [];
  const bron = S.equipped?.bron;
  const off = S.equipped?.offhand;
  const rodziny = S.weaponTypes ?? {};

  let h = '';

  // Skąd bierze się podział — najważniejsza informacja na tym ekranie.
  const czynna = lista.find(s => s.id !== 'obrona' && s.udzial > 0);
  const rece = !bron
    ? 'Gołe pięści — exp idzie w Broń jednoręczną.'
    : off?.wtype === 'tarcza'
      ? `${bron.name} i tarcza — exp dzieli się po połowie między ${czynna?.label ?? 'broń'} i Ekwipunek defensywny.`
      : `${bron.name} — cały exp idzie w ${czynna?.label ?? 'jej rodzinę'}.`;

  // Wyjaśnienie zjadało całą kartę na górze listy, a czyta się je RAZ.
  // Schodzi pod „i” obok nagłówka sekcji — tak jak składniki w profesjach.
  h += `<div class="sec sec-z-info">Skille bojowe ${chmurka('Skąd bierze się exp:', [
    esc(rece),
    '<b>Ekwipunek defensywny</b> rośnie zawsze, z samego udziału w walce.',
    '<b>Kostur jest dwuręczny, ale expi Przyrządy magiczne</b> — dwuręczność to liczba rąk, nie rodzina.',
  ], 'Skąd bierze się exp')}</div>`;

  h += `<div class="scrollbox">`;
  for (const s of lista) {
    const pct = Math.round(s.xp / s.need * 100);
    const otwarty = skillOtwarty === s.id;
    const bronie = rodziny[s.id]?.names;

    h += `<button class="card ${s.aktywny ? '' : 'off'} cskill" data-act="cskillopen" data-id="${s.id}">
      <div class="row" style="margin-bottom:6px">
        <div class="icon">${s.ic}</div>
        <div class="grow">
          <div class="t1">${esc(s.label)}
            <span class="num" style="color:var(--brass)">Lv. ${s.lvl}</span></div>
          <div class="t2">${esc(bronie ? bronie.join(' · ') : s.opis)}</div>
        </div>
        ${s.wolne ? `<span class="pill">${s.wolne}</span>` : ''}
        <span class="badge ${s.udzial ? 'on' : ''}">${UDZIAL_OPIS[s.udzial] ?? Math.round(s.udzial * 100) + '%'}</span>
      </div>
      <div class="bar xp"><i style="width:${pct}%"></i></div>
      <div class="t2 num" style="margin-top:4px">${s.xp} / ${s.need} exp ·
        punkty ${s.punkty - s.wolne} z ${s.punkty}${s.aktywny ? '' : ' · nieaktywny, nie trzymasz tej broni'}</div>
    </button>`;

    // ---- DRZEWKO ----
    // Rozwija się pod skillem, którego dotyczy. Węzeł rodziny broni działa
    // TYLKO z tą bronią w ręce — punkty w Toporach nie pomagają łucznikowi.
    if (!otwarty) continue;
    for (const n of s.wezly ?? []) {
      const max = n.ranga >= s.rangaMax;
      h += `<div class="card sub row">
        <div class="grow">
          <div class="t1">${esc(n.label)}
            <span class="num" style="color:var(--brass)">${n.ranga} / ${s.rangaMax}</span></div>
          <div class="t2">${esc(n.opis)}</div>
          <div class="t2" style="color:var(--brass)">${esc(n.efekt)}</div>
        </div>
        <button class="btn" data-act="cskillup" data-node="${n.id}"
          ${s.wolne && !max ? '' : 'disabled'}>+</button>
      </div>`;
    }
    if (s.punkty)
      h += `<button class="btn ghost wide" data-act="cskillreset" data-skill="${s.id}"
        style="margin-bottom:8px">Wyzeruj drzewko — punkty wracają za darmo</button>`;
  }

  // ---- RUNA I ZAKLĘCIA ----
  // Runę wykuwasz w RuneCraftingu, podpinasz tutaj, a poziom Magii decyduje,
  // jak daleko w jej żywiole sięgasz.
  h += `<div class="sec">Runa magii</div>`;
  const mam = Object.fromEntries((S.materials ?? []).map(m => [m.id, m.count]));
  const nazwy = S.matNames ?? {};
  const dostepne = Object.keys(S.runy ?? {}).filter(id => (mam[id] ?? 0) > 0);

  h += `<div class="card ${S.runa ? 'hi' : ''}">
    <div class="row"><div class="grow">
      <div class="t1">${S.runa ? esc(nazwy[S.runa] ?? S.runa) : 'Brak podpiętej runy'}</div>
      <div class="t2">${S.runa
        ? `Magia ${S.magiaLvl} — decyduje, które zaklęcia tej runy umiesz`
        : 'Wykuj runę w RuneCraftingu i podepnij ją tutaj, żeby rzucać czary'}</div>
    </div>${S.runa ? `<button class="btn ghost" data-act="runa" data-id="">Odepnij</button>` : ''}</div>
  </div>`;

  if (!dostepne.length && !S.runa) {
    h += `<div class="card"><div class="t2">Nie masz jeszcze żadnej runy.
      Kop <b>Esencję</b> i <b>kryształy żywiołów</b> w Górnictwie, potem połącz je w Runach.</div></div>`;
  }

  for (const id of dostepne) {
    const lista = S.runy[id] ?? [];
    const podpieta = S.runa === id;
    h += `<button class="card row compact ${podpieta ? 'hi' : ''}" data-act="runa" data-id="${id}">
      <div class="icon">${podpieta ? '✦' : '·'}</div>
      <div class="grow">
        <div class="t1">${esc(nazwy[id] ?? id)} <span class="num">×${mam[id]}</span></div>
        <div class="t2">${lista.map(z => `${z.label} (Magia ${z.magia})`).join(' · ')}</div>
      </div>
      <span class="badge ${podpieta ? 'on' : ''}">${podpieta ? 'PODPIĘTA' : 'PODEPNIJ'}</span>
    </button>`;
  }

  if (S.runa) {
    const lista = S.runy?.[S.runa] ?? [];
    h += `<div class="sec">Zaklęcia tej runy</div>`;
    for (const z of lista) {
      const umiesz = S.magiaLvl >= z.magia;
      h += `<div class="card compact ${umiesz ? '' : 'locked'}">
        <div class="row"><div class="grow">
          <div class="t1">${esc(z.label)}</div>
          <div class="t2">${umiesz ? esc(z.desc) : `Wymaga Magii ${z.magia} — masz ${S.magiaLvl}`}</div>
        </div><span class="badge ${umiesz ? 'on' : ''}">${umiesz ? 'UMIESZ' : `Lv.${z.magia}`}</span></div>
      </div>`;
    }
  }

  h += `<div class="card" style="margin-top:8px"><div class="t2">
    Skille <b>nie bramkują sprzętu</b> — jedyną bramką zostaje poziom postaci.
    Dają wyłącznie bonusy, więc noszenie czegoś nowego nigdy nie jest zablokowane.</div></div>`;
  h += `</div>`;

  return h;
}

// ---------------------------------------------------------------- EKWIPUNEK
// Ekran ma się mieścić na jednym ekranie: makieta postaci i statystyki obok
// siebie u góry, plecak z kategoriami niżej. Scrolluje się WYŁĄCZNIE lista
// przedmiotów, bo tylko ona rośnie bez końca.

// Makieta 3×3 z portretem w środku. Głowa u góry, bronie po bokach,
// pancerz pod spodem, dodatki w rogach — czyta się bez legendy.
// Napierśnik stoi w środku — tam, gdzie w każdym RPG stoi tors. Portret zniknął,
// bo zjadał najlepsze miejsce na ekranie i niczego nie mówił.
const DOLL_GRID = [
  ['rekawice', 'helm',       'amulet'],
  ['bron',     'napiersnik', 'offhand'],
  ['pierscien','buty',       null],
];
const SKILL_DOLL_GRID = [
  ['gloves', 'helmet', 'chest'],
  ['pickaxe', null, 'legs'],
  [null, 'boots', null],
];
const SKILL_SLOT_ICON = {
  helmet: '🪖', chest: '🥋', gloves: '🧤', legs: '👖', boots: '👢', pickaxe: '⛏',
};

// Filtr plecaka. 'all' | 'mat' | id slotu ('bron', 'helm', ...).
// SLOT WYBIERA SIĘ KLIKNIĘCIEM W MAKIETĘ, nie z listy na dole — dawny rząd
// kategorii został po nim tylko jako „Wszystko" i „Surowce".
let invCat = 'all';
let detail = null;         // { id, where: 'bag' | 'worn' | 'slot' }
let wearCache = {};        // id → { before, after } realnych statów po założeniu

// Realny wpływ przedmiotu na staty bojowe: Atak/HP/Pancerz/Moc przed → po.
// Liczone serwerowo tym samym computeStats co walka — gracz widzi PRAWDĘ,
// nie surowe afiksy, których nie umie przełożyć na obrażenia.
function wearSummaryHtml(id) {
  const p = wearCache[id];
  if (!p) return '<div class="t2">Liczę wpływ na staty…</div>';
  const b = p.before, a = p.after;
  const as = v => (v ?? 0).toFixed(2);
  const pct = v => `${Math.round((v ?? 0) * 100)}%`;
  const line = (label, bv, av, fmt = nf) => {
    const d = av - bv;
    if (Math.abs(d) < 0.0001) return '';
    return `<div class="stat"><span class="k">${label}</span>
      <span class="v">${fmt(bv)} → <b>${fmt(av)}</b>
      <b class="${d > 0 ? 'up' : 'down'}">(${d > 0 ? '+' : ''}${fmt(d)})</b></span></div>`;
  };
  const rows = [
    line('Atak', b.damage, a.damage),
    line('Maks. HP', b.maxHp, a.maxHp),
    line(S.armorModel === 'barrier' ? 'Pancerz (pula)' : 'Pancerz',
      b.armorPool ?? b.armor, a.armorPool ?? a.armor),
    line('Attack Speed', b.attackSpeed, a.attackSpeed, as),
    line('Blok', b.block, a.block, pct),
    line('Moc', b.power, a.power),
  ].filter(Boolean).join('');
  return rows
    ? `<div class="sec">Po założeniu — Twoje realne staty</div>${rows}`
    : '<div class="t2">Po założeniu: bez zmian w statystykach bojowych.</div>';
}
let equipmentMode = 'pve_a'; // 'pve_a' | 'pve_b' | 'pvp' | 'skill'

const activeCombatEquipment = () => equipmentMode === 'pvp' ? (S.pvpEquipment ?? {})
  : equipmentMode === 'pve_b' ? (S.pveEquipment?.b ?? {}) : (S.pveEquipment?.a ?? S.equipped);
const activeCombatStats = () => equipmentMode === 'pvp' ? (S.pvpStats ?? S.stats)
  : equipmentMode === 'pve_b' ? (S.pveStats?.b ?? S.stats) : (S.pveStats?.a ?? S.stats);
const activeCombatHands = () => equipmentMode === 'pvp' ? (S.pvpHands ?? {})
  : equipmentMode === 'pve_b' ? (S.pveHands?.b ?? {}) : (S.pveHands?.a ?? S.hands);

function dollHtml() {
  const gear = activeCombatEquipment();
  const stats = activeCombatStats();
  const hands = activeCombatHands();
  const cell = (slot) => {
    // Wolna komórka niesie Moc — jedną liczbę na porównanie buildów.
    if (!slot) {
      return `<div class="doll-power" title="Atak, zdrowie i pancerz w jednej liczbie">
        <span class="k">MOC</span><span class="v">${nf(stats.power)}</span></div>`;
    }
    const it = gear[slot];
    const wybrany = detail?.where === 'worn' && detail.slot === slot;
    // Dwuręczna blokuje drugą rękę — trzeba to widać, zanim gracz kliknie.
    const zablokowany = slot === 'offhand' && hands?.offBlocked;
    const tip = zablokowany
      ? 'Zajęte przez broń dwuręczną'
      : (it ? `${nazwaIt(it)} — ${S.rarities[it.rarity]?.label}` : S.slots[slot].label);
    return `<button class="doll-cell${it ? '' : ' empty'}${wybrany ? ' on' : ''}${zablokowany ? ' blocked' : ''}"
      data-act="slot" data-slot="${slot}" title="${esc(tip)}"
      style="${it ? `border-color:${rarityColor(it.rarity)}` : ''}">
      <span class="ic">${zablokowany ? '⛓' : (SLOT_ICON[slot] ?? '▪')}</span>
      <span class="lb">${zablokowany ? 'zajęte'
        : (it ? esc(it.name.split(' ')[0] + (it.plus ? ` +${it.plus}` : '')) : esc(S.slots[slot].label))}</span>
      ${it && it.hands === 2 ? '<span class="tag2h">2H</span>' : ''}
    </button>`;
  };
  return `<div class="doll">${DOLL_GRID.flat().map(cell).join('')}</div>`;
}

// Statystyki główne. Sześć liczb, które naprawdę o czymś mówią — reszta
// siedzi w podpowiedziach, żeby nie zasypać ekranu.
// Trzy statystyki są główne (Zdrowie, Atak, Moc) — reszta ma klasę `opcjonalna`
// i znika, gdy gracz podciągnie plecak do góry. Nic się wtedy nie chowa pod
// krawędzią: po prostu przestaje być rysowane.
function statsHtml() {
  const st = activeCombatStats();
  const w = (k, v, tip, glowna = false) => `<div class="stat-box ${glowna ? '' : 'opcjonalna'}" title="${esc(tip)}">
    <span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<div class="statgrid" id="eqstats">
    ${w('Zdrowie', `${nf(st.hp)}/${nf(st.maxHp)}`, 'Wieża nie leczy między falami. Wyprawa oddaje 8% maksymalnego HP po zwycięstwie.', true)}
    ${w('Atak', nf(st.damage), 'Obrażenia z jednego ciosu, przed pancerzem wroga. Rosną z Siły, Intelektu i Zręczności.', true)}
    ${w('Typ ataku', `${typObrazen(st.damageType).ic} ${typObrazen(st.damageType).label}`, 'Rodzaj obrażeń decyduje, jak działają odporności przeciwnika.')}
    ${S.armorModel === 'barrier'
      ? w('Pancerz (pula)', nf(st.armorPool ?? st.armor), 'Druga pula życia. Cios najpierw zbija pancerz — dopiero po jego przebiciu sięga HP. Przebicie omija, Zmiażdżenie łamie szybciej. Wraca co walkę.')
      : w('Obrona', nf(st.armor), 'Pancerz. Zbija otrzymywane obrażenia — im więcej, tym mniejszy każdy cios.')}
    ${w('Kryt', `${(st.crit * 100).toFixed(1)}% ×${st.critMult.toFixed(2)}`, 'Szansa na trafienie krytyczne i jego mnożnik.')}
    ${w('Attack Speed', (st.attackSpeed ?? st.speed / 20).toFixed(2),
      'Ile ciosów na sekundę. Ta sama skala u Ciebie, sojuszników, petów i mobów — widać wprost, kto uderzy ile razy. Rośnie ze Zręczności i z afiksu Attack Speed.')}
    ${w('Moc', nf(st.power), 'Jedna liczba na porównanie buildów: atak, zdrowie i pancerz razem.', true)}
    ${w('Celność', `${Math.round(st.accuracy * 100)}%`, 'Szansa, że cios trafi. Pudło to stracona tura.')}
    ${w('Unik', `${(st.evasion * 100).toFixed(1)}%`, 'Szansa, że cios wroga Cię minie.')}
    ${st.block ? w('Blok', `${Math.round(st.block * 100)}%`, 'Wymaga tarczy w drugiej ręce. Zablokowany cios traci połowę obrażeń.') : ''}
  </div>`;
}

// Rozbicie ataku i HP tym samym wzorem, co liczy walka. Ma pokazać graczowi
// SKĄD bierze się liczba — bez drugiej matematyki, bez chowania niczego.
function breakdownHtml() {
  const st = activeCombatStats();
  const b = st.breakdown;
  if (!b) return '';
  const attr = STAT_NAZWA[b.glownyAttr] ?? b.glownyAttr;
  const d = b.dmg, hp = b.hp;
  const linia = (k, v) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const suma = (k, v) => `<div class="stat"><span class="k"><b>${k}</b></span><span class="v" style="color:var(--brass)"><b>${v}</b></span></div>`;
  return `<div class="card" style="margin-top:8px">
    <button class="fight-fold grow" data-act="atakbreak" aria-expanded="${atakBreakdownOpen}">
      <span><b>Skąd bierze się Twój atak</b><small>${attr} niesie Twoje obrażenia (broń w ręce o tym decyduje)</small></span>
      <i>${atakBreakdownOpen ? '▲' : '▼'}</i></button>
    ${atakBreakdownOpen ? `<div style="margin-top:6px">
      <div class="sec">Atak</div>
      ${linia('Płaskie obrażenia (baza + broń + afiksy)', nf(d.plaskie))}
      ${linia(`× mnożnik z atrybutów (${nf(b.mainAttr)} ÷ ${b.divisor})`, `×${d.attrMult.toFixed(2)}`)}
      ${d.bonusMult > 1.001 ? linia('× bonusy (drzewko, jedzenie)', `×${d.bonusMult.toFixed(2)}`) : ''}
      ${suma('Atak na cios', nf(d.final))}
      <div class="t2" style="margin-top:5px">Główny atrybut liczy się w pełni, pozostałe ×${b.offAttrWeight}.
        Pancerz wroga zbija ten cios dopiero w walce — dlatego na tarczy widzisz pełną liczbę.</div>
      <div class="sec">Zdrowie</div>
      ${linia('Baza', nf(hp.baza))}
      ${linia('Z Wytrzymałości', `+${nf(hp.zWytrzymalosci)}`)}
      ${linia('Z poziomu (zdobyte piętro)', `+${nf(hp.zPoziomu)}`)}
      ${hp.zAfiksow ? linia('Z afiksów', `+${nf(hp.zAfiksow)}`) : ''}
      ${hp.bonusMult > 1.001 ? linia('× bonusy', `×${hp.bonusMult.toFixed(2)}`) : ''}
      ${suma('Maks. zdrowie', nf(hp.final))}
    </div>` : ''}
  </div>`;
}

// Ile dana statystyka wynosi z przedmiotu — do porównania z noszonym.
function itemStats(it) {
  const s = { dmg: it?.damage ?? 0, arm: it?.armor ?? 0 };
  for (const a of it?.affixes ?? []) {
    if (a.id === 'dmgFlat') s.dmg += a.value;
    else if (a.id === 'armorFlat') s.arm += a.value;
    else s[a.id] = (s[a.id] ?? 0) + a.value;
  }
  return s;
}

const STAT_NAZWA = {
  dmg: 'Atak', arm: 'Obrona', sila: 'Siła', precyzja: 'Precyzja', intelekt: 'Intelekt',
  zrecznosc: 'Zręczność', szczescie: 'Szczęście', witalnosc: 'Witalność',
  wytrzymalosc: 'Wytrzymałość', wszystkie: 'Wszystkie staty',
  hpFlat: 'Zdrowie', critChance: 'Szansa na kryt', critPower: 'Siła kryta',
  speed: 'Prędkość', accuracy: 'Celność', evasion: 'Unik', attackSpeed: 'Attack Speed',
  resistSlash: 'Odporność Slash', resistSmash: 'Odporność Smash',
  resistPierce: 'Odporność Pierce', resistMagic: 'Odporność na magię',
};
const STAT_PCT = new Set(['critChance', 'critPower', 'accuracy', 'evasion',
  'resistSlash', 'resistSmash', 'resistPierce', 'resistMagic']);
// Attack Speed trzymany jest w SETNYCH AS — pokazujemy go jako ludzkie 0,35.
const STAT_AS = new Set(['attackSpeed']);
const wartoscStatu = (k, v) => (STAT_AS.has(k)
  ? (v / 100).toFixed(2).replace('.', ',') + ' AS'
  : `${v}${STAT_PCT.has(k) ? '%' : ''}`);

// Mirror weaponDamageSplit z content.js (display-only). Główny + poboczny typ.
function bronPodzial(it) {
  const nazwa = String(it?.base ?? it?.name ?? '').toLocaleLowerCase('pl');
  const wt = it?.wtype;
  if (wt === 'magiczne' || wt === 'magia' || /różdżk|rozdzk|kostur|orb|księg|ksieg|staff|berło|berlo/.test(nazwa)) return { magic: 1 };
  if (/młot|mlot|maczug|buława|bulawa|obuch|kastet/.test(nazwa)) return { smash: 1 };
  if (/sztylet|rapier|szpad/.test(nazwa)) return { pierce: 1 };
  if (/łuk|luk|kusz/.test(nazwa)) return { pierce: 1 };
  if (/oszczep|włócz|wlocz|javelin/.test(nazwa)) return { pierce: 0.9, slash: 0.1 };
  if (/scimitar/.test(nazwa)) return { slash: 1 };
  if (/topór|topor/.test(nazwa)) return { slash: 1 };
  if (/dwuręczn|dwureczn|wielki miecz|greatsword/.test(nazwa)) return { slash: 1 };
  if (/miecz|ostrze/.test(nazwa)) return { slash: 0.8, pierce: 0.2 };
  if (wt === 'dystansowe') return { pierce: 1 };
  if (wt === 'dwureczna') return { slash: 1 };
  return { slash: 1 };
}
function typBroni(it) {
  return Object.entries(bronPodzial(it)).sort((a, b) => b[1] - a[1])[0][0];
}
// „⚔ Cięcie 80% · ➶ Przebicie 20%" — tożsamość broni w jednym wierszu.
function bronPodzialTekst(it) {
  return Object.entries(bronPodzial(it)).sort((a, b) => b[1] - a[1])
    .map(([t, w]) => `${typObrazen(t).ic} ${typObrazen(t).pl} ${Math.round(w * 100)}%`).join(' · ');
}

// Panel szczegółu: nazwa, rzadkość, typ, slot, RÓŻNICA wobec noszonego, opis.
function detailHtml() {
  if (!detail) return '';
  const gear = activeCombatEquipment();
  const hands = activeCombatHands();
  const it = detail.where === 'worn'
    ? gear[detail.slot]
    : S.backpack.find(x => x.id === detail.id);

  if (!it) {
    const slot = detail.slot;
    return `<div class="compact-detail"><div class="t1">${esc(S.slots[slot]?.label ?? 'Pusty slot')}</div>
      <div class="t2">Brak założonego przedmiotu. Wybierz pasujący przedmiot z plecaka.</div></div>`;
  }

  const rar = S.rarities[it.rarity] ?? { label: it.rarity };
  const worn = detail.where === 'bag' ? (gear[it.slot] ?? null) : null;
  const now = itemStats(it), old = itemStats(worn);
  const keys = [...new Set([...Object.keys(old), ...Object.keys(now)])]
    .filter(k => (old[k] ?? 0) || (now[k] ?? 0));
  const val = (k, n) => n ? wartoscStatu(k, n) : '—';
  const rows = keys.map(k => {
    const d = (now[k] ?? 0) - (old[k] ?? 0);
    return `<div class="cmp-row">
      <span class="cmp-stat">${esc(STAT_NAZWA[k] ?? k)}</span>
      ${worn ? `<span>${val(k, old[k] ?? 0)}</span>` : ''}
      <span>${val(k, now[k] ?? 0)}</span>
      ${worn ? `<b class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d ? `${d > 0 ? '+' : ''}${wartoscStatu(k, d)}` : '—'}</b>` : ''}
    </div>`;
  }).join('');
  const check = canEquipLocal(it);

  return `<div class="compact-detail">
    <div class="d-head compact">
      <div class="icon" style="border-color:${rarityColor(it.rarity)}">${itemIcon(it)}</div>
      <div class="grow"><div class="t1" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>
        <div class="t2">${esc(rar.label)} · ${esc(S.slots[it.slot]?.label ?? it.slot)} · poz. ${it.ilvl}${it.hands === 2 ? ' · 2H' : ''}</div></div>
    </div>
    ${it.slot === 'bron' ? `<div class="detail-meta"><span>${bronPodzialTekst(it)}</span></div>` : ''}
    ${(it.source || it.quality) ? `<div class="detail-meta">${it.source ? `<span>${it.source === 'boss_crafted' ? 'Receptura bossa' : 'Kowalstwo'}</span>` : ''}
      ${it.quality ? `<span>${esc(S.smithing?.qualities?.[it.quality]?.label ?? it.quality)} ×${Number(it.qualityMult ?? 1).toFixed(2)}</span>` : ''}</div>` : ''}
    ${rows ? `<div class="cmp-head ${worn ? '' : 'single'}"><span>Statystyka</span>${worn ? '<span>Nosisz</span>' : ''}<span>${worn ? 'Nowy' : 'Wartość'}</span>${worn ? '<span>Różnica</span>' : ''}</div>
      <div class="cmp-table ${worn ? '' : 'single'}">${rows}</div>` : '<div class="t2">Ten przedmiot nie ma statystyk bojowych.</div>'}
    ${worn ? `<div class="cmp-names"><span>${esc(nazwaIt(worn))}</span><span>→</span><span>${esc(nazwaIt(it))}</span></div>` : ''}
    ${detail.where === 'bag' ? wearSummaryHtml(it.id) : ''}
    ${detail.where === 'bag' && it.slot === 'bron' && it.hands === 2 && gear.offhand
      ? `<div class="compact-warn">Założenie zdejmie ${esc(gear.offhand.name)}.</div>` : ''}
    ${detail.where === 'bag' && it.slot === 'offhand' && hands?.offBlocked
      ? '<div class="compact-warn">Druga ręka jest zajęta przez broń dwuręczną.</div>' : ''}
    ${!check.ok ? `<div class="compact-warn">${esc(check.reason)}</div>` : ''}
    ${detail.where === 'worn' ? ulepszHtml(it) : ''}
    ${detail.where === 'bag' ? `<div class="actions compact-actions">
      <button class="btn solid" data-act="equip" data-id="${it.id}" ${check.ok ? '' : 'disabled'}>Załóż</button>
      <button class="btn ghost" data-act="sell" data-id="${it.id}">Sprzedaj</button></div>` : ''}
  </div>`;
}

// Stary pełny panel zostaje chwilowo jako referencja dla formatu statystyk;
// ekran używa powyższego kompaktowego inspektora.
function detailHtmlLegacy() {
  if (!detail) {
    return `<div class="card detail pusty"><div class="t2">Kliknij slot albo przedmiot,
      żeby zobaczyć, co robi i co zmieni.</div></div>`;
  }

  const gear = activeCombatEquipment();
  const hands = activeCombatHands();
  const it = detail.where === 'worn'
    ? gear[detail.slot]
    : S.backpack.find(x => x.id === detail.id);

  if (!it) {
    const slot = detail.slot;
    return `<div class="card detail"><div class="t1">${esc(S.slots[slot]?.label ?? '—')}</div>
      <div class="t2">Pusty slot. Załóż tu coś z plecaka poniżej.</div></div>`;
  }

  const rar = S.rarities[it.rarity];
  const noszony = detail.where === 'bag' ? (gear[it.slot] ?? null) : null;
  const mine = itemStats(it);
  const stare = itemStats(noszony);
  const klucze = [...new Set([...Object.keys(mine), ...Object.keys(stare)])];

  const diff = klucze.map(k => {
    const d = (mine[k] ?? 0) - (stare[k] ?? 0);
    if (!d) return '';
    return `<div class="stat"><span class="k">${STAT_NAZWA[k] ?? k}</span>
      <span class="v ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${wartoscStatu(k, d)}</span></div>`;
  }).join('');

  const eqCheck = canEquipLocal(it);

  return `<div class="card detail" style="border-color:${rarityColor(it.rarity)}">
    <div class="d-head">
      <div class="icon lg" style="border-color:${rarityColor(it.rarity)}">${itemIcon(it)}</div>
      <div class="grow">
        <div class="t1" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>
        <div class="t2">${esc(rar.label)} · ${esc(S.slots[it.slot]?.label ?? it.slot)}${it.wtype ? ` · ${esc(it.wtype)}` : ''}</div>
      </div>
    </div>

    ${it.source ? `<div class="stat"><span class="k">Źródło</span><span class="v">${it.source === 'boss_crafted' ? 'receptura bossa' : 'Kowalstwo'}</span></div>` : ''}
    ${it.quality ? `<div class="stat"><span class="k">Jakość wykonania</span><span class="v">${esc(S.smithing?.qualities?.[it.quality]?.label ?? it.quality)} ×${Number(it.qualityMult ?? 1).toFixed(2)}</span></div>` : ''}

    <div class="stat" title="Poziom przedmiotu. Tyle pięter trzeba zdobyć, żeby go założyć — i tyle waży jego baza obrażeń albo pancerza.">
      <span class="k">Poziom przedmiotu</span><span class="v">${it.ilvl}</span></div>
    ${it.slot === 'bron' ? `<div class="stat" title="${it.hands === 2
      ? 'Zajmuje obie ręce: bez tarczy i bez drugiego ostrza, ale bije mocniej i cały exp idzie w jeden skill.'
      : 'Zostawia drugą rękę wolną na tarczę albo drugą broń — exp dzieli się wtedy po połowie.'}">
      <span class="k">Chwyt</span><span class="v">${it.hands === 2 ? 'dwuręczna' : 'jednoręczna'}</span></div>` : ''}
    ${it.slot === 'bron' ? `<div class="stat"><span class="k">Rodzaj obrażeń</span>
      <span class="v">${typObrazen(typBroni(it)).ic} ${esc(typObrazen(typBroni(it)).label)}</span></div>` : ''}
    ${it.damage ? `<div class="stat"><span class="k">Atak</span><span class="v">${nf(it.damage)}</span></div>` : ''}
    ${it.armor ? `<div class="stat"><span class="k">Obrona</span><span class="v">${nf(it.armor)}</span></div>` : ''}
    ${(it.affixes ?? []).map(a => `<div class="stat"><span class="k">${esc(a.label)}</span>
      <span class="v up">+${a.as ? (a.value / 100).toFixed(2).replace('.', ',') + ' AS'
        : a.value + (a.pct ? '%' : '')}</span></div>`).join('')}

    ${detail.where === 'bag' && noszony ? porownanie(noszony, it) : ''}
    ${detail.where === 'bag' && diff ? `<div class="sec">Bilans</div>${diff}` : ''}
    ${detail.where === 'bag' && !noszony ? `<div class="sec">Zmiana</div>
      <div class="t2">Slot jest pusty — wszystko powyżej to czysty zysk.</div>` : ''}

    ${detail.where === 'bag' && it.slot === 'bron' && it.hands === 2 && gear.offhand
      ? `<div class="t2" style="color:var(--brass);margin-top:8px">Założenie zdejmie
         <b>${esc(gear.offhand.name)}</b> z drugiej ręki.</div>` : ''}
    ${detail.where === 'bag' && it.slot === 'offhand' && hands?.offBlocked
      ? `<div class="t2" style="color:#D9736B;margin-top:8px">Trzymasz broń dwuręczną —
         druga ręka jest zajęta.</div>` : ''}

    ${!eqCheck.ok ? `<div class="t2" style="color:#D9736B;margin-top:8px">${esc(eqCheck.reason)}</div>` : ''}

    ${ulepszHtml(it)}

    ${detail.where === 'bag' ? `<div class="actions">
      <button class="btn solid" data-act="equip" data-id="${it.id}" ${eqCheck.ok ? '' : 'disabled'}>Załóż</button>
      <button class="btn ghost" data-act="sell" data-id="${it.id}">Sprzedaj</button>
    </div>` : ''}
  </div>`;
}

// Ulepszanie sztabami z Kowalstwa. Pokazujemy koszt wprost i blokujemy,
// gdy brakuje — żeby nie trzeba było zgadywać.
function ulepszHtml(it) {
  const U = S.upgrade;
  // PIERŚCIENIE I NASZYJNIKI TEŻ SIĘ ULEPSZA. Nie mają bazy obrażeń ani
  // pancerza, więc plus podbija u nich AFIKSY — wcześniej panel po prostu
  // się dla nich nie pokazywał.
  if (!U) return '';
  const bezBazy = !it.damage && !it.armor;
  if (bezBazy && !(it.affixes ?? []).length) return '';
  const plus = it.plus ?? 0;
  if (plus >= U.maxPlus) {
    return `<div class="stat"><span class="k">Ulepszenie</span>
      <span class="v" style="color:var(--brass)">+${plus} — maksimum</span></div>`;
  }
  const mam = Object.fromEntries((S.materials ?? []).map(m => [m.id, m.count]));
  const nazwy = S.matNames ?? {};
  const koszt = Object.entries(U.koszt).map(([k, v]) => [k, v * (plus + 1)]);
  const stac = koszt.every(([k, v]) => (mam[k] ?? 0) >= v);
  const txt = koszt.map(([k, v]) => `${nazwy[k] ?? k} ${mam[k] ?? 0}/${v}`).join(' · ');

  return `<div class="sec">Ulepszenie</div>
    <div class="card row compact">
      <div class="grow">
        <div class="t1">+${plus} → +${plus + 1}</div>
        <div class="t2" style="color:${stac ? 'var(--brass)' : '#D9736B'}">${esc(txt)}</div>
        <div class="t2">+${Math.round(U.perPlus * 100)}% ${
          it.damage ? 'obrażeń' : it.armor ? 'pancerza' : 'wartości wszystkich afiksów'}</div>
      </div>
      <button class="btn" data-act="upgrade" data-id="${it.id}" ${stac ? '' : 'disabled'}>Ulepsz</button>
    </div>`;
}

// Porównanie obok siebie: co nosisz kontra co trzymasz. Bez tego gracz musiał
// pamiętać liczby z drugiego ekranu.
function porownanie(stary, nowy) {
  const kol = (it, tytul) => {
    const s = itemStats(it);
    const wiersze = Object.entries(s).filter(([, v]) => v)
      .map(([k, v]) => `<div class="pk"><span>${STAT_NAZWA[k] ?? k}</span>
        <b>${wartoscStatu(k, v)}</b></div>`).join('');
    return `<div class="pcol">
      <div class="ph" style="color:${rarityColor(it.rarity)}">${esc(tytul)}</div>
      <div class="pn" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>
      <div class="t2">${esc(S.rarities[it.rarity]?.label ?? '')}${it.slot === 'bron'
        ? ` · ${it.hands === 2 ? '2H' : '1H'}` : ''}</div>
      ${wiersze || '<div class="t2">bez statystyk</div>'}
    </div>`;
  };
  return `<div class="sec">Nosisz kontra bierzesz</div>
    <div class="porownanie">${kol(stary, 'NOSISZ')}${kol(nowy, 'BIERZESZ')}</div>`;
}

function bagList() {
  if (invCat === 'mat') {
    const mats = S.materials ?? [];
    if (!mats.length) {
      return `<div class="card"><div class="t2">Brak surowców. Kop w zakładce Skille.</div></div>`;
    }
    return mats.map(m => `<div class="inv-item mat">
      <div class="icon">🪨</div>
      <div class="grow"><div class="t1">${esc(m.label)}</div>
        <div class="t2">surowiec</div></div>
      <span class="num">${m.count}</span>
    </div>`).join('');
  }

  const lista = [...S.backpack].reverse()
    .filter(it => invCat === 'all' || it.slot === invCat);

  if (!lista.length) {
    return `<div class="card"><div class="t2">${invCat === 'all'
      ? 'Nic tu nie ma.'
      : `Nic na slot ${esc(S.slots[invCat]?.label ?? invCat)}. Kliknij ten sam slot jeszcze raz, żeby zobaczyć wszystko.`}</div></div>`;
  }

  return lista.map(it => {
    const on = detail?.where === 'bag' && detail.id === it.id;
    const gear = activeCombatEquipment();
    const lepszy = gear[it.slot]
      ? itemStats(it).dmg + itemStats(it).arm > itemStats(gear[it.slot]).dmg + itemStats(gear[it.slot]).arm
      : true;
    return `<button class="inv-item ${on ? 'on' : ''}" data-act="pick" data-id="${it.id}"
      style="border-color:${on ? rarityColor(it.rarity) : ''}">
      <div class="icon" style="border-color:${rarityColor(it.rarity)}">${itemIcon(it)}</div>
      <div class="grow">
        <div class="t1" style="color:${rarityColor(it.rarity)}">${esc(nazwaIt(it))}</div>
        <div class="t2">${esc(S.slots[it.slot]?.label ?? '')} · poz. ${it.ilvl}</div>
      </div>
      ${lepszy ? '<span class="up-dot" title="Lepsze od noszonego">▲</span>' : ''}
    </button>`;
  }).join('');
}

const skillPct = n => `${((Number(n) || 0) * 100).toFixed(1)}%`;

function skillDollHtml() {
  const gear = S.mining.equipment ?? {};
  const podsum = [
    ['TEMPO', skillPct(S.mining.bonuses.miningSpeed)],
    ['KLEJNOT', skillPct(S.mining.baseGemChance * (1 + S.mining.bonuses.gemFind))],
    ['XP', `+${skillPct(S.mining.bonuses.miningXp)}`],
  ];
  let p = 0;
  const cell = (slot) => {
    if (!slot) {
      const [k, v] = podsum[p++];
      return `<div class="doll-power" title="Łączna premia aktywnego zestawu Skill">
        <span class="k">${k}</span><span class="v">${v}</span></div>`;
    }
    const it = gear[slot];
    const wybrany = detail?.where === 'skill-worn' && detail.slot === slot;
    return `<button class="doll-cell${it ? '' : ' empty'}${wybrany ? ' on' : ''}"
      data-act="skillslot" data-slot="${slot}" title="${esc(it?.name ?? S.mining.slots[slot])}"
      style="${it ? `border-color:${rarityColor(it.rarity)}` : ''}">
      <span class="ic">${SKILL_SLOT_ICON[slot] ?? '▪'}</span>
      <span class="lb">${it ? esc(it.name.split(' ')[0]) : esc(S.mining.slots[slot])}</span>
    </button>`;
  };
  return `<div class="doll">${SKILL_DOLL_GRID.flat().map(cell).join('')}</div>`;
}

function skillStatsHtml() {
  const b = S.mining.bonuses;
  const w = (k, v) => `<div class="stat-box"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<div class="statgrid" id="eqstats">
    ${w('Szybkość', `+${skillPct(b.miningSpeed)}`)}
    ${w('XP', `+${skillPct(b.miningXp)}`)}
    ${w('Gem Find', `+${skillPct(b.gemFind)}`)}
    ${w('Podwójna ruda', skillPct(b.doubleOre))}
    ${w('Rzadki klejnot', `+${skillPct(b.rareGemFind)}`)}
    ${w('Podwójny klejnot', skillPct(b.doubleGem))}
  </div>`;
}

function skillDetailHtml() {
  if (!detail || !['skill-worn', 'skill-bag'].includes(detail.where)) {
    return '';
  }
  const it = detail.where === 'skill-worn'
    ? S.mining.equipment?.[detail.slot]
    : S.mining.inventory.find(x => x.id === detail.id);
  if (!it) {
    return `<div class="compact-detail"><div class="t1">${esc(S.mining.slots[detail.slot] ?? '—')}</div>
      <div class="t2">Pusty slot. Wykuj sprzęt w Kowalstwie i załóż go z plecaka Skill.</div></div>`;
  }
  const worn = detail.where === 'skill-bag' ? S.mining.equipment?.[it.slot] : null;
  const miningLvl = S.skills.gornictwo.lvl;
  const canWear = miningLvl >= (it.reqMiningLevel ?? 1);
  const bonus = Object.entries(it.bonuses ?? {}).map(([id, n]) => {
    const old = worn?.bonuses?.[id] ?? 0;
    const diff = n - old;
    return `<div class="cmp-row"><span class="cmp-stat">${esc(S.mining.bonusLabels[id] ?? id)}</span>
      ${worn ? `<span>${skillPct(old)}</span>` : ''}<span>${skillPct(n)}</span>
      ${worn ? `<b class="${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff ? `${diff > 0 ? '+' : ''}${skillPct(diff)}` : '—'}</b>` : ''}</div>`;
  }).join('');
  return `<div class="compact-detail">
    <div class="d-head compact"><div class="icon">${SKILL_SLOT_ICON[it.slot] ?? '⛏'}</div>
      <div class="grow"><div class="t1">${esc(it.name)}</div>
        <div class="t2">${esc(S.mining.slots[it.slot])} · ${esc(S.smithing.qualities[it.quality]?.label ?? it.quality)} ×${Number(it.qualityMult ?? 1).toFixed(2)}</div></div></div>
    <div class="detail-meta"><span>Kowalstwo</span><span class="${canWear ? 'up' : 'down'}">Górnictwo ${it.reqMiningLevel ?? 1}</span></div>
    <div class="cmp-head ${worn ? '' : 'single'}"><span>Premia</span>${worn ? '<span>Nosisz</span>' : ''}<span>${worn ? 'Nowy' : 'Wartość'}</span>${worn ? '<span>Różnica</span>' : ''}</div>
    <div class="cmp-table ${worn ? '' : 'single'}">${bonus}</div>
    ${detail.where === 'skill-bag' ? `<div class="actions compact-actions"><button class="btn solid" data-act="mineequip" data-id="${it.id}" ${canWear ? '' : 'disabled'}>${canWear ? 'Załóż' : `Wymaga poziomu ${it.reqMiningLevel}`}</button></div>` :
      `<div class="actions compact-actions"><button class="btn ghost" data-act="mineequip" data-slot="${it.slot}">Zdejmij</button></div>`}
  </div>`;
}

function skillBagList() {
  const lista = [...S.mining.inventory].reverse()
    .filter(it => invCat === 'all' || it.slot === invCat);
  if (!lista.length) return `<div class="card"><div class="t2">${invCat === 'all'
    ? 'Plecak Skill jest pusty. Sprzęt powstaje w Kowalstwie.'
    : `Brak sprzętu na slot ${esc(S.mining.slots[invCat] ?? invCat)}.`}</div></div>`;
  return lista.map(it => {
    const on = detail?.where === 'skill-bag' && detail.id === it.id;
    return `<button class="inv-item ${on ? 'on' : ''}" data-act="skillpick" data-id="${it.id}"
      style="border-color:${on ? rarityColor(it.rarity) : ''}">
      <div class="icon">${SKILL_SLOT_ICON[it.slot] ?? '⛏'}</div>
      <div class="grow"><div class="t1">${esc(it.name)}</div>
        <div class="t2">${esc(S.mining.slots[it.slot])} · ${esc(S.smithing.qualities[it.quality]?.label ?? it.quality)} · Górnictwo ${it.reqMiningLevel ?? 1}</div></div>
    </button>`;
  }).join('');
}

function eqHeader(licznik) {
  return `<div class="scr-head eq-head"><span class="eq-title">Ekwipunek</span>
    <div class="eq-modes" aria-label="Rodzaj ekwipunku">
      ${[['pve_a','PvE A'],['pve_b','PvE B'],['pvp','PvP'],['skill','Skill']].map(([id, label]) => {
        const aktywny = id === `pve_${S.pveLoadout ?? 'a'}`;
        return `<button data-act="eqmode" data-mode="${id}" class="${equipmentMode === id ? 'on' : ''}">${label}${aktywny ? ' ✓' : ''}</button>`;
      }).join('')}
    </div><span>${licznik}</span></div>`;
}

function eqInspector(content) {
  return `<div class="eq-inspector" role="dialog" aria-label="Szczegóły przedmiotu">
    <button class="eq-inspector-close" data-act="detailclose" title="Zamknij" aria-label="Zamknij">×</button>
    ${content}
  </div>`;
}

function renderSkillEq() {
  let h = eqHeader(`PLECAK ${S.mining.inventory.length} / ${S.mining.inventoryMax}`);
  h += `<div class="eq-top"><div class="eq-doll">${skillDollHtml()}</div>
    <div class="eq-side">${skillStatsHtml()}</div></div>`;
  h += `<div class="eq-bag"><div class="invtabs">
    <button class="${invCat === 'all' ? 'on' : ''}" data-act="invcat" data-c="all">Wszystko</button>
    ${invCat !== 'all' ? `<button class="on" data-act="invcat" data-c="all">${esc(S.mining.slots[invCat] ?? invCat)} ✕</button>` : ''}
    <button data-act="skillgo" data-t="zbierackie" data-skill="kowalstwo" class="junk">Idź do Kowalstwa</button>
    </div><div class="invlist">${skillBagList()}</div></div>`;
  if (detail) h += eqInspector(skillDetailHtml());
  return h;
}

function renderEq() {
  if (equipmentMode === 'skill') return renderSkillEq();
  const full = S.backpack.length >= S.backpackMax;

  let h = eqHeader(`PLECAK ${S.backpack.length} / ${S.backpackMax}`);

  h += `<div class="eq-top">
    <div class="eq-doll">${dollHtml()}</div>
    <div class="eq-side">${statsHtml()}${breakdownHtml()}</div>
  </div>`;

  if (equipmentMode === 'pve_a' || equipmentMode === 'pve_b') {
    const id = equipmentMode.slice(-1); const aktywny = S.pveLoadout === id;
    h += `<div class="card row compact loadout-activate"><div class="grow"><div class="t1">Zestaw PvE ${id.toUpperCase()}</div>
      <div class="t2">${aktywny ? 'Aktywny w walce' : 'Możesz go spokojnie ubierać bez zmiany aktualnej broni.'}</div></div>
      <button class="btn ${aktywny ? 'ghost' : 'solid'}" data-act="pveloadout" data-id="${id}" ${aktywny ? 'disabled' : ''}>${aktywny ? 'AKTYWNY' : 'AKTYWUJ'}</button></div>`;
  }

  h += `<div class="eq-bag">
    <div class="invtabs">
      <button class="${invCat === 'all' ? 'on' : ''}" data-act="invcat" data-c="all">Wszystko</button>
      <button class="${invCat === 'mat' ? 'on' : ''}" data-act="invcat" data-c="mat">Surowce</button>
      ${invCat !== 'all' && invCat !== 'mat'
        ? `<button class="on" data-act="invcat" data-c="all">${esc(S.slots[invCat]?.label ?? invCat)} ✕</button>` : ''}
      ${S.backpack.length ? `<button class="junk" data-act="selljunk"
        title="Sprzedaje wszystko gorsze od noszonego">Sprzedaj zbędne</button>` : ''}
    </div>
    ${full ? `<div class="card bad"><div class="t2">Plecak pełny — nowy łup przepada.</div></div>` : ''}
    <div class="invlist">${bagList()}</div>
  </div>`;

  if (detail) h += eqInspector(detailHtml());

  return h;
}

// ---------------------------------------------------------------- DRUŻYNA
// Na razie sama struktura. Silnik walki już przyjmuje pięć jednostek po stronie
// gracza (patrz PARTY_SLOTS i createFight) — brakuje wyłącznie tego, czym je obsadzić.

// ---------------------------------------------------------------- DRUŻYNA
// Lewa kolumna to skład, prawa to panel wybranego członka. Klikasz siebie —
// dostajesz swój panel, klikasz sojusznika — jego. Nagłówek u góry nie jest
// już jedyną drogą do własnych ulepszeń.

let teamSel = 'ja';        // 'ja' | 'a0' | 'a1' | 'a2' | 'pet'

function renderDruzyna() {
  const st = S.stats;
  const T = S.teamStats ?? { allies: [], pet: null };
  const obsadzeni = T.allies.filter(Boolean).length + (T.pet ? 1 : 0);

  let h = `<div class="scr-head">Drużyna <span>${1 + obsadzeni} / ${(S.allySlots ?? 3) + 2} W WALCE</span></div>`;
  h += `<div class="two-col">`;

  // ---- lewa: skład ----
  h += `<div class="col team-list">`;
  h += `<button class="card row team-row ${teamSel === 'ja' ? 'hi' : ''}" data-act="teamsel" data-s="ja">
    <div class="icon lg">${heroCrest(28)}</div>
    <div class="grow"><div class="t1">${esc(S.name)}</div>
      <div class="t2">poziom ${S.poziom} · moc ${nf(st.power)}</div></div>
    <span class="badge on">TY</span>
  </button>`;

  for (let i = 0; i < (S.allySlots ?? 3); i++) {
    const a = T.allies[i];
    const otwarty = S.slotOpen?.[i] ?? false;
    const blokada = i === 0 ? `od poziomu ${S.unlockAt?.ally1 ?? 3}`
      : i === 1 ? 'ukończ Puszczę Cierniową na poziomie profesjonalnym'
      : `od poziomu ${S.unlockAt?.ally3 ?? 30}`;
    h += `<button class="card row team-row ${teamSel === 'a' + i ? 'hi' : ''} ${a ? '' : 'off'}"
      data-act="teamsel" data-s="a${i}" ${otwarty ? '' : 'disabled'}>
      <div class="icon lg" ${a ? `style="border-color:${rarityColor(a.rarity)}"` : ''}>${!otwarty ? '🔒' : a ? '👤' : '＋'}</div>
      <div class="grow">
        <div class="t1" ${a ? `style="color:${rarityColor(a.rarity)}"` : ''}>${esc(a?.name ?? `Slot ${i + 1}`)}</div>
        <div class="t2">${!otwarty ? blokada : a ? `${esc(a.role)} · ${esc(a.rowLabel)} · ${nf(a.damage)} ATK` : 'pusty'}</div>
      </div>
      <span class="badge ${a ? 'on' : ''}">${!otwarty ? 'ZAMKNIĘTY' : a ? 'WALCZY' : 'WOLNY'}</span>
    </button>`;
  }

  const p = T.pet;
  const petOtwarty = S.petOpen ?? false;
  h += `<button class="card row team-row ${teamSel === 'pet' ? 'hi' : ''} ${p ? '' : 'off'}"
    data-act="teamsel" data-s="pet" ${petOtwarty ? '' : 'disabled'}>
    <div class="icon lg" ${p ? `style="border-color:${rarityColor(p.rarity)}"` : ''}>${!petOtwarty ? '🔒' : p ? '🐺' : '＋'}</div>
    <div class="grow">
      <div class="t1" ${p ? `style="color:${rarityColor(p.rarity)}"` : ''}>${esc(p?.name ?? 'Slot peta')}</div>
      <div class="t2">${!petOtwarty ? `od poziomu ${S.unlockAt?.pet ?? 10}` : p ? `${esc(p.role)} · ${esc(p.rowLabel)} · ${nf(p.damage)} ATK` : 'pusty'}</div>
    </div>
    <span class="badge ${p ? 'on' : ''}">${!petOtwarty ? 'ZAMKNIĘTY' : p ? 'WALCZY' : 'WOLNY'}</span>
  </button>`;
  h += `</div>`;

  // ---- prawa: panel wybranego ----
  h += `<div class="col team-detail">${teamSel === 'ja' ? panelGracza() : panelTowarzysza()}</div>`;

  h += `</div>`;
  return h;
}

function panelGracza() {
  const st = S.stats;
  return `<div class="card hi">
      <div class="row"><div class="icon lg">${heroCrest(30)}</div>
        <div class="grow"><div class="t1">${esc(S.name)}</div>
          <div class="t2">poziom ${S.poziom} · jedyny, który nosi ekwipunek</div></div></div>
    </div>
    <div class="statgrid" style="margin-bottom:8px">
      <div class="stat-box"><span class="k">Zdrowie</span><span class="v">${nf(st.hp)}/${nf(st.maxHp)}</span></div>
      <div class="stat-box"><span class="k">Atak</span><span class="v">${nf(st.damage)}</span></div>
      <div class="stat-box"><span class="k">Obrona</span><span class="v">${nf(st.armor)}</span></div>
      <div class="stat-box"><span class="k">Attack Speed</span>
        <span class="v">${(st.attackSpeed ?? st.speed / 20).toFixed(2)}</span></div>
      <div class="stat-box"><span class="k">Kryt</span><span class="v">${(st.crit * 100).toFixed(1)}%</span></div>
      <div class="stat-box"><span class="k">Moc</span><span class="v">${nf(st.power)}</span></div>
    </div>
    ${panelJedzenia({ kind: 'hero' }, S.foodBuffs)}`;
}

function panelJedzenia(target, buffs) {
  const sloty = [['main_meal', 'Główny posiłek'], ['drink', 'Drink'], ['dessert', 'Deser']];
  const targetAttrs = `data-kind="${target.kind}"${target.idx !== undefined ? ` data-idx="${target.idx}"` : ''}`;
  const jedzenie = (S.materials ?? []).filter(m => JEDZENIE.has(m.id));
  const receptura = id => S.skills.gotowanie?.resources?.find(r => r.id === id)?.food;
  let h = `<div class="sec">Jedzenie tej jednostki</div><div class="food-slots">${sloty.map(([id, label]) => {
    const b = buffs?.[id];
    return `<div class="card compact food-slot ${b ? 'on' : ''}"><div class="t2">${label}</div>
      <div class="t1">${b ? esc(b.label) : 'Pusty slot'}</div>
      ${b ? `<div class="t2">${esc(opisBuffa(b))}</div><span class="badge on">${b.walki} walk</span>` : ''}</div>`;
  }).join('')}</div>`;
  if (!jedzenie.length) return h + `<div class="card compact"><div class="t2">Brak gotowych potraw. Przygotujesz je w Gotowaniu.</div></div>`;
  h += `<div class="sec">Wybierz jedzenie</div>${jedzenie.map(m => `<div class="card row compact">
    <div class="grow"><div class="t1">${esc(m.label)} <span class="num">×${nf(m.count)}</span></div>
      <div class="t2">${esc(opisBuffa(receptura(m.id)))} · ${receptura(m.id)?.walki ?? Math.max(1, Math.round((receptura(m.id)?.durationMs ?? 900000) / 90000))} walk</div></div>
    <button class="btn" data-act="eat" data-id="${m.id}" ${targetAttrs}>Daj</button>
  </div>`).join('')}`;
  return h;
}

function panelTowarzysza() {
  const pet = teamSel === 'pet';
  const idx = pet ? null : Number(teamSel.slice(1));
  const wpis = pet ? S.teamStats.pet : S.teamStats.allies[idx];
  const pula = pet ? (S.collection?.pets ?? []) : (S.collection?.companions ?? []);
  const zajete = pet ? [] : (S.team?.allies ?? []).filter(x => x !== null && x !== idx);

  let h = '';

  if (wpis) {
    h += `<div class="card hi" style="border-color:${rarityColor(wpis.rarity)}">
      <div class="row">
        <div class="icon lg" style="border-color:${rarityColor(wpis.rarity)}">${pet ? '🐺' : '👤'}</div>
        <div class="grow">
          <div class="t1" style="color:${rarityColor(wpis.rarity)}">${esc(wpis.name)}</div>
          <div class="t2">${esc(S.rarities[wpis.rarity]?.label ?? wpis.rarity)} · ${esc(wpis.role)} · ${esc(wpis.rowLabel)}</div>
        </div>
      </div>
    </div>
    <div class="statgrid" style="margin-bottom:8px">
      <div class="stat-box"><span class="k">Zdrowie</span><span class="v">${nf(wpis.maxHp)}</span></div>
      <div class="stat-box"><span class="k">Atak</span><span class="v">${nf(wpis.damage)}</span></div>
      <div class="stat-box"><span class="k">Obrona</span><span class="v">${nf(wpis.armor)}</span></div>
      <div class="stat-box"><span class="k">Prędkość</span><span class="v">${wpis.speed}</span></div>
      <div class="stat-box"><span class="k">Kryt</span><span class="v">${(wpis.crit * 100).toFixed(1)}%</span></div>
      <div class="stat-box"><span class="k">Rzadkość</span><span class="v">${esc(S.rarities[wpis.rarity]?.label ?? '')}</span></div>
    </div>
    <div class="card role-card"><span class="badge on">${esc(wpis.role)}</span>
      <div><div class="t1">${esc(wpis.rowLabel)} szyku</div><div class="t2">${esc(wpis.roleDesc)}</div></div></div>
    <button class="btn ghost wide" data-act="teamset" data-slot="${pet ? 'pet' : idx}" data-idx="">
      Zdejmij ze slotu</button>`;
    const source = pet ? S.collection?.pets?.[wpis.idx] : S.collection?.companions?.[wpis.idx];
    h += panelJedzenia({ kind: pet ? 'pet' : 'ally', idx: wpis.idx }, source?.foodBuffs);
  } else {
    h += `<div class="card"><div class="t1">Pusty slot</div>
      <div class="t2">Wybierz z kolekcji poniżej. ${pet ? 'Pety' : 'Sojusznicy'} przychodzą z Przywołania.</div></div>`;
  }

  h += `<div class="sec">Kolekcja · ${pula.length}</div>`;
  h += `<div class="scrollbox">`;
  if (!pula.length) {
    h += `<div class="card"><div class="t2">Pusto. Idź do Przywołania.</div></div>`;
  } else {
    h += pula.map((c, i) => {
      const gdzieindziej = zajete.includes(i);
      const tu = wpis && wpis.idx === i;
      const rola = pet ? S.petRole : S.allyRoles?.[c.klasa];
      return `<button class="card row compact" data-act="teamset"
        data-slot="${pet ? 'pet' : idx}" data-idx="${i}" ${gdzieindziej || tu ? 'disabled' : ''}>
        <div class="icon" style="border-color:${rarityColor(c.rarity)}">${pet ? '🐺' : '👤'}</div>
        <div class="grow"><div class="t1" style="color:${rarityColor(c.rarity)}">${esc(c.name)}</div>
          <div class="t2">${esc(S.rarities[c.rarity]?.label ?? c.rarity)} · ${esc(rola?.label ?? 'Towarzysz')}</div></div>
        <span class="badge ${tu ? 'on' : ''}">${tu ? 'TUTAJ' : gdzieindziej ? 'W INNYM' : 'WSTAW'}</span>
      </button>`;
    }).join('');
  }
  h += `</div>`;

  h += `<div class="card" style="margin-top:8px"><div class="t2">
    <b>Towarzysze nie noszą ekwipunku.</b> Ich baza skaluje się z bohatera,
    rzadkość zwiększa siłę, a klasa nadaje pozycję i własne zachowanie w walce.</div></div>`;

  return h;
}

// ---------------------------------------------------------------- SKILLE
// Górnictwo GRA. Reszta to makiety.
//
// Pętla: klient trzyma zegar, po każdym cyklu woła /api/minetick, serwer wydaje
// dokładnie jeden cykl i sprawdza czas. Bez postępu offline, ale zmiana zakładki
// niczego nie gubi — timer chodzi dalej, bo to ta sama strona.

let skillOpen = 'gornictwo';
let miningCategory = 'ore';
let smithCategory = 'smelting';
let smithSelected = null;
const lifeFilter = { rybolowstwo: 'all', rolnictwo: 'all', gotowanie: 'all' };
let cookingSelected = null;
let cookingSearch = '';
let attrHold = null;       // trwający przytrzymany przycisk „+"
// Które opisy gracz rozwinął przyciskiem „i”. Na szerokim ekranie zbiór nie ma
// znaczenia — tam CSS pokazuje opisy zawsze.
const OPISY_OTWARTE = new Set();

// PRZYTRZYMANIE „+" — PŁYNNE NARASTANIE DO 10 PUNKTÓW NA SEKUNDĘ.
//
// Poprzednia wersja przyspieszała I zwiększała porcję naraz: po chwili wrzucała
// po pięćdziesiąt punktów na raz, więc licznik SKAKAŁ i nie dało się trafić
// w żądaną wartość. Teraz porcja jest ZAWSZE JEDNOPUNKTOWA, a zmienia się
// wyłącznie tempo — więc liczba rośnie na żywo, równo, bez przeskoków.
//
// Tempo idzie po smoothstep, a nie liniowo: krzywa startuje i kończy łagodnie,
// więc nie ma szarpnięcia ani w chwili wejścia w rozpęd, ani przy osiągnięciu
// sufitu. Gracz czuje narastanie, a nie przełącznik.
const ATTR_START_MS = 320;   // pierwsze powtórzenia: ~3 na sekundę
const ATTR_MIN_MS   = 100;   // sufit: równo 10 na sekundę
const ATTR_RAMP_MS  = 1800;  // po tylu milisekundach trzymania jesteśmy na suficie

function attrDelay(odKiedy) {
  const p = Math.min(1, (Date.now() - odKiedy) / ATTR_RAMP_MS);
  const ease = p * p * (3 - 2 * p);                       // smoothstep
  return ATTR_START_MS + (ATTR_MIN_MS - ATTR_START_MS) * ease;
}

// Operuje na danych (nazwa atrybutu), nie na węźle DOM — render() przebudowuje
// przyciski, więc uchwyt do elementu przestaje być ważny po pierwszym tiku.
async function attrTick(attr) {
  if (!attrHold || attrHold.attr !== attr) return;
  const d = await api('attr', { attr, n: 1 });
  if (d.error || !attrHold) { attrHold = null; render(); return; }
  render();
  if (!attrHold) return;                       // puszczono w trakcie żądania
  if ((S.unspentAttr ?? 0) <= 0) { attrHold = null; return; }
  attrHold.timer = setTimeout(() => attrTick(attr), attrDelay(attrHold.od));
}
function stopAttrHold() { if (attrHold) { clearTimeout(attrHold.timer); attrHold = null; } }
document.addEventListener('pointerdown', (ev) => {
  const b = ev.target.closest?.('[data-act="attr"]');
  if (!b || b.disabled) return;
  ev.preventDefault();
  stopAttrHold();
  attrHold = { attr: b.dataset.attr, od: Date.now() };
  attrTick(b.dataset.attr);
});
['pointerup', 'pointercancel'].forEach(e => document.addEventListener(e, stopAttrHold));
window.addEventListener('blur', stopAttrHold);
// Co da się zjeść — czyta się z definicji profesji, żeby lista nie rozjechała
// się z configiem przy dodaniu nowej potrawy.
const JEDZENIE = new Set();
const opisBuffa = (buff) => {
  const b = buff?.effects ?? buff ?? {};
  return [
    b.dmgPct ? `obrażenia +${Math.round(b.dmgPct * 100)}%` : null,
    b.hpPct ? `zdrowie +${Math.round(b.hpPct * 100)}%` : null,
    b.armorPct ? `pancerz +${Math.round(b.armorPct * 100)}%` : null,
    b.attackSpeedPct ? `szybkość ataku +${Math.round(b.attackSpeedPct * 100)}%` : null,
    b.critChance ? `kryt +${Math.round(b.critChance * 100)}%` : null,
    b.accuracy ? `celność +${Math.round(b.accuracy * 100)}%` : null,
    b.manaRegenPct ? `regeneracja many +${Math.round(b.manaRegenPct * 100)}%` : null,
    b.hpRegenPct ? `regeneracja HP +${Math.round(b.hpRegenPct * 100)}%` : null,
    b.professionXpPct ? `EXP profesji +${Math.round(b.professionXpPct * 100)}%` : null,
    b.gatheringSpeedPct ? `tempo zbierania +${Math.round(b.gatheringSpeedPct * 100)}%` : null,
    b.yieldPct ? `zbiory +${Math.round(b.yieldPct * 100)}%` : null,
    b.luckPct ? `szczęście +${Math.round(b.luckPct * 100)}%` : null,
  ].filter(Boolean).join(' · ') || 'brak efektu';
};
const buffTxt = (b) => `${opisBuffa(b)}${b.durationMs ? ` · ${czasKrotki(b.durationMs)}` : b.walki ? ` przez ${b.walki} walk` : ''}`;

let MINE = null;         // { skill, res, ms, t0, timer, tick, pauza }
// Dorobek TEJ sesji zbierania. Przeżywa przerwę między cyklami, kasuje się
// przy zmianie surowca i przy „Przerwij" — bo to jest licznik jednego siedzenia,
// nie stan postaci.
let WYDOBYCIE = null;    // { skill, res, sztuk, xp, od }
const PAUZA_MS = 700;    // oddech między cyklami — żeby było widać, że coś padło

// skill jest parametrem, nie stałą — inaczej drugi cykl Rybołówstwa szukał
// swojego surowca w tabeli Górnictwa i wywalał się na undefined.
// Pasek ma dojść do końca i ZACZĄĆ OD POCZĄTKU, a nie cofać się animacją.
// `transition: width` na .bar>i odtwarzał powrót ze 100% na 0% jak przewijanie
// wstecz — więc reset robimy bez animacji, na jedną klatkę.
function snapPasek(el) {
  if (!el) return;
  el.style.transition = 'none';
  el.style.width = '0%';
  void el.offsetWidth;              // wymuszenie reflow: bez tego przeglądarka scala obie zmiany
  el.style.transition = '';
}

// Ile brakuje do kolejnego poziomu profesji i ile to jeszcze potrwa
// przy tym, co gracz właśnie zbiera. Bez tego „exp 340/500" nie mówi nic
// o tym, czy warto zostać jeszcze pięć minut.
function doPoziomu(skill, res, cykl) {
  const sk = S.skills[skill];
  if (!sk) return '—';
  const brak = Math.max(0, (sk.xpNeed ?? 0) - (sk.xp ?? 0));
  const xpNaCykl = res?.xp ?? 0;
  if (!xpNaCykl) return `${nf(brak)} exp`;
  const cykli = Math.ceil(brak / xpNaCykl);
  return `${nf(brak)} exp · ${cykli} cykli · ${czasKrotki(cykli * cykl)}`;
}

// Milisekundy po ludzku, krótko.
function czasKrotki(ms) {
  const s2 = Math.round(ms / 1000);
  if (s2 < 60) return `${s2} s`;
  const m = Math.round(s2 / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

// Ile to już trwa, po ludzku.
function czasTrwania(od) {
  if (!od) return '—';
  const s2 = Math.floor((Date.now() - od) / 1000);
  if (s2 < 60) return `${s2} s`;
  const m = Math.floor(s2 / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

// Liczniki dorobku odświeżają się BEZ render() — przerysowanie całego ekranu
// co 80 ms zabierałoby przewijanie pod palcem.
// Pasek pokazuje sam postęp — nie ma już liczników do odświeżania.
// Zostaje jako punkt zaczepienia, gdyby coś do niego wróciło.
function malujDorobek() {}

function startMineLoop(skill, res, ms, elapsed = 0) {
  stopMineLoop();
  snapPasek($('#mineprog'));
  const nadrobione = Math.min(ms, Math.max(0, elapsed));
  MINE = { skill, res, ms, t0: Date.now() - nadrobione, pauza: false };
  // Zmiana surowca zaczyna liczenie od zera; ten sam surowiec liczy dalej.
  if (!WYDOBYCIE || WYDOBYCIE.skill !== skill || WYDOBYCIE.res !== res) {
    WYDOBYCIE = { skill, res, sztuk: 0, xp: 0, od: Date.now() };
  }

  // setInterval, nie requestAnimationFrame: rAF zamiera, gdy strona nie jest
  // rysowana (zminimalizowane okno, tło), i pasek zastyga w miejscu.
  const rysuj = () => {
    if (!MINE || MINE.pauza) return;
    const pct = Math.min(100, (Date.now() - MINE.t0) / MINE.ms * 100);
    const bar = $('#mineprog'); if (bar) bar.style.width = pct + '%';
    const zeg = $('#minetime');
    if (zeg) zeg.textContent = Math.max(0, (MINE.ms - (Date.now() - MINE.t0)) / 1000).toFixed(1) + ' s';
    malujDorobek();
    // Pierścień postępu przy ikonie w górnym pasku. Krecę samą zmienną CSS,
    // a nie przerysowuję paska — przebudowa DOM co 80 ms zabierałaby przewijanie.
    const ring = $('#hdrAkt .ring');
    if (ring) ring.style.setProperty('--p', pct);
    const ap = $('#aktprog');
    if (ap) ap.style.width = pct + '%';
    // Licznik sekund też musi żyć — był rysowany raz przy render() i stał
    // w miejscu na wartości z chwili wejścia na ekran, choć pasek obok się sunął.
    const ac = $('#aktczas');
    if (ac) ac.textContent = Math.max(0, (MINE.ms - (Date.now() - MINE.t0)) / 1000).toFixed(1);
  };
  rysuj();
  MINE.tick = setInterval(rysuj, 80);

  MINE.timer = setTimeout(async () => {
    const d = await api('minetick', {});
    if (d.error) { stopMineLoop(); render(); return; }
    const sk = S.skills[skill];
    if (d.awans) { toast(`${sk.label} ${sk.lvl}!`); dzwiek('awans'); }
    const r = sk.resources.find(x => x.id === res);
    // Cykl się domknął — dopisujemy do dorobku sesji.
    if (WYDOBYCIE) {
      WYDOBYCIE.sztuk += d.gained?.count ?? 1;
      WYDOBYCIE.xp += d.gained?.xp ?? r?.xp ?? 0;
    }

    // PRZERWA. Pasek zostaje PEŁNY — widać, że cykl się domknął. Zatrzymujemy
    // rysowanie, żeby nie nadpisało go wyliczoną wartością, a kolejny cykl
    // zeruje pasek bez animacji (snapPasek), zamiast przewijać go wstecz.
    if (S.activity && r) {
      clearInterval(MINE.tick);
      const nextMs = S.activity?.ms ?? r.effectiveMs ?? r.ms;
      MINE = { skill, res, ms: nextMs, t0: Date.now(), pauza: true };
      render();                                  // pasek narysuje się jako pełny
      MINE.timer = setTimeout(() => startMineLoop(skill, res, nextMs), PAUZA_MS);
    } else {
      stopMineLoop();
      render();
    }
  }, Math.max(0, ms - nadrobione) + 60);
}

// Zatrzymuje wszystko, co po stronie klienta odtwarza walkę. Jedno miejsce,
// bo porzucenie i zmiana trybu muszą sprzątnąć dokładnie to samo.
function stopPlayback() {
  if (FIGHT?.timer) clearTimeout(FIGHT.timer);
  FIGHT = null;
  AUTO = false;
  paintCombatBar();
}

function stopMineLoop() {
  if (!MINE) return;
  clearTimeout(MINE.timer);
  clearInterval(MINE.tick);
  MINE = null;
}

// Skille to jedno miejsce na wszystko, co się rozwija: zbieranie, walkę
// i atrybuty. Drużyna została podglądem składu i niczym więcej.
let skillTab = 'zbierackie';   // 'zbierackie' | 'bojowe' | 'atrybuty'

// Co teraz leci — pełny wiersz z postępem i przerwaniem.
// Żródłem prawdy jest S.activity i MINE, dokładnie jak w kole w górnej belce,
// więc obie rzeczy nie mają jak się rozść.
function pasekAktywnosci() {
  const akt = S.activity;
  if (!akt) {
    return `<div class="akt-box pusty">
      <div class="grow"><div class="t1">Nic się nie zbiera</div>
        <div class="t2">Wybierz profesję i surowiec niżej — cykl leci sam,
          także gdy oglądasz inne zakładki.</div></div>
    </div>`;
  }
  const sk = S.skills?.[akt.skill];
  const r = sk?.resources?.find(x => x.id === akt.res);
  const pct = MINE && !MINE.pauza
    ? Math.min(100, (Date.now() - MINE.t0) / MINE.ms * 100)
    : (MINE?.pauza ? 100 : 0);
  const zostalo = MINE?.ms ? Math.max(0, (MINE.ms - (Date.now() - MINE.t0)) / 1000) : null;
  // Kliknięcie prowadzi DO TEJ PROFESJI, tak samo jak koło w górnej belce —
  // ta sama akcja `skillgo`, więc oba skróty zachowują się identycznie.
  // Treść jest przyciskiem, a "Przerwij" stoi OBOK niego, nie w środku:
  // przycisk w przycisku to nieprawidłowy HTML i klik w "Przerwij"
  // wyzwalałby przy okazji przejście do profesji.
  return `<div class="akt-box">
    <button class="akt-go" data-act="skillgo" data-t="zbierackie"
      data-skill="${esc(akt.skill)}" title="Przejdź do ${esc(sk?.label ?? 'tej profesji')}">
      <span class="ic">${sk?.ic ?? '⛏'}</span>
      <span class="grow">
        <span class="t1">${esc(r?.nodeLabel ?? r?.label ?? akt.res)}
          <small>${esc(sk?.label ?? '')}</small></span>
        <span class="bar"><i id="aktprog" style="width:${pct}%"></i></span>
        <span class="t2">${MINE?.ms ? `cykl ${(MINE.ms / 1000).toFixed(1)} s · ` : ''}zostało <b id="aktczas">${zostalo != null ? zostalo.toFixed(1) : '—'}</b> s${r?.xp ? ` · ${r.xp} exp za cykl` : ''}</span>
      </span>
    </button>
    <button class="btn" data-act="minestop">Przerwij</button>
  </div>`;
}

function renderSkille() {
  let h = `<div class="scr-head">
    <button class="lnk" data-act="tab" data-tab="postac">‹ ${esc(S.name)}</button>
    <span>${skillTab === 'bojowe' ? 'SKILLE BOJOWE' : skillTab === 'atrybuty' ? 'ATRYBUTY' : 'SKILLE ZBIERACKIE'}</span></div>`;

  h += `<div class="segs">
    <button data-act="skilltab" data-t="zbierackie" aria-selected="${skillTab === 'zbierackie'}">Zbierackie</button>
    <button data-act="skilltab" data-t="bojowe" aria-selected="${skillTab === 'bojowe'}">Bojowe</button>
    <button data-act="skilltab" data-t="atrybuty" aria-selected="${skillTab === 'atrybuty'}">
      Atrybuty${S.unspentAttr ? ` · ${S.unspentAttr}` : ''}</button>
  </div>`;

  // DUZY BOX „CO ROBISZ TERAZ" — TYLKO NA ZBIERACKICH.
  // Stał wcześniej na wszystkich trzech sekcjach, bo zbieranie leci także podczas
  // oglądania Bojowych i Atrybutów. Ale tam nie ma czego nim zrobić — zjadał tylko
  // wysokość, a od sygnalizowania „coś leci" jest koło w górnej belce, widoczne
  // z każdego ekranu i prowadzące jednym kliknięciem tutaj.
  if (skillTab === 'zbierackie') h += pasekAktywnosci();

  if (skillTab === 'bojowe') return h + sekcjaBojowe();
  if (skillTab === 'atrybuty') return h + sekcjaAtrybuty();
  return h + sekcjaZbierackie();
}

function sekcjaAtrybuty() {
  const st = S.stats;
  const bz = S.statsBase ?? null;
  const rozdane = Object.values(st.attrsBase ?? {}).reduce((s, v) => s + (v || 0), 0);

  // DWIE KOLUMNY: po lewej rozdajesz punkty, po prawej OD RAZU widzisz, co z tego
  // wyszło. Wcześniej staty leżały pod listą atrybutów, więc żeby zobaczyć skutek
  // kliknięcia, trzeba było przewinąć w dół i z powrotem.
  let h = `<div class="two-col atryb">`;

  h += `<div class="col scrollbox">`;
  h += `<div class="card ${S.unspentAttr ? 'hi' : ''} row">
    <div class="grow"><div class="t1">Punkty do rozdania</div>
      <div class="t2">10 na start, 3 za każde zdobyte piętro</div></div>
    <span class="num big-n">${S.unspentAttr}</span>
    ${rozdane ? `<button class="btn ghost" data-act="attrreset" title="Zwraca wszystkie rozdane punkty do puli — za darmo">Reset</button>` : ''}
  </div>`;
  for (const k of ['sila', 'precyzja', 'intelekt', 'zrecznosc', 'szczescie', 'witalnosc']) {
    const total = st.attrs[k] ?? 0;
    const baza = st.attrsBase?.[k] ?? total;
    const zeSprz = total - baza;
    // Na telefonie wiersz jest WĄSKI: nazwa, wartość i „+". Opis i rozbicie
    // chowają się pod „i”, bo siedem opisów nie mieści się na jednym ekranie,
    // a gracz przychodzi tu żeby ROZDAĆ PUNKTY, nie żeby czytać.
    // Na szerokim ekranie miejsca jest dość, więc wszystko stoi otwarte —
    // decyduje CSS, nie drugi wariant szablonu.
    const otw = OPISY_OTWARTE.has(k);
    h += `<div class="card row attr-row ${otw ? 'otwarty' : ''}">
      <div class="grow">
        <div class="t1">${ATTR_LABEL[k]}</div>
        <div class="opis">
          <div class="t2">${ATTR_DESC[k]}</div>
          <div class="t2">punkty ${nf(baza)}${zeSprz ? ` · sprzęt <b style="color:var(--brass)">+${nf(zeSprz)}</b>` : ''}</div>
        </div>
      </div>
      <button class="info-btn" data-act="opis" data-k="${k}"
        aria-expanded="${otw}" title="${esc(ATTR_DESC[k])}">i</button>
      <span class="num attr-n" title="Łącznie z punktów i sprzętu">${nf(total)}</span>
      <button class="btn" data-act="attr" data-attr="${k}" ${S.unspentAttr ? '' : 'disabled'}>+</button>
    </div>`;
  }
  h += `</div>`;

  h += `<div class="col scrollbox">
    <div class="sec">Co z tego wychodzi</div>
    ${statyPelne(st, bz, true)}
    <div class="t2" style="margin-top:8px">Pierwsza liczba to wartość łączna. Pod nią widać,
      ile z niej niosą Twoje punkty i poziom, a ile dokłada założony sprzęt.</div>
  </div>`;

  return h + `</div>`;
}

// PEŁNY KOMPLET STATYSTYK WYNIKOWYCH — jedno miejsce dla ekranu atrybutów
// i karty gracza, inaczej Celność i Unik trzeba by dopisywać dwa razy.
//
// `baza` to te same statystyki policzone Z PUSTYMI SLOTAMI (`statsBase` z serwera).
// Różnica między nią a stanem faktycznym JEST wkładem sprzętu — nie ma tu drugiego
// wzoru, który mógłby się rozjechać z computeStats().
//
// `pelne` przełącza na wykład: skąd liczba się bierze, co ją podnosi i gdzie ma
// sufit. Karta gracza woła bez tego i dostaje ciasną siatkę jak dotąd.
function statyPelne(st, baza = null, pelne = false) {
  // JEDNA ZASADA NA WSZYSTKIE LICZBY W ROZBICIACH: maksimum dwa miejsca
  // po przecinku, bez zbędnych zer na końcu. Wcześniej każde miejsce miało
  // własne zaokrąglenie — procenty jedno miejsce, mnożniki dwa, a różnica
  // sprzętu żadnego, przez co wychodziło „+18,545".
  const lb = v => {
    const r = Math.round(v * 100) / 100;
    return Number.isInteger(r) ? nf(r) : r.toFixed(2).replace('.', ',');
  };
  const pct = v => `${lb(v * 100)}%`;
  const dwa = v => lb(v);
  const F = S.formuly ?? {};
  const A = st.attrs ?? {};
  const B = st.breakdown ?? {};

  // To samo co w zeSprzetu: różnica z surowych wartości, zaokrąglenie na końcu.
  const R = (klucz, fmt = nf) => {
    if (!baza) return '';
    const b = baza.raw?.[klucz] ?? baza[klucz], t = st.raw?.[klucz] ?? st[klucz];
    if (b == null || t == null) return '';
    const d = t - b;
    if (Math.abs(d) < 0.5) return `Twoje ${fmt(baza[klucz])}`;
    return `Twoje ${fmt(baza[klucz])} · sprzęt <b>${d > 0 ? '+' : '−'}${fmt === nf ? lb(Math.abs(d)) : fmt(Math.abs(d))}</b>`;
  };

  if (!pelne || !F.hpPerStamina) {
    // Zwięzła siatka: karta gracza, a także awaryjnie stary serwer bez S.formuly.
    const w = (k, v, tip, skad) => `<div class="stat-box" title="${esc(tip)}">
      <span class="k">${k}</span><span class="v">${v}</span>${skad ? `<span class="skad">${skad}</span>` : ''}</div>`;
    return `<div class="statgrid staty-rozbite">
      ${w('Zdrowie', nf(st.maxHp), 'Nie wraca między falami.', R('maxHp'))}
      ${w('Atak', nf(st.damage), 'Obrażenia jednego ciosu.', R('damage'))}
      ${w('Obrona', nf(st.armor), 'Pancerz.', R('armor'))}
      ${w('Attack Speed', dwa(st.attackSpeed ?? st.speed / 20), 'Ciosy na sekundę.', R('attackSpeed', dwa))}
      ${w('Celność', pct(st.accuracy), 'Szansa na trafienie.', R('accuracy', pct))}
      ${w('Unik', pct(st.evasion), 'Szansa na uniknięcie ciosu.', R('evasion', pct))}
      ${w('Kryt', pct(st.crit), 'Szansa na krytyka.', R('crit', pct))}
      ${w('Siła kryta', `×${dwa(st.critMult)}`, 'Mnożnik krytyka.', R('critMult', dwa))}
      ${w('Moc', nf(st.power), 'Atak, zdrowie i pancerz w jednej liczbie.', R('power'))}
      ${st.block ? w('Blok', pct(st.block), 'Wymaga tarczy.', R('block', pct)) : ''}
      ${st.maxMana ? w('Mana', nf(st.maxMana), 'Zaklęcia nią płacą.', R('maxMana')) : ''}
    </div>`;
  }

  // ---- wersja pełna: kompaktowa karta na statystykę ----
  // Poprzednia wersja była wykładem: trzy akapity prozy na każdą statystykę.
  // Gracz nie czyta eseju za każdym wejściem — chce zobaczyć SKŁADNIKI liczby
  // i jedną rzecz, której nie da się wywnioskować. Stąd rządek boxów zamiast zdań.
  const kafle = (...pary) => {
    const w = pary.filter(p => p && p[1] !== null && p[1] !== undefined && p[1] !== '');
    return w.length ? `<div class="skladniki">${w.map(([et, v, mocny]) =>
      `<span class="sk ${mocny ? 'mocny' : ''}"><i>${et}</i><b>${v}</b></span>`).join('')}</div>` : '';
  };
  const karta = (nazwa, wartosc, skladniki, nota) => `
    <div class="statcard">
      <div class="statcard-head"><span class="nm">${nazwa}</span><span class="val">${wartosc}</span></div>
      ${skladniki}
      ${nota ? `<div class="nota">${nota}</div>` : ''}
    </div>`;

  const hp = B.hp ?? {};
  const dmg = B.dmg ?? {};
  const attrGlowny = { dwureczna: 'Siła', jednoreczna: 'Siła',
    dystansowe: 'Precyzja', magiczne: 'Intelekt' }[st.wtype] ?? 'Siła';
  // WKŁAD SPRZĘTU. Liczony z SUROWYCH wartości (`raw`), a zaokrąglany DOPIERO
  // na końcu. Wcześniej odejmowałem dwie osobno zaokrąglone liczby i wynik potrafił
  // ZMALEĆ przy rosnącej statystyce: przy Sile 8 chip pokazywał „+19", przy 10 „+18",
  // choć atak w tym czasie rósł z 24,67 na 25,09. Znikający punkt brał się z tego,
  // że liczba pomocnicza (postaci bez sprzętu) przeskakiwała próg zaokrąglenia
  // wcześniej niż prawdziwa. Teraz różnica jest monotoniczna.
  const zeSprzetu = (klucz, fmt = nf) => {
    if (!baza) return null;
    const t = st.raw?.[klucz] ?? st[klucz];
    const b = baza.raw?.[klucz] ?? baza[klucz];
    if (t == null || b == null) return null;
    const d = t - b;
    if (Math.abs(d) < 0.5) return null;
    return `${d > 0 ? '+' : '−'}${fmt === nf ? lb(Math.abs(d)) : fmt(Math.abs(d))}`;
  };

  return `<div class="statcards">
    ${karta('Zdrowie', nf(st.maxHp), kafle(
      ['baza', nf(hp.baza ?? F.startHp)],
      ['witalność', nf(hp.zWytrzymalosci ?? 0)],
      ['poziom', nf(hp.zPoziomu ?? 0)],
      ['sprzęt', zeSprzetu('maxHp'), true]),
      'Nie wraca między falami ani po porażce.')}

    ${karta('Atak', nf(st.damage), kafle(
      ['płaskie', nf(dmg.plaskie ?? F.baseDamage)],
      ['×atrybuty', dwa(dmg.attrMult ?? 1)],
      [(dmg.bonusMult ?? 1) !== 1 ? '×bonusy' : null, (dmg.bonusMult ?? 1) !== 1 ? dwa(dmg.bonusMult) : null],
      ['sprzęt', zeSprzetu('damage'), true]),
      `Broń decyduje, który atrybut niesie obrażenia — teraz <b>${attrGlowny}</b>. Reszta liczy się z wagą ${F.offAttrWeight}.`)}

    ${karta('Obrona', nf(st.armor), kafle(
      ['pancerz', nf(st.armor)],
      [F.armorModel === 'barrier' ? 'pula' : null, F.armorModel === 'barrier' ? nf(st.armorPool ?? st.armor) : null, true],),
      F.armorModel === 'barrier'
        ? `Druga pula życia, nie redukcja. <b>Przebicie i magia ją omijają</b>, Zmiażdżenie łamie ×${F.crushVsArmorMult}. Wraca co walkę.`
        : 'Zbija otrzymywane obrażenia procentowo.')}

    ${karta('Attack Speed', dwa(st.attackSpeed ?? st.speed / 20), kafle(
      ['zręczność', nf(A.zrecznosc ?? 0)],
      ['sprzęt', zeSprzetu('attackSpeed', dwa), true]),
      'Ciosy na sekundę. Ta sama skala u Ciebie i u mobów.')}

    ${karta('Celność', pct(st.accuracy), kafle(
      ['precyzja', nf(A.precyzja ?? 0)],
      ['sprzęt', zeSprzetu('accuracy', pct), true],
      ['widełki', `${pct(F.accuracyMin)}–${pct(F.accuracyMax)}`]),
      'Pudło to stracona tura. Pewnego trafienia nie ma.')}

    ${karta('Unik', pct(st.evasion), kafle(
      ['zręczność', nf(A.zrecznosc ?? 0)],
      ['sprzęt', zeSprzetu('evasion', pct), true]),
      'Liczy się przeciw celności atakującego.')}

    ${karta('Kryt', pct(st.crit), kafle(
      ['baza', pct(F.critBase)],
      ['szczęście', nf(A.szczescie ?? 0)],
      ['sprzęt', zeSprzetu('crit', pct), true]),
      `Szczęście daje +${(100 / (F.agiCritDivisor ?? 500)).toFixed(1)}% za punkt.`)}

    ${karta('Siła kryta', `×${dwa(st.critMult)}`, kafle(
      ['baza', `×${dwa(F.critMultBase)}`],
      ['sprzęt', zeSprzetu('critMult', dwa), true]),
      'Bez szansy na kryta nie daje nic — działają wyłącznie razem.')}

    ${karta('Moc', nf(st.power), kafle(
      ['atak ×3', nf(st.damage * 3)],
      ['zdrowie ×0,5', nf(Math.round(st.maxHp * 0.5))],
      ['pancerz ×1,5', nf(Math.round(st.armor * 1.5))],
      ['sprzęt', zeSprzetu('power'), true]),
      'Ustawia Cię w rankingu. Do walki NIE wchodzi.')}

    ${st.block ? karta('Blok', pct(st.block), kafle(
      ['sprzęt', zeSprzetu('block', pct), true]),
      'Wymaga tarczy — broń dwuręczna wyklucza blok.') : ''}

    ${st.maxMana ? karta('Mana', nf(st.maxMana), kafle(
      ['baza', nf(F.manaBase)],
      ['intelekt', `${nf(A.intelekt ?? 0)} × ${F.manaPerInt}`],
      ['na turę', `+${F.manaRegenPerTurn}`, true]),
      'Zaklęcia płacą maną. Pasek ultimate to osobny zasób.') : ''}

    ${A.witalnosc ? karta('Regeneracja', `+${nf(Math.round(A.witalnosc * F.hpRegenPerVit))}`, kafle(
      ['witalność', nf(A.witalnosc)],
      ['za punkt', `+${F.hpRegenPerVit}`]),
      'HP na turę, tylko w walce.') : ''}
  </div>`;
}

function sekcjaZbierackie() {
  const s = S.skills[skillOpen];
  const akt = S.activity;

  let h = '';
  h += `<div class="three-col zbierackie">`;

  // ---- bok: lista profesji (wąski słupek, na telefonie pasek) ----
  h += `<div class="col skill-list">`;
  for (const [id, sk] of Object.entries(S.skills)) {
    const kopie = akt?.skill === id;
    h += `<button class="skillrow ${id === skillOpen ? 'on' : ''}" data-act="skill" data-id="${id}">
      <span class="ic">${sk.ic}</span>
      <span class="grow">
        <span class="nm">${esc(sk.label)}</span>
        <span class="lv">${sk.grywalne ? `Lv. ${sk.lvl}` : 'wkrótce'}</span>
      </span>
      ${kopie ? '<span class="dot"></span>' : ''}
    </button>`;
  }
  h += `</div>`;

  // ---- środek: surowce wybranej profesji ----
  h += `<div class="col skill-mid">`;
  if (!s.grywalne) {
    h += `<div class="card"><div class="t1">${esc(s.label)}</div>
      <div class="t2">Jeszcze nie działa. Docelowo: ${esc(s.daje)} — zasila ${esc(s.zasila)}.</div></div>`;
    for (const [nazwa, lv] of s.ladder ?? []) {
      h += `<div class="card row locked compact">
        <div class="grow"><div class="t1">${esc(nazwa)}</div></div>
        <span class="num">Lv.${lv}</span></div>`;
    }
  } else {
    h += `<div class="card xp-card">
      <div class="row">
        <div class="grow"><div class="t1">${esc(s.label)} · poziom ${s.lvl}</div>
          <div class="t2">${s.xp} / ${s.xpNeed} exp</div></div>
      </div>
      <div class="bar xp big" style="margin-top:6px"><i style="width:${Math.round(s.xp / s.xpNeed * 100)}%"></i></div>
    </div>`;

    if (skillOpen === 'kowalstwo') {
      h += `<div class="segs smith-cats">${Object.entries(S.smithing.categories).map(([id, label]) =>
        `<button data-act="smithcat" data-c="${id}" aria-selected="${smithCategory === id}">${esc(label)}</button>`
      ).join('')}</div>`;
    }
    if (skillOpen === 'gornictwo') {
      h += `<div class="segs smith-cats">${Object.entries(S.mining.categories).map(([id, label]) =>
        `<button data-act="miningcat" data-c="${id}" aria-selected="${miningCategory === id}">${esc(label)}</button>`
      ).join('')}</div>`;
    }
    if (['rybolowstwo', 'rolnictwo', 'gotowanie'].includes(skillOpen)) {
      const filtr = lifeFilter[skillOpen] ?? 'all';
      h += `<div class="life-filters">${Object.entries(s.categories ?? {}).map(([id, label]) =>
        `<button data-act="lifefilter" data-c="${id}" aria-selected="${filtr === id}">${esc(label)}</button>`
      ).join('')}</div>`;
      if (skillOpen === 'gotowanie') {
        h += `<input id="cooksearch" class="cook-search" type="search" value="${esc(cookingSearch)}" placeholder="Szukaj przepisu lub składnika…" aria-label="Szukaj przepisu">`;
      }
      if (s.mastery) h += `<div class="card compact mastery"><div class="t2">Mistrzostwo 100: ${esc(s.mastery)}</div></div>`;
    }

    const mam = Object.fromEntries((S.materials ?? []).map(m => [m.id, m.count]));
    const nazwaMat = S.matNames ?? {};

    if (skillOpen === 'gornictwo' && miningCategory === 'equipment') {
      const katalog = S.skills.kowalstwo.resources
        .filter(r => r.output?.type === 'mining')
        .sort((a, b) => a.lvl - b.lvl || a.label.localeCompare(b.label, 'pl'));
      h += `<div class="card"><div class="t1">Sprzęt do Górnictwa</div>
        <div class="t2">Wykuwasz go w Kowalstwie. Poziom poniżej jest też wymaganiem założenia.</div></div>`;
      for (const r of katalog) {
        const mozesz = s.lvl >= r.lvl;
        h += `<div class="card row compact ${mozesz ? '' : 'locked'}">
          <div class="icon">${SKILL_SLOT_ICON[r.output.slot] ?? '⛏'}</div>
          <div class="grow"><div class="t1">${esc(r.label)}</div>
            <div class="t2">${esc(S.mining.slots[r.output.slot])} · Kowalstwo ${r.lvl} · założysz od Górnictwa ${r.lvl}</div></div>
          <span class="badge ${mozesz ? 'on' : ''}">${mozesz ? 'MOŻESZ' : `Lv.${r.lvl}`}</span>
        </div>`;
      }
    }

    if (skillOpen === 'kowalstwo' && smithCategory === 'furnace') {
      const piec = S.smithing.furnace ?? { coal: 0, looseCoal: mam.wegiel ?? 0 };
      h += `<div class="card hi furnace-card">
        <div class="furnace-flame" aria-hidden="true">🔥</div>
        <div class="grow"><div class="t1">Piec kowalski</div>
          <div class="t2">Węgiel (Coal) załadowany do pieca jest paliwem dla każdej sztabki.</div>
          <div class="furnace-stock"><b>${nf(piec.coal)}</b><span>w piecu</span></div>
          <div class="t2">W plecaku: ${nf(piec.looseCoal)} · paliwo schodzi dopiero po ukończeniu wytopu.</div>
        </div>
        <div class="furnace-actions">
          <button class="btn" data-act="furnace" data-action="deposit" data-amount="1" ${piec.looseCoal >= 1 ? '' : 'disabled'}>Dołóż 1</button>
          <button class="btn" data-act="furnace" data-action="deposit" data-amount="10" ${piec.looseCoal >= 1 ? '' : 'disabled'}>Dołóż 10</button>
          <button class="btn solid" data-act="furnace" data-action="deposit" data-amount="all" ${piec.looseCoal >= 1 ? '' : 'disabled'}>Dołóż cały</button>
          <button class="btn ghost" data-act="furnace" data-action="withdraw" data-amount="all" ${piec.coal >= 1 ? '' : 'disabled'}>Wyjmij</button>
        </div>
      </div>
      <div class="card"><div class="t1">Zużycie paliwa</div>
        <div class="t2">Miedź–Złoto: 1 Węgiel · Mithril–Adamantyt: 2 · Runite: 3 · Mistyczna: 4 · Niebiańska: 5.</div></div>`;
    }

    let pokaz = skillOpen === 'kowalstwo'
      ? s.resources.filter(r => r.category === smithCategory)
      : skillOpen === 'gornictwo'
        ? s.resources.filter(r => r.category === miningCategory)
        : s.resources;
    if (['rybolowstwo', 'rolnictwo', 'gotowanie'].includes(skillOpen)) {
      const filtr = lifeFilter[skillOpen] ?? 'all';
      pokaz = pokaz.filter(r => filtr === 'all' || r.category === filtr);
      if (skillOpen === 'gotowanie' && cookingSearch.trim()) {
        const q = cookingSearch.trim().toLocaleLowerCase('pl');
        pokaz = pokaz.filter(r => `${r.label} ${Object.keys(r.koszt ?? {}).map(id => nazwaMat[id] ?? id).join(' ')}`.toLocaleLowerCase('pl').includes(q));
      }
    }
    for (const r of pokaz) {
      const kopie = akt?.res === r.id;
      if (skillOpen === 'rybolowstwo') {
        // ŁOWISKO TO MIEJSCE, NIE PRODUKT. Wcześniej cała tabela połowu wisiała
        // na kaflu łowiska — sardynka, płotka i pstrąg sklejone w jedną kartę, choć
        // to trzy różne produkty. Teraz kafel łowiska niesie SAMĄ AKCJĘ, a szanse
        // chowają się pod „i". Złowione ryby mają własne kafle niżej.
        const dostepne = (r.catchTable ?? []).filter(x => x.unlocked);
        const suma = dostepne.reduce((a2, x) => a2 + (x.weight ?? 0), 0) || 1;
        const tip = chmurka(r.unlocked ? 'Co się łowi:' : 'Zamknięte',
          r.unlocked
            ? [...dostepne.map(x => `${esc(x.label)} <b>${Math.round((x.weight ?? 0) / suma * 100)}%</b>`),
               dostepne.length < (r.catchTable ?? []).length
                 ? '<i>Wyższe poziomy Wędkarstwa otwierają kolejne gatunki</i>' : null]
            : [`Otwiera się na poziomie ${r.lvl}`]);
        h += `<div class="card res-row life-card lowisko ${r.unlocked ? '' : 'locked'} ${kopie ? 'hi' : ''}">
          <div class="row">
            <div class="icon">${r.ic ?? '🎣'}</div>
            <div class="grow"><div class="t1">${esc(r.label)}${tip}</div>
              <div class="t2">${r.unlocked ? `${czasKrotki(r.effectiveMs ?? r.ms)} · ważony połów` : `otwiera się na poziomie ${r.lvl}`}</div></div>
          </div>
          ${!r.unlocked ? `<span class="akcja zgaszona">Wymaga poziomu ${r.lvl}</span>`
            : kopie ? '<span class="akcja leci">Łowienie<i></i></span>'
            : `<button class="akcja" data-act="mine" data-res="${r.id}">Łów</button>`}
        </div>`;
        continue;
      }
      if (skillOpen === 'rolnictwo') {
        const outputy = r.outputs ?? [];
        // Ile masz — na ZNACZKU w rogu, nie w środku zdania. Liczba schowana
        // między nazwą a widelkami plonu ginieła: gracz skanuje kafle wzrokiem
        // i szuka jednej rzeczy, a musiał ją czytać ze zdania.
        // „Drop: 2–4 szt." zamiast „Ziemniak 2–4". Nazwa surowca stoi już w tytule
        // kafla — powtarzanie jej w linii plonu zjadało miejsce i nic nie wnosiło.
        // Gdy uprawa daje KILKA różnych rzeczy, wtedy nazwy są potrzebne i wracają.
        const jedno = outputy.length === 1;
        const plon = jedno
          ? `Drop: ${outputy[0].yield?.[0] ?? 1}–${outputy[0].yield?.[1] ?? 1} szt.`
          : 'Drop: ' + outputy.map(x => `${x.label} ${x.yield?.[0] ?? 1}–${x.yield?.[1] ?? 1}`).join(' · ');
        // Dopiski w rodzaju „Odnawialny produkt zwierzęcy" schodzą do „i”.
        // Czyta się je RAZ, a na kaflu rosły o cały wiersz i rozpychały siatkę.
        const tipRol = chmurka('Co daje:', [
          ...outputy.map(x => `${esc(x.label)} <b>${x.yield?.[0] ?? 1}–${x.yield?.[1] ?? 1} szt.</b>`),
          r.animalMode === 'renewable' ? '<i>Odnawialny produkt zwierzęcy — zwierzę zostaje</i>'
            : r.animalMode ? '<i>Ubój — zbiór jednorazowy</i>' : null,
        ]);
        const ileMam = outputy.reduce((sum, x) => sum + (mam[x.id] ?? 0), 0);
        h += `<div class="card res-row life-card ${r.unlocked ? '' : 'locked'} ${kopie ? 'hi' : ''}">
          <div class="row">
          <div class="icon">${r.ic ?? (r.category === 'animals' ? '🐑' : r.category === 'fruit' ? '🍎' : '🌱')}</div><div class="grow"><div class="t1">${esc(r.label)}${tipRol}</div>
          <div class="t2">${r.unlocked ? `${r.xp} exp · ${czasKrotki(r.effectiveMs ?? r.ms)}` : `otwiera się na poziomie ${r.lvl}`}</div>
          <div class="t2 life-output">${esc(plon)}</div></div>
          ${ileMam ? `<span class="mam" title="Tyle masz w plecaku">×${nf(ileMam)}</span>` : ''}
          </div>
          ${!r.unlocked ? `<span class="akcja zgaszona">Wymaga poziomu ${r.lvl}</span>`
            : kopie ? '<span class="akcja leci">Zbieranie<i></i></span>'
            : `<button class="akcja" data-act="mine" data-res="${r.id}">Zbieraj</button>`}
        </div>`;
        continue;
      }
      if (skillOpen === 'gotowanie') {
        const selected = cookingSelected === r.id;
        const koszt = Object.entries(r.koszt ?? {});
        const stac = koszt.every(([id, ile]) => (mam[id] ?? 0) >= ile);
        // AKCJE SIEDZĄ NA KAFLU, nie w panelu obok. Panel zajmował całą czwartą
        // kolumnę po to, żeby trzymać dwa przyciski — a żeby ich użyć, trzeba było
        // najpierw kliknąć kafel, potem przenieść wzrok w prawo i kliknąć drugi raz.
        // Składniki schodzą do chmurki pod „i” przy nazwie. Na kaflu zostaje to,
        // co potrzebne do DECYZJI: co to jest, ile masz i przycisk. Czego trzeba,
        // czyta się raz — i wtedy się to otwiera.
        const tipSkl = chmurka(koszt.length ? 'Potrzebujesz:' : 'Składniki',
          koszt.length
            ? koszt.map(([id, ile]) =>
                `${esc(S.matNames[id] ?? id)} <b>${ile} szt.</b> <i>(masz ${nf(mam[id] ?? 0)})</i>`)
            : ['Nie wymaga składników.']);
        const brakuje = koszt.filter(([id, ile]) => (mam[id] ?? 0) < ile)
          .map(([id]) => S.matNames[id] ?? id);
        // BEZ PRZYCISKÓW. Cały kafel jest przyciskiem — tak jak w każdej innej
        // profesji. „Ugotuj 1" i „Gotuj wszystko" robiły prawie to samo: tryb ciągły
        // i tak leci do przerwania albo do wyczerpania składników, a to jest sekcja
        // Gotowania, więc nie trzeba pisać na kaflu, że się w niej gotuje.
        // KARTA JEST <div>, NIE <button>. „i” przy nazwie jest przyciskiem, a przycisk
        // w przycisku przeglądarka rozcina: zewnętrzny zamyka się przed wewnętrznym
        // i połowa kafla ląduje poza kartą. Klikalna jest ETYKIETA AKCJI na dole.
        h += `<div class="card res-row life-card cook-card ${r.unlocked ? '' : 'locked'} ${kopie ? 'hi' : ''}">
          <div class="row">
            <div class="icon">${r.ic ?? (r.category === 'drink' ? '🥤' : r.category === 'dessert' ? '🍰' : r.category === 'fish' ? '🐟' : r.category === 'meat' ? '🍖' : '🥘')}</div>
            <div class="grow"><div class="t1">${esc(r.label)}${r.unlocked
              ? `${tipSkl}` : ''}</div>
              <div class="t2">${r.unlocked ? `${r.xp} exp · ${czasKrotki(r.effectiveMs ?? r.ms)}` : `otwiera się na poziomie ${r.lvl}`}</div></div>
            ${(mam[r.id] ?? 0) ? `<span class="mam" data-mam="${esc(r.id)}" title="Tyle masz w plecaku">×${nf(mam[r.id])}</span>` : ''}
          </div>
          ${!r.unlocked ? `<div class="skladniki-lin"><span class="skl bad">Wymaga poziomu ${r.lvl}</span></div>`
            : brakuje.length ? `<div class="skladniki-lin"><span class="skl bad">Brakuje: ${esc(brakuje.join(', '))}</span></div>` : ''}
          ${!r.unlocked ? '' : kopie
            ? '<span class="akcja leci">Gotowanie<i></i></span>'
            : `<button class="akcja ${stac ? '' : 'zgaszona'}" ${stac
                ? `data-act="cookstart" data-res="${r.id}" data-mode="all"` : 'disabled'}>Wytwórz</button>`}
        </div>`;
        continue;
      }
      // Licznik siedzi bezpośrednio na plakietce źródła. Dla Wytapiania
      // pokazujemy gotową sztabkę; dla zbierania i pozostałych profesji materiał
      // o id receptury. Sprzęt nie jest materiałem, więc ma własny plecak.
      const ownedId = r.output?.type === 'material' ? r.output.id
        : !r.output && !r.daje?.mikstura && !r.daje?.potion ? r.id : null;
      // MIKSTURY NIE LEŻĄ W MATERIAŁACH — mają własny worek (`S.mikstury`), więc
      // `ownedId` był dla nich celowo zerowany i Alchemia jako jedyna profesja
      // nie pokazywała, ile się ma. Teraz czytamy z tamtej listy.
      const potkaId = r.daje?.mikstura ?? r.daje?.potion ?? null;
      const owned = potkaId
        ? ((S.mikstury ?? []).find(m => m.id === potkaId)?.count ?? 0)
        : (ownedId ? (mam[ownedId] ?? 0) : null);
      // Zamknięte złoża z zerowym stanem nie dostają dodatkowej plakietki —
      // na telefonie liczy się każdy wiersz i każdy piksel. Jeśli gracz ma już
      // dany surowiec (np. po zmianie balansu poziomów), licznik nadal pokażemy.
      const showOwned = owned !== null && (r.unlocked || owned > 0);
      const mamId = potkaId ?? ownedId ?? r.id;
      // Profesja przetwarzająca potrzebuje wsadu — pokazujemy go wprost
      // i blokujemy, gdy go brakuje.
      const koszt = r.koszt ? Object.entries(r.koszt) : null;
      const fuel = r.fuel ?? 0;
      const fuelOk = !fuel || (S.smithing.furnace?.coal ?? 0) >= fuel;
      const staC = (!koszt || koszt.every(([id, ile]) => (mam[id] ?? 0) >= ile)) && fuelOk;
      const kosztTxt = koszt
        ? koszt.map(([id, ile]) => `${nazwaMat[id] ?? id} ${mam[id] ?? 0}/${ile}`).join(' · ')
        : null;
      const fuelTxt = fuel ? `Piec: Węgiel ${S.smithing.furnace?.coal ?? 0}/${fuel}` : null;

      const smith = skillOpen === 'kowalstwo';
      const directSmelt = smith && r.output?.type === 'material';
      const akcja = smith
        ? (r.unlocked ? `data-act="smithstart" data-res="${r.id}" data-mode="${directSmelt ? 'all' : 'once'}"` : 'disabled')
        : (r.unlocked && staC ? `data-act="mine" data-res="${r.id}"` : 'disabled');
      // Karta jest <div>, akcja na dole jest <button> — patrz komentarz przy kaflu
      // Gotowania: przycisk w przycisku przeglądarka rozcina.
      const tipCraft = chmurka(koszt || fuel ? 'Potrzebujesz:' : 'Składniki', [
        ...(koszt ? koszt.map(([id, ile]) =>
          `${esc(nazwaMat[id] ?? id)} <b>${ile} szt.</b> <i>(masz ${nf(mam[id] ?? 0)})</i>`) : []),
        fuel ? `Piec: Węgiel <b>${fuel}</b> <i>(masz ${S.smithing.furnace?.coal ?? 0})</i>` : null,
        !koszt && !fuel ? 'Nie wymaga składników.' : null,
      ]);
      h += `<div class="card res-row craft-card ${r.unlocked ? '' : 'locked'} ${kopie || smithSelected === r.id ? 'hi' : ''}">
        <div class="row">
        <div class="icon">${!r.unlocked ? '🔒' : r.kind === 'magic' ? '✦' : r.daje?.potion ? '🧪' : r.output?.type === 'mining' ? '⛏' : r.output?.type === 'combat' ? '⚔' : koszt ? '🔥' : '🪨'}</div>
        <div class="grow">
          <div class="t1">${esc(r.nodeLabel ?? r.label)}${r.daje?.potion ? ` ×${r.daje.potion}` : ''}${r.unlocked
            ? `${tipCraft}` : ''}</div>
          <div class="t2">${!r.unlocked
            ? `otwiera się na poziomie ${r.lvl}`
            : `${r.xp} exp · ${((r.effectiveMs ?? r.ms) / 1000).toFixed(1)} s`}</div>
          ${kosztTxt
            ? `<div class="t2" style="color:${!r.unlocked ? 'var(--ink-mute)' : staC ? 'var(--brass)' : '#D9736B'}">z: ${esc(kosztTxt)}</div>` : ''}
          ${fuelTxt
            ? `<div class="t2" style="color:${!r.unlocked ? 'var(--ink-mute)' : fuelOk ? 'var(--brass)' : '#D9736B'}">${esc(fuelTxt)}</div>` : ''}
          ${r.buff ? `<div class="t2" style="color:var(--heal)">${esc(buffTxt(r.buff))}</div>` : ''}
          ${smith && r.unlocked ? `<div class="t2">${esc(r.special ? 'Receptura bossa · bez losowania jakości'
            : r.output?.type === 'material' ? 'Wytapianie do wyczerpania rudy lub paliwa'
            : Object.entries(r.qualityChances ?? {}).map(([id, n]) => `${S.smithing.qualities[id].label} ${n}%`).join(' · ') || 'Wykuwa jedną sztukę')}</div>` : ''}
          ${(() => {
            const pot = r.daje?.mikstura ? (S.miksturyInfo ?? []).find(m => m.id === r.daje.mikstura) : null;
            return pot ? `<div class="t2" style="color:var(--heal)">Leczy +${nf(pot.heal)} HP${pot.pct ? ` (${Math.round(pot.pct * 100)}% maks. zdrowia)` : ''}</div>` : '';
          })()}
        </div>
        ${showOwned && owned ? `<span class="mam" data-mam="${esc(String(mamId))}" title="Tyle masz w plecaku">×${nf(owned)}</span>` : ''}
        </div>
        ${!r.unlocked ? `<span class="akcja zgaszona">Wymaga poziomu ${r.lvl}</span>`
          : kopie
            ? `<span class="akcja leci">${directSmelt ? 'Przetapianie' : (smith || koszt) ? 'Tworzenie' : 'Wydobywanie'}<i></i></span>`
            : `<button class="akcja ${staC ? '' : 'zgaszona'}" ${staC ? akcja : 'disabled'}>${
                directSmelt ? 'Przetapiaj' : (smith || koszt) ? 'Wytwórz' : 'Wydobywaj'}</button>`}
      </div>`;
    }
  }
  h += `</div>`;

  // ---- prawa: co się teraz dzieje ----
  h += `<div class="col skill-now">`;
  // PANEL SZCZEGÓŁÓW KOWALSTWA ZOSTAŁ USUNIĘTY. Koszt, paliwo i jakość stoją
  // na kaflu receptury, a kliknięcie kafla JEST akcją — panel powtarzał te same
  // liczby i zabierał czwartą kolumnę liście receptur.


  // KARTA „Zestaw Skill" STĄD ZNIKŁA. Trzymała dwie liczby i przycisk do
  // Ekwipunku, a zajmowała całą trzecią kolumnę — przez co lista surowców
  // dostawała trzy wąskie kolumny zamiast czterech szerokich.
  // PANEL SZCZEGÓŁÓW GOTOWANIA ZOSTAŁ USUNIĘTY. Wszystko, co niesie — składniki,
  // stan spiżarni i oba przyciski — stoi teraz NA KAFLU przepisu, więc panel
  // zajmował czwartą kolumnę bez powodu i wymuszał dwa kliknięcia zamiast jednego.

  // KARTA „Aktywność" STĄD ZNIKŁA. Mówiła dokładnie to samo, co stała belka
  // nad treścią — dwa razy ta sama rzecz na jednym ekranie, a przy okazji
  // zajmowała całą prawą kolumnę, która jest potrzebna na przegląd skilli.

  h += `</div>`;

  h += `</div>`;
  return h;
}

// ---------------------------------------------------------------- PRZYWOŁANIE

let summonKind = 'companions';
let summonResult = null;      // { name, rarity, kind } — ostatnie losowanie

function renderSummon() {
  const keys = S.keys ?? 0;
  const stac = keys >= (S.keyCost ?? 1);

  let h = `<div class="scr-head">Przywołanie <span>KLUCZE ${keys}</span></div>`;

  h += `<div class="segs">
    <button data-act="summonkind" data-k="companions" aria-selected="${summonKind === 'companions'}">Sojusznicy</button>
    <button data-act="summonkind" data-k="pets"       aria-selected="${summonKind === 'pets'}">Pety</button>
  </div>`;

  h += `<div class="portal ${summonResult ? 'lit' : ''}">
    <div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div>
    <div class="core">${summonKind === 'pets' ? '🐾' : '⚔'}</div>
  </div>`;

  if (summonResult) {
    const rar = S.rarities[summonResult.rarity];
    h += `<div class="reveal" style="--rar:${rarityColor(summonResult.rarity)}">
      <div class="rar">${esc(rar?.label ?? summonResult.rarity)}</div>
      <div class="nm">${esc(summonResult.name)}</div>
      <div class="t2">Trafił do kolekcji. Zobaczysz go w Drużynie i w Kronice.</div>
    </div>`;
  }

  h += `<div class="card">
    <div class="row">
      <div class="grow"><div class="t1">Klucz Przywołania</div>
        <div class="t2">Jeden za zdobyte piętro, trzy za bossa aktu. Nie kupisz go za pieniądze.</div></div>
      <span class="num" style="font-size:22px;color:var(--brass)">${keys}</span>
    </div>
  </div>`;

  h += `<button class="btn solid big wide" data-act="summon" ${stac ? '' : 'disabled'}>
    ${stac ? `Przywołaj ×1 — 1 klucz` : 'Brak kluczy'}</button>`;

  // Szanse jawne od pierwszego dnia. System, który ukrywa liczby, uczy gracza
  // nieufności — a i tak je policzy.
  const wagi = S.summonOdds ?? {};
  const suma = Object.values(wagi).reduce((a, b) => a + b, 0) || 1;
  h += `<div class="sec">Szanse — ${summonKind === 'pets' ? 'pety' : 'sojusznicy'}</div>
    <div class="odds">
      ${Object.entries(wagi).map(([r, w]) => {
        const pct = w / suma * 100;
        return `<div class="oddrow" title="${w} na ${suma} losów">
          <span class="on" style="color:${rarityColor(r)}">${esc(S.rarities[r]?.label ?? r)}</span>
          <span class="ob"><i style="width:${Math.max(1.5, pct)}%;background:${rarityColor(r)}"></i></span>
          <span class="ov">${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span>
        </div>`;
      }).join('')}
    </div>
    <div class="t2" style="margin-top:6px">Te same wagi dla obu pul. Jedno losowanie nie może dać
      sojusznika zamiast peta — pule są rozdzielone.</div>`;

  h += `<div class="card" style="margin-top:8px"><div class="t2">Docelowo duplikaty podbijają gwiazdki,
    maksymalny duplikat zamienia się w esencję, a system dostaje <b>jawny pity</b>.
    Tego jeszcze nie ma.</div></div>`;

  return h;
}

// ---------------------------------------------------------------- KRONIKA

let logView = 'bestiariusz';
let logOpen = null;           // rozwinięty wpis bestiariusza

const LOG_TABS = [
  ['bestiariusz', 'Bestiariusz'], ['przedmioty', 'Przedmioty'], ['bossowie', 'Bossowie'],
  ['sojusznicy', 'Sojusznicy'], ['pety', 'Pety'], ['osiagniecia', 'Osiągnięcia'],
];

function renderKronika() {
  let h = `<div class="scr-head">Kronika <span>${esc((LOG_TABS.find(t => t[0] === logView) ?? [])[1] ?? '').toUpperCase()}</span></div>`;

  h += `<div class="logtabs">`;
  for (const [id, label] of LOG_TABS) {
    h += `<button class="${id === logView ? 'on' : ''}" data-act="logview" data-v="${id}">${label}</button>`;
  }
  h += `</div><div class="scrollbox">`;

  if (logView === 'bestiariusz') h += bestiariuszHtml(e => !e.family.includes('Strażnik'));
  else if (logView === 'bossowie') h += bestiariuszHtml(e => e.family.includes('Strażnik'));
  else if (logView === 'sojusznicy') h += kolekcjaHtml('companions', '👤', 'Sojusznicy przychodzą z Przywołania.');
  else if (logView === 'pety') h += kolekcjaHtml('pets', '🐺', 'Pety przychodzą z Przywołania.');
  else if (logView === 'przedmioty') {
    h += `<div class="card"><div class="t1">Katalog przedmiotów</div>
      <div class="t2">Jeszcze nie prowadzony. Docelowo każdy przedmiot, który raz przeszedł Ci przez ręce,
      zostaje tu na zawsze — z afiksami, źródłem i tym, gdzie wypada.</div></div>`;
  } else {
    h += `<div class="card"><div class="t1">Osiągnięcia</div>
      <div class="t2">Jeszcze nie prowadzone. Docelowo to one wracają do herbu:
      pełny bestiariusz Puszczy da symbol wilka, setny boss da obramowanie, Tytan da aurę.</div></div>`;
  }

  h += `</div>`;
  return h;
}

function bestiariuszHtml(filtr) {
  const lista = (S.bestiary ?? []).filter(filtr);
  const odkryte = lista.filter(e => e.seen).length;
  let h = `<div class="card"><div class="row">
    <div class="grow"><div class="t1">Odkryte</div>
      <div class="t2">Wpis otwiera się przy pierwszym zabiciu</div></div>
    <span class="num" style="font-size:17px;color:var(--brass)">${odkryte} / ${lista.length}</span>
  </div></div>`;

  for (const e of lista) {
    const open = logOpen === e.family;
    h += `<button class="card row ${e.seen ? '' : 'locked'}" data-act="logopen" data-f="${esc(e.family)}">
      <div class="icon">${e.seen ? (e.family.includes('Strażnik') ? '👑' : '👹') : '?'}</div>
      <div class="grow">
        <div class="t1">${e.seen ? esc(e.family) : '???'}</div>
        <div class="t2">${e.seen ? `zabity ${e.kills}×` : 'jeszcze niespotkany'}</div>
      </div>
      <span class="badge ${e.seen ? 'on' : ''}">${e.drops.filter(Boolean).length} / ${e.drops.length}</span>
    </button>`;

    if (open && e.seen) {
      h += `<div class="card sub">
        <div class="sec" style="margin-top:0">Trofea</div>
        ${e.drops.map(d => `<div class="stat"><span class="k">${d ? '✓' : '·'}</span>
          <span class="v" style="color:${d ? 'var(--ink)' : 'var(--ink-mute)'}">${d ? esc(d) : '???'}</span></div>`).join('')}
      </div>`;
    }
  }
  return h;
}

function kolekcjaHtml(kind, ic, pusto) {
  const lista = S.collection?.[kind] ?? [];
  if (!lista.length) return `<div class="card"><div class="t2">${pusto}</div></div>`;
  return lista.map(c => `<div class="card row">
    <div class="icon lg" style="border-color:${rarityColor(c.rarity)}">${ic}</div>
    <div class="grow">
      <div class="t1" style="color:${rarityColor(c.rarity)}">${esc(c.name)}</div>
      <div class="t2">${esc(S.rarities[c.rarity]?.label ?? c.rarity)}</div>
    </div>
  </div>`).join('');
}

// ---------------------------------------------------------------- STAŁY PASEK WALKI
// Widoczny na każdej zakładce. To on niesie tożsamość gry: wychodzisz do
// ekwipunku, a walka leci dalej i widzisz ją cały czas.

function paintCombatBar() {
  const bar = $('#combatbar');
  if (!bar || !S) return;

  // Na ekranie Przygód pasek dublował nazwę lokacji oraz oba paski HP z areny
  // i zabierał prawie 1/8 telefonu. Jest potrzebny wyłącznie wtedy, gdy walka
  // leci w tle, a gracz ogląda Ekwipunek, Drużynę albo Skille.
  if ($('#s-wyprawa')?.classList.contains('on')) { bar.hidden = true; return; }

  // Pasek żyje także wtedy, gdy run stoi i CZEKA NA DECYZJĘ — inaczej gracz
  // siedzi w Ekwipunku, a wyprawa stoi i on o tym nie wie.
  const czeka = S.expedition && (S.expedition.decyzja || S.expedition.safepoint);
  const trwa = FIGHT && (FIGHT.playing || AUTO || (FIGHT.mode === 'turowa' && !FIGHT.result));
  // TRZECI STAN PASKA: WYNIK. Do tej pory pasek po prostu ZNIKAŁ z końcem walki —
  // gracz siedzący w Skillach albo Ekwipunku dowiadywał się o porażce przez to,
  // że coś przestało się ruszać. Teraz pasek zostaje i mówi, jak poszło,
  // a po wyczyszczeniu piętra pozwala wejść wyżej BEZ wracania na Przygody.
  // Zapamiętujemy wynik, dopóki obiekt walki jeszcze żyje.
  if (FIGHT?.result) {
    OSTATNI_WYNIK = { result: FIGHT.result, hp: FIGHT.party?.[0]?.hp ?? 0,
      maxHp: FIGHT.party?.[0]?.maxHp ?? 0, context: FIGHT.context ?? {} };
  }
  const wynik = !trwa && !czeka && OSTATNI_WYNIK && !WYNIK_ZAMKNIETY;
  if (!trwa && !czeka && !wynik) { bar.hidden = true; return; }
  bar.hidden = false;

  if (wynik) {
    const R = OSTATNI_WYNIK.result;
    const meR = { hp: OSTATNI_WYNIK.hp, maxHp: OSTATNI_WYNIK.maxHp };
    const hpP = meR.maxHp ? Math.max(0, Math.round(meR.hp / meR.maxHp * 100)) : 0;
    const ctxR = OSTATNI_WYNIK.context ?? {};
    const nawieza = !['expedition', 'dungeon'].includes(ctxR.kind);
    bar.innerHTML = `
      <div class="cb-head">
        <span class="${R.win ? 'wyg' : 'prz'}">${R.win ? (R.floorCleared ? 'PIĘTRO ZDOBYTE' : 'WALKA WYGRANA') : 'PORAŻKA'}</span>
        <span>${nawieza ? `PIĘTRO ${ctxR.floor ?? S.floor} · FALA ${ctxR.step ?? '—'} / ${ctxR.total ?? S.fightsOnFloor}` : ''}</span>
      </div>
      <div class="cb-wynik">
        <span>Zdrowie <b class="${hpP < 40 ? 'prz' : ''}">${nf(meR?.hp ?? 0)} / ${nf(meR?.maxHp ?? 0)}</b></span>
        ${R.gold ? `<span>Złoto <b class="wyg">+${nf(R.gold)}</b></span>` : ''}
        ${R.potionsUsed ? `<span>Mikstury <b class="prz">−${R.potionsUsed}</b></span>` : ''}
        ${R.nagroda ? `<span>Punkty <b class="wyg">+${R.nagroda.attr}</b></span>` : ''}
      </div>
      <div class="cb-act">
        ${R.win && R.floorCleared && nawieza
          ? `<button class="cbtn go" data-act="advance">WEJDŹ NA PIĘTRO ${(ctxR.floor ?? S.floor) + 1}</button>`
          : `<button class="cbtn go" data-act="fight">${R.win ? 'NASTĘPNA FALA' : 'SPRÓBUJ PONOWNIE'}</button>`}
        <button class="cbtn" data-act="wynikzamknij" title="Chowa podsumowanie">ZAMKNIJ</button>
      </div>`;
    return;
  }

  if (!trwa && czeka) {
    const E = S.expedition;
    bar.innerHTML = `
      <div class="cb-head"><span>WYPRAWA — ETAP ${E.at + 1} / ${E.total}</span>
        <span>SAKWA ${E.sakwaCount}</span></div>
      <div class="cb-decyzja">${E.safepoint ? 'POSTÓJ — WYBIERZ, CO ODESŁAĆ' : 'DECYZJA — WYBIERZ DROGĘ'}</div>
      <div class="cb-act">
        <button class="cbtn go" data-act="tab" data-tab="wyprawa">ROZSTRZYGNIJ</button>
      </div>`;
    return;
  }

  // Wpisy logu niosą tylko HP — nazwa wroga siedzi w FIGHT.foeName, ustawiona przy starcie fali.
  const me = FIGHT.party?.[0];
  const foe = (FIGHT.enemies ?? []).find(e => e.alive) ?? FIGHT.enemies?.[0];
  const ctx = FIGHT.context ?? {};
  const ctxRun = ['expedition', 'dungeon'].includes(ctx.kind);
  const pct = (u) => u && u.maxHp ? Math.max(0, Math.round(u.hp / u.maxHp * 100)) : 0;

  bar.innerHTML = `
    <div class="cb-head">
      <span>${ctxRun ? (ctx.kind === 'dungeon' ? 'DUNGEON' : 'WYPRAWA')
        : `${esc(S.actName.toUpperCase())} — PIĘTRO ${ctx.floor ?? S.floor}`}</span>
      <span>${ctxRun
        ? `${ctx.kind === 'dungeon' ? 'KOMNATA' : 'ETAP'} ${ctx.step} / ${ctx.total}`
        : `FALA ${ctx.step ?? Math.min(S.fight + 1, S.fightsOnFloor)} / ${ctx.total ?? S.fightsOnFloor}`}</span>
    </div>
    <div class="cb-row"><span class="cb-n">${esc(S.name)}</span>

      <span class="bar hp"><i style="width:${pct(me)}%"></i></span><span class="cb-p">${pct(me)}%</span></div>
    <div class="cb-row"><span class="cb-n">${esc(foe?.name ?? FIGHT.foeName ?? '—')}</span>
      <span class="bar foe"><i style="width:${pct(foe)}%"></i></span><span class="cb-p">${pct(foe)}%</span></div>
    <div class="cb-act">
      <button class="cbtn ${SPEED === 1 ? 'on' : ''}" data-act="speed" data-v="1">×1</button>
      <button class="cbtn ${SPEED === 2 ? 'on' : ''}" data-act="speed" data-v="2">×2</button>
      ${S.forcedTurn ? '' : `<button class="cbtn" data-act="mode"
        data-m="${S.mode === 'auto' ? 'turowa' : 'auto'}"
        title="Przełącza tryb i porzuca bieżącą walkę">${S.mode === 'auto' ? 'NA TUROWĄ' : 'NA AUTO'}</button>`}
      ${AUTO ? `<button class="cbtn" data-act="stopauto">STOP</button>` : ''}
      <button class="cbtn go" data-act="tab" data-tab="wyprawa">DO WALKI</button>
    </div>`;
}

// Przerysowanie ekranu podmienia innerHTML, więc każde przewijane pudełko
// wraca na górę. Przy kopaniu render leci co cykl i wyrzucało gracza na początek
// listy w połowie klikania. Zapamiętujemy pozycje i odtwarzamy je po renderze.
// Górna połowa ekwipunku przewija się na telefonie (makieta + porównanie
// + ulepszanie potrafią urosnąć) — bez niej czytanie opisu przedmiotu kończyło się
// skokiem na początek listy przy pierwszym kliknięciu.
const PRZEWIJANE = '.scrollbox, .invlist, .eq-top, .two-col, .three-col, .three-col > .col, .two-col > .col, .log';

function zapiszScroll() {
  const mapa = new Map();
  for (const el of $$(PRZEWIJANE)) {
    if (!el.scrollTop) continue;
    const ekran = el.closest('.screen')?.id ?? '';
    const idx = [...$$(PRZEWIJANE)].indexOf(el);
    mapa.set(`${ekran}#${idx}`, el.scrollTop);
  }
  return mapa;
}

function odtworzScroll(mapa) {
  if (!mapa.size) return;
  const lista = $$(PRZEWIJANE);
  lista.forEach((el, idx) => {
    const ekran = el.closest('.screen')?.id ?? '';
    const y = mapa.get(`${ekran}#${idx}`);
    if (y) el.scrollTop = y;
  });
}

function render() {
  const scroll = zapiszScroll();
  header();
  // Odśwież listę tego, co jadalne — definicje przychodzą z serwera.
  JEDZENIE.clear();
  for (const s of Object.values(S.skills ?? {})) {
    for (const r of s.resources ?? []) if (r.food || r.buff) JEDZENIE.add(r.id);
  }
  // W trakcie walki arena i log mają własny cykl rysowania — nie ruszamy ich,
  // inaczej animacja pasków znika, a ekran skacze pod palcem.
  if (FIGHT) drawFightView();
  else $('#s-wyprawa').innerHTML = renderWyprawa();
  $('#s-druzyna').innerHTML = renderDruzyna();
  $('#s-eq').innerHTML      = renderEq();
  $('#s-skille').innerHTML  = renderSkille();
  $('#s-summon').innerHTML  = renderSummon();
  $('#s-kronika').innerHTML = renderKronika();
  $('#s-postac').innerHTML  = renderPostac();
  ostrzezenieWersji();
  paintCombatBar();
  paintMineBar();
  odtworzScroll(scroll);
}

// ---------------------------------------------------------------- akcje

// Jedna fala. Wyciągnięte z obsługi kliknięcia, bo ciąg auto woła to samo
// bez udziału gracza.
async function startWave() {
  const baseRunStats = S.combatRunStats;
  const foe = S.expedition?.enemy ?? S.nextEnemy;
  const context = S.expedition ? {
    kind: S.expedition.kind, id: S.expedition.id, label: S.expedition.runLabel, step: S.expedition.at + 1,
    total: S.expedition.total, nodes: S.expedition.nodes.map(n => ({ ...n })),
  } : { kind: 'tower', floor: S.floor, step: S.fight + 1, total: S.fightsOnFloor };
  const enemyDefs = S.expedition
    ? (S.expedition.enemies?.length ? S.expedition.enemies : [S.expedition.enemy])
    : S.nextEnemies;
  const d = await api('fight', {});
  if (d.error) { AUTO = false; render(); return; }

  fightStatsOpen = false;
  fightLogOpen = false;
  fightDetailsOpen = false;
  fightActionTab = 'atak';

  FIGHT = {
    mode: S.forcedTurn ? 'turowa' : S.mode,
    foeName: foe.name,
    party: [{ name: S.name, hp: S.stats.hp, maxHp: S.stats.maxHp, alive: true }],
    enemies: [{ name: foe.name, hp: foe.maxHp, maxHp: foe.maxHp, alive: true }],
    cooldowns: {}, baseRunStats, context, enemyDefs,
    enemyProgress: d.fight?.enemyProgress ?? d.enemyProgress ?? null,
    reinforcementPreview: d.fight?.reinforcementPreview ?? d.reinforcementPreview ?? [],
    combatStats: d.fight?.combatStats ?? d.combatStats ?? null,
    mana: S.stats.maxMana, maxMana: S.stats.maxMana, blokady: {},
    log: [], idx: 0, playing: false, result: null,
  };
  if (d.awaiting) {
    FIGHT.mode = 'turowa';
    AUTO = false;
    FIGHT.party = d.fight.party?.length ? d.fight.party : FIGHT.party;
    FIGHT.enemies = d.fight.enemies?.length ? d.fight.enemies : FIGHT.enemies;
    FIGHT.enemyProgress = d.fight.enemyProgress ?? FIGHT.enemyProgress;
    FIGHT.reinforcementPreview = d.fight.reinforcementPreview ?? FIGHT.reinforcementPreview;
    FIGHT.nextAction = d.fight.nextAction ?? null;
    FIGHT.log = d.fight.log; FIGHT.idx = d.fight.log.length;
    FIGHT.cooldowns = d.fight.cooldowns;
    FIGHT.potions = d.fight.potions;
    FIGHT.combatStats = d.fight.combatStats ?? FIGHT.combatStats;
    syncFightHp(); drawFightView(); paintCombatBar();
  } else startPlayback(d);
}

document.addEventListener('click', async (ev) => {
  const tab = ev.target.closest('.tabs button');
  if (tab) { openTab(tab.dataset.tab); return; }

  const btn = ev.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act;
  // Rozdawanie atrybutów obsługuje logika hold-to-repeat (pointerdown niżej),
  // nie klik — inaczej tap dodawałby dwa razy.
  if (act === 'attr') return;
  btn.disabled = true;

  try {
    if (act === 'tip') {
      // Chmurka jest RODZEŃSTWEM przycisku — pokaż tę, zamknij pozostałe.
      const moja = btn.parentElement?.querySelector('.chmurka');
      const byla = moja?.classList.contains('otwarta');
      $$('.chmurka.otwarta').forEach(e => e.classList.remove('otwarta'));
      if (moja && !byla) moja.classList.add('otwarta');
      return;
    }
    if (act === 'wynikzamknij') { WYNIK_ZAMKNIETY = true; OSTATNI_WYNIK = null; paintCombatBar(); return; }
    if (act === 'fight') {
      WYNIK_ZAMKNIETY = false; OSTATNI_WYNIK = null;
      // Auto obejmuje cały ciąg fal. Boss aktu wyłamuje się z tego z definicji.
      AUTO = S.mode === 'auto' && !S.forcedTurn;
      await startWave();

    } else if (act === 'stopauto') {
      AUTO = false;
      paintCombatBar();

    } else if (act === 'speed') {
      SPEED = Number(btn.dataset.v) === 2 ? 2 : 1;
      paintCombatBar();

    } else if (act === 'tab') {
      openTab(btn.dataset.tab);

    } else if (act === 'opentower') {
      advView = 'wieza'; render();

    } else if (act === 'openexp') {
      advView = 'exp'; render();

    } else if (act === 'opendungeon') {
      advView = 'dungeon'; render();

    } else if (act === 'openbosses') {
      advView = 'bosses'; render();

    } else if (act === 'openkolos') {
      advView = 'kolos'; render();

    } else if (act === 'kolos') {
      // Kolos jest zawsze turowy — nie ma tu automatu do włączenia.
      AUTO = false;
      const baseRunStats = S.combatRunStats;
      const d = await api('kolos', {});
      if (d.error) { render(); return; }
      fightStatsOpen = false;
      fightLogOpen = false;
      fightDetailsOpen = false;
      fightActionTab = 'atak';
      const K = S.kolos;
      FIGHT = {
        mode: 'turowa', foeName: K.label,
        party: [{ name: S.name, hp: S.stats.hp, maxHp: S.stats.maxHp, alive: true, slot: 0 }],
        enemies: [{ name: K.label, hp: K.hp, maxHp: K.hp, alive: true }],
        cooldowns: {}, mana: S.stats.maxMana, maxMana: S.stats.maxMana, blokady: {},
        baseRunStats, combatStats: d.fight?.combatStats ?? d.combatStats ?? null,
        context: { kind: 'kolos', label: K.label, step: 1, total: 1 }, enemyDefs: [K],
        log: [], idx: 0, playing: false, result: null,
      };
      if (d.awaiting) {
        FIGHT.party = d.fight.party?.length ? d.fight.party : FIGHT.party;
        FIGHT.enemies = d.fight.enemies?.length ? d.fight.enemies : FIGHT.enemies;
        FIGHT.nextAction = d.fight.nextAction ?? null;
        FIGHT.log = d.fight.log; FIGHT.idx = d.fight.log.length;
        FIGHT.cooldowns = d.fight.cooldowns;
        FIGHT.combatStats = d.fight.combatStats ?? FIGHT.combatStats;
        syncFightHp(); drawFightView(); paintCombatBar();
      } else startPlayback(d);

    } else if (act === 'opentytan') {
      advView = 'tytan'; render();

    } else if (act === 'tytan') {
      // Tytan jest zawsze turowy — jak Kolos.
      AUTO = false;
      const baseRunStats = S.combatRunStats;
      const d = await api('tytan', {});
      if (d.error) { render(); return; }
      fightStatsOpen = false;
      fightLogOpen = false;
      fightDetailsOpen = false;
      fightActionTab = 'atak';
      const K = S.tytan;
      FIGHT = {
        mode: 'turowa', foeName: K.label,
        party: [{ name: S.name, hp: S.stats.hp, maxHp: S.stats.maxHp, alive: true, slot: 0 }],
        enemies: [{ name: K.label, hp: K.hp, maxHp: K.hp, alive: true }],
        cooldowns: {}, mana: S.stats.maxMana, maxMana: S.stats.maxMana, blokady: {},
        baseRunStats, combatStats: d.fight?.combatStats ?? d.combatStats ?? null,
        context: { kind: 'tytan', label: K.label, step: 1, total: 1 }, enemyDefs: [K],
        log: [], idx: 0, playing: false, result: null,
      };
      if (d.awaiting) {
        FIGHT.party = d.fight.party?.length ? d.fight.party : FIGHT.party;
        FIGHT.enemies = d.fight.enemies?.length ? d.fight.enemies : FIGHT.enemies;
        FIGHT.nextAction = d.fight.nextAction ?? null;
        FIGHT.log = d.fight.log; FIGHT.idx = d.fight.log.length;
        FIGHT.cooldowns = d.fight.cooldowns;
        FIGHT.combatStats = d.fight.combatStats ?? FIGHT.combatStats;
        syncFightHp(); drawFightView(); paintCombatBar();
      } else startPlayback(d);

    } else if (act === 'hub') {
      advView = 'hub'; render();

    } else if (act === 'fighttarget') {
      // Priorytet celu drużyny. Klik w oznaczonego wroga zdejmuje znacznik.
      const idx = Number(btn.dataset.target);
      const cur = FIGHT?.priorityTarget ?? null;
      const d = await api('fighttarget', { idx: cur === idx ? null : idx });
      if (!d.error && FIGHT) {
        FIGHT.priorityTarget = d.fight?.priorityTarget ?? null;
        if (d.fight?.party?.length) FIGHT.party = d.fight.party;
        if (d.fight?.enemies?.length) FIGHT.enemies = d.fight.enemies;
        drawFightView();
      }

    } else if (act === 'atakbreak') {
      atakBreakdownOpen = !atakBreakdownOpen;
      render();

    } else if (act === 'fightstats') {
      fightStatsOpen = !fightStatsOpen;
      paintCombatStats();

    } else if (act === 'fightlog') {
      fightLogOpen = !fightLogOpen;
      drawFightView();

    } else if (act === 'fightdetails') {
      fightDetailsOpen = !fightDetailsOpen;
      drawFightView();

    } else if (act === 'fightactiontab') {
      fightActionTab = btn.dataset.t;
      drawActionMenu();

    } else if (act === 'towerheal') {
      towerHealingOpen = !towerHealingOpen;
      render();

    } else if (act === 'towerdetails') {
      towerDetailsOpen = !towerDetailsOpen;
      render();

    } else if (act === 'expsel') {
      expSel = btn.dataset.id || null; render();

    } else if (act === 'dungeonsel') {
      dungeonSel = btn.dataset.id || null; render();

    } else if (act === 'dungeonstart') {
      const d = await api('dungeonstart', { id: btn.dataset.id });
      if (!d.error) { advView = 'dungeon'; render(); }

    } else if (act === 'exprisk') {
      expRisk = btn.dataset.r; render();

    } else if (act === 'expmod') {
      const m = btn.dataset.m;
      if (expMods.has(m)) expMods.delete(m); else expMods.add(m);
      render();

    } else if (act === 'expstart') {
      const d = await api('expstart', {
        id: btn.dataset.id, risk: btn.dataset.r ?? expRisk, mods: [...expMods],
      });
      if (!d.error) { advView = 'exp'; render(); }

    } else if (act === 'expleave') {
      const E = S.expedition;
      if (!confirm(`PORZUCIĆ ${E?.kind === 'dungeon' ? 'DUNGEON' : 'WYPRAWĘ'}?\n\nZ sakwy przepadnie: ${E?.sakwaCount ?? 0} przedmiotów`
        + `${(E?.mats ?? []).length ? ` i ${E.mats.map(m => `${m.label ?? m.id} ×${m.count}`).join(', ')}` : ''}.`
        + `\n\nTwój noszony sprzęt i plecak zostają nietknięte.`)) return;
      stopPlayback();
      const d = await api('expleave', {});
      if (!d.error) { advView = 'hub'; toast(d.stracone ? `Przepadło ${d.stracone} przedmiotów` : 'Porzucone'); render(); }

    } else if (act === 'expchoose') {
      const d = await api('expchoose', { opcja: btn.dataset.o });
      if (!d.error) { if (d.efekty?.length) toast(d.efekty.join(' · ')); render(); }

    } else if (act === 'expsafe') {
      const d = await api('expsafe', { itemId: btn.dataset.item ?? null, matId: btn.dataset.mat ?? null,
                                       jedzenie: btn.dataset.jedzenie ?? null });
      if (!d.error) {
        const co = [
          d.uleczony ? `${d.zjedzone} — pełne zdrowie` : null,
          d.wyniesione.length ? `Odesłane: ${d.wyniesione.join(', ')}` : null,
          d.odnowione ? 'Mikstury odnowione' : null,
        ].filter(Boolean);
        toast(co.length ? co.join(' · ') : 'Idziesz dalej');
        render();
      }

    } else if (act === 'powtarzaj') {
      const d = await api('powtarzaj', { on: !S.powtarzaj });
      if (!d.error) { toast(d.powtarzaj ? 'Piętro będzie się powtarzać' : 'Powtarzanie wyłączone'); render(); }

    } else if (act === 'autoboss') {
      const d = await api('autoboss', { on: !S.alwaysAuto });
      if (!d.error) render();

    } else if (act === 'goto') {
      const d = await api('goto', { floor: Number(btn.dataset.f) });
      if (!d.error) render();

    } else if (act === 'skill') {
      skillOpen = btn.dataset.id; zapiszMiejsce({ skillOpen }); render();

    } else if (act === 'smithcat') {
      smithCategory = btn.dataset.c;
      smithSelected = S.skills.kowalstwo.resources.find(r => r.category === smithCategory)?.id ?? null;
      render();

    } else if (act === 'miningcat') {
      miningCategory = btn.dataset.c; render();

    } else if (act === 'lifefilter') {
      lifeFilter[skillOpen] = btn.dataset.c;
      if (skillOpen === 'gotowanie') cookingSelected = null;
      render();

    } else if (act === 'cookselect') {
      cookingSelected = btn.dataset.res; render();

    } else if (act === 'cookstart') {
      const res = btn.dataset.res;
      // To samo co przy zbieraniu: nie restartujemy tego, co już się gotuje.
      if (S.activity?.skill === 'gotowanie' && S.activity?.res === res) return;
      const d = await api('mine', { skill: 'gotowanie', res, mode: btn.dataset.mode ?? 'all' });
      if (d.error) return;
      const r = S.skills.gotowanie.resources.find(x => x.id === res);
      render();
      startMineLoop('gotowanie', res, S.activity?.ms ?? r.effectiveMs ?? r.ms);

    } else if (act === 'smithstart') {
      // To samo co przy zbieraniu: nie restartujemy trwającego wytapiania.
      if (S.activity?.skill === 'kowalstwo' && S.activity?.res === btn.dataset.res) return;
      const res = btn.dataset.res;
      smithSelected = res;
      const d = await api('mine', { skill: 'kowalstwo', res, mode: btn.dataset.mode ?? 'once' });
      if (d.error) return;
      const r = S.skills.kowalstwo.resources.find(x => x.id === res);
      render();
      startMineLoop('kowalstwo', res, S.activity?.ms ?? r.effectiveMs ?? r.ms);

    } else if (act === 'furnace') {
      const amount = btn.dataset.amount === 'all' ? 'all' : Number(btn.dataset.amount);
      const d = await api('furnace', { action: btn.dataset.action, amount });
      if (!d.error) {
        toast(btn.dataset.action === 'withdraw'
          ? `Wyjęto Węgiel ×${d.moved}` : `Dołożono Węgiel ×${d.moved}`);
        render();
      }

    } else if (act === 'restart') {
      // Różnica wersji ma DWIE przyczyny i przycisk musi ogarnąć obie:
      //   1. serwer jest starszy niż pliki  → restartujemy proces
      //   2. TELEFON trzyma stary plik      → czyścimy jego pamięć i wczytujemy od nowa
      // Wcześniej obsługiwał tylko pierwszą i przy drugiej wyglądał na zepsuty:
      // serwer odpowiadał „jestem aktualny" i nie działo się nic.
      btn.textContent = 'Restartuję…';
      const d = await api('restart', {});

      if (d.aktualny) {
        btn.textContent = 'Czyszczę pamięć telefonu…';
        await odswiezTwardo();
        return;
      }

      toast('Serwer wstaje — za chwilę odświeżę');
      let prob = 0;
      const czekaj = setInterval(async () => {
        prob++;
        const zyje = await fetch('/api/roster', { cache: 'no-store' }).then(r => r.ok).catch(() => false);
        if (zyje || prob > 20) { clearInterval(czekaj); odswiezTwardo(); }
      }, 700);

    } else if (act === 'herbedit') {
      herbSzkic = { ...S.crest }; profilView = 'herb'; render();

    } else if (act === 'herbset') {
      herbSzkic = { ...(herbSzkic ?? S.crest), [btn.dataset.k]: btn.dataset.v }; render();

    } else if (act === 'herblos') {
      herbSzkic = randomCrest(); render();

    } else if (act === 'herbstop') {
      if (btn.dataset.zapisz === '1' && herbSzkic) {
        const d = await api('profil', { crest: herbSzkic });
        if (!d.error) toast('Herb zmieniony');
      }
      herbSzkic = null; profilView = 'karta'; render();

    } else if (act === 'biozapisz') {
      const d = await api('profil', { bio: bioSzkic ?? S.bio ?? '' });
      if (!d.error) { bioSzkic = null; toast('Opis zapisany'); render(); }

    } else if (act === 'motyw') {
      UST.theme = btn.dataset.t; applyUI(); dzwiek('klik');
      await api('settings', { theme: UST.theme });
      render();

    } else if (act === 'opis') {
      const k = btn.dataset.k;
      if (OPISY_OTWARTE.has(k)) OPISY_OTWARTE.delete(k); else OPISY_OTWARTE.add(k);
      render();
    } else if (act === 'jezyk') {
      // Język leży w tych samych ustawieniach co motyw — przechodzi na inne
      // urządzenie razem z postacią, bo właścicielem ustawień jest serwer.
      UST.lang = btn.dataset.l; applyUI(); render();
      await api('settings', { lang: UST.lang });
    } else if (act === 'jakosc') {
      UST.quality = btn.dataset.q; applyUI();
      await api('settings', { quality: UST.quality });
      render();

    } else if (act === 'dzwiek') {
      UST.sound = !UST.sound; applyUI();
      if (UST.sound) dzwiek('awans');
      await api('settings', { sound: UST.sound });
      render();

    } else if (act === 'fullscreen') {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      else await document.documentElement.requestFullscreen().catch(() => toast('Przeglądarka nie dała pełnego ekranu', true));

    } else if (act === 'cskillopen') {
      skillOtwarty = skillOtwarty === btn.dataset.id ? null : btn.dataset.id; render();

    } else if (act === 'cskillup') {
      const d = await api('cskill', { node: btn.dataset.node });
      if (!d.error) render();

    } else if (act === 'cskillreset') {
      const d = await api('cskillreset', { skill: btn.dataset.skill });
      if (!d.error) { toast(`Wróciło ${d.wrocilo} punktów`); render(); }

    } else if (act === 'skilltab') {
      skillTab = btn.dataset.t; zapiszMiejsce({ skillTab }); render();

    } else if (act === 'skillgo') {
      skillTab = btn.dataset.t;
      if (btn.dataset.skill) skillOpen = btn.dataset.skill;
      zapiszMiejsce({ skillTab, skillOpen });
      openTab('skille'); render();

    } else if (act === 'eqskill') {
      equipmentMode = 'skill'; invCat = 'all'; detail = null;
      openTab('eq'); render();

    } else if (act === 'summonkind') {
      summonKind = btn.dataset.k; summonResult = null; render();

    } else if (act === 'summon') {
      summonResult = null;
      $('#s-summon').innerHTML = renderSummon();     // portal gaśnie na moment przed wynikiem
      const d = await api('summon', { kind: summonKind });
      if (!d.error) { summonResult = d.summon; render(); }

    } else if (act === 'logview') {
      logView = btn.dataset.v; logOpen = null; render();

    } else if (act === 'teamsel') {
      teamSel = btn.dataset.s; render();

    } else if (act === 'teamset') {
      const d = await api('team', { slot: btn.dataset.slot, idx: btn.dataset.idx === '' ? null : Number(btn.dataset.idx) });
      if (!d.error) render();

    } else if (act === 'logopen') {
      logOpen = logOpen === btn.dataset.f ? null : btn.dataset.f;
      render();

    } else if (act === 'strike' || act === 'strikepotion' || act === 'ability' || act === 'defend') {
      const action =
        act === 'strikepotion' ? { type: 'potion', id: btn.dataset.id ?? null } :
        act === 'ability'      ? { type: 'ability', id: btn.dataset.id } :
        act === 'defend'       ? { type: 'defend' } :
                                 { type: 'attack', strength: btn.dataset.s };
      const d = await api('act', { action });
      if (d.error) return;
      const from = FIGHT.idx;
      FIGHT.log = d.fight ? d.fight.log : d.log;
      if (d.awaiting) {
        for (let i = from; i < FIGHT.log.length; i++) appendLog(FIGHT.log[i]);
        FIGHT.idx = FIGHT.log.length;
        FIGHT.cooldowns = d.fight.cooldowns;
        FIGHT.mana = d.fight.mana; FIGHT.maxMana = d.fight.maxMana;
        FIGHT.blokady = d.fight.blokady;
        FIGHT.potions = d.fight.potions;
        FIGHT.combatStats = d.fight.combatStats ?? FIGHT.combatStats;
        syncFightHp(); paintArena(); paintCombatStats();
        drawActionMenu();
      } else {
        // Walka się skończyła — dograj TYLKO nowe wpisy, nie cały przebieg od zera.
        FIGHT.idx = from;
        startPlayback(d, from);
      }

    } else if (act === 'skipplay') {
      finishPlayback();

    } else if (act === 'nextfight') {
      FIGHT = null; AUTO = false;
      await startWave();

    } else if (act === 'afterrun') {
      const kind = FIGHT?.result?.runKind;
      FIGHT = null; AUTO = false;
      if (kind === 'dungeon') { dungeonSel = null; advView = 'dungeon'; }
      else { expSel = null; advView = 'exp'; }
      render();

    } else if (act === 'runagain') {
      const kind = FIGHT?.result?.runKind;
      FIGHT = null; AUTO = false;
      advView = kind === 'dungeon' ? 'dungeon' : 'exp';
      openTab('wyprawa');
      render();

    } else if (act === 'closefight') {
      const wynik = FIGHT?.result;
      const byloWyprawa = wynik?.expDone || wynik?.expFailed;
      const kind = wynik?.runKind;
      FIGHT = null; AUTO = false;
      advView = (wynik?.kolos || wynik?.tytan || byloWyprawa) ? 'hub' : (S.expedition ? (S.expedition.kind === 'dungeon' ? 'dungeon' : 'exp') : 'wieza');
      render();

    } else if (act === 'mode') {
      // Zmiana trybu przerywa to, co leci. Serwer porzuca walkę, klient sprząta po sobie.
      stopPlayback();
      const d = await api('mode', { mode: btn.dataset.m });
      if (!d.error) {
        if (d.porzucona) toast('Walka porzucona — fala zaczyna się od nowa');
        openTab('wyprawa'); advView = 'wieza';
        render();
      }

    } else if (act === 'abandon') {
      stopPlayback();
      await api('abandon', {});
      render();

    } else if (act === 'advance') {
      WYNIK_ZAMKNIETY = false; OSTATNI_WYNIK = null;
      FIGHT = null; AUTO = false;
      advView = 'wieza';
      const d = await api('advance', {});
      if (!d.error) { toast(d.nowySlot ?? `Piętro ${d.floor}`); render(); }
    } else if (act === 'slot') {
      // Klik w slot ROBI DWIE RZECZY: pokazuje, co tam nosisz, i przestawia
      // plecak na ten slot. Drugie kliknięcie zwija jedno i drugie.
      const slot = btn.dataset.slot;
      const juz = detail?.where === 'worn' && detail.slot === slot;
      detail = juz ? null : { where: 'worn', slot };
      invCat = juz ? 'all' : slot;
      render();
    } else if (act === 'eqmode') {
      equipmentMode = btn.dataset.mode;
      invCat = 'all'; detail = null; render();
    } else if (act === 'pveloadout') {
      const d = await api('pveloadout', { id: btn.dataset.id });
      if (!d.error) { toast(`Aktywny zestaw PvE ${String(d.active).toUpperCase()}`); render(); }
    } else if (act === 'detailclose') {
      detail = null; render();
    } else if (act === 'skillslot') {
      const slot = btn.dataset.slot;
      const juz = detail?.where === 'skill-worn' && detail.slot === slot;
      detail = juz ? null : { where: 'skill-worn', slot };
      invCat = juz ? 'all' : slot; render();
    } else if (act === 'skillpick') {
      detail = detail?.where === 'skill-bag' && detail.id === btn.dataset.id
        ? null : { where: 'skill-bag', id: btn.dataset.id };
      render();
    } else if (act === 'pick') {
      const id = btn.dataset.id;
      detail = (detail?.where === 'bag' && detail.id === id) ? null : { where: 'bag', id };
      if (detail && !wearCache[id]) {
        const d = await api('preview', { id });
        if (d.preview) wearCache[d.preview.id] = d.preview;
      }
      render();
    } else if (act === 'invcat') {
      invCat = btn.dataset.c; render();
    } else if (act === 'mine') {
      const res = btn.dataset.res;
      // KLIKNIĘCIE W TO, CO WŁAŚNIE LECI, NIC NIE ROBI.
      // Wcześniej restartowało cykl od zera: gracz stukał w kafel żeby sprawdzić
      // postęp albo trafiał w niego przypadkiem i tracił cały odliczony czas.
      // Przerwanie ma jedno miejsce — przycisk w belce aktywności.
      if (S.activity?.skill === skillOpen && S.activity?.res === res) return;
      const d = await api('mine', { skill: skillOpen, res });
      if (d.error) return;
      const r = S.skills[skillOpen].resources.find(x => x.id === res);
      render();
      startMineLoop(skillOpen, res, S.activity?.ms ?? r.effectiveMs ?? r.ms);
    } else if (act === 'runa') {
      const d = await api('runa', { id: btn.dataset.id || null });
      if (!d.error) {
        toast(d.runa ? `Podpięta · ${d.zaklecia.length} zaklęć` : 'Runa odpięta');
        render();
      }

    } else if (act === 'eat') {
      const target = { kind: btn.dataset.kind ?? 'hero' };
      if (btn.dataset.idx !== undefined) target.idx = Number(btn.dataset.idx);
      const d = await api('eat', { id: btn.dataset.id, target });
      if (!d.error) { toast(`${d.buff.label}: ${opisBuffa(d.buff)} · ${d.buff.walki} walk`); render(); }

    } else if (act === 'upgrade') {
      const d = await api('upgrade', { itemId: btn.dataset.id });
      if (!d.error) { toast(`${d.name} +${d.plus}`); wearCache = {}; render(); }

    } else if (act === 'minestop') {
      stopMineLoop();
      WYDOBYCIE = null;
      await api('minestop', {});
      render();
    } else if (act === 'mineequip') {
      const d = await api('mineequip', { itemId: btn.dataset.id ?? null, slot: btn.dataset.slot ?? null });
      if (!d.error) { toast(btn.dataset.id ? 'Założone' : 'Zdjęte'); detail = null; render(); }
    } else if (act === 'equip') {
      const d = await api('equip', { itemId: btn.dataset.id, loadout: equipmentMode });
      if (!d.error) { toast('Założone'); detail = null; wearCache = {}; render(); }
    } else if (act === 'sell') {
      const d = await api('sell', { itemId: btn.dataset.id });
      if (!d.error) { toast(`+${nf(d.gold)} zł`); detail = null; render(); }
    } else if (act === 'selljunk') {
      const d = await api('selljunk', { loadout: equipmentMode });
      if (!d.error) { toast(`Sprzedano ${d.count} — +${nf(d.gold)} zł`); render(); }
    } else if (act === 'attr') {
      await api('attr', { attr: btn.dataset.attr }); render();
    } else if (act === 'attrreset') {
      const d = await api('attrreset', {});
      if (!d.error) { toast(`Zwrócono ${d.zwrot} punktów`); wearCache = {}; render(); }
    } else if (act === 'potion') {
      const d = await api('potion', { id: btn.dataset.id ?? null });
      if (!d.error) { toast(`${d.label}: +${nf(d.ile)} HP`); render(); }
    } else if (act === 'logout') {
      // POTWIERDZENIE W GRZE, NIE PRZEZ confirm().
      // Natywne okno dialogowe bywa blokowane w webview — w podglądzie i w APK
      // z Capacitora `confirm()` potrafi wrócić false bez pytania, więc przycisk
      // wyglądał na zepsuty: klikasz i nic się nie dzieje.
      // Dwa kliknięcia zamiast okna: pierwsze uzbraja, drugie wykonuje.
      if (btn.dataset.pewne !== '1') {
        btn.dataset.pewne = '1';
        btn.classList.add('groza');
        btn.textContent = 'Na pewno? Kliknij jeszcze raz';
        toast('Postać zostaje na serwerze — wrócisz do niej kodem z zakładki Konto');
        setTimeout(() => {
          if (!btn.isConnected || btn.dataset.pewne !== '1') return;
          btn.dataset.pewne = '0';
          btn.classList.remove('groza');
          btn.textContent = 'Zmień postać';
        }, 4000);
        return;
      }
      localStorage.removeItem('rf_token');
      location.reload();
    } else if (act === 'copycode') {
      try { await navigator.clipboard.writeText(TOKEN); toast('Kod skopiowany'); }
      catch { toast('Zaznacz i skopiuj ręcznie', true); }
    }
  } finally {
    if (btn.isConnected) btn.disabled = false;
  }
});

document.addEventListener('input', ev => {
  if (ev.target.id !== 'cooksearch') return;
  cookingSearch = ev.target.value;
  const pos = ev.target.selectionStart ?? cookingSearch.length;
  $('#s-skille').innerHTML = renderSkille();
  const input = $('#cooksearch');
  if (input) { input.focus(); input.setSelectionRange(pos, pos); }
});

// Pola formularza karty gracza. Nie wołają render() przy każdym znaku —
// przerysowanie zabrałoby kursor w połowie zdania.
document.addEventListener('input', (ev) => {
  const cel = ev.target;
  if (cel.id === 'bio') {
    bioSzkic = cel.value;
    const licz = $('#biolicznik');
    if (licz) licz.textContent = `${cel.value.length} / ${S.ui?.bioMax ?? 140}`;
  } else if (cel.id === 'glosnosc') {
    UST.volume = Number(cel.value) / 100;
    applyUI();
  }
  // Pole „punktów na klik" zniknęło razem z kartą — tempo ustala teraz samo
  // przytrzymanie „+", więc nie ma tu już trzeciej gałęzi.
});

// Głośność zapisuje się dopiero po puszczeniu suwaka — inaczej leciałoby
// dwadzieścia zapytań na jedno przeciągnięcie.
document.addEventListener('change', async (ev) => {
  if (ev.target.id === 'glosnosc') { dzwiek('cios'); await api('settings', { volume: UST.volume }); }
});

// odświeżenie regeneracji, gdy wracasz do apki
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && TOKEN && S) {
    const d = await fetch('/api/state?token=' + TOKEN).then(r => r.json()).catch(() => ({}));
    if (d.state) { S = d.state; render(); }
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();

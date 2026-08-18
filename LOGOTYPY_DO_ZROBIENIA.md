# Logotypy / ikony — lista do przejścia

Legenda pola w danych:
- `ic:` = emoji ikona (tekst). Renderuje się wszędzie jako `<i>${ic}</i>` albo `.icon`.
- `portrait` / `obraz` = plik PNG/WEBP (`/img/...`). Tylko moby (`u.portrait`) i Kolos (`obraz`).
- **BRAK** = encja nie ma żadnego pola ikony → renderuje fallback (moby: `👹`, reszta: sam tekst).

Żeby nadać obrazek zamiast emoji: dodać `img: '/img/xxx.png'` do wpisu **oraz** wpiąć go w renderer
(dla mobów: `makeEnemy` w `content.js` → przełożyć na `portrait`; reszta: podmienić `${x.ic}` na `<img>` w `app.js`).

---

## 1. MOBY (bestiariusz) — WIĘKSZOŚĆ BEZ IKONY, renderują `👹`

Renderer: [public/app.js:388](public/app.js) — `icon: foe ? (u.ic ?? def.ic ?? '👹'/'👑')`. Portret: [app.js:349](public/app.js) `u.portrait`.

### Rodziny aktów — **BRAK ic** (definicja: [game/content.js:47](game/content.js))
| Region | Rodziny (moby) |
|---|---|
| Puszcza | Leśny Szlam · Goblin · Leśny Wilk |
| Mokradła Szeptu | Topielec · Pijawka |
| Kopalnia Zgniłego Kamienia | Konstrukt · Nietoperz |
| Wąwóz Popiołu | Ogr · Pomiot |
| Zapadła Kaplica | Kultysta · Upiór |
| Bezimienne Piętra (generic) | Cień · Pełzacz · Zjawa |
| dodatkowy | Strażnik Puszczy |

### Świta bossów — **MAJĄ emoji** ([config.js:768](game/config.js))
Rogaty Demon `😈` · Lich `💀` · Sukkubus `🦇`

### Mini-elita pięter 25/35/45 — **MAJĄ emoji** ([config.js:777](game/config.js))
rodzina „— Elita" `☠` · Szeptucha `✚` · Oprawca `🗡`

### Fallbacki w kodzie
zwykły mob `👹` · boss `👑` — [app.js:388](public/app.js)

### Kolos (poza wieżą) — **MA obraz** ([config.js:635](game/config.js))
`ic: 🧊`, `obraz: /img/yeti.png` (zaślepka do podmiany). Render: [app.js:1446](public/app.js)

---

## 2. SKILLE ŻYCIOWE — **CAŁOŚĆ BEZ IKON** (plik `game/life-content.js`)

Helpery `catchOf/farm/animal/recipe` nie ustawiają `ic`. UI pokazuje sam tekst. To jest główny blok „roślin".

### 2a. ROLNICTWO — rośliny/owoce/zwierzęta ([life-content.js:52](game/life-content.js))
**Uprawy (crops):** Ziemniak · Zioło Polne · Marchew · Zboże · Cebula · Sałata · Zioło Gorzkie · Pomidor · Kapusta · Korzeń Nocny · Ogórek · Kwiat Cierniowy · Fasola · Papryka · Kukurydza · Czosnek · Dynia · Grzyby · Ryż · Chili · Zioła Kuchenne · Złota Dynia · Księżycowy Grzyb · Mistyczne Zioło
**Owoce (fruit):** Jabłoń/Jabłko · Krzew Jagód/Jagody · Truskawki · Winorośl/Winogrona · Drzewko Cytrynowe/Cytryna · Pomarańcza · Brzoskwinia · Bananowiec/Banan · Arbuz · Ananas · Gwiezdny Owoc · Mistyczna Jagoda
**Zwierzęta (animals):** Kurnik/Jaja · Ul/Miód · Krowa/Mleko · Owca/Mleko+Wełna · Kura/Mięso · Świnia/Wieprzowina · Krowa/Wołowina · Koza/Mleko · Egzotyczne/Jajo · Mistyczne/Mleko

### 2b. RYBOŁÓWSTWO — łowiska + ryby ([life-content.js:7](game/life-content.js))
**Łowiska:** Spokojny Staw · Kamienne Wybrzeże · Głębokie Morze · Wody Otchłani
**Ryby:** Sardynka · Płotka · Pstrąg · Karp · Łosoś · Jesiotr · Szczupak · Śledź · Krewetki · Makrela · Małże · Kałamarnica · Ostrygi · Krab · Tuńczyk · Ośmiornica · Homar · Miecznik · Królewski Krab · Węgorz Głębinowy · Ryba Głębin · Ryba Otchłani · Mistyczny Węgorz

### 2c. GOTOWANIE — potrawy ([life-content.js:118](game/life-content.js))
~35 receptur (fish/meat/veg/dessert/drink): Sardynka z Ziemniakiem, Grillowana Sardynka, Pstrąg z Ziołami, … Mistyczna Herbata. Pełna lista w pliku.

---

## 3. GÓRNICTWO / KOWALSTWO

### Rudy — **BRAK ic** ([config.js:50](game/config.js))
Miedź · Żelazo · Węgiel · Srebro · Złoto · Mithril · Adamantyt · Runite · Mistyczna ruda · Niebiańska ruda

### Żyła magiczna — **BRAK ic** ([config.js:857](game/config.js))
Esencja · Kryształ Ognia · Kryształ Mrozu · Kryształ Ziemi · Kryształ Wichru

### Klejnoty (gems) — **BRAK ic** ([config.js:803](game/config.js))
Topaz · Szafir · Szmaragd · Rubin · Diament · Ametyst · Onyks · Mistyczny klejnot · Boski klejnot

### Sztaby (smith tiers) — **BRAK ic** ([config.js:62](game/config.js))
10 sztab (Miedziany…Niebiański). Sprzęt górniczy craftowany z nich — [config.js:94](game/config.js).

---

## 4. ALCHEMIA / RUNY / MAGIA

### Mikstury (9) — **BRAK ic** ([config.js:286](game/config.js))
Słaba/… /Pełna Mikstura, Eliksir Krwi/Życia/Odnowy/Otchłani. Pokazywane w `miksturyPanel()`.

### Runy (5) — **BRAK ic** ([config.js:945](game/config.js))
Runa Ognia · Mrozu · Ziemi · Wichru · Pradawna

### Zaklęcia (6) — **BRAK ic** ([config.js:213](game/config.js))
Fireball · Pożoga · Fala Chłodu · Kamienna Skóra · Podmuch · Burza Żywiołów. W walce: [app.js:629](public/app.js) `${a.mana ? '✦' : '⚑'}`.

---

## 5. MAJĄ JUŻ EMOJI — do ewentualnej podmiany na obraz

| Grupa | Gdzie | Ikony |
|---|---|---|
| Profesje (7) | [config.js:843](game/config.js) | ⛏ 🔨 🐟 🌾 🍲 ⚗ ✦ |
| Rodziny broni (5, `wtype`) | [config.js:984](game/config.js) | 🪓 🗡 ✦ 🏹 🛡 |
| Typy obrażeń (4) | [config.js:137](game/config.js) | ⚔ ◆ ➶ ✦ |
| Regiony wypraw (14) | [config.js:1279](game/config.js) | 🌲🌫⛰🌋⛪🧊⚰⚡◉✦🗿🔥☄♛ |
| Materiały z wypraw (28) | [config.js:1134](game/config.js) | 💎🌿🧂🫀… (komplet) |

## 6. BEZ IKON, ale może niepotrzebne

- **Przywołanie** — sojusznicy i pety to same `[nazwa, klasa]`, brak ic ([config.js:1180](game/config.js)). ~20 wpisów.
- **Trofea bestiariusza** (`FAMILY_DROPS`, [content.js:477](game/content.js)) — 4 na moba, tekstowe.

---

## Priorytet do wpięcia obrazków (wymaga też zmiany renderera, nie tylko danych)
1. **Moby** — dodać `img` do rodzin + `makeEnemy` → `portrait`. (dziś fallback `👹`)
2. **Rośliny/ryby/potrawy** — `life-content.js` helpery nie mają pola ikony; dodać `ic`/`img` + render w `app.js` skillsView.
3. Rudy / klejnoty / runy / mikstury — dodać `ic` (na start emoji, potem obraz).

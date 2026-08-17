# RAIDFOLK IDLE — HANDOFF

Dokument przekazania. Nowa sesja, nowe konto albo inny agent ma stąd wyjść bez
znajomości poprzedniej rozmowy.

Zacznij od: **przeczytaj ten plik, `RAIDFOLK_IDLE_DESIGN.md` i ostatni wpis
w `RAIDFOLK_IDLE_SESSION_LOG.md`. Sprawdź stan Gita i rusz od NEXT STEP.**

---

## PROJECT

| | |
|---|---|
| Nazwa | RaidFolk Idle |
| Ścieżka | `C:\Dev\RaidFolk_idle` |
| Technologia | Node 22+, **zero zależności runtime**, czysty JS, moduły ES |
| Baza | SQLite przez wbudowane `node:sqlite`, plik `raidfolk.db`, postać jako JSON |
| Frontend | jeden `public/app.js`, bez frameworka, bez budowania |
| Zależności dev | tylko Capacitor do budowania APK |

**GRANICA:** istnieje osobna gra o nazwie `RaidFolk`. To **inny produkt**.
Nie sięgaj do niej po nic, nie modyfikuj jej, nie traktuj tego repo jako jej gałęzi.

---

## CURRENT STATE

### Działa i da się przeklikać

Pełne przejście, które zadziałało ręcznie od początku do końca:

```
herb → nick → wprowadzenie → wybór klasy → główne UI
→ hub Wyprawy → Puszcza → piętra 1–9 na automacie
→ piętro 10, boss turowy → wygrana → trofeum
→ Drużyna / Ekwipunek / Skille / Przywołanie / Kronika
```

- **Nawigacja** — sześć zakładek: Wyprawa, Drużyna, Ekwipunek, Skille,
  Przywołanie, Kronika. Postać i Drzewko siedzą pod przyciskiem profilu
  w nagłówku (herb + nick + poziom + moc + sakiewka).
- **Stały pasek walki** — nad zakładkami, widoczny na każdym ekranie, dopóki coś
  się bije. Niesie biom, piętro, falę, oba paski HP, tempo ×1/×2, STOP i DO WALKI.
- **Wyprawa (hub)** — Wieża otwarta; Wyprawa `WKRÓTCE`; World Boss, Kolos, Tytan
  `ZAMKNIĘTE`. Nic za nimi nie stoi i tak ma zostać do osobnej decyzji.
- **Wieża** — lista dziesięciu pięter biomu, odblokowanie sekwencyjne, powrót na
  zdobyte piętro (`/api/goto`). Piętro to 6–10 fal, co 5. wariant „+", co 10. boss.
- **Walka** — symulacja serwerowa, tryb automatyczny i turowy, trzy siły ciosu,
  celność i unik, pasek ultimate 0–10 (pudło zeruje), umiejętności z cooldownami,
  blok z tarczy, **Obrona** jako akcja tury, mikstury ze słabnącym efektem.
- **Wyczerpanie HP** — zdrowie **nie wraca między falami**. Pełne oddaje wejście
  na nowe piętro albo porażka. Porażka cofa na pierwszą falę piętra.
- **Ciąg fal** — w trybie auto fale lecą same, aż piętro padnie albo padniesz Ty.
  Odtwarzanie chodzi na timerze klienta, więc przejście na inną zakładkę go nie przerywa.
- **Boss aktu zawsze turowy** — przełącznik trybu na piętrze bossa znika.
- **Łup i ekwipunek** — 7 rzadkości, afiksy skalowane z ilvl, 8 slotów, makieta
  postaci, plecak, sprzedaż, „sprzedaj wszystko gorsze od noszonego".
- **Atrybuty** — start na zerze, 10 punktów w kieszeni, 3 za każde piętro.
- **Klasy i drzewka** — sześć klas, po trzy gałęzie × pięć węzłów × pięć rang.
- **Kronika** — bestiariusz z licznikiem zabić i odsłanianiem trofeów (4 na
  przeciwnika). Zakładki Sojusznicy i Pety czytają kolekcję z Przywołania.
- **Przywołanie** — klucze (dawna „waluta specjalna"), osobne pule sojuszników
  i petów, portal, losowanie ×1, animacja odsłonięcia.
- **Herb** — SVG, kształt, symbol, trzy kolory, losowanie.
- **Kod postaci** — powrót do postaci z innego urządzenia albo po zmianie adresu.

### Zrobione w połowie

- **Drużyna** — struktura pięciu slotów stoi, silnik walki od początku przyjmuje
  pięć jednostek po stronie gracza. Przywołani sojusznicy i pety **lądują
  w kolekcji, ale jeszcze nie wchodzą do walki**. Kart z ekranu nie da się rozwinąć.
- **Skille zbierackie** — siedem profesji z prawdziwymi drabinkami, ale to
  **sama makieta**: poziomy stoją na 1, nic się nie zbiera, nic się nie zapisuje.
- **Przywołanie** — brak prawdziwych szans, pity, duplikatów i gwiazdek.
- **Kronika** — Przedmioty i Osiągnięcia to na razie karty wyjaśniające zamiar.

### Nie zaczęte

Wyprawy · World Boss · Kolos · Tytan · rajdy · multiplayer · gildia ·
kowal i afiksy · Mystic/God crafting · przepalanie i energia · bank ·
postęp offline · **Dusze** · **wiele postaci na koncie** ·
etykiety klas na przedmiotach.

---

## CURRENT GIT STATE

| | |
|---|---|
| Branch | `main` |
| HEAD | `aeddb98` — „Vertical slice: szesc zakladek, staly pasek walki, wyczerpanie HP, Kronika" |
| Working tree | czysty w chwili pisania tego pliku (poza dopisywanymi dokumentami) |

Poprzednie punkty:

- `0739c17` — checkpoint pracy, która leżała niezacommitowana: drzewka klas,
  blok z tarczy, wprowadzenie, wybór klasy
- `ed3d46a` — stan sprzed vertical slice

**Nie ma niezacommitowanych zmian w kodzie.** Jeśli je zobaczysz, ktoś pracował po tym wpisie.

---

## COMPLETED

- [x] Audyt istniejącego projektu przed dotknięciem czegokolwiek
- [x] Checkpoint pracy leżącej w brudnym drzewie
- [x] Sześć zakładek głównej nawigacji, Postać i Drzewko pod profilem
- [x] Stały pasek walki, żyjący na każdej zakładce
- [x] Hub Wyprawy z widocznymi, wyłączonymi trybami
- [x] Biom Puszcza, lista pięter, odblokowanie sekwencyjne, powrót na piętro
- [x] Wyczerpanie HP między falami + restart piętra po porażce
- [x] Boss piętra 10 wymuszony turowo
- [x] Obrona jako akcja tury (silnik, config, UI, test)
- [x] Ciąg fal w automacie + tempo ×1/×2
- [x] Drużyna, Skille, Przywołanie, Kronika
- [x] Bestiariusz z trofeami odsłanianymi na zawsze

---

## ACTIVE WORK

Sesja z 17 sierpnia 2026 zbudowała cały vertical slice i **zatrzymała się zgodnie
z poleceniem**: przed rozbudową Wypraw właściciel ma obejrzeć całość i wydać werdykt
o kierunku UI/UX i gameplayu.

---

## NEXT STEP

**Poczekaj na werdykt właściciela.** Nie rozszerzaj scope’u bez niego.

Kiedy werdykt przyjdzie, pierwsza rzecz do zrobienia to **posadzenie sojuszników
i peta w walce**: silnik już przyjmuje pięć jednostek po stronie gracza
(`createFight({ party: [...] })`, `PARTY_SLOTS` w `public/app.js`), a Przywołanie
już produkuje obsadę do `ch.collection`. Brakuje wyłącznie sklejenia jednego
z drugim i statystyk dla sojusznika.

---

## IMPORTANT DESIGN DECISIONS

1. **HP nie wraca między falami.** To jest oś napięcia piętra. Pełne zdrowie oddaje
   wejście na nowe piętro albo porażka. Odwróciło to wcześniejszą decyzję
   („w wieży wchodzisz w każdą walkę z pełnym HP") — zrobione świadomie, na polecenie.
2. **Porażka nie karze niczym poza czasem.** Cofa na pierwszą falę piętra i oddaje
   pełne HP. Bez tego wyczerpanie zamyka gracza w pętli bez wyjścia.
3. **Boss aktu zawsze turowy.** Zwykłe fale grają się same, ważna walka wraca
   w ręce gracza. To jest główny eksperyment gameplayowy tej wersji.
4. **Auto to ciąg całego piętra, nie jednej walki.** Odtwarzanie chodzi po stronie
   klienta, dlatego walkę widać na każdej zakładce.
5. **Klucze Przywołania to ta sama waluta, którą oddaje boss.** Jeden portfel,
   dopóki nie wiadomo, czy Przywołanie zostaje.
6. **Skille zbierackie nie mają stanu.** Renderują się z `config.skills`. Nie ma
   czego zapisywać, więc nie ma czego stracić przy migracji.
7. **UI jest po polsku.** Specyfikacja slice’a używała angielskich etykiet —
   przeczytane jako nazwy systemów, nie tekst do wyświetlenia. Cała gra,
   dokumenty i commity są polskie.
8. **Klasy mieszane liczą oba atrybuty w pełni**, a płacą wyższym dzielnikiem
   (`dmgDivisor`). Wersja z liczeniem po połowie zabierała Paladynowi 37% obrażeń.

---

## DO NOT CHANGE

Bez wyraźnego polecenia nie ruszaj:

- **`game/config.js` jako jedynego miejsca z liczbami.** Balans stroi się tam
  i nigdzie indziej.
- **`mobHpGrowth` / `mobDmgGrowth` powyżej 1.01.** To mnożniki wykładnicze,
  a gracz rośnie liniowo. Powyżej tego moby uciekają bezpowrotnie po dwudziestu
  piętrach. Raz już wysadziło balans.
- **Serializowalności stanu walki.** Na tym stoi obsługa trybu turowego jednym
  kodem i możliwość zapisania walki do bazy. Generator losowy ma jawny stan
  (`nextRandom`), nie domknięcie.
- **`party` / `enemies` / `name` we wpisach logu walki.** Klient odtwarza z nich
  całą arenę. Usunięcie nazw dawało „undefined" pod każdym paskiem HP.
- **Struktury pięciu slotów po stronie gracza** — to jest przygotowane miejsce
  na sojuszników i peta.
- **Powrotu do liczenia atrybutów klas mieszanych po połowie** bez przeliczenia.
- **Wprowadzenia opisującego rzeczy, których nie ma.** Zasada: `INTRO`
  w `public/app.js` opisuje TYLKO to, co działa w tym buildzie.

---

## TEST / RUN COMMANDS

```
node server.js                  http://localhost:8080
.\start.ps1                     serwer + publiczny tunel Cloudflare
node game/combat.js             testy symulacji walki
node game/character.js          testy klas, atrybutów i drzewka
npm run apk <adres>             budowa APK
```

**Smoke check po zmianie w walce lub postaci:**

```
node game/combat.js && node game/character.js
```

**Smoke check ręczny (pełne przejście, ~3 minuty):**

1. Skasuj `raidfolk.db` albo wyczyść `localStorage` — dostaniesz świeżą postać.
2. Ułóż herb, wpisz imię, przeklikaj wprowadzenie, wybierz klasę.
3. Rozdaj dziesięć punktów atrybutów. **Bez tego nie przejdziesz pierwszego piętra.**
4. Wyprawa → Wieża → Ruszaj. Przejdź na Ekwipunek — pasek u dołu ma dalej żyć.
5. Zdobądź piętro, wejdź wyżej, zakładaj łup i dokupuj mikstury.
6. Na piętrze 10 sprawdź, że przełącznik trybu zniknął, a walka jest turowa.
7. Przywołaj sojusznika i peta, sprawdź, że widać ich w Drużynie i Kronice.

---

## KNOWN ISSUES

- **Sojusznicy i pety nie wchodzą do walki.** Lądują w kolekcji i widać ich
  w Drużynie oraz Kronice, ale arena dalej pokazuje puste sloty.
- **Skille zbierackie to makieta.** Klikanie niczego nie zmienia, poziomy stoją na 1.
- **Balans wieży jest luźno sprawdzony.** Bot, który rozdaje punkty, zakłada łup
  i dokupuje mikstury, przechodzi piętra 1–9 **bez ani jednej porażki**. Wyczerpanie
  jest więc widoczne, ale jeszcze nie groźne. Ktoś, kto nie rozda dziesięciu punktów
  startowych, nie przejdzie pierwszego piętra — to jedyna prawdziwa ściana.
- **Piętra mają 6–10 fal, nie sztywne 6.** Specyfikacja slice’a prosiła o 6,
  ale 6–10 już działało i było mniejszą zmianą niż upraszczanie.
- **Bestiariusz zna tylko obsadę Puszczy.** Rodziny z aktów 2–5 mają generyczną
  listę trofeów, bo ich obsada nie jest jeszcze zaprojektowana.
- **Trofea nie mają żadnego zastosowania** poza odsłanianiem wpisu w Kronice.
- **Kronika: Przedmioty i Osiągnięcia** to karty opisujące zamiar, nie systemy.
- **Ekran wyboru klasy obiecuje Dusze**, których w grze nie ma.
- **Jedna postać na konto.** Model sześciu osobnych postaci nie jest zrobiony.
- **Brak APK z tą wersją.** `RaidFolk.apk` w repo wskazuje na adres z `capacitor.config.json`
  i nie wymaga przebudowy przy zmianach w grze — ale sam adres tunelu zmienia się
  po każdym restarcie.

---

## FILE MAP

| Plik | Za co odpowiada |
|---|---|
| `server.js` | HTTP, całe API, pliki statyczne, rozliczenie walki, wyczerpanie HP, bestiariusz, Przywołanie |
| `game/config.js` | **WSZYSTKIE liczby gry** — walka, klasy, drzewka, wieża, łup, skille, Przywołanie |
| `game/content.js` | akty, piętra, przeciwnicy, generator przedmiotów, trofea bestiariusza |
| `game/combat.js` | symulacja walki (auto + turowa) + testy: `node game/combat.js` |
| `game/character.js` | atrybuty, drzewko, ekwipunek, statystyki wynikowe, migracja + testy |
| `game/db.js` | SQLite, postać jako JSON, tokeny |
| `public/index.html` | szkielet: ekrany startowe, osiem sekcji, pasek walki, sześć zakładek |
| `public/app.js` | cały klient: renderery ekranów, odtwarzanie walki, ciąg fal, obsługa akcji |
| `public/style.css` | cały wygląd |
| `public/crest.js` | generator herbu (SVG) |
| `makieta_ui.html` | klikalna makieta wszystkich ekranów, także niezaimplementowanych |
| `RAIDFOLK_IDLE_DESIGN.md` | zatwierdzona wizja produktu |
| `RAIDFOLK_IDLE_SESSION_LOG.md` | historia prac bez czytania diffów |
| `CLAUDE.md` | kontekst dla agenta, pułapki środowiskowe |
| `start.ps1` | serwer + tunel jedną komendą |

### Gdzie co zmienić

| Chcesz | Idź do |
|---|---|
| zmienić balans czegokolwiek | `game/config.js` — i tylko tam |
| dodać przeciwnika albo biom | `game/content.js`, `ACTS` + `FAMILY_DROPS` |
| zmienić zachowanie walki | `game/combat.js`, potem `node game/combat.js` |
| dodać ekran | `public/index.html` (sekcja + zakładka) i `render()` w `public/app.js` |
| zmienić, co niesie stan do klienta | `view()` w `server.js` |

---

## PUŁAPKI ŚRODOWISKOWE

- **PowerShell 5.1 czyta `.ps1` jako ANSI.** Polskie znaki bez BOM-u łamią parser
  w losowym miejscu. Skrypty `.ps1` zapisuj jako **UTF-8 z BOM**.
- **Komunikaty commitów z polskimi znakami przez `-m` się wysypują.** Pisz treść
  do pliku i używaj `git commit -F plik`.
- **APK to tylko powłoka** wskazująca na adres serwera. Zmiany w grze lecą
  z serwera i nie wymagają przebudowy APK.
- **Serwer chodzi na laptopie autora**, wystawiany losowym tunelem Cloudflare.
  Adres zmienia się po każdym restarcie — stąd kod postaci.
- **ngrok jest odradzany** — Defender oznaczył zaktualizowany plik jako trojana.
- **Port 8080 bywa zajęty** przez wcześniejszy `node.exe` autora.

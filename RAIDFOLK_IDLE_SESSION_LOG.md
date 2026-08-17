# RAIDFOLK IDLE — SESSION LOG

Historia prac. Bez pierdół — jeden wpis na znaczącą sesję, żeby dało się zobaczyć,
co się działo, bez czytania całego diffa.

---

## 2026-08-17 — vertical slice

**START HEAD:** `ed3d46a`
**END HEAD:** `aeddb98`

### DONE

- Audyt całego projektu przed dotknięciem czegokolwiek. Drzewo robocze było brudne
  na 928 linii prawdziwej pracy (drzewka klas, blok z tarczy, wprowadzenie, wybór
  klasy) — zacommitowane osobno jako `0739c17`, żeby dało się je oddzielić od slice’a.
- Główna nawigacja przebudowana na sześć zakładek: Wyprawa, Drużyna, Ekwipunek,
  Skille, Przywołanie, Kronika. Postać i Drzewko zeszły pod przycisk profilu
  w nagłówku — **nic nie zostało skasowane**.
- Stały pasek walki nad zakładkami. Widoczny na każdym ekranie, dopóki coś się bije;
  niesie biom, piętro, falę, oba paski HP, tempo ×1/×2, STOP i DO WALKI.
- Hub Wyprawy: Wieża otwarta, Wyprawa `WKRÓTCE`, World Boss / Kolos / Tytan `ZAMKNIĘTE`.
- Biom Puszcza (akt 1) z obsadą pod bestiariusz: Leśny Szlam, Goblin, Leśny Wilk,
  boss Strażnik Puszczy. Lista dziesięciu pięter, odblokowanie sekwencyjne,
  powrót na zdobyte piętro.
- **Wyczerpanie HP między falami.** Pełne zdrowie oddaje wejście na nowe piętro
  albo porażka; porażka cofa na pierwszą falę.
- Boss piętra 10 wymuszony turowo, niezależnie od przełącznika trybu.
- **Obrona** jako akcja tury — silnik, liczba w config, przycisk, test.
- Ciąg fal w trybie auto: całe piętro leci samo, odtwarzanie na timerze klienta,
  więc przejście na inną zakładkę go nie przerywa.
- Nowe ekrany: Drużyna (5 slotów), Skille zbierackie (7 profesji z drabinkami),
  Przywołanie (klucze, portal, osobne pule, animacja odsłonięcia),
  Kronika (bestiariusz z licznikiem zabić i trofeami).
- `RAIDFOLK_IDLE_HANDOFF.md` i ten plik — założone od zera.

### CHANGED

- `server.js` — `fightMode()`, wyczerpanie HP w `startFight`/`resolveFight`,
  restart piętra po porażce, `doGoto`, `doSummon`, `floorList`, `bestiaryView`,
  klucze zamiast „waluty specjalnej"
- `game/config.js` — `combat.defendCut`, blok `skills`, blok `summon`
- `game/content.js` — akt 1 na Puszczę, `family` w przeciwniku,
  `FAMILY_DROPS` + `rollTrophy`
- `game/combat.js` — akcja `defend`, `takenMult` w obliczaniu obrażeń,
  **nazwy jednostek w `snapshot()`**
- `game/character.js` — `bestiary`, `collection`, klucze na start, migracja
- `public/index.html` — osiem sekcji, pasek walki, sześć zakładek, nagłówek-przycisk
- `public/app.js` — hub, lista pięter, cztery nowe ekrany, pasek walki, ciąg fal,
  tempo, ekrany ZDOBYTE/PORAŻKA, przepisane wprowadzenie
- `public/style.css` — style wszystkiego powyżej
- `.claude/launch.json` — `autoPort: false`, żeby siedzieć na 8080

### DECISIONS

- **HP nie wraca między falami.** Odwrócenie wcześniejszej decyzji
  („w wieży wchodzisz w każdą walkę z pełnym HP") — świadome, na polecenie.
- **Porażka cofa na pierwszą falę i oddaje pełne HP.** Bez tego wyczerpanie
  zamyka gracza w pętli bez wyjścia.
- **Auto obejmuje całe piętro, nie jedną walkę.** Inaczej stały pasek nie miałby
  czego pokazywać na innych zakładkach.
- **Klucze Przywołania = dawna „waluta specjalna".** Jeden portfel zamiast dwóch.
- **Skille zbierackie bez stanu**, renderowane z config. Nie ma czego stracić.
- **UI zostaje po polsku.** Angielskie etykiety ze specyfikacji przeczytane jako
  nazwy systemów, nie tekst do wyświetlenia.
- **Piętra zostają na 6–10 falach**, nie sztywnych 6. To już działało; upraszczanie
  byłoby większą zmianą niż zostawienie.
- **Postać i Drzewko schodzą pod profil, nie znikają.** Działające systemy się nie kasuje.

### TESTS

- `node game/combat.js` — przechodzą, w tym nowy test Obrony
- `node game/character.js` — przechodzą
- Ręczne przejście na `localhost:8080`: nowa postać → herb → wprowadzenie →
  klasa → piętra 1–9 na automacie → boss turowy z Obroną → wygrana → trofeum →
  dwa przywołania → wszystkie zakładki
- Sprawdzone osobno: pasek walki żyje po przejściu na Ekwipunek w trakcie ciągu fal;
  wyczerpanie HP widoczne między falami; piętra zamknięte nie dają się kliknąć

### NEXT

- **Werdykt właściciela o kierunku UI/UX i gameplayu.** Scope zatrzymany zgodnie
  z poleceniem — żadnych Wypraw przed tą rozmową.
- Potem pierwsze w kolejce: posadzić sojuszników i peta w walce. Silnik przyjmuje
  pięć jednostek od początku, Przywołanie już produkuje obsadę — brakuje sklejenia.

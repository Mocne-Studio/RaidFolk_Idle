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

---

## 2026-08-17 (druga sesja) — corrections pass

**START HEAD:** `84317f1`
**END HEAD:** `0b4ac30`

### DONE

- **Skasowany czterostronicowy pseudo-poradnik** po herbie. Flow to teraz
  herb → imię → gra, bez ani jednego przystanku.
- **Skasowany wybór klasy głównej postaci** razem z ekranem, endpointem
  `/api/classes` i wszystkim, co w kliencie od niego zależało.
- **Główna postać dostała stały profil „Bohater"** — obrażenia z Siły, Intelektu
  i Zręczności naraz, jedno uniwersalne drzewko (Siła / Hart / Tempo).
- **Układ jednoekranowy.** `.screens` przestało być długą stroną; każdy ekran to
  kolumna flex, a przewijają się wyłącznie pudełka z danymi.
- **Responsywność na tablet i desktop** — 520 / 900 / 1180 px. Wcześniej gra była
  paskiem 520 px pośrodku pustej strony.
- **Ekwipunek przebudowany** — makieta postaci 3×3 z portretem, siatka statystyk
  z podpowiedziami, panel szczegółu z różnicą wobec noszonego, kategorie plecaka.
- **`ilvl` → „Poziom przedmiotu"** z wyjaśnieniem w podpowiedzi.
- **Górnictwo gra naprawdę** — exp, poziomy, pasek, drabinka pięciu surowców,
  cykle lecące same, surowce lądujące w Ekwipunku.
- **Naprawione zakleszczenie walki turowej** zgłoszone przez testera.

### CHANGED

- `game/config.js` — profil `bohater`, drzewko `bohater`, prawdziwe dane Górnictwa
- `game/character.js` — `PROFIL`, migracja każdej klasy na Bohatera, `prof`,
  `materials`, `activity`, `xpNeed`, `addSkillXp`, `canGather`; testy przepisane
- `server.js` — `/api/classes` skasowane, `/api/mine`, `/api/minestop`,
  `/api/minetick`, `/api/abandon`; `startFight` wraca do niedokończonej walki;
  `/api/mode` porzuca ją zamiast blokować; `skillsView`, `materialsView`
- `public/index.html` — usunięte sekcje wprowadzenia i wyboru klasy
- `public/app.js` — usunięte `INTRO` i `showClasses`; przebudowany Ekwipunek;
  pętla Górnictwa; dwu- i trzykolumnowe układy; karta „Wróć do walki / Porzuć";
  przycisk zmiany trybu w pasku walki
- `public/style.css` — układ jednoekranowy, punkty łamania, style Ekwipunku,
  Skilli i drzewka; usunięte martwe style wprowadzenia i wyboru klasy

### DECISIONS

- **Gracz nie ma klasy i nie będzie miał.** Klasy przechodzą do Sojuszników.
  Sześć drzewek klasowych zostaje w config — policzone i przetestowane, czekają.
- **Bohater liczy trzy atrybuty ofensywne w pełni**, dzielnik 110. Skutek uboczny,
  który jest zyskiem: znika martwy drop.
- **`ilvl` zostaje jako pole**, bo realnie bramkuje zakładanie i skaluje bazę
  przedmiotu. Zmieniona tylko nazwa i dodane wyjaśnienie.
- **Porzucenie walki nic nie kosztuje.** Blokada „najpierw dokończ walkę" robiła
  z tego pułapkę bez wyjścia, a przegrana i tak nie kosztuje nic poza powrotem
  na pierwszą falę.
- **Górnictwo bez postępu offline.** Zegar trzyma klient, serwer wydaje dokładnie
  jeden cykl i sprawdza czas.
- **Ekran tworzenia herbu wolno przewijać.** Nie jest ekranem gameplayowym.

### TESTS

- `node game/combat.js` — przechodzą
- `node game/character.js` — przechodzą, testy przepisane pod brak klasy gracza
- Zmierzone `scrollHeight` vs `clientHeight` sześciu zakładek na **1280×720**,
  **768×1024** i **375×812** — żadna nie przewija się jako strona, brak poziomego scrolla
- Ręcznie: herb → imię → gra; Ekwipunek z porównaniem przedmiotów; Górnictwo do
  poziomu 5 z odblokowaniem Cyny i Żelaza; 37 sztuk Miedzi w Ekwipunku → Surowce
- Ręcznie odtworzone i naprawione zakleszczenie: `Walka już trwa` → `WRACA DO WALKI`,
  `Najpierw dokończ walkę` → `ok, porzucona=true`

### NEXT

- **Werdykt właściciela.** Scope zatrzymany.
- Potem: Sojusznicy w walce (i klasy wracają po ich stronie), następnie Kowalstwo,
  żeby ruda miała gdzie trafić.

---

## 2026-08-17 (trzecia sesja) — szyk, Wyprawa, sojusznicy w walce

**START HEAD:** `1650a64`
**END HEAD:** `34f2dc0`

### DONE

- **Sojusznicy i pet naprawdę walczą.** Statystyki liczą się z bohatera, mikstury
  zostają jego. Drużyna przebudowana na skład + panel wybranego.
- **Szyk trzech rzędów.** Klasa daje rząd, broń daje zasięg, broń biała musi
  podejść do tylnego rzędu. Przeciwnicy grają na tych samych zasadach.
- **Wyprawa uruchomiona** jako jedyne źródło przedmiotów. Osiem walk, trzy ryzyka,
  sakwa wpada do plecaka dopiero po ukończeniu.
- **Łup wycięty z wieży.** Zostaje złoto, exp skilli i Kronika.
- **Dwóch przeciwników od piętra 3**, drugi słabszy o 35%.
- **Skille bojowe wróciły** jako bonusy: Broń biała, Łuk, Różdżka, Obrona,
  Witalność. Exp dzieli się według rąk. Bronie mają liczbę rąk, dwuręczne biją
  mocniej i blokują drugą rękę.
- **Drzewko punktowe schowane z UI**, liczby zostają w kodzie.
- **Rodzaj obrażeń w logu** — fizyczne bordowe, magiczne niebieskie.
- **Pamięć porażki** — piętro, fala i przeciwnik, który rozłożył.
- **Odblokowania drużyny progami**: piętro 3 przywoływanie sojuszników,
  piętro 10 petów, sloty 2 i 3 zamknięte.
- **Skille to jedno miejsce na rozwój**: Zbierackie, Bojowe, Atrybuty.
- **Rybołówstwo i Runy grywalne** obok Górnictwa.
- **Jawne szanse Przywołania** — 62 / 25 / 9 / 3.2 / 0.8%.
- **Ekwipunek**: portret znikł ze środka makiety, jest tam napierśnik, buty pod
  nim, wolna komórka niesie Moc. Doszło porównanie „nosisz kontra bierzesz".

### POPRAWKI

- pętla kopania miała zaszyte `gornictwo` — Rybołówstwo i Runy wywalały się
  na drugim cyklu
- niedokończona walka turowa była ślepym zaułkiem (patrz sekcja 18.10 DESIGN)

### RESET

Konta **Lol** (7 postaci) i **Cuckamcy** zresetowane do piętra 1, obsada drużyny
wyczyszczona. Ekwipunek i złoto zostały.

### TESTS

- `node game/combat.js` — przechodzą, w tym testy szyku: broń biała nie dosięga
  trzeciego rzędu, potrzebuje dwóch podejść, dystans bije od razu, przód zasłania tył
- `node game/character.js` — przechodzą, w tym podział expa według rąk
  i dwuręczna zdejmująca tarczę
- Zmierzone na **375×812**: żadna z sześciu zakładek ani żadna podzakładka Skilli
  nie przewija się jako strona, brak poziomego scrolla
- Ręcznie: wyprawa od startu do ukończenia, dwa przedmioty do plecaka;
  wieża bez łupu; sojusznik i pet zadający obrażenia w logu

### NEXT

- Werdykt właściciela. Potem: Kowalstwo (ruda nie ma gdzie trafiać) i sloty 2–3.

---

## 2026-08-17 (czwarta sesja) — Wyprawa V1

**START HEAD:** `06f6401`
**END HEAD:** `f4b1ca1`

### DONE

- **Wyprawa przebudowana na roguelite run**: dziesięć etapów z szkieletu
  generowanego z ziarna — walki, dwa rozdroża, zdarzenie, postój, elita, boss.
- **Rozdroża i zdarzenia zatrzymują run.** Trzy rozdroża i trzy zdarzenia
  z realnymi konsekwencjami: leczenie, klątwa (+15% obrażeń wroga na resztę runu),
  surowiec do sakwy, mnożniki łupu, mikstura.
- **Sakwa** — łup i surowce runu wiszą osobno, wpadają do plecaka dopiero po bossie.
- **Postój w połowie** — odsyłasz jeden przedmiot i jeden rodzaj surowca.
- **Boss wyprawy turowo** priorytetowo, z przełącznikiem „zawsze automatyczna".
- **Porażka nie leczy** — nigdzie.
- **Limity mikstur**: 3 na wieżę, 10 na wyprawę.
- Zakładka **Przygody** (dawniej Wyprawa), z Wieżą i Wyprawą w środku.
- UI: pasek trasy `●●◆●?⛺●◆★☠`, ekran decyzji, ekran postoju, podgląd sakwy,
  efekty runu, podsumowania ukończenia i porażki, „Jeszcze raz".

### TESTS

- `node game/combat.js`, `node game/character.js` — przechodzą
- **nowy** `node game/expedition.test.js` (wymaga `PORT=8099 node server.js`) —
  brak leczenia na wejściu, brak wcześniejszej ekstrakcji, porzucenie niszczy
  sakwę ale nie plecak, rozdroże zatrzymuje run i blokuje walkę, struktura runu,
  limity mikstur, wąskość postoju
- Ręcznie na **375×812**: pełny run od wyboru ryzyka przez rozdroże (obóz
  wyleczył 186/212), postój (przedmiot z sakwy do plecaka, 2→1), po śmierć
  z utratą reszty sakwy. Żaden ekran nie przewija się jako strona.

### ZNANE RYZYKO

Porażka bez leczenia + brak łupu z wieży potrafi zabetonować postać:
zmierzone **9 HP z 245, 0 mikstur, 37 złota** przy koszcie mikstury 52.
Jedyne wyjście to regeneracja 2%/min. Do rozstrzygnięcia z Alchemią.

### NEXT

- Werdykt właściciela o Wyprawie: długość runu, rozdroża, napięcie sakwy,
  attrition, czytelność, chęć kliknięcia „Jeszcze raz".
- Potem: Alchemia (mikstury) i modyfikatory trudności.

---

## 2026-08-17 (piąta sesja, przerwana) — wybór wyprawy i modyfikatory

**START HEAD:** `bb04200`
**END HEAD:** `7872f37`

### DONE

- **Wybór wyprawy przed ryzykiem.** Najpierw dokąd, potem jak trudno.
  Puszcza Cierniowa otwarta od początku, Mokradła Szeptu zamknięte do piętra 11.
- **Długość runu rośnie z poziomem** — 8 etapów, 10 od piętra 5, 12 od piętra 12.
- **Tabela dropów z odkrywaniem.** Generator losuje nazwy wyłącznie z listy
  w definicji wyprawy, więc tabela jest prawdą. Nieodkryte stoją jako `???`;
  odkrycia trwałe w `ch.discovered`, migracja oznacza to, co gracz już ma.
- **Modyfikatory** (odłożone sekcje 17–18 promptu): Zahartowani, Wścieklizna,
  Sucha ziemia, Łowy na elity, Bez postoju. Każdy podbija mnożnik nagrody,
  kolejne otwierają się z piętrami.
- **Poprawka:** nagłówek walki na wyprawie pokazywał „Piętro 2" — teraz etap runu.
- **Usunięte kupowanie mikstur** — mają być z Alchemii.
- **Przerwa 700 ms między cyklami zbierania**, żeby było widać, że coś padło.

### TESTS

`node game/combat.js`, `node game/character.js`, `node game/expedition.test.js`
(z `PORT=8099 node server.js`) — wszystkie przechodzą.
Ręcznie na 375×812: lista wypraw, ekran szczegółów z tabelą dropów
i modyfikatorami — nic się nie przewija.

### PRZERWANE

Autor zabrał laptopa. Repo czyste, nic nie wisi.

### NEXT

**Alchemia** — patrz NEXT STEP w HANDOFF. Potem umiejętności.

---

## 2026-08-17 (szósta sesja) — wszystkie profesje

**START HEAD:** `e886af0`
**END HEAD:** `112372a`

### DONE

- **Alchemia** — zioła na mikstury. Jedyne źródło mikstur w grze.
- **Rolnictwo** — zbiera zioła i zboże, karmi Alchemię i Gotowanie.
- **Kowalstwo** — ruda na sztaby, sztaby na **ulepszanie sprzętu** (+8% za plus, do +10).
- **Gotowanie** — ryby i zboże na jedzenie, jedzenie na **buff liczony w walkach**.
- Mechanika przetwarzania jest uogólnieniem pętli zbierania: `koszt` w definicji
  surowca zjada materiały, `daje.potion` omija plecak i idzie prosto w mikstury.
- **Poprawka:** wyprawka startowa powstawała z `id: null`, więc ulepszanie
  odbijało się o „nie ma takiego przedmiotu". Migracja nadaje id każdemu
  przedmiotowi, który go nie ma.
- UI: koszt wsadu na karcie, blokada przy braku, aktywny buff z licznikiem walk,
  przycisk „Zjedz", ulepszanie w panelu przedmiotu, nazwy surowców z serwera.
- Ekwipunek na telefonie: makieta i panel szczegółu w jednym przewijanym pudełku,
  żeby ekran dalej mieścił się na jednym ekranie.

### TESTS

`combat.js`, `character.js`, `expedition.test.js` — przechodzą.
Ręcznie przeszedł cały łańcuch:
Rolnictwo 4 zioła → Alchemia zjadła 2 → +1 mikstura ·
Górnictwo 7 miedzi → Kowalstwo 2 sztaby → broń +1 (14→15 obrażeń) ·
Rolnictwo zboże → Gotowanie placek → zjedzony → +6% zdrowia na 5 walk (132→140).
Na 375×812 żaden ekran nie przewija się jako strona.

### NEXT

Werdykt właściciela. Potem: umiejętności (zapowiedziane), sloty drużyny 2–3,
Mokradła Szeptu jako druga wyprawa.

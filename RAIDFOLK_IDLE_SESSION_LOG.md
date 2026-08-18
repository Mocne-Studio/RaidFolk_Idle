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

---

## 2026-08-17 (siódma sesja) — runy dwustopniowe

**START HEAD:** `102de0a`
**END HEAD:** `5d5ab1b`

### DONE

- **Poprawka:** składniki receptury pokazywały się tylko przy odblokowanych
  pozycjach — nie dało się zobaczyć, na co się zbiera. Teraz widać zawsze.
- **Runy na dwa stopnie:** esencja + ruda → runa zwykła; runa ×2 + **Kryształ
  Magii** → runa mocy.
- **Kryształ Magii wypada wyłącznie z wypraw** (14% na walkę). Świadoma bramka:
  samo kopanie nigdy nie da run mocy.
- **Górnictwo kopie esencje**, przeplatane z rudami (10 pozycji drabinki).
- **Eliksir bierze Runę Mocy** — runy mocy mają odbiorcę od pierwszego dnia.
- Tabela surowców wyprawy jest data-driven, nie zaszyta w kodzie.

### TESTS

`combat.js`, `character.js`, `expedition.test.js` — przechodzą.
Ręcznie: trzy wyprawy oddały 7 miedzi i 1 Kryształ Magii; wszystkie receptury
pokazują składniki pod kłódką; ekran Skilli się nie przewija.

### NEXT

Werdykt właściciela, potem umiejętności.

---

## 2026-08-17 (ósma sesja) — magia z run

**START HEAD:** `f2666c5`
**END HEAD:** `755524f`

### DONE

- **Łańcuch magii:** Górnictwo (esencja + kryształy żywiołów) → RuneCrafting
  (runa) → podpięcie runy → poziom Magii otwiera zaklęcia.
- **Fireball** jako pierwszy czar: Runa Ognia + Magia 1.
- Zaklęcia liczone przy wejściu do walki, nie trzymane w `ch.abilities`.
- **Kopanie run dzieli exp 50/50** między Górnictwo i RuneCrafting.
- Panel „Runa magii" w Skille → Bojowe: podpięta runa, posiadane runy,
  ich zaklęcia i to, które już umiesz.
- Składniki receptur widoczne także pod kłódką (poprawka z poprzedniej sesji).

### POPRAWKI

- Edycja configu zjadła bloki `combatSkills`, `formation` i `allies` —
  przywrócone z commita, potwierdzone testami.
- Eliksir wskazywał na nieistniejący składnik po przebudowie run.
  Dodany kontroler spójności wszystkich kosztów.

### TESTS

`combat.js`, `character.js`, `expedition.test.js` — przechodzą.
Ręcznie: wykucie Runy Ognia (esencja 1 + kryształ 2), podpięcie, Fireball
w umiejętnościach walki; kryształ dał 16 expa → 8 Górnictwo + 8 Runy.
Na 375×812 ekran Skilli się nie przewija.

### NEXT

Werdykt właściciela. Otwarte: co dają runy poza czarami, drugie zaklęcia
pozostałych żywiołów, rzadsze runy z dropu.

---

## 2026-08-17 (dziewiąta sesja) — mana i skalowanie od broni

**START HEAD:** `d70eb0d`
**END HEAD:** `efb9703`

### DONE

- **Broń decyduje o atrybucie obrażeń** — biała/Siła, dystans/Zręczność,
  różdżka/Intelekt. Autoatak różdżką jest magiczny. Pozostałe atrybuty liczą się
  z wagą 0.35, więc martwy drop nie wraca.
- **Mana** — zaklęcia kosztują manę zamiast ładunków paska. 20 + Intelekt×3,
  regen 2 na turę, start pełny. Automat rzuca najdroższy dostępny czar.
- **Punkty za piętro przy ostatnim mobie**, nie przy wejściu wyżej.
  `ch.nagrodzone` blokuje podwójną wypłatę za to samo piętro.
- **Przewijanie przeżywa render** — kopanie nie wyrzuca już na górę listy.

### POPRAWKI

- `charge` przy umiejętności to ile ŁADUJE pasek, nie koszt. Potraktowanie go
  jako kosztu zablokowało wszystkie zwykłe umiejętności. Złapane testami.

### TESTS

`combat.js` (nowe testy many: koszt, blokada przy braku, regeneracja, brak
ładowania paska), `character.js` (skalowanie od broni w obie strony, mana tylko
z Intelektu), `expedition.test.js` — przechodzą.
Ręcznie: pozycja przewijania 220 przed i po cyklu kopania; zdobycie piętra
wypłaciło +3 punkty i +1 klucz przy ostatnim mobie.

### NEXT

Werdykt właściciela. Otwarte: drugie zaklęcia pozostałych żywiołów,
czy rzucanie czarów ma dawać exp do Magii.

---

## 2026-08-17 (dziesiąta sesja) — szyk, prowokacja, AI

**START HEAD:** `50f0a4b`
**END HEAD:** `e37fcd0`

### DONE

- **Pasek ładowania i ultimate skasowane.** Zostały cooldowny i mana.
- **Rząd bohatera z broni** — biała 1, różdżka 2, łuk 3. Dopiero teraz
  sojusznik-wojownik naprawdę zasłania.
- **Prowokacja** — ściąga wrogów na tanka na 3 tury i zatrzymuje ich marsz.
- **AI wybiera najgroźniejszego** w zasięgu, nie pierwszego z tablicy.
- **Czary dają exp do Magii** (9 za rzut).
- Potwierdzone: dwóch przeciwników od piętra 3 już działało.

### TESTS

`combat.js` (nowe: AI wybiera najgroźniejszego, prowokacja nakłada taunt
i zatrzymuje marsz), `character.js`, `expedition.test.js` — przechodzą.
Zmierzone: topór rząd 1/zasięg 1, różdżka 2/3, łuk 3/3; jedno zaklęcie = 9 expa.

### NEXT

Werdykt właściciela.

---

## 17 sierpnia 2026 — sesja piąta: UI, ranking, skalowanie do 50, Kolos

**Nawigacja i wygląd**
- **SKILLE wróciły na dolny pasek.** Sześć zakładek zamiast pięciu; font schodzi
  na wąskich telefonach, cel dotyku zostaje pełny.
- **Karta gracza pod górnym paskiem** — herb do edycji na miejscu (bez wracania
  na ekran startowy), opis o sobie, gildia (jeszcze jej nie ma i tak to napisane),
  data założenia konta i dni w wieży.
- **Pięć motywów**: Mrok, Mosiądz Świetlisty (gradient), Otchłań, Krew, Pergamin
  (jasny). Kafelek wyboru maluje się WŁASNĄ paletą, więc podgląd jest samym motywem.
  Motyw i jakość siedzą na serwerze — przeżywają zmianę urządzenia.
- **Jakość** niska gasi animacje, cienie i gradienty. **Dźwięk** to WebAudio bez
  plików: cios, kryt, pudło, leczenie, koniec walki, awans.
- Twarde kolory (`#0C0A09`, `#26211B`, `#17120B`) zamienione na zmienne
  (`--void`, `--press`, `--on-brass`) — inaczej jasny motyw rysował czarny log
  na pergaminie.

**Ranking**
- Top 3 po **piętrze** (złota korona) i po **mocy** (złoty hełm), z podpisem `1#`.
  Podium na karcie gracza, własne miejsce jako trofea w górnym pasku.
- Liczony ze WSZYSTKICH zapisów, cache 15 s — bez niego przeliczałby się przy
  każdym zapytaniu do API.

**Ekwipunek**
- **Przesuwany pasek podziału.** Gracz przeciąga uchwyt i oddaje ekran plecakowi.
  Podział trzymany w px w localStorage, zmienna CSS — przeciąganie NIE przerysowuje
  ekranu, więc lista nie skacze pod palcem.
- Poniżej progu statystyki zwijają się do **Zdrowie / Atak / Moc**.
- **Klik w slot makiety filtruje plecak** na ten slot. Rząd kategorii zszedł
  do „Wszystko / Surowce" plus chip aktywnego filtru.
- **Naprawiony reset przewijania**: `.eq-top` doszedł do `PRZEWIJANE`. Czytanie
  opisu przedmiotu i kliknięcie czegokolwiek nie wyrzuca już na początek listy.

**Wrogowie**
- **Trójki od piętra 15** (`trioFromFloor`), trzeci najsłabszy.
- **Piętra 25, 35, 45…** kończą się **mini-elitą**: elita ze stunem i trucizną,
  healer i oprawca.
- **Bossy 10/20/30/40/50 mają świtę**: Rogaty Demon (tank, elita, ogłuszenie),
  Lich (mag, elita, zatrucie), Sukkubus (łucznik, zwykły). Ta sama przy każdym bossie.
- Silnik walki umie teraz po stronie WROGA: zdolności z cooldownem, **ogłuszenie**,
  **trucizna** (procent max HP na turę, przechodzi przez pancerz), **leczenie**
  swoich i **kilka ciosów w jednej turze**.

**Skalowanie — `tools/balans.js`**
- Nowe narzędzie: buduje prawdziwą postać, bierze prawdziwe statystyki, puszcza
  prawdziwą symulację. `node tools/balans.js --cel` sprawdza cele balansu.
- **Znaleziony i naprawiony błąd: `plus` z Kowalstwa NIC NIE ROBIŁ.** Ulepszenia
  rosły w UI i nie wchodziły do statystyk — sztaby szły w powietrze.
- **`armorK` skaluje się z piętrem.** Przy stałym 400 pancerz z piętra 50 zbijał
  79% obrażeń, a z piętra 10 — 45%; bohater na 50 wytrzymywał 66 tur zamiast 25.
- **Człon kwadratowy w skalowaniu moba.** Obrażenia gracza rosną kwadratowo
  (broń z ilvl × mnożnik z atrybutów), zmierzone: 270 na piętrze 10, 2759 na 50.
  Bez `mobHpPerFloor2` boss z piętra 50 padał od dwóch ciosów.
- Trafione cele: boss 10 w heroikach +3 — **68%**, z dwiema legendami — **90%**,
  w wyprawce — **0%**; piętro 5 w commonach — 88%; mini-elita 25 — 80%;
  piętro 50 w legendach — 33%. Zwykłe piętra przechodzą się w 100%, ścianami
  są bossy i piętra elit.

**Wyprawy**
- **Pięć wypraw do poziomu 50**: Puszcza 1–10, Mokradła 10–20, Kopalnia 20–30,
  Wąwóz 30–40, Kaplica 40–50. Odblokowuje je postęp w wieży.
- **To wyprawa, a nie piętro, decyduje o poziomie łupu.** Legendarne biorą górne
  20% widełek (Puszcza: 8–10), reszta dolne (1–8). **Wysokie ryzyko MNOŻY widełki ×2.**

**Drużyna**
- Sojusznik 1 od poziomu 3. **Pet przed walką z bossem** — próg 10 zapala się
  z wejściem na piętro bossa, nie po nim.
- **Slot 2 otwiera ukończona Puszcza Cierniowa na wysokim ryzyku**, nie kolejne piętro.
- **Pet stoi na SWOIM miejscu w arenie.** Wcześniej przy pustym slocie sojusznika
  wskakiwał na jego miejsce i był podpisany „sojusznik".

**Powtarzanie piętra** — od piętra 10. Zdobyte piętro startuje od pierwszej fali
z pełnym zdrowiem zamiast wypuszczać wyżej. Punkty za piętro dalej jednorazowe.
Porażka zatrzymuje automat i mówi wprost, że dalej idzie się ręcznie.

**Zbieranie** — panel „co teraz zbierasz" wskakuje na telefonie NA GÓRĘ ekranu.
Licznik sztuk i expa tej sesji, czas zbierania, tempo **szt/h i exp/h**
oraz **ile brakuje do kolejnego poziomu** (exp, cykle i czas).

**Kolos — Yeti Zmarzniętych Turni.** 500 000 HP, 10 000 ataku, 15 000 pancerza,
dwa ciosy w turze, ogłuszenie na dwie tury. Opis, grafika (`public/img/yeti.png`
— **zaślepka do podmiany**, generator `tools/make-yeti.mjs`), nagroda: Różdżka
Lodowa za pierwsze zwycięstwo, złoto za kolejne. Ekran pokazuje WPROST, ile
ciosów potrzeba i ile tur się przeżyje — bo dziś ta walka jest nie do wygrania
(bohater z piętra 50: ~1100 ciosów potrzebnych, jedna tura przeżycia).

**Szanse na rzadkości ustalone co do setnej.** Wagi w `config.loot` przeszły
na setne procenta (suma 100 000), bo w skali 1–1000 nie da się zapisać 0,001%.
**Legendary, Mystic i God wypadają wyłącznie ze skrzyni bossa** — poza nim mają
zerową wagę, więc bramka wynika z samych liczb, bez osobnego warunku w kodzie.
Legendary **0,3%**, Mystic **0,1%**, God **0,001%** na przedmiot.
Zmierzone na 2 000 000 losowań: 0,2947% · 0,0997% · 0,0013%.
W przeliczeniu na run wyprawy (skrzynia 3–6 sztuk, średnio 4,5): heroik co ~3 runy,
legenda co ~74, Mystic co ~223, God co ~22 000.

**Poprawka rat:** unique **5%**, heroic **1%** — na mobach, wariantach „+" i u bossa
tak samo; różni je szansa na drop i złoto, nie rzadkość. Reszta puli to commony
i uncommony. Boss dokłada legendary 0,3%, Mystic 0,1%, God 0,001%.

**Broń wypada już z plusem.** `config.loot.plusNaBroni`: 1% broni ma jakikolwiek
plus, kolejne stopnie są o 0,682 rzadsze, najwyższy to 1% puli plusowanych
(0,01% wszystkich broni). Tylko broń — pancerz dalej u kowala. Zmierzone
na 1 000 000 losowań: 0,986% broni z plusem, +10 to 0,98% puli i 0,0096% całości.
Plus widać teraz przy nazwie w plecaku, na makiecie i w porównaniu.

**Ryzyko wyprawy przebudowane.** Zamiast niskie/równe/wysokie są trzy progi,
które ustawiają DŁUGOŚĆ RUNU: Bez ryzyka 12 etapów, Zaawansowany 24 (×2 nagroda),
Profesjonalista 48 (×5 nagroda, podwójne widełki ilvl). **Bez ryzyka legendy
nie wypadają w ogóle.** Szkielet runu powtarza teraz swój wzór zamiast dosypywać
walki jedną kupą — 48 etapów daje 23 walki, 11 rozdroży, 6 zdarzeń i 6 ognisk,
a nie czterdzieści walk pod rząd. Stare klucze ryzyka migrują same.

**Poziom przedmiotu zależy od WĘZŁA.** Zwykła walka oddaje dolną część widełek,
elita środek, boss górę — Puszcza (1–10) daje odpowiednio 1–5, 5–8 i 6–10.
Wcześniej pierwsza walka runu i boss dawały statystycznie to samo.

**Ognisko leczy do pełna.** Na postoju można zjeść jedzenie z Gotowania: pełne HP
plus buff na kolejne walki, bez ruszania limitu mikstur. Postój jest teraz
wielokrotny — każde ognisko raz, więc długi run ma sześć okazji.

**Znaleziony przy okazji błąd, który wywalał serwer na 500:** `resolveFight`
sięgało po `out.buffKoniec` PRZED utworzeniem `out`. Nie wychodziło, dopóki
buffy z jedzenia były rzadkie — ognisko je upowszechniło i każda walka z buffem
kończyła się `ReferenceError`.

**Pasek zbierania niesie komplet liczb i żyje na KAŻDEJ zakładce**, także
w Skillach — duży panel zniknął, bo był drugą kopią tego samego.
Pokazuje poziom profesji, exp/h, szt/h, ile expa i czasu do kolejnego poziomu
oraz dorobek sesji.

**„Pomiń animację" przykręcone nad logiem walki.** Wcześniej pojawiało się
i znikało pod areną, która zmienia wysokość, gdy przeciwnicy padają — przycisk
uciekał spod palca.

**Ranking pokazuje TWOJE miejsce zawsze**, nie tylko w pierwszej trójce
(zmierzone: 111 postaci w bazie). Pusta lista rozróżnia teraz dwa przypadki:
naprawdę pusty ranking i **serwer starszy niż ekran** — pliki z `public/`
idą z dysku od razu, ale `server.js` zostaje ten z chwili startu, więc bez
restartu ranking nie istnieje w stanie i ekran mówił „nikt nie wszedł do wieży".

**Dziewięć rodzajów mikstur.** Pięć procentowych (10 / 15 / 25 / 35 / 50% maks. HP)
i cztery stałe (200 / 500 / 1000 / 2500 punktów). `ch.potions` — jeden licznik —
zamienił się w mapę `ch.mikstury`; stary zapas migruje na Wielką Miksturę (dawne 35%).
Alchemia ma teraz dziewięć przepisów, po jednym na rodzaj, od poziomu 1 do 50.
Automat i przycisk „Wypij" biorą NAJSŁABSZĄ, która domknie brak — inaczej Eliksir
Otchłani szedł na zadrapanie. Do walki zabierasz najmocniejsze, ile mieści limit.

**Boss piętra 20 ma 10 010 zdrowia.** `bossHpMult` 2,6 → 7,0, `bossStatMult`
1,15 → 1,00 (boss jest ścianą zdrowia, nie wyścigiem obrażeń).
Świta skaluje się teraz od ZWYKŁEGO MOBA z piętra, nie od bossa — wcześniej
każde podniesienie zdrowia bossa mnożyło razem z nim całą grupę.
Bije słabiej niż zwykły mob (0,45–0,55 obrażeń), za to ma 0,9–1,8 jego zdrowia.

**Obrażenia broni podniesione z 4,2 na 7,0 za ilvl, afiks Obrażenia 1,10 → 1,80.**
To nie jest widzimisię: przy starych liczbach boss z 10 000 HP zbijał bohatera
w heroikach +3 do **3%** przejść piętra 10. Po zmianie: 78%. Zmierzone narzędziem,
nie oszacowane. Wszystkie cele balansu trafione, z nowym celem dla piętra 20 (58%).

**Poziom przedmiotów widać przy wyborze ryzyka**: Bez ryzyka i Zaawansowany 1–10,
Profesjonalista 2–20 (×2). Serwer podaje widełki dla KAŻDEGO ryzyka, żeby zmiana
nazw progów drugi raz niczego nie urwała.

## Skille bojowe — przebudowa na rodziny broni

**Pięć skilli zamiast pięciu, ale innych.** Broń dwuręczna · Broń jednoręczna ·
Przyrządy magiczne · Broń dystansowa · Ekwipunek defensywny. **Witalność skasowana.**
`wtype` przedmiotu JEST identyfikatorem skilla, więc nie ma drugiej tabeli, która
mogłaby się rozjechać. Kostur jest dwuręczny, ale należy do Przyrządów magicznych —
dwuręczność to liczba rąk, nie rodzina, i test tego pilnuje.

**Dwanaście baz broni**, po trzy na rodzinę: Topór/Młot/Miecz Dwuręczny ·
Miecz/Scimitar/Sztylet · Różdżka/Orb/Kostur · Łuk/Kusza/Oszczep. Każda wyprawa
dropi cały zestaw — inaczej mag nie znajdzie różdżki w Puszczy.

**Każdy skill ma własne drzewko**: trzy węzły, ranga do 10, punkt za poziom.
Węzły rodziny broni liczą się TYLKO z tą bronią w ręce. Dawny bonus „za sam
poziom" (`perLevel`) skasowany — dawał premię dwa razy.

**Skala drzewek zmierzona, nie zgadnięta.** Pierwsze podejście (wartości ×2)
podnosiło piętro 50 w legendach z 24% na 75% — ściana znikała. Po zejściu
do obecnych liczb pełny komplet daje +2 pp na piętrze 10 i +22 pp na 50,
a bossowie zostają walkami (piętro 20: 72%, piętro 50: 45%).

**Mocny cios trafia w 15% przy zerowej Zręczności** (`acc` −0,28 → −0,55).
Dopiero Zręczność robi z niego opcję: 25 punktów → 25%, 50 → 35%, 100 → 55%.

**Pasek ostrzegający o starym serwerze.** Trzy zgłoszenia „nie działa" pod rząd
(pusty ranking, boss na 800 hp, 8 etapów wyprawy, stare skille) miały jedną
przyczynę: proces serwera z 19:00 przy plikach z 21:00. `WERSJA` w `server.js`
i `WERSJA_GRY` w `public/app.js` — gdy się różnią, nad ekranem wisi czerwony pasek
z komendą restartu. Odświeżenie gry na telefonie tego nie naprawia i teraz gra
mówi o tym wprost.

**Namioty liczy RYZYKO, nie wzór szkieletu.** Bez ryzyka 1, Zaawansowany 3,
Profesjonalista **2** — na najtrudniejszym jest ich mniej, mimo że run jest
dwa razy dłuższy. Wcześniej wypadały z powtarzania wzoru i Pro miał ich sześć.
Wstawiane są równo po drodze i nigdy nie nadpisują rozdroża, zdarzenia,
elity ani bossa. Zmierzone na żywym serwerze: 12/1 na pozycji 6, 24/3 na 7-12-18,
48/2 na 17-33.

**ATTACK SPEED.** Jedna liczba dla wszystkich: `AS = speed / 20`, czyli ciosy
na sekundę. Baza 5,00; Zręczność daje +0,025 za punkt (25 pkt → 5,65, 100 pkt → 7,50),
a nowy afiks **Attack Speed** wypada na broni i na każdej części garderoby
(+0,09–0,23 AS na ilvl 1, +0,34–0,50 na ilvl 50). Zastąpił dawny afiks „Prędkość
ataku" liczony w surowych jednostkach silnika. Mob też ma AS w tej samej skali,
więc widać wprost, kto uderzy ile razy.

**Statystyki przeciwnika jawne, boss kryje swoje do 50% zdrowia**
(`tower.bossOdkrywaOd`). Nad areną stoi lista: HP, atak, obrona, AS — u bossa
`???` z dopiskiem, kiedy się odkryje.

**Towarzysz w fali nie nosi już „+".** Zgłoszone: „Leśny Szlam +" 171 HP obok
zwykłego „Leśnego Wilka" 202 HP. Wariant „+" należy do prowadzącego; towarzysze
dostają mnożnik slotu na zwykłej bazie, więc plus zawsze znaczy mocniejszy.

**Strona w grze nie przewija się w ogóle** (`body.wgrze`) — dolne menu uciekało
na telefonie, gdy pasek adresu przeglądarki chował się i wracał, bo `height:100%`
liczy się od body. Ekran tworzenia herbu przewija się dalej, bo musi.

**Naprawione picie mikstur poza walką.** `(zad && ...) ?? reszta` przy pustym
`zad` dawało `''` — wartość fałszywą, ale nie null, więc `??` nie przepuszczało
dalej i „Wypij" bez wskazania rodzaju kończyło się komunikatem „Brak mikstur".

**Naprawione zakleszczenie na postoju.** `safepointDone` przeszło z flagi na LISTĘ
wykorzystanych ognisk, ale widok dla klienta został przy `!X.safepointDone` —
puste `[]` jest prawdziwe, więc pole `safepoint` zawsze wychodziło `false`.
Klient nie pokazywał postoju, serwer nie puszczał dalej („Najpierw rozstrzygnij
postój"), a wyprawa stała. Do tego podgląd przeciwnika leci teraz TYLKO na węzłach,
na których się bije — na namiocie i rozdrożu pokazywał moba z paskiem na 0%.

**Mikstury mówią, ile leczą — wszędzie.** Wspólny `miksturyPanel()` zastąpił
przycisk „Wypij" z samym licznikiem sztuk na trzech ekranach (wieża, wyprawa,
Kolos). Każda pozycja: nazwa, `+X HP`, procent (dla procentowych) i sztuki,
klikalna wprost. Procent liczony z AKTUALNEGO maksymalnego zdrowia gracza,
więc liczba na ekranie jest tą, którą naprawdę dostanie.

**Pierścienie i naszyjniki da się ulepszać.** Nie mają bazy obrażeń ani pancerza,
więc `+N` podbija u nich WARTOŚĆ AFIKSÓW — panel ulepszania po prostu się dla nich
nie pokazywał. Zmierzone: Sygnet z Intelektem 20 / Pancerzem 31 na +10 daje
Intelekt 36 / Pancerz 55,8.

**Mikstury na wyprawie: dziesięć na CAŁY run, odnawiane w namiocie.** Limit liczy
się na całą drogę, nie na walkę, a namiot resetuje go do pełna — i to jedyny
sposób. Profesjonalista ma 48 etapów i dwa namioty, czyli trzy pełne zapasy
na cały run. Przejście sprawdzone: 10 → 9 po wypiciu → namiot → 10.

**Restart serwera z telefonu.** Czerwony pasek dostał przycisk wołający
`/api/restart`. Endpoint działa TYLKO przy realnej różnicy wersji (czyta
`WERSJA_GRY` z `public/app.js` i porównuje z własną `WERSJA`), więc po restarcie
sam się zamyka i nie da się nim ubić serwera w kółko; wymaga też ważnego tokenu.
Proces startuje odłączoną kopię siebie i wychodzi. Sprawdzone end-to-end:
PID 19276 → 3296, wersja 2156 → 2158, serwer odpowiada od razu.
Haczyk warty zapamiętania: endpoint musi już istnieć w DZIAŁAJĄCYM procesie —
pierwszy raz po jego dodaniu trzeba zrestartować ręcznie.

**Mocny cios przestał być pułapką.** Mnożnik 1,75 → **2,60**. Przy 1,75 Mocny był
GORSZY od Średniego na każdym etapie gry: 0,54× na piętrze 10 i wciąż 0,75×
przy 87 Zręczności na piętrze 50 — czyli nie ryzyko, tylko kara za kliknięcie.
Przy 2,60 wychodzi na prowadzenie powyżej ~80 Zręczności i to jest cała jego rola.

**Średni ZOSTAŁ na 1,00 i to jest decyzja, nie przeoczenie.** Jest miarą, do której
porównują się dwa pozostałe, a automat bije właśnie nim. Podniesienie go do 1,15
wywindowało bossa 10 z 70% na 90%, a piętro 50 z 46% na 75%; żeby to odkręcić,
trzeba by dodać mobom te same 15% i wyszłoby to samo na większych liczbach.
Zmierzone, nie przypuszczone.

**Przycisk naprawy wersji ogarnia OBIE przyczyny.** Wcześniej umiał tylko jedną:
restart serwera. Gdy stary był TELEFON (własna pamięć podręczna, powłoka APK),
serwer odpowiadał „jestem aktualny" i nie działo się nic — z perspektywy gracza
przycisk był zepsuty. Teraz przy takiej odpowiedzi klient czyści `caches`,
wyrejestrowuje service workera i wczytuje stronę z sygnaturą czasu w adresie,
która omija każdą pamięć podręczną. Pasek mówi wprost obie wersje.
Sprawdzone w obie strony: proces 2208 przy plikach 2210 → kliknięcie →
proces 12456 na 2210, pasek znika; przy zgodnych wersjach → twarde odświeżenie.

**Naprawione ułamki w atrybutach.** Mnożniki biżuterii (drzewko Ekwipunku
defensywnego i `+N` na pierścieniu) robiły z atrybutów liczby w rodzaju
`9.851799999999999` — osiemnaście znaków wychodziło poza kafelek i rozwalało
układ na szerokim ekranie. Atrybuty są zaokrąglane po zsumowaniu przedmiotów,
tak samo `dmgFlat`, `hpFlat` i `armorFlat`. Kafelki dostały `min-width:0`,
więc długa wartość przycina się kropkami zamiast rozpychać siatkę.

**Celność i Unik na ekranie atrybutów i na karcie gracza.** Oba ekrany rysuje
teraz wspólny `statyPelne()`: Zdrowie, Atak, Obrona, Attack Speed, Celność, Unik,
Kryt, Siła kryta, Moc, plus Blok i Mana, gdy są niezerowe.

**Opisy atrybutów przestały kłamać.** Mówiły „obrażenia — tylko klasy siłowe"
i „tylko klasy magiczne", a gracz nie ma klasy od dawna — o obrażenia decyduje
rodzina trzymanej broni.

## 17 sierpnia 2026 — Wyprawy do poziomu 200

**Czternaście Wypraw.** Dotychczasowa droga 1–50 została rozszerzona co 10
poziomów do 100, a dalej co 25: 100–125, 125–150, 150–175 i 175–200.

**Moby Wyprawy przestały brać poziom z `maxFloor` gracza.** Każda Wyprawa
skaluje własną trasę od dolnej do górnej granicy przedziału; pierwszy przeciwnik
bierze dół, boss górę. Ryzyko nadal dokłada przesunięcie poziomu i mnożnik statystyk.
Powrót postaci z poziomu 200 do Puszczy daje więc moby 1–10, nie poziom 200.

**Naprawiony ukryty mnożnik Wieży.** Generator Wyprawy wymusza teraz zwykły wariant
bazowego moba. Wcześniej trafienie poziomu 10/20/30 mogło niechcący wnieść mnożnik
bossa Wieży do zwykłego węzła Wyprawy.

**UI pokazuje poziom przeciwników** dla wybranej Wyprawy i ryzyka obok widełek
poziomu przedmiotów. Test `game/expedition-scaling.test.js` pilnuje ciągłości
przedziałów do 200 oraz pierwszego i ostatniego przeciwnika trasy.

**Boss Profesjonalisty przestał zabijać w dwa ciosy.** Wspólne `bossMult: 2,40`
mnożyło jednocześnie zdrowie i obrażenia, a ryzyko dokładało jeszcze `×1,30` —
razem boss zadawał `×3,12` bazowego ataku bez żadnych utrudnień. Rozdzielone na
`bossHpMult: 2,40` i `bossDmgMult: 1,15`: zdrowie zostaje ścianą, obrażenia na
Profesjonaliście wynoszą około `×1,495` bazy.

## 18 sierpnia 2026 — Górnictwo, Kowalstwo i ekonomia craftu 1–100

**Górnictwo ma pełną drabinkę 1–100.** Rudy otwierają się na poziomach
1/10/20/30/40/50/60/70/80/90: Miedź, Żelazo, Węgiel, Srebro, Złoto, Mithril,
Adamantyt, Runite, Mistyczna ruda i Niebiańska ruda. Poziom 100 jest
mistrzostwem. Dotychczasowe kryształy i esencja zostały jako osobne cele
zasilające Runy, więc aktualizacja nie urywa istniejącego systemu.

**Klejnot ma bazowo 0,10% na ukończony cykl.** Pula zależy od rudy, a Gem Find
liczy się mnożnikowo: `0,001 × (1 + suma bonusów)`. Osobne premie obsługują
podwójną rudę, XP, rzadkie pozycje z puli i podwójny klejnot. Każdy cykl zawsze
daje co najmniej jedną rudę oraz XP.

**Sprzęt górniczy jest oddzielony od bojowego.** Ma sześć slotów: Hełm, Kaftan,
Rękawice, Spodnie, Buty i Kilof oraz własny magazyn 60 przedmiotów. Kilof zmienia
czas według `czas_bazowy / (1 + szybkość_kopania)`. Stan trafia do tego samego
JSON-a postaci i jest migrowany przy wczytaniu starego zapisu.

**Kowalstwo ma 91 receptur.** Dziesięć sztab, broń, pancerze i komplet sprzętu
górniczego dla każdego tieru oraz specjalne Ostrze Strażnika Cierni. Wyższe
sztaby wymagają Węgla. Ekran ma pięć kategorii, listę receptur oraz szczegół
z kosztem, czasem, XP i aktualnymi szansami jakości. „Craft All” używa istniejącej
pętli automatycznej i zatrzymuje się po wyczerpaniu materiałów lub miejsca.

**Jakość craftu nie jest rzadkością łupu.** Normalny/Dobry/Doskonały/Arcydzieło
dają odpowiednio ×1,00/×1,05/×1,10/×1,15. Szanse interpolują między kotwicami
nadpoziomu 0, 10, 30 i 50. Zwykłe Arcydzieło pozostaje `common`; nie może
wyprodukować Unique/Legendary/Mystic/God. Przedmiot zachowuje `canonicalId`,
`source`, `quality`, `qualityMult` i `plus`.

**Boss Puszczy daje Cierniowy Rdzeń wyłącznie na węźle bossa.** Rdzeń siedzi
w sakwie i przepada po porażce jak pozostałe materiały. Receptura specjalna jest
blokowana bez rdzenia i zawsze tworzy zdefiniowane Unique, bez losowania jakości.

**Pion sprawdzony przez API:** 15 sztab Mithrilu → jakościowy Mithrilowy Kilof →
osobny slot górniczy → cykl Mithrilu 6600 ms → 5326 ms w wylosowanym Arcydziele.
Testy czyste są w `game/professions.test.js`; kontrola UI przeszła na szerokości
390 px bez poziomego overflow i bez błędów konsoli.

**Ekwipunek ma przełącznik PvE / PvP / Skill.** Stoi w nagłówku między nazwą
ekranu a licznikiem plecaka. PvE zachowuje dotychczasowy zestaw używany w Wieży
i Wyprawach, PvP ma osobno zapisywany zestaw korzystający ze wspólnego plecaka,
a Skill obsługuje sześć slotów Górnictwa i osobny plecak 60 przedmiotów.

**Skill używa pełnego ekranu Ekwipunku.** Ma makietę 3×3, klikalne sloty,
sumę sześciu premii, szczegół jakości, porównanie z noszonym przedmiotem,
filtrowanie plecaka po slocie i bezpośrednie zakładanie/zdejmowanie. Uproszczona
lista z ekranu Górnictwa została zastąpiona jednym przyciskiem prowadzącym do
zestawu Skill. Sprawdzone na 390 px: wszystkie trzy przyciski są widoczne,
brak poziomego overflow i błędów konsoli.

**Górnictwo ma trzy kategorie: Rudy / Magiczne / Ekwipunek.** Magiczne złoża
mają celowo nieregularne progi: Ruda Esencji 4, Ognisty Kamień 9, Kamień Mrozu
23, Kamień Ziemi 41 i Kamień Wichru 67. Wydobyte materiały zachowują kanoniczne
nazwy Esencji i Kryształów używane przez Runy. Premie zestawu Skill działają
również na czas, XP i podwójne wydobycie z magicznych złóż.

**Katalog Ekwipunku w Górnictwie pokazuje oba wymagania.** Każdy wiersz podaje
slot, poziom Kowalstwa oraz poziom Górnictwa wymagany do założenia. Wymaganie
jest zapisane na przedmiocie jako `reqMiningLevel`, migrowane dla starszych
craftów i egzekwowane przez serwer; sam wyszarzony przycisk w UI nie jest jedyną
blokadą.

**Szczegóły Ekwipunku są kompaktowym inspektorem.** Usunięto przeciągany pasek
podziału i jego zapisane ustawienie wysokości. Kliknięcie przedmiotu nie zmienia
już rozmiaru plecaka: na desktopie otwiera małą kartę nad ekranem, a na telefonie
dolny panel. Tabela pokazuje `Nosisz / Nowy / Różnica`, nazwę obu przedmiotów
oraz działania Załóż/Sprzedaj. Ten sam układ działa dla PvE, PvP i Skill;
sprawdzone na 390 px bez błędów konsoli.

**Kowalstwo ma osobną zakładkę Piec.** Węgiel z materiałów można przełożyć do
trwałego zasobnika przyciskami `1 / 10 / cały` i w razie potrzeby wyjąć. Każdy
wytop sztabki wymaga paliwa z Pieca: Miedź–Złoto 1, Mithril–Adamantyt 2,
Runite 3, Mistyczna 4, Niebiańska 5. Paliwo jest pobierane dopiero po ukończeniu
cyklu; brak żaru zatrzymuje Craft All bez zabierania rudy. Receptury pokazują
oddzielnie wsad i stan Pieca. Sprawdzone przez API oraz na mobilnym widoku 390 px.

**Stan surowca jest teraz na jego kafelku.** Rudy, Węgiel, Esencja, Kryształy
i gotowe sztabki pokazują małą plakietkę `×liczba` obok START/WYBIERZ. Licznik
odświeża się po każdym ukończonym cyklu. Usunięto osobny, długi blok „Zapasy”;
została tylko kompaktowa sekcja Jedzenie, ponieważ zawiera akcję „Zjedz”.
Zablokowane źródła z zerowym stanem nie dostają zbędnej plakietki. Układ
sprawdzony na 390 px bez ściskania nazw, poziomego overflow i błędów konsoli.

**Wytrzymałość i Obrona dostały endgame'owe skalowanie.** Do poziomu 25 nic
się nie zmienia. Później HP pochodzące z Wytrzymałości rośnie o 1,25% wartości
na poziom, maksymalnie do ×3, a skuteczność Obrony dochodzi stopniowo do +25%
na poziomie 100. Na realnym zapisie Karola (149 Wytrzymałości) maksymalne HP
wzrosło z 4668 do około 7840. Początek Wieży zachował dotychczasowy balans.

**Boss Wyprawy zachował ×2,4 HP, ale stracił dodatkowy mnożnik obrażeń.**
Profesjonalista liczy teraz `1,30 × 1,00`, zamiast `1,30 × 1,15`. Każda wygrana
walka Wyprawy odnawia ponadto 8% maksymalnego HP i pokazuje tę wartość na ekranie
wyniku. Próba na kopii Karola przeciw Strażnikowi Prastarych Ruin zakończyła się
wygraną oraz poprawnie zapisanym `+627 HP`; widok sprawdzony na 390 px bez błędów.

**Wędkarstwo, Rolnictwo i Gotowanie są pełnymi profesjami 1–100.** Wędkarstwo
ma cztery ważone łowiska z zachowaniem pospolitych połowów na wysokim poziomie,
Rolnictwo 46 upraw, owoców i produkcji zwierzęcych, a Gotowanie 35 receptur.
Całość używa wspólnej aktywności z czasem serwerowym, wspólnego EXP profesji,
materiałów i zapisu JSON; odświeżenie strony wznawia bieżący cykl z zachowanym
postępem zamiast zerować zegar.

**Jedzenie ma trzy niezależne sloty czasowe:** Główny posiłek, Drink i Deser.
Nowa potrawa zastępuje wyłącznie efekt w swoim slocie. Ryby wspierają szybkość,
kryt i celność; mięso atak, HP i pancerz; dania roślinne rozwój profesji,
tempo zbierania, plony i regenerację. Efekty wygasają według znacznika czasu
i są uwzględniane przez statystyki walki, regenerację oraz profesje.

**Ekrany profesji pozostają jednym widokiem.** Małe filtry zawężają łowiska,
uprawy lub typ przepisu; Gotowanie ma wyszukiwarkę, panel składników z aktualnym
stanem, efekt i przyciski `Ugotuj 1 / Gotuj wszystko`. Łowiska pokazują całą
tabelę połowów i stan ryb, a produkcje zakres plonu i typ hodowli. Widok przeszedł
kontrolę na 390 px; pasek profesji jest poziomy, a jego suwak ukryty.

**Regresja czysta.** Przeszły `combat.js`, `character.js`, `professions.test.js`,
`life-skills.test.js`, `expedition.test.js` i `expedition-scaling.test.js`.
Próba API wykonała prawdziwy 12-sekundowy połów, przyznała rybę i EXP oraz
utrzymała aktywność ciągłą; obie postacie testowe zostały usunięte z bazy.

**Jedzenie przeniesiono ze Skilli do Drużyny i przypisuje się je jednostkom.**
Po wybraniu bohatera, konkretnego sojusznika albo peta panel pokazuje jego
Główny posiłek, Drink i Deser oraz dostępne potrawy z akcją `Daj`. Bonus działa
wyłącznie na tę jednostkę i schodzi po jej ukończonych walkach: 10 / 20 / 30 / 40
zależnie od tieru potrawy. Dotychczasowe czasowe buffy są migrowane na liczbę
walk, więc aktualizacja nie usuwa aktywnego jedzenia.

**Kowalstwo nie pokazuje już `Craft All`.** Kliknięcie receptury sztabki, np.
Sztaby miedzi, od razu uruchamia ciągłe przetapianie i zatrzymuje je po braku
rudy lub paliwa. Sprzęt ma osobną akcję `Wykuj 1` i po jednym cyklu kończy pracę.
Test API potwierdził przydzielenie Łososia wyłącznie sojusznikowi (`AS 95 → 100`),
spadek licznika `20 → 19` po walce oraz automatyczny drugi cykl przetapiania
Miedzi. Mobilna Drużyna ma poziomy pasek jednostek, a panel jedzenia jest od razu
pod nim; sprawdzone na szerokości 390 px.
Lista produkcji Gotowania pokazuje już tylko recepturę, koszt, czas i EXP;
konkretne bonusy oraz liczniki walk są widoczne wyłącznie przy jednostce w Drużynie.

**Wyprawy losują osiem slotów po równo — każdy ma 12,5%.** Generator najpierw
wybiera Broń, Drugą rękę, Hełm, Napierśnik, Buty, Rękawice, Pierścień albo Amulet,
a dopiero potem konkretną bazę z wybranego slotu. Usuwa to dawną przewagę katalogu
12 broni nad 7 częściami defensywnymi (`63,1%` broni). Wagi rzadkości pozostały
bez zmian: Common 45%, Uncommon 49%, Unique 5%, Heroic 1%, a trzy najwyższe
progi nadal są wyłącznie w tabeli bossa.

**Bonus łupu ma jedno losowanie.** Usunięto ukryty drugi rzut bazowych 55%, który
obcinał podbitą szansę maksymalnie do 52,25%. Dynamiczna szansa z ryzyka,
utrudnień, elit i zdarzeń jest teraz przekazywana bezpośrednio do generatora,
a boss zawsze otwiera skrzynię 3–6 przedmiotów. Nowy test rozkładu wykonuje
80 000 losowań, sprawdza każdy slot w okolicy 12,5%, niezmienione wagi rzadkości
oraz zachowanie szans 0%/100%.

**Kowalstwo działa jednym kliknięciem także na telefonie.** Dawniej receptura
sprzętu tylko zmieniała zaznaczenie, a przycisk `Wykuj 1` pojawiał się w panelu
szczegółu powyżej aktualnego miejsca przewijania, więc wyglądała na martwą.
Teraz każda odblokowana karta jest akcją: sztabka uruchamia ciągłe przetapianie,
a broń, pancerz i sprzęt górniczy wykuwają dokładnie jedną sztukę. Receptura bez
materiałów nadal reaguje i pokazuje błąd serwera zamiast być martwym przyciskiem.
Sprawdzone na mobilnej kopii aktualnego zapisu: Miedziany miecz pobrał 10 sztab,
dał 38 EXP, trafił do plecaka i zatrzymał aktywność po jednym cyklu.

**Zioła do Alchemii mają tempo bojowe, nie tempo długich upraw.** Zioło Polne,
Zioło Gorzkie, Korzeń Nocny i Kwiat Cierniowy skrócono odpowiednio z
40 / 70 / 110 / 170 sekund do 8 / 12 / 16 / 22 sekund. Samo warzenie nadal
trwa 3,6–10 sekund. Patch aktualizuje również już rozpoczęty, zapisany timer,
więc gracz nie musi doczekać jednego starego cyklu po restarcie serwera.
Wersja `2026-08-18.0845` działa na porcie 8080; testy profesji, walki, Wyprawy,
skalowania oraz rozkładu łupu przeszły.

**Walka Wyprawy dostała nową arenę szyku.** Zamiast jednego płaskiego paska są
osobne rzędy Przód / Środek / Tył po obu stronach, linia starcia, role jednostek
oraz panel `TERAZ: wykonujący → cel`. Podczas odtwarzania aktor i cel dostają
osobne podświetlenie. API walki zachowuje teraz rząd, slot, klasę i rolę w stanie
początkowym oraz każdym wpisie logu. Widok sprawdzono na 390×844: czteroosobowa
drużyna mieści się bez poziomego overflow.

**Sojusznicy i pet są pełnoprawnymi rolami, nie słabymi kopiami ataku.** Baza
sojusznika wzrosła do 48% HP, 36% ataku i 45% pancerza bohatera, a peta do
32% / 22% / 25%. Wojownik przejmuje uwagę, Paladyn dodatkowo leczy, Tancerz
tnie dwa razy, Mag przebija pancerz i razi grupę, Łowca stawia na krytyki,
Tropiciel odsłania pancerz, a pet nakłada krwawienie. Ekran Drużyny pokazuje
rolę, rząd i opis zachowania.

**Naprawiono rzeczywisty zasięg wręcz.** Kod przeciwników odwoływał się do
nieistniejącego `formation.reach.mele`, przez co fallback dawał wojownikom
zasięg wszystkich trzech rzędów. Teraz przód ma zasięg 1; po jego wyczyszczeniu
jednostka wręcz traci tury na podejście do środka i tyłu. Nowy test
`companions.test.js` sprawdza role, tankowanie, leczenie, falę Maga, krwawienie
peta oraz dane szyku. Wersja patcha: `2026-08-18.0900`.

**Wyprawy i Dungeony mają osobne cele.** Wyprawy nie losują już wyposażenia:
każdy z 14 regionów do poziomu 200 ma własny niecraftowalny minerał, Kryształ
Magii oraz gwarantowane trofeum bossa. UI podaje nazwę, szansę i ilość przed
wejściem. Progi ponad 100 idą co 25 poziomów: 100–125, 125–150, 150–175 i
175–200.

**Dungeony są trzecim otwartym trybem Przygód.** Osiem lochów pokrywa poziomy
1–200. Każdy ma pięć stałych komnat: walka, walka, elita, walka, boss. Zwykła
komnata ma 30% na jeden przedmiot, elita gwarantuje jeden, boss otwiera skrzynię
3–6. Przed wejściem widać dokładną pulę 11 baz i niezmienione szanse rzadkości.
Dungeon używa wspólnego silnika walki, ale ma osobny zapis ukończeń, 8 mikstur,
12% regeneracji po sali oraz wyłącznie sprzętową nagrodę. Testy logiki i widok
390×844 przeszły. Wersja patcha: `2026-08-18.1000`.

**Mobilna walka została odchudzona i dostała licznik całego runu.** Usunięto
powtórzony blok HP/ATK/OBR/AS przeciwników pod areną — ich bieżące HP zostaje
na polach szyku. Log jest krótszy i mieści się bezpośrednio pod areną. Wynik
stawia centralny przycisk następnej fali, etapu, piętra lub mapy przed detalami
nagród. Zwijana ikona podsumowania pokazuje zadane obrażenia, wytankowane
obrażenia i realne leczenie (bez overhealu), łącznie oraz per bohater, sojusznik
i pet. Wyniki sumują się przez wszystkie fale piętra albo cały run Wyprawy i
Dungeonu. Kontekst nagłówka jest zamrożony na czas odtwarzania, więc nie
przeskakuje przedwcześnie na kolejną falę. Widok 390×844 i pełny zestaw testów
przeszły. Wersja patcha: `2026-08-18.1030`.

**Bossowie drużynowi zostali zebrani w jeden dział Przygód.** Osobne kafle
Kolosa, World Bossa i Tytana zastąpił jeden kafel `Bossowie Drużynowi`, który
od razu wyjaśnia, że walczy w nim bohater, wystawieni sojusznicy i pet. W środku
znajdują się wszystkie trzy tryby: działający Kolos oraz czytelnie oznaczone
World Boss i Tytan jako zawartość w przygotowaniu. Wersja patcha:
`2026-08-18.1045`.

**Walka na telefonie została przebudowana wokół wyniku, a nie logu.** Ten sam
zwarty ekran obsługuje Wieżę, Wyprawy i Dungeony. Puste rzędy szyku nie są już
rysowane, natomiast pozycje Przód / Środek / Tył pozostają widoczne. Przebieg
walki i statystyki runu są domyślnie zwinięte. W trybie turowym na ekranie jest
jedna grupa decyzji naraz dzięki zakładkom Atak / Skille / Obrona / Mikstury.
Po zakończeniu arena znika, a przyklejona wysoko karta od razu pokazuje wynik,
pozostałe HP, łączne obrażenia, złoto i główny przycisk dalszego kroku. Arena,
pełny log, tabela drużyny i rozpiska nagród są dostępne pod jednym przyciskiem
`Szczegóły walki i nagród`. Widok 390×844 sprawdzony dla walki automatycznej,
porażki, rozwijanych danych oraz sterowania turowego. Wersja patcha:
`2026-08-18.1130`.

**Pełny skład jest widoczny od pierwszej klatki walki.** Klient nie zaczyna już
od tymczasowej pary bohater–boss. Automat przygotowuje arenę ze stanu pierwszej
akcji jeszcze przed uruchomieniem animacji, a walka turowa bierze od serwera
pełne listy uczestników nawet wtedy, gdy log jest jeszcze pusty. Sojusznicy,
pet oraz obstawa bossa są więc obecni od razu; nie „wchodzą” dopiero po
pierwszym ciosie. Dotyczy Wieży, Wypraw, Dungeonów i Kolosa. Wersja patcha:
`2026-08-18.1145`.

**Dungeony dostały prawdziwe walki drużynowe zamiast pojedynczych worków HP.**
Zwykła komnata wystawia głównego przeciwnika i słabszego Wartownika, Elita ma
Ochroniarza, a boss walczy ze Strażnikiem Bram na przodzie i Runicznym
Łucznikiem na tyle. Obstawa ma własne proporcje HP, obrażeń, pancerza, szybkości
i zasięgu, ale nie zwiększa złota. UI przed walką podaje teraz liczbę wrogów,
a pełna grupa jest widoczna na arenie od pierwszej klatki. Bazowe statystyki
Wieży i Wypraw nie zostały zmienione. Pomiar świeżej postaci: pierwsza komnata
pozostaje do wygrania, ale zabiera około połowy HP zamiast być darmowa.
Wersja patcha: `2026-08-18.1215`.

**Arena walki została ponownie skompresowana pod telefon.** Gdy gracz patrzy
na zakładkę Przygód, dolny pasek z nazwą lokacji oraz powtórzonym HP bohatera
i bossa jest całkowicie ukryty; wraca wyłącznie na innych zakładkach, gdy walka
leci w tle. Jednostki nie budują już osobnego wysokiego pasa dla każdego rzędu.
Układają się w zwartą siatkę 2–3 kart, a pozycja Przód / Środek / Tył jest małą
etykietą bezpośrednio na karcie. Zostają nazwa, bieżące HP, paski zdrowia,
kolejność akcji, cel oraz mana. Widok 390×844 sprawdzony w Dungeonie z dwoma
przeciwnikami; arena i całe sterowanie mieszczą się wysoko bez dolnej kopii.
Wersja patcha: `2026-08-18.1245`.

**Ekran Wieży przed falą został odwrócony: najpierw decyzja, potem dane.** Bez
przewijania widać teraz numer fali, postęp, zwarty pojedynek HP bohater–wróg,
duży przycisk startu i mały przełącznik Auto / Turowa. Mapa dziesięciu pięter,
ostatnia porażka, porównanie Atak / Prędkość / Obrona / Celność oraz tryb
powtarzania są domyślnie schowane pod `Piętra i szczegóły`. Zdrowie nie jest
już pokazane w dwóch pełnych blokach; panel mikstur otwiera osobny przycisk
`Leczenie`. Niedokończona walka i zdobyte piętro również stawiają główną akcję
na samej górze. Widok 390×844 oraz oba rozwijane panele zostały sprawdzone.
Wersja patcha: `2026-08-18.1330`.

---

## Sesja 2026-08-18/19 — bariera pancerza, 7 atrybutów, typy broni, czytelność

Duży przebudowa rdzenia. Commit `74999bc`. Wersja `2026-08-19.0210`.

**NAJWAŻNIEJSZE: pancerz to teraz PULA (model bariery).** `config.combat.armorModel`
= `'barrier'` (WŁĄCZONE, live). Cios najpierw bije pulę pancerza; dopiero jej
nadwyżka sięga HP. **Przebicie** omija pulę (prosto w HP), **Zmiażdżenie** łamie
ją ×1.3 (`crushVsArmorMult`), **Magia** idzie po odporności na magię z pominięciem
puli. Pula wraca CO WALKĘ (init w `mkUnit`/`barrierArmorMax`), HP zostaje.
Rozmiar puli: mob **0.5×HP** (`barrierMobArmorRatio`), boss/kolos/tytan **0.25×HP**
(`barrierBossArmorRatio`), gracz = pancerz sprzętu **×2** (`barrierPlayerArmorMult`).
Stary model `'reduction'` (armor/(armor+K)) zostaje w kodzie za tą samą flagą —
gałąź w `strike()` w `game/combat.js`. Pola jednostki: `armorMax` (pula max),
`armorNow` (bieżąca). Snapshoty niosą oba.

**Atrybuty 4→7.** Siła (obrażenia mele biała+2H), **Precyzja** (obrażenia dystans
+ celność), Intelekt (magia + mana), Zręczność (Attack Speed + unik), **Szczęście**
(kryt), **Witalność** (HP + regeneracja HP w walce, `hpRegenPerVit`), **Twarda
Skóra** (+% pancerza, `twardaSkoraPct` 0.03/pkt). „Atak" NIE jest atrybutem —
to wynik. `weaponAttr.dystansowe='precyzja'`, `bohater.dmgAttrs=['sila','precyzja',
'intelekt']`. **Migracja** (`migrate()` w character.js): stare postacie dostają
ZWROT wszystkich punktów i respec (role się rozeszły). Afiksy sprzętu rolują
wszystkie 7 (pula afiksów w config, `itemStatSummary` w content.js). Stary afiks
„Wytrzymałość" mapuje się na Witalność.

**Typy broni: główny + poboczny podział.** `weaponDamageSplit()` w content.js
(mirror `bronPodzial()` w app.js). Miecz 80% Cięcie/20% Przebicie, Sztylet 100%
Przebicie (melee-pierce), Młot/Buława Zmiażdżenie, Łuk/Kusza Przebicie, Oszczep
90/10, magia 100% Magia. `strike()` blenduje odporności ważone po podziale.
Smash przemianowany na **Crush / Zmiażdżenie** (id `smash` w środku zostaje).
`damageSplit` dochodzi przez `mkUnit` (był bug — nie kopiował go).

**Czytelność (dużo).** Podgląd „po założeniu" na itemie (realny Atak/HP/pula/Moc
przed→po, endpoint `/api/preview` + `wearPreview`, cache `wearCache`). Rozbicie
ataku (karta „Skąd bierze się Twój atak", `computeStats.breakdown`). Pancerz jako
LICZBA obok HP w arenie (`🛡 N`) + log `🛡−X` przy pochłonięciu. Stat panel i
podgląd pokazują `armorPool` (×2), nie surowiec, pod barierą. Rozbicie atrybutu
(punkty vs sprzęt, `attrsBase` z serwera). **Reset atrybutów** za darmo
(`/api/attrreset` + przycisk). **Hold-to-add** na „+" z akceleracją + input
„ile na klik" (`/api/attr` przyjmuje `n`, pointer w app.js).

**Grafiki.** Tytan (boss lvl 300, 100M HP, „nie do zajebania", `config.tytan`,
świta jak Kolos, ekran `renderTytan`) z łupem **Aegis Tytana** (boska tarcza,
rarity god, 8 wpisanych afiksów). **Zbroja Runiczna** (napierśnik). Render obrazków
itemów przez mapę `ITEM_IMG` w app.js (`itemIcon()`). Portret Draegara z GIF-a 8-dir
(klatka 0 = przód). Pliki: `public/img/{tytan,tarcza-boska,zbroja-runiczna}.png`.

**Balans.** Wszystkie 7 celów `tools/balans.js --cel` trafione pod nowym modelem.
Tabela pięter 1–50 zdrowa (bossy 10/20/30 to ściany, legendy 90/88/68%).
`rozdajPunkty` w balans.js sypie w sila/witalnosc/twardaskora.

**Inne z sesji.** Naprawiona walka (auto + resume — Codex zostawił pusty log przez
pół-przeróbkę na /api/autotick; wróciło do runToEnd/resolveFight). Kolos po
wygranej → powrót do menu (nie skok do wieży). Ikony emoji: sojusznicy wg klasy
(tank tarcza/mag różdżka/dystans łuk), moby (`FAMILY_IC`), rośliny/ryby/potrawy
(`LIFE_IC` w life-content.js), heal przy miksturach w Alchemii (`miksturyInfo`).
Layout areny: usunięty label PRZÓD/ŚRODEK/TYŁ, samotny wróg nie pływa.

### TODO na następny czat („na koniec zrobimy zmiany")
- **Ekrany Kolosa/Tytana pod barierę.** `kolosWidok`/`tytanWidok` liczą „ile ci
  brakuje" starym wzorem redukcji (`armor/(armor+K)`) — pod barierą te liczby
  KŁAMIĄ. Przeliczyć na model puli.
- **Strojenie afiksów** nowych atrybutów (precyzja/szczescie/witalnosc/twardaskora
  — wartości min/max/perIlvl w config, na oko).
- **Mnożnik pancerza gracza** `barrierPlayerArmorMult` (2.0) na prawdziwych buildach.
- **Ranged divisor** zszedł 130→100 (Precyzja jest czysta) — sprawdzić czy dystans
  nie za mocny vs mele.
- **Afiksy dla nowych atrybutów działają**, ale mag/dystans build sprawdzić w praniu.
- Ranking na komputerze ziomka pokazywał czerwoną kartę „serwer nie zna rankingu"
  — to STARY serwer u niego, nie bug (kod OK, view() zawsze wysyła ranking).

---

## Sesja 2026-08-19 — ekrany Kolosa i Tytana pod model bariery

Pierwszy punkt z NEXT STEP poprzedniej sesji. Wersja `2026-08-19.1140`.

**Problem.** `kolosWidok`/`tytanWidok` w `server.js` miały WKLEJONY wzór redukcji
`armor/(armor+K)`. Po włączeniu bariery ekran „Ile Ci brakuje" kłamał, i to nie
o kilka procent. Postać na piętrze 50 w legendach +3 (atak 2212) widziała:

```
                  STARY EKRAN     PRAWDA POD BARIERĄ
jego pancerz         15 000          125 000  (pula = 0,25 × HP)
twój cios               364            2 212  (pula nie zbija ciosu!)
ciosów do zabicia     1 374              283
```

Ekran zaniżał cios sześciokrotnie i zawyżał długość walki pięciokrotnie.
Powód jest prosty: pod barierą pancerz **nie redukuje obrażeń**, tylko stoi jako
druga pula życia. Wzór redukcji nie ma tu czego liczyć.

**Rozwiązanie — jedno źródło prawdy.** Do `game/combat.js` doszły trzy eksporty:

- `pulaPancerza(u, side)` — publiczne okno na `barrierArmorMax`
- `ciosRozbity(dmg, atakujacy, obronca)` — jeden cios rozbity na pulę i życie,
  mirror gałęzi `barrier` w `strike()` bez losowości, krytyka i bloku
- `projekcja(dmg, atakujacy, obronca, strona, poziom)` — pula, cios, ciosy na
  zdarcie pancerza, ciosy do śmierci. **Obsługuje OBA modele** — po przełączeniu
  `armorModel` z powrotem na `'reduction'` ekran wraca do starych liczb sam

Kluczowa obserwacja, na której stoi `ciosow`: pod barierą **budżet to
`pula + zdrowie`**, bo nadwyżka ciosu przelewa się przez pulę dalej w HP
(`toHp += toPool - absorbed` w `strike()`). Podział broni nie zmienia SUMY,
zmienia KOLEJNOŚĆ — dlatego `ciosowNaPule` liczy się osobno.

**Serwer.** `kolosWidok` i `tytanWidok` to teraz dwie linijki nad wspólnym
`widokSpozaWiezy(ch, K, pokonany)`. Nowe pola widoku: `barierowy`, `jegoPula`,
`twojaPula`, `twojCiosWPule`, `twojCiosWZycie`, `ciosowNaPancerz`
(`null` = ta broń w ogóle nie rusza puli). Jednostki budowane DOKŁADNIE tak jak
w `startKolos`/`startTytan`, z `variant: 'kolos'` — z niego bierze się rozmiar puli.
Martwe importy `armorK`/`playerArmorEffect` wyleciały z `server.js`.

**Klient.** Oba ekrany dzieli teraz `panelSpozaWiezy(K, ogon)` w `public/app.js`.
Pod barierą: box „Pancerz · pula" zamiast „Obrona", wiersz „Ciosów na zdarcie
pancerza", rozbicie ciosu w podlinijce, informacja o Twojej puli przy turach do
śmierci. Pod starym modelem panel wraca do czterech wierszy i słowa „Obrona".
Broń w pełni przebijająca pisze **„omijasz go"** zamiast dzielenia przez zero.

### Sprawdzone liczbami — Kolos, gracz bije 2212

```
broń                 w pulę  w życie   ciosów na pancerz   ciosów razem
Miecz 2H (slash)      2212        0                  57            283
Miecz 1H (80/20)      1770      442                  71            283
Młot (smash)          2876        0                  44            218
Sztylet / Łuk / Różdżka  0     2212               nigdy            283
```

### DO DECYZJI: Zmiażdżenie bije 1,3× także po zdarciu puli

Widać to w tabeli: Młot kładzie Kolosa w **218** ciosach, wszystko inne w **283**.
To **23% przewagi na całej walce**, nie tylko na zdzieraniu pancerza.

Bierze się z `strike()`: `smash` dostaje `crushVsArmorMult` przy wejściu do puli,
a gdy pula jest pusta, cała ta **zawyżona** wartość przelewa się w HP. Zamiar był
inny — „Zmiażdżenie łamie pulę szybciej", a nie „młot bije mocniej w gołe ciało".

**Nie ruszone**, bo to zmiana balansu, nie czytelności. Poprawka to jedna linijka:
mnożnik ma dotyczyć wyłącznie części pochłoniętej przez pulę, a przelew liczyć
z wartości surowej.

### Przy okazji: test Smash/Slash nie sprawdzał niczego

`node game/combat.js` wypisywało `Assertion failed: Smash przebija podatnosc
lepiej niz Slash odporność` i mimo to kończyło się „wszystkie testy przeszly”.
Test mierzył sam ubytek HP, a pod barierą oba ciosy lądowały w puli — porównywał
zero z zerem. Mierzy teraz **pulę i HP naraz**. Przechodzi.

**Zostaje do decyzji:** `console.assert` w Node NIE przerywa i NIE ustawia kodu
wyjścia. Cały zestaw testów jest miękki, a końcowe „wszystkie testy przeszly"
drukuje się bezwarunkowo. Awaria jest widoczna tylko dla kogoś, kto czyta wyjście
oczami — dla automatu `node game/combat.js` zawsze kończy się sukcesem.

### Stan po sesji
```
node game/combat.js        wszystkie testy przeszly (bez Assertion failed)
node game/character.js     wszystkie testy przeszly
node tools/balans.js --cel 7/7 celów trafionych, exit 0
```

---

## Sesja 2026-08-19 (druga) — repo na GitHubie, czytelność pod iOS, układ

### Repozytorium
Projekt stoi na **github.com/Seebuchowy/raidfolk-idle** (prywatne). W repo NIE MA
`raidfolk.db`, APK, `node_modules` ani kluczy. Tożsamość gitowa autora poprawiona
na **Seebuchowy** — stare commity są autorstwa Adama i **zostają nietknięte**.

### Szerokość i tło
- **Stała kolumna 1180 px**, wyśrodkowana (`--gra-szer`). To DRUGI zwrot w tym
  miejscu: limit → pełna szerokość z `zoom` → z powrotem limit
- **`zoom` skasowany** — skalował cały `#app`, więc „stałe 1180" na monitorze
  1900 px dawało 1843 px. Stała szerokość i skalowanie okna wykluczają się
- **Jedno tło na całą stronę**: strona i treść dzielą `--stone`, bez bocznych
  ramek. Odcinają się WYŁĄCZNIE belki — górna i dolne menu — na `--belka`,
  policzonej jako 38% drogi od treści do `--ground`. Pełny `--ground` był za
  ciemny i dzielił ekran na dwa światy

### Paski przewijania
Sekcja `PRZEWIJANIE` w `style.css` celuje w `*`, więc każde nowe pudełko dostaje
pasek samo. Kolory z palety motywu. Zmierzone: 10 px zamiast systemowych 15–17.
Dwa miejsca chowały pasek całkowicie — **odkryte**, bo ukrywały fakt, że lista
jedzie dalej w bok.

### Czytelność pod iOS HIG
**Biały obrys górnej belki**: `.topbar` to `<button>` z samym `border-bottom`,
więc góra i boki zostawały na domyślnej ramce przeglądarki `2px outset`, która
na ciemnym tle renderuje się jako jasna faza 3D. Reset `button{border:0}`.

**166 deklaracji rozmiaru podniesionych.** Gra sypała czcionkami 5,5–8,5 px przy
progu iOS 11 pt. Mapowanie na kroki Dynamic Type, NIGDY nie zmniejsza:
```
<9 px → 11    9–10,5 → 12    11–12,5 → 13    13–14 → 15    15 → 16    16 → 17
```
Treść siedzi na 13–16 px, nie na 17 px Body — to gęsty pulpit danych, a nie ekran
do czytania; iOS w Ustawieniach robi tak samo. Próg 11 pt i cel 44 pt są ścisłe.

**Kontrasty: było 49 par poniżej 4,5:1, jest 0.** Liczone WCAG dla 5 motywów
na 4 tłach. `--ink-mute` oblewał we WSZYSTKICH pięciu, a to kolor prawie każdego
podpisu w grze. Poprawki ruszają wyłącznie jasnością (HSL) — odcień zostaje.

**Zasada jednego ekranu przetrwała.** Zmierzone po podniesieniu czcionek: dolne
menu kończy się na 812/812 na wszystkich sześciu zakładkach przy 375 px.

### Skille zbierackie — siatka zamiast paska
Lista profesji była wąskim słupkiem 168 px (na telefonie paskiem jadącym w bok),
więc siódmej profesji nigdy nie było widać. Teraz **siatka trzech kolumn na całą
szerokość**: ikona 30 px na górze, nazwa, poziom i zdanie „co ta profesja daje".
Siedem kafli w trzech rzędach. Zmierzone: wszystkie widoczne bez przewijania na
1180 px i na 375 px, tekst nigdzie nieprzycięty, cel dotyku 121 px.

### Zaczęte, niedokończone
`public/i18n.js` — mechanizm PL/EN. **Polski tekst jest kluczem** (jak gettext):
`t('Ekwipunek')` oddaje 'Equipment' albo sam polski, gdy brak wpisu. Dzięki temu
komunikaty błędów z serwera tłumaczą się tym samym słownikiem i serwer nie musi
wiedzieć o istnieniu języków. **Jeszcze niepodpięty do `app.js`.**
UWAGA przy podpinaniu: w `app.js` `t` jest już używane jako nazwa parametru
w czterech miejscach — trzeba je przemianować albo importować pod inną nazwą.

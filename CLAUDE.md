# RaidFolk_idle — kontekst projektu

Mobilne, klikane RPG z prawdziwym grindem. Itemizacja w duchu Margonema, skille jak
w RuneScape, drzewko pasywne jak w Path of Exile, podanie jak w RealmIdle.
Świat to **wieża bez końca** — wspinasz się, nikt nie wie, ile jest pięter.

**To jest osobny produkt.** Istnieje też inna gra o nazwie `RaidFolk` — nie ma z nią
nic wspólnego, nie jest jej trybem ani gałęzią. Nie sięgaj do niej po nic.

---

## Dokumenty

| Plik | Co zawiera |
|---|---|
| `RAIDFOLK_IDLE_HANDOFF.md` | **zacznij tutaj** — stan gry, stan Gita, następny krok, mapa plików |
| `RAIDFOLK_IDLE_SESSION_LOG.md` | historia prac bez czytania diffów |
| `RAIDFOLK_IDLE_DESIGN.md` | **pełny projekt gry** — systemy, ekonomia, świat, UI |
| `makieta_ui.html` | klikalna makieta wszystkich ekranów, także tych niezaimplementowanych |
| `README.md` | uruchomienie, strojenie, struktura |

**Sekcje 17–26 dokumentu projektowego opisują to, co faktycznie stoi w kodzie.**
Gdzie wcześniejsze rozdziały mówią co innego — a mówią, bo opisują klasy gracza
i Dusze — **wygrywają sekcje 17–25**. Przy sprzecznościach WEWNĄTRZ tego zakresu
wygrywa numer wyższy: **sekcja 26 przebija wcześniejsze ustalenia o Wyprawach**,
a sekcja 25 pozostaje fundamentem liczbowym (skille bojowe, pancerz, skalowanie
mobów, mikstury).

**Dokument projektowy wyprzedza implementację.** Opisuje docelową grę; kod ma na razie
pierwszy kawałek. Nie traktuj różnicy jako błędu do naprawienia — to plan na później.

---

## Co JEST zaimplementowane

**Nawigacja i UI**
- **Sześć zakładek** — Przygody, Drużyna, Ekwipunek, Skille, Przywołanie, Kronika.
  Skille MAJĄ swoją zakładkę na dolnym pasku (raz zeszły pod profil i wróciły —
  nie przenoś ich z powrotem bez polecenia). Ekran drzewka usunięty
- **Górny pasek = karta gracza**: herb do edycji na miejscu, opis o sobie, gildia
  (jeszcze nie istnieje w grze), data założenia konta, **ranking top 3**
- **Pięć motywów** (`config.ui.themes`, palety w `public/style.css` pod
  `[data-theme=...]`), **jakość** (niska gasi animacje i cienie) i **dźwięk**
  (WebAudio, bez plików). Ustawienia trzyma serwer, localStorage tylko cachuje
- **Ranking**: top 3 po piętrze (korona) i po mocy (hełm), liczony ze wszystkich
  zapisów z cache 15 s w `server.js`
- **Pasek zbierania** pod nagłówkiem — żyje na każdej zakładce, dopóki coś się
  zbiera, i pozwala przerwać bez wracania do Skilli
- **Skille = trzy sekcje**: Zbierackie · Bojowe · Atrybuty. Tam rozdajesz punkty
- **Stały pasek walki** nad zakładkami, żyje na każdym ekranie
- **Układ jednoekranowy**, przełamania 430 / 760 / 1100 px
- **SZEROKOŚĆ NA PC JEST STAŁA: 1440 px, wyśrodkowana** (`--gra-szer` w `style.css`).
  To już DRUGI zwrot w tym miejscu: najpierw limit 520/900/1180, potem pełna
  szerokość okna z powiększaniem schodkami (`zoom`), teraz z powrotem stała
  kolumna. **Zoom został skasowany świadomie** — skalował cały `#app`, więc
  „stałe 1440 px" na monitorze 1900 px dawało w rzeczywistości 1843 px.
  Stała szerokość i skalowanie okna wykluczają się; nie przywracaj zoomu
  bez decyzji o porzuceniu stałej kolumny
- **KAŻDY PASEK PRZEWIJANIA MA WSPÓLNY WYGLĄD** — sekcja `PRZEWIJANIE`
  w `style.css` celuje w `*`, więc nowe pudełko dostaje pasek samo.
  Kolory idą z palety motywu. Dwa miejsca chowały pasek całkowicie
  (lista drużyny i lista profesji na telefonie) — **zostały odkryte**,
  bo ukryty pasek zatajał, że lista jedzie dalej w bok
- **Przewijanie przeżywa render** — patrz `PRZEWIJANE` w `public/app.js`
- **Wejście do gry**: herb → imię → od razu gra. Bez wprowadzenia i wyboru klasy

**Przygody**
- **Wieża** — piętra po 6–10 fal, wariant „+" co 5, boss co 10; siatka pięter,
  odblokowanie sekwencyjne, powrót na zdobyte piętro. **NIE DAJE ŁUPU**
- **Wyprawa** — jedyne źródło sprzętu. Etapy z ziarna: walki, rozdroża, zdarzenia,
  ogniska, elita, boss. Sakwa wpada do plecaka dopiero po bossie.
  **Czternaście wypraw do poziomu 200**, otwieranych postępem w wieży. Do 100
  mają przedziały co 10 poziomów, powyżej 100 co 25: 100–125, 125–150,
  150–175, 175–200
- **MOBY WYPRAWY SKALUJĄ SIĘ Z WYBRANĄ WYPRAWĄ, NIE Z `maxFloor` GRACZA.**
  Pierwszy przeciwnik ma dolny poziom jej przedziału, boss górny, a trasa
  płynnie przechodzi pomiędzy nimi. Ryzyko dokłada `floorOffset` i mnożnik statystyk
- **DZIESIĘĆ MIKSTUR NA CAŁĄ WYPRAWĘ**, nie na walkę. Zapas **odnawia namiot**
  i to jedyny sposób — dlatego liczba namiotów jest prawdziwą walutą trudności
- **RYZYKO USTAWIA DŁUGOŚĆ RUNU I LICZBĘ NAMIOTÓW**: Bez ryzyka 12 etapów / 1 namiot,
  Zaawansowany 24 / 3 namioty (×2 nagroda), Profesjonalista 48 / **2 namioty**
  (×5 nagroda, podwójne widełki ilvl). Namiotów jest MNIEJ na trudniejszym —
  długi run bez odpoczynku jest tym, za co płaci pięciokrotna nagroda.
  **Bez ryzyka nie ma legend** — to jest cała różnica, na której stoi wybór
- **WĘZEŁ DECYDUJE O POZIOMIE PRZEDMIOTU** w widełkach wyprawy (`ilvlWezel`):
  zwykła walka z dołu, elita ze środka, boss z góry. Puszcza (1–10) daje:
  walka 1–5, elita 5–8, boss 6–10
- **OGNISKO LECZY DO PEŁNA.** Na postoju można zjeść jedzenie z Gotowania —
  pełne HP plus buff, bez ruszania limitu mikstur. Długi run ma kilka ognisk
- **TO WYPRAWA DECYDUJE O POZIOMIE ŁUPU, NIE PIĘTRO.** Każda ma widełki `ilvl`;
  legendarne biorą górne 20% (Puszcza: 8–10), reszta dolne (1–8).
  **Wysokie ryzyko mnoży widełki ×2**
- **RZADKOŚCI MAJĄ USTALONE PROCENTY.** Wagi w `config.loot` są w setnych procenta
  i sumują się do 100 000 — inaczej nie da się zapisać 0,001%.
  Wszędzie tak samo: **unique 5%**, **heroic 1%**, reszta to commony i uncommony.
- **LEGENDARY, MYSTIC I GOD LECĄ WYŁĄCZNIE ZE SKRZYNI BOSSA**: **0,3%**, **0,1%**,
  **0,001%** na przedmiot. Poza bossem mają zerową wagę, więc bramka wynika z samych
  liczb i nie ma jej gdzie obejść
- **BROŃ MOŻE WYPAŚĆ JUŻ Z PLUSEM.** `config.loot.plusNaBroni`: 1% broni ma
  jakikolwiek plus, rozkład geometryczny do `upgrade.maxPlus`, najwyższy stopień
  to 1% puli plusowanych, czyli **0,01% wszystkich broni**. Dotyczy TYLKO broni —
  pancerz plusuje się wyłącznie u kowala. Zmierzone na 1 mln losowań
- **Modyfikatory trudności** z mnożnikiem nagrody, otwierane piętrami
- **Tabela dropów** z odkrywaniem (`???` do pierwszego zdobycia)

**Walka**
- symulacja serwerowa, tryb automatyczny (całe piętro) i turowy
- **boss zawsze turowy**, z przełącznikiem „zawsze automatyczna"
- **szyk trzech rzędów** — klasa daje rząd, broń zasięg; biała musi podchodzić
- **dwóch przeciwników od piętra 3, trzech od piętra 15**
- **piętra 25/35/45… kończy mini-elita**: elita ze stunem i trucizną + healer + oprawca
- **bossy 10/20/30/40/50 mają świtę**: Rogaty Demon (tank, elita), Lich (mag, elita),
  Sukkubus (łucznik). Ta sama przy każdym bossie — `config.tower.swita`
- **wrogowie mają zdolności** (`config.wrogowie.zdolnosci`): ogłuszenie, trucizna
  (procent max HP na turę, omija pancerz), leczenie swoich, kilka ciosów w turze
- **`armorK` ROŚNIE Z PIĘTREM** (`armorKBase` + `armorKPerFloor`). Stałe 400
  sprawiało, że pancerz z piętra 50 zbijał 79% obrażeń — gracz uciekał wieży
- **skalowanie moba ma człon kwadratowy** (`mobHpPerFloor2`, `mobDmgPerFloor2`),
  bo obrażenia gracza rosną kwadratowo: broń z ilvl razy mnożnik z atrybutów
- **powtarzanie piętra** od piętra 10 — zdobyte piętro startuje od nowa zamiast
  wypuszczać wyżej
- **Kolos (Yeti)** — jeden przeciwnik spoza wieży, `config.kolos`. Liczby są
  z założenia poza dzisiejszą skalą i ekran mówi o tym wprost
- trzy siły ciosu, celność, unik, pasek ultimate, Obrona jako akcja tury
- **ATTACK SPEED (AS) = ILE CIOSÓW NA SEKUNDĘ**, jedna skala dla wszystkich:
  bohatera, sojuszników, petów i mobów. `AS = speed / 20` — silnik dalej liczy
  w `speed`, AS jest tym, co widzi gracz. Rośnie ze **Zręczności** (+0,025 za punkt)
  i z **afiksu Attack Speed**, który wypada na broni I na każdej części garderoby.
  Helpery: `attackSpeed()` / `asDoSpeed()` w `game/combat.js`
- **STATYSTYKI PRZECIWNIKA SĄ JAWNE.** Zwykły mob pokazuje HP, atak, obronę i AS
  od razu; **boss kryje swoje, dopóki nie zejdzie poniżej 50% zdrowia**
  (`tower.bossOdkrywaOd`)
- **TOWARZYSZ W FALI NIGDY NIE NOSI „+".** Wariant „+" należy do prowadzącego;
  towarzysze dostają mnożnik slotu na zwykłej bazie. Inaczej „Leśny Szlam +"
  miał 171 HP przy zwykłym „Leśnym Wilku" na 202 i plus obiecywał coś, czego nie było
- **MANA** — zaklęcia nią płacą; pasek został przy umiejętnościach zwykłych
- **DZIEWIĘĆ RODZAJÓW MIKSTUR** (`config.healing.mikstury`): pięć procentowych
  (10/15/25/35/50% maks. HP) i cztery stałe (200/500/1000/2500). Zapas siedzi
  w `ch.mikstury` jako mapa id→sztuki, NIE w jednym liczniku. Automat pije
  najsłabszą, która wystarczy
- **BOSS TO ŚCIANA ZDROWIA**: `bossHpMult` 7,0 przy `bossStatMult` 1,0.
  Boss piętra 20 ma 10 010 HP. Świta skaluje się od ZWYKŁEGO MOBA z piętra,
  nie od bossa — inaczej podniesienie bossa mnoży całą grupę
- **sojusznik i pet walczą**; sloty 2–3 zamknięte świadomie
- rodzaj obrażeń w logu: fizyczne bordowe, magiczne niebieskie
- **wyczerpanie HP** — nie wraca między falami ani po porażce

**Postać i sprzęt**
- **broń decyduje o atrybucie obrażeń** (biała/Siła, dystans/Zręczność,
  różdżka/Intelekt); reszta liczy się z wagą `offAttrWeight`
- **PIĘĆ SKILLI BOJOWYCH = PIĘĆ RODZIN BRONI**: Broń dwuręczna (topory, młoty,
  miecze 2H) · Broń jednoręczna (miecze, scimitary, sztylety) · Przyrządy magiczne
  (różdżki, orby, kostury) · Broń dystansowa (łuki, kusze, oszczepy) ·
  Ekwipunek defensywny (ciuchy, biżuteria, HP). **Witalność skasowana.**
  `wtype` przedmiotu JEST identyfikatorem skilla — nie ma drugiej tabeli
- **KOSTUR JEST DWURĘCZNY, ALE EXPI PRZYRZĄDY MAGICZNE.** Dwuręczność to liczba
  rąk, nie rodzina
- **KAŻDY SKILL MA WŁASNE DRZEWKO** (`config.combatSkills.drzewka`): trzy węzły,
  ranga do 10, jeden punkt za poziom skilla. Węzły rodziny broni działają TYLKO
  z tą bronią w ręce; Ekwipunek defensywny zawsze. Premii „za sam poziom" NIE MA —
  cały bonus idzie przez drzewko. Reset jednego drzewka jest darmowy
- Skille **dają bonusy, NIE bramkują sprzętu**
- bronie mają liczbę rąk; dwuręczne biją mocniej i blokują drugą rękę
- 8 slotów, makieta 3×3, porównanie „nosisz kontra bierzesz", kategorie plecaka
- **DWANAŚCIE BAZ BRONI**, po trzy na rodzinę, wspólne dla wszystkich wypraw
  (`BRONIE` w `game/config.js`) — inaczej mag nie znalazłby różdżki w Puszczy
- **ulepszanie sprzętu** sztabami z Kowalstwa. `plus` wchodzi do statystyk
  w `itemStatSummary()` — przez jakiś czas rósł w UI i NIE ROBIŁ NIC.
  **PIERŚCIENIE I NASZYJNIKI TEŻ SIĘ ULEPSZA**: nie mają bazy obrażeń ani
  pancerza, więc plus podbija u nich WARTOŚĆ AFIKSÓW
- **DZIEWIĘĆ MIKSTUR POKAZUJE, ILE LECZY** — na każdym ekranie, gdzie się pije
  (wieża, wyprawa, Kolos), przez wspólny `miksturyPanel()` w `public/app.js`.
  Procentowe pokazują procent i punkty policzone z aktualnego zdrowia gracza
- **punkty za piętro lecą przy ostatnim mobie**, nie przy wejściu wyżej

**Profesje — wszystkie siedem gra**
```
Górnictwo    ruda + runy podstawowe + esencja + kryształy
Kowalstwo    ruda → sztaby → ulepszanie sprzętu
Rybołówstwo  ryby
Rolnictwo    zioła i zboże
Gotowanie    ryby + zboże → jedzenie → buff na kilka WALK
Alchemia     zioła → MIKSTURY (jedyne źródło, kupowanie skasowane)
Runy         esencja + kryształ → RUNA → podpięcie → zaklęcia
```

**Magia**
- runę **podpinasz**, a poziom skilla **Magia** otwiera kolejne zaklęcia
- pierwszy czar to **Fireball**: Runa Ognia + Magia 1

**Reszta** — Kronika z bestiariuszem i trofeami · Przywołanie z jawnymi szansami ·
generator herbu · kod postaci

## Zrobione w połowie

- **Drużyna** — bohater + jeden sojusznik + pet walczą, sloty 2–3 zamknięte
- **Klasy Sojuszników** nadają rząd i własny automat: tankowanie, leczenie,
  wielokrotny atak, fala magiczna, przebicie albo osłabienie pancerza; pet krwawi
- **Przywołanie** — szanse jawne, brak pity, duplikatów i gwiazdek
- **Kronika** — Przedmioty i Osiągnięcia to karty opisujące zamiar
- **Żywioły poza ogniem mają po jednym zaklęciu**

## Czego NIE MA

World Boss · Tytan · rajdy · multiplayer · gildia · Mystic/God crafting ·
przepalanie i energia · bank · postęp offline · rozkazy ręczne Sojuszników ·
**klasy gracza (skasowane na stałe)** · **wiele postaci na koncie**.

---

## Model klas — GRACZ NIE MA KLASY

**To jest decyzja trwała.** Główna postać nie wybiera klasy przy tworzeniu i nigdy
jej nie dostanie. Ekran wyboru klasy i endpoint `/api/classes` zostały skasowane.

Gracz ma stały profil **Bohater** (`config.classes.bohater`):

- obrażenia niesie atrybut **pasujący do trzymanej broni** (patrz sekcja 23.1
  dokumentu projektowego); pozostałe liczą się z wagą `offAttrWeight`
- Wytrzymałość dalej daje wyłącznie życie i pancerz
- drzewko **jedno i uniwersalne**: Siła / Hart / Tempo

Skutek uboczny, który jest zyskiem: **znika martwy drop**. Każdy afiks ofensywny
coś daje, więc nie ma z góry bezużytecznych przedmiotów.

**Klasy przeszły do Sojuszników.** Sześć klas (Wojownik, Paladyn, Łowca, Tropiciel,
Mag, Tancerz Ostrzy) i ich drzewka **zostają w `game/config.js` nietknięte** —
policzone, przetestowane, czekają na moment, w którym Sojusznicy wejdą do walki.
Nie kasuj ich i nie „sprzątaj" jako martwego kodu.

**Klasy mieszane liczyły oba atrybuty w pełni, a płaciły wyższym dzielnikiem.**
Wersja z liczeniem po połowie zabierała Paladynowi 37% obrażeń z tych samych punktów.
Gdy Sojusznicy wejdą — nie wracaj do niej bez policzenia.

**Migracja:** każda postać z bazy staje się Bohaterem przy pierwszym wczytaniu,
a punkty wydane w martwych węzłach wracają do puli (`migrate()` w `game/character.js`).

**Skille bojowe WRÓCIŁY, ale jako BONUSY.** Broń biała, Łuk, Różdżka, Obrona,
Witalność. Poprzednio bramkowały sprzęt i to był powód ich skasowania — teraz
nie bramkują niczego. (Nie myl **skilla** Obrona z **akcją tury** Obrona.)
Sprzęt bramkuje wyłącznie **poziom postaci = najwyższe zdobyte piętro** (`poziom()`
w `game/character.js`). Po skasowaniu skilla Zdrowie darmowy przyrost HP niesie poziom
(`hpPerLevel` × piętro), inaczej wieża robiłaby się coraz ostrzejsza dla każdego,
kto nie wsypał wszystkiego w Wytrzymałość.

**Drzewko punktowe jest SCHOWANE z UI**, ale liczby, reguły i respec zostają
w `config.tree` i `character.js` — może wrócić. Wszystko liczbami w `config.tree`. Opisy węzłów w UI generują się
z tych liczb — nie ma drugiego miejsca do poprawiania po zmianie balansu.

Efekty węzłów to `dmgPct`, `hpPct`, `armorPct/armorFlat`, `critChance/critPower`,
`speed`, `accuracy`, `evasion`, `block/blockCut`, `potionPct` oraz `attrWeight`.
Ten ostatni podbija WAGĘ atrybutu w obrażeniach.

**Dusze wypadły z projektu w dotychczasowej formie** — obiecywały granie kolejną
klasą jako osobną postacią, a klas dla gracza już nie ma.

---

## Architektura

```
server.js            HTTP, API, pliki statyczne — Node 22+, ZERO zależności runtime
game/config.js       WSZYSTKIE liczby gry
game/content.js      akty, piętra, przeciwnicy, generator przedmiotów
game/combat.js       symulacja walki + testy (node game/combat.js)
game/character.js    atrybuty, drzewko, ekwipunek, statystyki wynikowe
                     + testy (node game/character.js)
game/db.js           SQLite (wbudowany node:sqlite), postać jako JSON
public/              frontend — czysty JS, moduły ES, bez frameworka
public/crest.js      generator herbu (SVG)
tools/               generator ikon, budowanie APK
start.ps1            serwer + tunel jedną komendą
```

**Zależności deweloperskie** to tylko Capacitor do budowania APK. Runtime nie ma żadnych
i tak ma zostać.

---

## Zasady, które warto znać

**Przycisk na czerwonym pasku naprawia OBIE strony.** Różnica wersji ma dwie
przyczyny: stary proces serwera ALBO stary plik w telefonie. Gdy serwer jest
aktualny, klient czyści `caches`, wyrejestrowuje service workera i przeładowuje
się z sygnaturą czasu w adresie. Bez tego przy winie telefonu przycisk wyglądał
na zepsuty.

**Restart serwera da się kliknąć z telefonu.** Czerwony pasek ostrzegający
o starym kodzie ma przycisk, który woła `/api/restart`. Endpoint **działa TYLKO
wtedy, gdy na dysku leżą nowsze pliki niż kod w pamięci procesu** — po restarcie
wersje się zgadzają i sam się zamyka, więc nie da się nim ubić serwera w kółko.
Wymaga ważnego tokenu. Proces startuje odłączoną kopię siebie i wychodzi;
stan jest bezpieczny, bo postać zapisuje się po każdym zapytaniu.
UWAGA: endpoint musi już ISTNIEĆ w działającym procesie — pierwszy raz po jego
dodaniu trzeba zrestartować ręcznie.

**Serwer trzyma swój kod z chwili startu.** Pliki z `public/` idą do przeglądarki
z dysku przy każdym żądaniu, ale `server.js` i `game/*` ładują się RAZ. Po zmianie
liczb **trzeba zrestartować proces** — odświeżenie gry na telefonie nic nie da.
Gra sama to wykrywa: `WERSJA` w `server.js` i `WERSJA_GRY` w `public/app.js`;
gdy się różnią, nad ekranem wisi czerwony pasek. **Zmieniaj oba znaczniki razem.**

**Wszystkie liczby siedzą w `game/config.js`.** Nigdzie indziej. Balans stroi się przez
edycję tego jednego pliku, bez dotykania logiki.

**`mobHpGrowth` i `mobDmgGrowth` to mnożniki wykładnicze, a gracz rośnie liniowo.**
Powyżej 1.01 moby uciekają bezpowrotnie po dwudziestu piętrach. To już raz wysadziło balans.

**Stan walki jest serializowalnym JSON-em** — dlatego ten sam kod obsługuje tryb
automatyczny i turowy, a walkę turową da się zapisać do bazy i wznowić. Generator liczb
losowych ma jawny stan (`nextRandom`), nie domknięcie.

**Log walki niesie stan HP i NAZWY obu stron przy każdym wpisie.** Na tym stoi cała
arena po stronie klienta — nie tylko animacja pasków. Nie usuwaj `party`/`enemies`
ani `name` ze wpisów logu; bez nazw klient rysował „undefined" pod każdym paskiem.

**Zdrowie nie wraca między falami.** Wcześniej wracało i to jest odwrócona decyzja,
nie błąd. `startFight` wchodzi w walkę z `stats.hp`, `resolveFight` zapisuje, ile
zostało. Pełne HP oddaje tylko `doAdvance` i porażka. Nie „naprawiaj" tego z powrotem.

**Ekran gry mieści się na ekranie.** `.screens` nie przewija się jako strona.
Przewijają się `.scrollbox`, `.invlist`, `.two-col`/`.three-col` na wąskich ekranach
i log walki. **Nie „naprawiaj" przeładowanego ekranu przez dodanie scrolla** —
przemyśl układ: kolumny, grupowanie, zakładki, podpowiedzi zamiast akapitów.

**Niedokończona walka turowa nie może być ślepym zaułkiem.** `/api/fight` WRACA
do niej, `/api/mode` ją porzuca, `/api/abandon` kasuje ją wprost. Wcześniejsze
„Walka już trwa" + „Najpierw dokończ walkę" zakleszczało postać na stałe.
Porzucenie kosztuje tyle co przegrana, czyli nic poza powrotem na pierwszą falę.

**Górnictwo: zegar trzyma klient, serwer wydaje jeden cykl.** `/api/minetick`
sprawdza, czy minął czas, i przyznaje dokładnie jedno wydobycie. Tak wygląda brak
postępu offline przy zachowaniu odporności na zmianę zakładki. Nie przerabiaj tego
na pętlę serwerową bez decyzji o offline.

**Automat rozgrywa całe piętro, nie jedną walkę.** Ciąg fal siedzi po stronie klienta
(`AUTO` w `public/app.js`), bo na tym stoi stały pasek walki widoczny na innych zakładkach.

**Strona gracza to tablica jednostek**, choć na razie jest w niej jedna. Układ jest
przygotowany na 1 + 3 sojuszników + pet.

**`game/combat.js` ma testy** uruchamiane przez `node game/combat.js`. Uruchamiaj je po
każdej zmianie w walce — łapały już cztery realne błędy.

**Balans stroi się `tools/balans.js`, nie na oko.** Narzędzie buduje prawdziwą
postać, bierze statystyki z `character.js` i puszcza symulację z `combat.js`.
Cele balansu (boss 10 w heroikach +3, z dwiema legendami, w wyprawce…) siedzą
w tablicy `CELE` w tym pliku — zmieniasz liczby, uruchamiasz `--cel`, widzisz,
co się posypało. Każda próba losuje INNY zestaw sprzętu tej samej klasy;
bez tego wynik mówił o jednym losowaniu i skakał z 0% na 100%.

---

## Pułapki środowiskowe

**Windows PowerShell 5.1 czyta pliki `.ps1` jako ANSI.** Polskie znaki bez BOM-u łamią
parser w sposób, który wygląda na błąd składni w losowym miejscu. Skrypty `.ps1` zapisuj
jako **UTF-8 z BOM**.

**APK to tylko powłoka** wskazująca na adres serwera (`capacitor.config.json`). Zmiany
w grze lecą z serwera i **nie wymagają przebudowy APK**. Przebudowa jest potrzebna tylko
przy zmianie adresu, ikony lub nazwy aplikacji.

**Serwer chodzi na laptopie autora**, wystawiany losowym tunelem Cloudflare
(`.\start.ps1`). Adres zmienia się po każdym restarcie — stąd kod postaci.

**ngrok jest odradzany.** Próbowaliśmy go dla stałego adresu; Windows Defender oznaczył
zaktualizowany plik jako trojana (niemal na pewno fałszywy alarm, ale nie obchodzimy
antywirusa). Stały adres wymaga domeny autora podpiętej pod Cloudflare — jeszcze tego
nie zrobił.

**Autor pracuje na Windows PowerShell 5.1.** Komunikaty commitów z polskimi znakami
przez `-m` się wysypują — pisz treść do pliku i używaj `git commit -F plik`.

---

## Uruchomienie

```
node server.js                  http://localhost:8080
.\start.ps1                     serwer + tunel publiczny
node game/combat.js             testy symulacji walki
node game/character.js          testy skalowania klas i atrybutów
node tools/balans.js --cel      cele balansu wieży (kod 1 = któryś nietrafiony)
node tools/balans.js            tabela pięter 1–50 dla wszystkich buildów
node tools/make-yeti.mjs        zaślepka grafiki Kolosa
npm run apk <adres>             budowa APK
```

Baza to plik `raidfolk.db`. Skasowanie go czyści świat.

---

## Wejście do gry — zasada na przyszłość

**Ekran wprowadzenia został SKASOWANY.** Cztery strony `Dalej → Dalej → Dalej`
poszły do kosza na polecenie autora. Ścieżka to **herb → imię → gra**, bez przystanków.
Stała `INTRO` i funkcja `showIntro` już nie istnieją — nie przywracaj ich.

**Ustalona zasada w zamian: wyjaśniaj kontekstowo, w miejscu użycia.** Podpowiedź
przy statystyce, jedno zdanie na karcie, opis pod przyciskiem. Nigdy osobnym
ekranem na wejściu.

Stara zasada zostaje w mocy tam, gdzie tekst jednak jest: **opisuj TYLKO to,
co faktycznie działa w buildzie.** Nie obiecuj klas, wypraw ani offline’u,
dopóki ich nie ma.

**Mana już jest** — zaklęcia nią płacą, rośnie z Intelektu (`character.manaBase`,
`manaPerInt`). Pasek ultimate został przy umiejętnościach zwykłych.
Świadomie pominięta zostaje tylko regeneracja poza tą 2%/min między sesjami.

---

## Sposób pracy

Autor projektuje na bieżąco i **zmienia zdanie** — kilka systemów już wyleciało
(wioska, frakcje, pula ochrony, wielogodzinne walki z Elitami II). Nie traktuj
dokumentu projektowego jak specyfikacji do wdrożenia w całości; traktuj jak stan
ustaleń na dziś.

Kiedy decyzja psuje coś, co już działa, albo tworzy problem widoczny dopiero za miesiąc
— **powiedz to wprost i pokaż liczby**, potem zaproponuj prostsze rozwiązanie. Tego się
tu oczekuje, nie potakiwania.

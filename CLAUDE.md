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

**Sekcje 17 i 18 dokumentu projektowego opisują to, co faktycznie stoi w kodzie.**
Gdzie reszta dokumentu mówi co innego — a mówi, bo opisuje klasy gracza i Dusze —
wygrywają sekcje 17 i 18.

**Dokument projektowy wyprzedza implementację.** Opisuje docelową grę; kod ma na razie
pierwszy kawałek. Nie traktuj różnicy jako błędu do naprawienia — to plan na później.

---

## Co JEST zaimplementowane

- **Sześć zakładek** — Wyprawa, Drużyna, Ekwipunek, Skille, Przywołanie, Kronika.
  Postać i Drzewko siedzą pod przyciskiem profilu w nagłówku, nie mają zakładki
- **Stały pasek walki** — nad zakładkami, żyje na każdym ekranie, dopóki coś się bije
- **Hub Wyprawy** — Wieża otwarta, Wyprawa `WKRÓTCE`, World Boss / Kolos / Tytan `ZAMKNIĘTE`
- **Wieża** — piętra po 6–10 fal, wariant „+" co 5, boss aktu co 10, akty po 10 pięter;
  siatka dziesięciu pięter biomu, odblokowanie sekwencyjne, powrót na zdobyte piętro
- **Wyczerpanie HP** — zdrowie **nie wraca między falami**; pełne oddaje wejście
  na nowe piętro albo porażka, która cofa na pierwszą falę
- **Walka** — symulacja serwerowa, attack speed steruje częstotliwością ciosów
  - dwa tryby: **automatyczny** i **turowy**; automat leci przez **całe piętro**
  - **boss aktu zawsze turowy**, przełącznik trybu na jego piętrze znika
  - **Obrona** jako akcja tury — połowa obrażeń do następnej tury
  - trzy siły ciosu: lekki, średni, mocny — mocniej znaczy rzadziej
  - **celność** i **unik**, obie rosną ze Zręczności
  - **pasek ultimate** (0–10): lekki ładuje 1, średni 2, mocny 3;
    **pudło zeruje cały pasek**; ultimate zależy od typu broni
  - **umiejętności** z cooldownami: Okrzyk bojowy, Wir, Cios ogłuszający
  - **blok** — tylko z tarczą w drugiej ręce; 10% bazy + drzewko, zbija cios o połowę
  - leczenie miksturami, każda kolejna w walce o 10% słabsza
- **Łup** — 7 rzadkości, afiksy skalowane z poziomem przedmiotu, bronie w trzech typach
- **Ekwipunek** — 8 slotów, **jeden próg**: poziom postaci (= najwyższe piętro);
  makieta postaci 3×3 z portretem, siatka statystyk, porównanie z noszonym,
  kategorie plecaka
- **Atrybuty** — start na zerze, **10 punktów do rozdania**, potem 3 za piętro;
  obrażenia rosną z Siły, Intelektu i Zręczności naraz
- **Górnictwo** — pełna pętla: kopiesz, dostajesz rudę i exp, wbijasz poziom,
  odblokowujesz kolejny surowiec; cykle lecą same do „Przerwij"
- **Generator herbu** — kształt, symbol, trzy kolory; SVG, nie plik graficzny
- **Kod postaci** — pozwala wrócić do postaci z innego adresu lub urządzenia
- **Wejście do gry** — herb → imię → **od razu gra**. Nie ma wprowadzenia
  ani wyboru klasy; jedno i drugie zostało skasowane
- **Drzewko Bohatera** — jedno, uniwersalne: Siła / Hart / Tempo, 3 × 5 węzłów × 5 rang,
  węzeł `i` wymaga `i × 2` punktów w swojej gałęzi, reset za złoto
- **Układ jednoekranowy** — żaden z sześciu ekranów nie przewija się jako strona;
  responsywność 520 / 900 / 1180 px
- **Kronika** — bestiariusz z licznikiem zabić i trofeami (4 na przeciwnika,
  odsłaniane na zawsze); obsada biomu Puszcza
- **Przywołanie** — klucze (dawna „waluta specjalna"), osobne pule sojuszników i petów

## Zrobione w połowie

- **Drużyna** — struktura pięciu slotów stoi, przywołani lądują w kolekcji,
  ale **jeszcze nie wchodzą do walki**
- **Skille zbierackie** — **Górnictwo gra naprawdę**; pozostałe sześć profesji
  to makiety z drabinkami, poziomy stoją na 1
- **Przywołanie** — brak prawdziwych szans, pity, duplikatów i gwiazdek
- **Kronika** — Przedmioty i Osiągnięcia to karty opisujące zamiar

## Czego NIE MA

Sojusznicy i pet w walce (sloty w arenie stoją puste, silnik gotowy) ·
przepalanie i energia · kowal i przetapianie rudy · wyprawy · world boss ·
Kolos · Tytan · rajdy · bank · sześć pozostałych profesji · offline ·
**klasy gracza (skasowane na stałe)** · **wiele postaci na koncie**.

---

## Model klas — GRACZ NIE MA KLASY

**To jest decyzja trwała.** Główna postać nie wybiera klasy przy tworzeniu i nigdy
jej nie dostanie. Ekran wyboru klasy i endpoint `/api/classes` zostały skasowane.

Gracz ma stały profil **Bohater** (`config.classes.bohater`):

- obrażenia z **Siły, Intelektu i Zręczności naraz**, `dmgDivisor: 110`
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

**Skille bojowe skasowane.** Atak, Dystansowy, Magia, Obrona i Zdrowie zniknęły z gry.
(Nie myl skasowanego **skilla** Obrona z **akcją tury** Obrona, która doszła później —
to dwie różne rzeczy o tej samej nazwie.)
Sprzęt bramkuje wyłącznie **poziom postaci = najwyższe zdobyte piętro** (`poziom()`
w `game/character.js`). Po skasowaniu skilla Zdrowie darmowy przyrost HP niesie poziom
(`hpPerLevel` × piętro), inaczej wieża robiłaby się coraz ostrzejsza dla każdego,
kto nie wsypał wszystkiego w Wytrzymałość.

**Drzewko działa.** Wszystko liczbami w `config.tree`. Opisy węzłów w UI generują się
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

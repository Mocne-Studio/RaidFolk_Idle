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
| `RAIDFOLK_IDLE_DESIGN.md` | **pełny projekt gry** — systemy, ekonomia, świat, UI |
| `makieta_ui.html` | klikalna makieta wszystkich ekranów, także tych niezaimplementowanych |
| `README.md` | uruchomienie, strojenie, struktura |

**Dokument projektowy wyprzedza implementację.** Opisuje docelową grę; kod ma na razie
pierwszy kawałek. Nie traktuj różnicy jako błędu do naprawienia — to plan na później.

---

## Co JEST zaimplementowane

- **Wieża** — piętra po 6–10 fal, wariant „+" co 5, boss aktu co 10, akty po 10 pięter
- **Walka** — symulacja serwerowa, attack speed steruje częstotliwością ciosów
  - dwa tryby: **automatyczny** i **turowy**
  - trzy siły ciosu: lekki, średni, mocny — mocniej znaczy rzadziej
  - **celność** i **unik**, obie rosną ze Zręczności
  - **pasek ultimate** (0–10): lekki ładuje 1, średni 2, mocny 3;
    **pudło zeruje cały pasek**; ultimate zależy od typu broni
  - **umiejętności** z cooldownami: Okrzyk bojowy, Wir, Cios ogłuszający
  - leczenie miksturami, każda kolejna w walce o 10% słabsza
- **Łup** — 7 rzadkości, afiksy skalowane z ilvl, bronie w trzech typach
- **Ekwipunek** — 10 slotów, **dwa progi**: poziom postaci i poziom skilla
- **Skille bojowe** — rosną z tego, czego używasz; tarcza dzieli exp 50/50 z Obroną
- **Atrybuty** — 3 punkty za piętro, Siła/Intelekt/Zręczność skalują swój styl walki
- **Generator herbu** — kształt, symbol, trzy kolory; SVG, nie plik graficzny
- **Kod postaci** — pozwala wrócić do postaci z innego adresu lub urządzenia

## Czego NIE MA

Drzewko (punkty się naliczają, nie ma ich gdzie wydać) · sojusznicy i pet (sloty
w arenie stoją puste, silnik gotowy) · Przywołanie i klucze · przepalanie i energia ·
kowal i afiksy · wyprawy · world boss · rajdy · bank · skille zbierackie · offline ·
**ekran wprowadzenia** · **nowy model klas**.

---

## UWAGA: model klas w kodzie jest NIEAKTUALNY

Kod ma stary model: 4 klasy dające +50% expa do swojego skilla bojowego, nowa postać
dostaje neutralnego **Wędrowca**.

**Projekt ustalił coś zupełnie innego** (`RAIDFOLK_IDLE_DESIGN.md`, sekcja o klasach):

- **Sześć klas** — Wojownik, Paladyn, Łowca, Tropiciel, Mag, Tancerz Ostrzy
- **Każda to osobna postać na koncie** — własny poziom, atrybuty, drzewko, ekwipunek
- **Wieża jest jedna i wspólna** — nowa klasa nie dostaje kopii świata, po prostu
  zaczyna nisko
- **Skille bojowe znikają** (Atak, Dystansowy, Magia, Obrona, Zdrowie) — bramkowanie
  sprzętu przejmuje klasa i poziom
- **Atrybuty mają dwie warstwy**: efekty uniwersalne dostaje każdy, obrażenia skalują
  się tylko z atrybutem swojej klasy
- **Przedmioty mają etykietę klas** — likwiduje martwy drop
- **Klasy odblokowują bossowie aktów** — start z jedną, każdy boss daje kolejną
- Wspólne dla konta: skille zbierackie, bank, złoto, materiały, wiedza o wieży

To jest **duża przebudowa** i nie została zaczęta. Nie „naprawiaj" kodu do zgodności
z dokumentem bez wyraźnego polecenia — autor wie o różnicy.

---

## Architektura

```
server.js            HTTP, API, pliki statyczne — Node 22+, ZERO zależności runtime
game/config.js       WSZYSTKIE liczby gry
game/content.js      akty, piętra, przeciwnicy, generator przedmiotów
game/combat.js       symulacja walki + testy (node game/combat.js)
game/character.js    atrybuty, skille, ekwipunek, statystyki wynikowe
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

**Log walki niesie stan HP obu stron przy każdym wpisie.** Na tym stoi animacja pasków
po stronie klienta. Nie usuwaj `party`/`enemies` ze wpisów logu.

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
node game/combat.js             testy symulacji
npm run apk <adres>             budowa APK
```

Baza to plik `raidfolk.db`. Skasowanie go czyści świat.

---

## NASTĘPNE ZADANIE — ekran wprowadzenia

Po wyborze herbu, przed wejściem do gry, ma się pojawić **krótkie wprowadzenie**.

**Ustalona zasada: wprowadzenie opisuje TYLKO to, co faktycznie działa w buildzie.**
Nie opisuj klas, wypraw ani drzewka, dopóki ich nie ma — gracz zobaczyłby obietnice,
których gra nie spełnia. Sekcje dopisuj w miarę, jak systemy wchodzą.

Do opisania w obecnej wersji:

- **Wieża nie ma końca**, idziesz piętro po piętrze
- **Piętro ma 6–10 fal**; utykasz na siódmej — wracasz na piątą, poprawiasz sprzęt
  i próbujesz znowu. Ściana jest wewnątrz piętra, nie między piętrami
- **Co dziesiąte piętro to boss aktu**
- **Nie wiesz, co jest wyżej** — piętra są zakryte, dopóki tam nie wejdziesz
- **Cztery atrybuty**: Siła (obrażenia wręcz, trochę HP), Intelekt (obrażenia magiczne,
  mana), Zręczność (prędkość, celność, unik, obrażenia z dystansu), Wytrzymałość
  (HP, regeneracja, pancerz)
- **Dwa tryby walki**: automatyczny i turowy
- **Trzy siły ciosu** — mocniej znaczy rzadziej
- **Pasek ultimate** ładuje się z trafień (1/2/3 wg siły ciosu), a **pudło go zeruje**

Szkic treści powstał w rozmowie — napisz własną wersję, krótką, kilka ekranów
z przyciskiem dalej i możliwością pominięcia.

---

## Sposób pracy

Autor projektuje na bieżąco i **zmienia zdanie** — kilka systemów już wyleciało
(wioska, frakcje, pula ochrony, wielogodzinne walki z Elitami II). Nie traktuj
dokumentu projektowego jak specyfikacji do wdrożenia w całości; traktuj jak stan
ustaleń na dziś.

Kiedy decyzja psuje coś, co już działa, albo tworzy problem widoczny dopiero za miesiąc
— **powiedz to wprost i pokaż liczby**, potem zaproponuj prostsze rozwiązanie. Tego się
tu oczekuje, nie potakiwania.

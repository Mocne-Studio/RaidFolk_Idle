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
  - **blok** — tylko z tarczą w drugiej ręce; 10% bazy + drzewko, zbija cios o połowę
  - leczenie miksturami, każda kolejna w walce o 10% słabsza
- **Łup** — 7 rzadkości, afiksy skalowane z ilvl, bronie w trzech typach
- **Ekwipunek** — 8 slotów, **jeden próg**: poziom postaci (= najwyższe piętro)
- **Atrybuty** — start na zerze, **10 punktów do rozdania**, potem 3 za piętro;
  obrażenia rosną tylko z atrybutu swojej klasy
- **Generator herbu** — kształt, symbol, trzy kolory; SVG, nie plik graficzny
- **Kod postaci** — pozwala wrócić do postaci z innego adresu lub urządzenia
- **Ekran wprowadzenia** — cztery ekrany, z pominięciem; treść w `public/app.js`
  (stała `INTRO`). Pokazuje się raz, tylko nowej postaci
- **Wybór klasy** — sześć klas z opisem i skalowaniem, zaraz po wprowadzeniu
- **Drzewka klas** — własna zakładka; 3 gałęzie × 5 węzłów × 5 rang dla każdej klasy,
  węzeł `i` wymaga `i × 2` punktów w swojej gałęzi, reset za złoto

## Czego NIE MA

Sojusznicy i pet (sloty w arenie stoją puste, silnik gotowy) · Przywołanie i klucze · przepalanie i energia ·
kowal i afiksy · wyprawy · world boss · rajdy · bank · skille zbierackie · offline ·
**Dusze** · **wiele postaci na koncie**.

---

## Model klas — wdrożony w połowie

**Zrobione:** sześć klas z dokumentu (Wojownik, Paladyn, Łowca, Tropiciel, Mag, Tancerz
Ostrzy), wybierane na ekranie po wprowadzeniu. Stary Wędrowiec i bonus +50% expa do
skilla klasy **zniknęły**.

Obrażenia skalują się z atrybutami klasy (`classes[x].dmgAttrs`), a nie z typu trzymanej
broni. Warstwa uniwersalna została wspólna: Zręczność daje prędkość, kryt, celność i unik
każdemu, Wytrzymałość daje HP i pancerz każdemu.

**Klasy mieszane liczą oba atrybuty w pełni, a płacą wyższym dzielnikiem**
(`dmgDivisor`: czyste 100/130, mieszane 115–125). Wersja z liczeniem po połowie była
pierwsza i okazała się karą, nie wyborem — Paladyn dostawał 37% mniej obrażeń z tych
samych punktów. Nie wracaj do niej bez policzenia.

**Skille bojowe skasowane.** Atak, Dystansowy, Magia, Obrona i Zdrowie zniknęły z gry.
Sprzęt bramkuje wyłącznie **poziom postaci = najwyższe zdobyte piętro** (`poziom()`
w `game/character.js`). Po skasowaniu skilla Zdrowie darmowy przyrost HP niesie poziom
(`hpPerLevel` × piętro), inaczej wieża robiłaby się coraz ostrzejsza dla każdego,
kto nie wsypał wszystkiego w Wytrzymałość.

**Drzewka klas działają.** Trzy gałęzie po pięć węzłów dla każdej z sześciu klas,
wszystko liczbami w `config.tree`. Opisy węzłów w UI generują się z tych liczb —
nie ma drugiego miejsca do poprawiania po zmianie balansu.

Efekty węzłów to `dmgPct`, `hpPct`, `armorPct/armorFlat`, `critChance/critPower`,
`speed`, `accuracy`, `evasion`, `block/blockCut`, `potionPct` oraz `attrWeight`.
Ten ostatni podbija WAGĘ atrybutu w obrażeniach i tak wygląda „większe obrażenia
od magii" w silniku, który nie zna typów obrażeń, tylko atrybuty klasy.

**Czego wciąż NIE MA z modelu klas:**

- **Sześć osobnych postaci na koncie** — jedna postać, jedna klasa, na zawsze
- **Dusze** — ekran wyboru klasy obiecuje je graczowi, ale nic za tym nie stoi
- **Odblokowywanie klas przez bossów aktów** — wszystkie sześć dostępnych od startu
- **Etykiety klas na przedmiotach** — martwy drop nadal istnieje

To wciąż **duża przebudowa**. Nie „naprawiaj" reszty bez wyraźnego polecenia.

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
node game/combat.js             testy symulacji walki
node game/character.js          testy skalowania klas i atrybutów
npm run apk <adres>             budowa APK
```

Baza to plik `raidfolk.db`. Skasowanie go czyści świat.

---

## Ekran wprowadzenia — zasada na przyszłość

Zrobiony: cztery ekrany po stworzeniu postaci (wieża bez końca → ściana wewnątrz
piętra → tryby i siły ciosu → pasek ultimate i atrybuty), przycisk dalej i pominięcie.
Treść siedzi w stałej `INTRO` w `public/app.js`.

**Ustalona zasada: wprowadzenie opisuje TYLKO to, co faktycznie działa w buildzie.**
Nie opisuj klas, wypraw ani drzewka, dopóki ich nie ma — gracz zobaczyłby obietnice,
których gra nie spełnia. Sekcje dopisuj w miarę, jak systemy wchodzą.

Świadomie pominięte, bo w kodzie tego nie ma: mana (Intelekt daje tylko obrażenia
magiczne) i regeneracja. Jak wejdą — dopisz je do ekranu czwartego.

---

## Sposób pracy

Autor projektuje na bieżąco i **zmienia zdanie** — kilka systemów już wyleciało
(wioska, frakcje, pula ochrony, wielogodzinne walki z Elitami II). Nie traktuj
dokumentu projektowego jak specyfikacji do wdrożenia w całości; traktuj jak stan
ustaleń na dziś.

Kiedy decyzja psuje coś, co już działa, albo tworzy problem widoczny dopiero za miesiąc
— **powiedz to wprost i pokaż liczby**, potem zaproponuj prostsze rozwiązanie. Tego się
tu oczekuje, nie potakiwania.

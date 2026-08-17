# RAIDFOLK_IDLE — DESIGN

Wersja 1.0 · zastępuje `RAIDFOLK_IDLE_GAME_VISION.md` i `RAIDFOLK_IDLE_UI_UX_VISION.md`
Interfejs: `makieta_ui.html` — klikalna makieta jest częścią tego dokumentu, nie ilustracją do niego.

`PROPOZYCJA` = pomysł Claude, czeka na decyzję. `OTWARTE` = nie wiemy.

---

## 1. CZYM JEST TA GRA

**Mobilne, klikane RPG z prawdziwym grindem.**
Itemizacja w duchu Margonema. Skille w duchu RuneScape. Drzewko pasywne w duchu Path of Exile. Format podania jak RealmIdle.

Nie masz klasy. Jesteś tym, czego używasz: weźmiesz różdżkę — rośnie Magia i otwierają się lepsze różdżki. Weźmiesz tarczę — połowa expa idzie w Obronę i otwiera się cięższa zbroja. Walka rozstrzyga się matematycznie na serwerze, więc może się toczyć, gdy Ty grzebiesz w ekwipunku albo kopiesz rudę.

### Pitch

> „Expię, bo na wieczór jest boss i każdy bierze udział, a za top 100 są duże nagrody.
> I może mi wypaść legendarna broń, a zbierałem materiały i kryształy, żeby ją ulepszyć."

### Trzy filary

1. **Wieczorny world boss** — wspólny cel, rywalizacja, powód, żeby być silniejszym niż wczoraj.
2. **Polowanie na legendarny drop** — powód, żeby zrobić jeszcze jedną walkę.
3. **Ulepszanie zdobytej broni** — projekt na tygodnie, nie na jedno kliknięcie.

---

## 2. CZEGO TA GRA NIE ROBI

- Nie ma energii ani staminy. Grind jest nielimitowany.
- Nie ma pay-to-win. Rankingu nie da się kupić.
- Nie ma klas, które cokolwiek zamykają — klasa to bonus do expa i punkt startu na drzewku.
- Nie ma frakcji.
- Nie ma wielogodzinnych walk.
- Nie ma kasynowego UI: migających świateł, popupów, morza czerwonych kropek.
- Nie ma wspólnych map z walką o respy mobów. Farmienie jest prywatne.
- Nie ma PvP, w którym tracisz dorobek.

---

## 3. NAWIGACJA

Pięć zakładek. Stały pasek walki nad nimi, widoczny na każdym ekranie.

| Zakładka | Zawiera |
|---|---|
| **PRZYGODA** | Kampania · Wyprawy · World Boss · Kolos · Tytan · Skille · **Przywołanie** |
| **DRUŻYNA** | Drzewko · Statystyki · Skille · sojusznicy · pet · pozycje |
| **EKWIPUNEK** | Plecak · Bank · karta przedmiotu · ulepszanie · gniazda · narzędzia |
| **LOG BOOK** | Kolekcje · bestiariusz · zadania dzienne · tabela źródeł łupu |
| **KONTO** | Ustawienia · powiadomienia · blokada expa · język |

`PROPOZYCJA` Czat jako ikona w nagłówku, wysuwana szuflada. Nie ma dla niego zakładki.

---

## 4. WALKA

- **Czysta symulacja matematyczna** na serwerze. Bez fizyki i pozycjonowania w czasie rzeczywistym.
- **Attack speed steruje częstotliwością ataków.** Kto szybszy, bije częściej.
- Prezentacja: **5 na 5**, statyczne PNG, paski HP, liczby obrażeń, log 3–4 linii.
- Gracz wybiera: **ręcznie co turę** albo **automatycznie z rotacją ustawioną z góry**.
- Można **przyspieszyć** albo **skipnąć**.
- **Zamknięcie aplikacji niczego nie psuje.** Symulacja leci dalej, powiadomienie po zakończeniu.

Konsekwencja: backend jest potrzebny od V1, nie później.

### Leczenie

Ręcznie w swojej turze albo automatycznie z progiem. **Każde kolejne użycie w tej samej walce leczy o 10% słabiej.**

- Walka ma naturalny sufit i nie ciągnie się w nieskończoność.
- Gracz aktywny wygrywa, pasywny nie przegrywa. Automat leczy poprawnie i marnuje ładunki.

`OTWARTE` 10% liniowo (100/90/80…) czy mnożnie (100/90/81…).

### Agro w walce automatycznej

**Prowokacja** — jedna statystyka. Każdy cios przeciwnika leci w jednostkę wybraną z wagą Prowokacji. Tarcza, pancerz i Obrona ją podnoszą.

Tank ściąga ciosy dlatego, że został zbudowany, a nie dlatego, że coś kliknął. Zero AI, zero rotacji taunta.

> **W automatycznej walce umiejętnością gracza nie jest reagowanie, tylko przygotowanie.**
> Rajd przegrywa nie dlatego, że ktoś zaspał, tylko dlatego, że skład był źle zbudowany.

---

## 5. POSTAĆ

### Dwa rodzaje postępu — i to jest oś całej gry

```
POZIOM POSTACI    z pierwszego przejścia etapów kampanii    → przedział, punkty
SKILLE BOJOWE     z zabijania                               → dostęp do sprzętu
```

Rozdzielone **źródłem**, nie dwoma paskami z tego samego killa.

Wynika z tego wszystko inne:

- **200 etapów ≈ 200 poziomów.** Poziom 47 znaczy „jestem na etapie 47" — nie trzeba tego tłumaczyć.
- **Farmienie nigdy nie wypycha z przedziału.** Możesz siedzieć na kotwicy miesiąc, zabić dziesięć tysięcy mobów: poziom stoi, skille rosną, sprzęt się poprawia.
- **Parkowanie jest naturalne** — po prostu nie idziesz dalej. **Nie ma blokady expa i nie jest potrzebna.**
- **Zaparkowana postać dalej rośnie** — skille z zabijania oraz punkty drzewka z powtarzania etapu na wyższych trudnościach. Poziom stoi, postać nie.

```
poziom postaci    za PIERWSZE przejście etapu, na dowolnej trudności
punkty drzewka    osobno za każdą trudność tego samego etapu
```

Dlatego wracanie na wyższą trudność ma sens **bez inflacji poziomu**: rośniesz, nie wypadając z przedziału.

`ODRZUCONE` Poziom liczony z ekwipunku. Im lepszy sprzęt, tym szybciej wypadasz z przedziału, w którym ten sprzęt zbierasz — parkowanie, bank i cztery postacie przestają działać.

Przedział to **widełki**, więc sprzęt nie może nimi ruszać. **Moc** to **podłoga** (próg wejścia na Kolosa i Tytana), więc sprzęt ma ją podnosić bez końca — przekroczenie progu nigdy z niczego nie wyrzuca.

### Klasy — sześć osobnych postaci na jednym koncie

`ZASTĘPUJE` wcześniejszy model klasy jako bonusu do expa oraz model czterech dowolnych postaci.

**Konto ma dostęp do wszystkich klas. Każda ma własny poziom, atrybuty, drzewko i ekwipunek.**
Wbicie Wojownika na 20 nie daje nic Magowi — Mag zaczyna od pierwszego poziomu i musi
przejść wieżę po swojemu.

**Wieża jest jedna i wspólna.** Piętro 20 to piętro 20 dla każdego. Nowa klasa nie dostaje
własnej kopii świata — po prostu jest za słaba, żeby wejść wysoko, więc zaczyna nisko.

| Wspólne dla konta | Osobne dla każdej klasy |
|---|---|
| skille zbierackie | poziom i postęp w wieży |
| **bank** | atrybuty i punkty |
| wiedza o wieży (mgła) | drzewko |
| **złoto**, materiały, mikstury | ekwipunek |

Mgła jest kontowa świadomie: **dotyczy tego, czego nie wiesz, nie tego, czym nie zagrałeś.**
Skoro Wojownikiem byłeś na piętrze 50, Mag nie ma powodu tego nie wiedzieć.

### Klasy i skalowanie obrażeń

| Klasa | Skaluje obrażenia | Bronie |
|---|---|---|
| **Wojownik** | Siła 100% | miecz, młot, topór — dwuręczne |
| **Paladyn** | Siła + Intelekt | jednoręczna + **tarcza** |
| **Łowca** | Zręczność 100% | łuk, kusza, oszczep |
| **Tropiciel** | Zręczność + Intelekt | broń dwuczłonowa: nośnik + żywioł |
| **Mag** | Intelekt 100% | różdżka, orb, księga |
| **Tancerz Ostrzy** | Zręczność 50% + Siła 50% | dwie bronie |

Trzy czyste i trzy mieszane — wierzchołki i boki trójkąta atrybutów. Pełne pokrycie,
nic się nie dubluje.

### Atrybuty mają dwie warstwy

To jest sedno systemu:

| Atrybut | Dostaje **każdy** | Obrażenia |
|---|---|---|
| **Siła** | trochę HP | tylko klasy siłowe |
| **Zręczność** | prędkość ataku, kryt, unik, celność | tylko klasy zręcznościowe |
| **Intelekt** | mana | tylko klasy intelektualne |
| **Wytrzymałość** | HP, regeneracja, pancerz | **nikt — to nie jest oś obrażeń** |

Wojownik pakujący Zręczność dostanie kryty, prędkość i uniki — ale **ani jednego punktu
obrażeń**. Łowca za te same punkty dostanie to samo plus obrażenia.

Poboczny atrybut **nie jest bezużyteczny, tylko słabszy**. Zostaje wybór „więcej biję"
kontra „dłużej żyję i częściej krytuję", zamiast jednej oczywistej ścieżki.

### Drzewka

Każda klasa ma **własne drzewko z trzema gałęziami stylu**. Przykładowo Wojownik:
*Rzeźnia* (krwawienie), *Wał* (pancerz i kontratak), *Furia* (obrażenia rosnące z czasem walki).

`PROPOZYCJA` Punkty są osobne dla każdej klasy, bo poziom też jest osobny.

### Przedmioty mają etykietę klas

```
Kieł Krwi        miecz dwuręczny    Wojownik
Puklerz Straży   tarcza             Paladyn
Pierścień Wichru pierścień          Łowca · Tropiciel · Tancerz
Amulet Wytrwałości                  wszystkie klasy
```

**To likwiduje martwy drop.** Wojownik znajdujący różdżkę nie wyrzuca jej — odkłada
do banku dla swojego Maga. Każdy przedmiot trafia w którąś z Twoich postaci.

Przedmiot wymaga **poziomu tej klasy**, która ma go nosić. Wspólny bank nie pozwala
ubrać świeżego Maga w sprzęt z piętra 50.

### Skutek, który wychodzi sam

Pierwsza wspinaczka jest głodna sprzętu — nikt jeszcze nic nie nafarmił. **Każda kolejna
klasa ma w banku komplet na każdy poziom**, więc idzie znacznie szybciej, mimo że przechodzi
te same piętra. To jest naturalne przyspieszenie, którego nie trzeba nigdzie kodować.

### Wiele klas naprawia kolejki do rajdów

Zaprojektowaliśmy Tytana na 25 osób z wymogiem trzech tanków i pięciu healerów, a ekran
kolejki pokazuje `1 tank z 3 · 31 DPS-ów czeka`. To jest klasyczna choroba tego gatunku:
wszyscy chcą bić, nikt nie chce trzymać tarczy.

**Wiele klas na koncie rozwiązuje to bez żadnej zachęty.** Widzisz, że brakuje tanka —
przełączasz się na Paladyna i wchodzisz od ręki, zamiast czekać dziewięć minut w kolejce
DPS-ów. To samo w wyprawach drużynowych i Kolosie.

Gracz nie robi tego z uprzejmości, tylko dlatego, że **to jego najszybsza droga do wejścia**.
Kolejka reguluje się sama, a role przestają być deklaracją i stają się reakcją na to,
czego akurat brakuje.

Warunek: te klasy trzeba mieć wychodzone. Rajdowy Paladyn na pierwszym poziomie nikomu
nie pomoże — więc **posiadanie drugiej i trzeciej klasy na poziomie staje się celem samo
w sobie**, a nie ciekawostką.

### Odblokowywanie klas

**Zaczynasz jedną klasą. Kolejne odblokowują bossowie aktów.**

```
start        wybierasz pierwszą klasę
boss 10      druga klasa
boss 20      trzecia
boss 30      czwarta
boss 40      piąta
boss 50      szósta
```

Pięciu bossów do piętra 50, sześć klas — liczby wychodzą bez naciągania.

Trzy rzeczy z tego wynikają:

- **Boss aktu przestaje być tylko przeszkodą.** Daje punkty drzewka, walutę specjalną
  **i całą nową postać do rozegrania**. To najmocniejsza nagroda w grze.
- **Wybór ma wagę.** Pierwsza klasa to jedyna, jaką masz przez pierwsze dziesięć pięter.
- **Sześć pustych postaci na dzień dobry nie istnieje.** Nowy gracz ma jedną rzecz do
  zrobienia, a nie sześć, których żadnej nie rozumie.

Złoto jest wspólne dla konta, tak samo jak bank i materiały.

### Czego już nie ma

`ODRZUCONE` **Skille bojowe** (Atak, Dystansowy, Magia, Obrona, Zdrowie). Bramkowanie
sprzętu przejmuje klasa i poziom. Razem z nimi znika **podatek za tarczę** — decyzja
o tarczy przenosi się poziom wyżej, do wyboru klasy. **Zdrowie** wchłania Wytrzymałość.

### Cztery atrybuty

Punkty co poziom, gracz rozdaje sam. Dochodzą też z ekwipunku.

| Atrybut | Co daje |
|---|---|
| **Siła** | obrażenia · trochę HP · energia |
| **Intelekt** | obrażenia magiczne · mana |
| **Zręczność** | prędkość ataku · szansa i siła krytyka |
| **Wytrzymałość** | HP · regeneracja · pancerz i odporność magiczna |

**Atrybuty mnożą, ekwipunek daje bazę:**

```
Obrażenia = (obrażenia broni + płaskie z itemów) × (1 + Siła / 100)
Zdrowie   = (HP bazowe + HP z itemów)            × (1 + Wytrzymałość / 100)
```

To dwie różne waluty, więc nie wypychają się nawzajem. Bez broni mnożysz zero; bez atrybutów masz gołą bazę.

`PROPOZYCJA` Progi atrybutów co 25–50 punktów odblokowujące pasywkę (Siła 100 → ignorujesz 20% pancerza). Bez nich punkty są tylko liczbą; z nimi gracz liczy, czy dobije do setki.

### Pięć skilli bojowych

**Poziom skilla = poziom sprzętu, który założysz.** To jest ich główna robota.

| Skill | Otwiera | Rośnie gdy |
|---|---|---|
| **Atak** | bronie mele | walczysz wręcz |
| **Atak dystansowy** | łuki, kusze, pistolety | walczysz z dystansu |
| **Magia** | różdżki, orby, zwoje, przyzwania | rzucasz zaklęcia |
| **Obrona** | pancerz, hełm, tarcza, buty | **masz tarczę na ręce** |
| **Zdrowie** | nic — daje życie bazowe | zawsze |

**Podział expa — liczy się druga ręka:**

```
Dwuręczna                100% Atak
Dwie bronie              100% Atak
Broń + tarcza            50% Atak    · 50% Obrona
Wielka różdżka (2 sloty) 100% Magia
Różdżka + orb            100% Magia
Różdżka + tarcza         50% Magia   · 50% Obrona
Łuk, kusza               100% Dystansowy
```

Tarcza to **podatek, nie bonus**: rośniesz o połowę wolniej, ale otwierasz zbroję. „Tank" nie jest klasą, tylko decyzją o drugiej ręce — mag z tarczą też jest tankiem.

`OTWARTE` Czy poziom skilla bojowego dodaje też obrażenia, czy jest wyłącznie bramką sprzętu.

### Drzewko pasywne — model Path of Exile

- Jedno duże drzewo, punkty **1 na poziom**.
- **Dodatkowe punkty za pokonanie etapów kampanii** — drzewko rośnie też z eksploracji, nie tylko z expa.
- Małe bonusy procentowe, rzadkie **węzły kluczowe**, które coś dają i coś zabierają.
  Przykład: *Miażdżenie — ignorujesz 20% pancerza, tracisz 15% szansy na kryt.*
- **Drzewko to pasywki, nie umiejętności.** Mówi jak mocno bijesz, nie czym.

Punkty z kampanii robią dwie rzeczy naraz: dają powód, żeby przechodzić etapy zamiast farmić jeden w kółko, i **odrywają siłę postaci od samego poziomu**. Gracz zaparkowany na kotwicy dalej rośnie — przez content, nie przez pasek expa. To jest ważne, bo blokada expa jest główną strategią gry.

`OTWARTE` Ile punktów i za co dokładnie: za każdy etap, tylko za Elity, czy za pierwsze przejście na każdej z trzech trudności.
`OTWARTE` Liczba węzłów. Przy limicie 200 poziomów i punktach z kampanii gracz ma ~250–300 punktów.

**Produkcja:** na telefonie drzewko PoE wymaga płótna z przesuwaniem i zbliżaniem oraz wyszukiwarki węzłów. To nie jest lista do przewijania.

### Umiejętności — z drzewka. Gniazda je ulepszają

**Umiejętności bierzesz z drzewka.** Kamienie w gniazdach ich nie dają — tylko podnoszą to, co już masz.

Trzy rodzaje węzłów:

| Węzeł | Daje |
|---|---|
| **małe, połączenia** | podstawowe statystyki: +4 Siła, +30 HP |
| **duże, procentowe** | +12% obrażeń bronią dwuręczną |
| **duże, umiejętności** | nowy skill do rotacji |

Przykłady umiejętności: **Wojownik — Wir** (AoE za 60% obrażeń) · **Mag — Kula Ognia** · **Łucznik — Szybka Strzała** (przyspiesza kolejny atak) · **Obrońca — Prowokacja**.

**Dlaczego umiejętności są w drzewku, a nie w sprzęcie:** postać zaparkowana na kotwicy nie może mieć więcej umiejętności bazowych, niż wychodziła sobie punktami. Gdyby siedziały w gniazdach, lepszy sprzęt kupowałby rotację — a to łamie uczciwość przedziałów tak samo, jak łamałby ją brak progu poziomu na przedmiotach.

**Gniazda:**
- **Gniazdo bierze ulepszenie umiejętności albo statystykę, nie oboje.** *Kamień Wiru: +25% zasięgu Wiru.*
- Kamień bez odpowiedniej umiejętności w drzewku **nie robi nic**.
- **Kamienie przenosi się swobodnie** między przedmiotami. Zmiana broni nic nie kosztuje.
- **Źródło: wyprawy, Kolosy, Tytani.**

Rzadkość waży podwójnie: Common ma jedno gniazdo, Legendary cztery — i dopiero tam zaczyna się build.

---

## 6. SKILLE ZBIERACKIE I WARSTWA OFFLINE

Sześć skilli, model RuneScape. Każdy ma drabinkę odblokowań — na danym poziomie odblokowujesz konkretny surowiec albo czynność, więc nagroda ma nazwę, a nie numer.

| Skill | Robi | Karmi |
|---|---|---|
| **Mining** | ruda + szansa na kryształ | Smithing, ulepszanie |
| **Smithing** | przetop rudy, kucie sprzętu | ekwipunek, **Mystic i God ze składników** |
| **Fishing** | ryby | Cooking |
| **Farming** | rośliny i zwierzęta | Cooking |
| **Cooking** | **buffy przed walką** + **jedzenie na exp peta** | cała drużyna, rozwój peta |
| **Alchemy** | **mikstury lecznicze** | leczenie w trakcie walki |
| **RuneCrafting** | runy z essencji + ogników | **Magia — bez run nie rzucisz zaklęcia** |

Żaden skill nie jest osobną wyspą. RuneCrafting jest najmocniejszym wiązaniem: bez run nie ma zaklęć, bez Miningu nie ma essencji, bez wyprawy nie ma ogników.

### Cooking i Alchemy to dwie różne rzeczy

- **Cooking — przed walką.** Jedno danie dla Ciebie, jedno dla każdego sojusznika, jedno dla peta. Osobno gotujesz jedzenie dające **doświadczenie petowi**.
- **Alchemy — w trakcie walki.** Mikstury lecznicze, osobny exp. To one działają o 10% słabiej z każdym kolejnym użyciem.

Buffy przed walką to **jedyna decyzja podejmowana przed startem**. Reszta walki jest automatyczna, więc to jest moment, w którym przygotowanie zamienia się w wynik.

### Offline

**Ustawiasz skill, który ma się farmić, i on farmi przy zamkniętej aplikacji.** To jest cała warstwa idle w tej grze — wąska i świadoma. Walka offline nie działa poza tym, co już trwa.

### Ekwipunek pod skille

Osobna kategoria sprzętu, **nie kolidująca ze slotami bojowymi**: kilof, młot, wędka, patelnia, dłuto, motyka — plus pełne zestawy pod wydobywanie, kopanie i łowienie.

- Narzędzia to **zwykłe itemy**: ta sama rzadkość, plusy, kowal, przekucie. Zero nowych systemów, tylko nowe sloty.
- **Poziom skilla decyduje CO możesz zbierać, narzędzie decyduje JAK SZYBKO i ILE.** Lepszy kilof jest zawsze pożądany, ale jego brak nigdy nie blokuje.
- Kilof niesie **szansę na kryształ** — dlatego legendarny kilof z Tytana karmi ulepszanie broni.

**Osobne kategorie wypraw dają sprzęt pod skille.** To daje powód, żeby chodzić na wyprawy nawet wtedy, gdy sprzęt bojowy jest już zrobiony.

---

## 7. PRZEDMIOTY

**10 slotów bojowych** + osobne sloty narzędzi.

### Siedem rzadkości, każda z własnym źródłem

| Rzadkość | Skąd |
|---|---|
| Common · Uncommon · Unique | zwykłe moby |
| Heroic | Elity (co 10 etapów) |
| Legendary | Herosi · **bardzo mała szansa z wyprawy** |
| Mystic · God | **kute ze składników** · Kolosy i Tytani |

**Rzadkość dokłada linie, nie tylko liczby.** Common: trzy wiersze i jedno gniazdo. Legendary: sześć wierszy, specjalny efekt i cztery gniazda.

### Dwa progi na każdym przedmiocie

```
Kieł Krwi · Legendary +14 · miecz dwuręczny
✓ Poziom 36 — masz 47
✓ Atak 45  — masz 58
```

| Próg | Czego pilnuje |
|---|---|
| **Poziom postaci** | **uczciwości przedziałów** — bez niego postać z konta wysyłałaby swojemu altowi na 25 sprzęt ze setki i rozbiła kategorię „max 25" |
| **Poziom skilla** | **buildu** — poziom postaci dostajesz z kampanii, więc nie może kupować specjalizacji, której nie wytrenowałeś |

Oba działają w obie strony i to jest ich sens: postać na 100 bez treningu Magii nie założy różdżki na 40; postać z Atakiem 58 na poziomie 20 nie założy miecza na 36. **Poziom nie kupuje buildu, a build nie kupuje przedziału.**

Próg poziomu jest wyłącznie dolny — przedmiotu nigdy się nie „wyrasta". Wyrasta się tylko z **contentu**, nie ze sprzętu.

### Który skill bramkuje co

Miecz → Atak. Łuk → Dystansowy. Różdżka → Magia. Pancerz i tarcza → Obrona.
**Biżuteria tak samo:** Pierścień Wojownika wymaga Ataku, Pierścień Maga wymaga Magii, Amulet Wytrwałości wymaga Zdrowia.

Typ przedmiotu decyduje jednocześnie o puli afiksów i o wymaganiu — jedno wynika z drugiego, więc przy nowym przedmiocie podejmujesz jedną decyzję zamiast trzech.

### Ulepszanie ma dwa kroki

**Krok 1 — Energia.** Zanim kowal tknie broń, trzeba ją **nakarmić energią z przepalonych przedmiotów**. Bez pełnego progu przycisk ulepszenia jest martwy.

| Rzadkość spalanego | Energia |
|---|---|
| Common | 1 |
| Uncommon | 3 |
| Unique | 8 |
| Heroic | 20 |
| Legendary | 50 |
| Mystic | 120 |
| God | 300 |

**Krok 2 — próba u kowala**, za kryształy, w jednym z trzech pasm ryzyka.

Dwa zegary, nie jeden: **kryształy kupują próbę, energia kupuje prawo do próby.** Można mieć pełną sakwę kryształów i nie ruszyć broni.

Skutek uboczny i chyba najlepszy: **plecak nigdy nie jest pełen śmieci.** Wszystko, co wypada, ma jedno z dwóch przeznaczeń — nosisz albo palisz. Nie ma trzeciej kategorii „leży i zawadza". To też nadaje sens zwykłym walkom w wieży, które dropią właśnie takie paliwo.

`OTWARTE` Progi energii. 1 200 energii z samych Commonów to 1 200 przedmiotów — realnie karmi się to Heroicami z przekutych zestawów. Trzeba sprawdzić przy testach, czy progi nie zmuszają do palenia rzeczy, które gracz chciałby zatrzymać.

### Trzy pasma ryzyka

```
+1  → +6     nie wchodzi, tracisz materiały
+6  → +10    nieudane — spada poziom
+10 → +15    nieudane — broń przepada
```

Trzy pasma uczą gracza stopniowo. Do +6 nabiera odwagi, na +6 uczy się, że boli, na +10 wie już, czym ryzykuje.

**Kamienie ochronne — dwa rodzaje:**

| Kamień | Chroni | Źródło |
|---|---|---|
| **Kamień Utrwalenia** | przed spadkiem poziomu (+6→+10) | **Heros, raz dziennie** |
| **Kamień Ocalenia** | przed spaleniem (+10→+15) | **Tytan, raz w tygodniu** |

Dwa zamiast jednego, bo przy jednym nikt nie zużyłby go w niższym paśmie. Podaż jest ograniczona zegarem, nie szansą dropu — gracz grający 12 godzin dostaje tyle samo, co grający godzinę.

**Ryzyko widać przed kliknięciem.** Szansa, skutek porażki, liczba kamieni i wynik z kamieniem — wszystko na jednym ekranie, zero dialogów „czy na pewno" po fakcie.

### Przekucie

U kowala, za złoto: **odzyskujesz włożone kryształy**, które wchodzą w kolejny przedmiot **tego samego tieru**. Kryształy giną tylko wtedy, gdy sam je spalisz. Wartość odzysku widoczna przed decyzją.

### Kucie Mystic i God

**Nie lecą z dropu — składasz je ze składników** zbieranych z mniejszych wypraw swojego przedziału.

```
Kieł Przędącej Matki   3 z 5    boss wyprawy 40–59
Popiół Krypty          7 z 12   Krypta Zapomnianych
Rdzeń Arsenału         0 z 8    Zatopiony Arsenał
                                → Smithing → Mityczna broń, przedział 36
```

Gracz bez drużyny **nie stoi pod ścianą — idzie dłużej**. Rajdy dają to szybciej. To największa robota, jaką dostaje Smithing.

---

## 8. ŚWIAT

### Wieża — ścieżka

Świat jest wieżą. **Poziom postaci = najwyższe zdobyte piętro.** Fabuła to jedno zdanie: *wejść jak najwyżej, bo nigdy nie wiesz, co jest na następnym piętrze.*

**Podział ról, na którym stoi cała struktura:**

| | Wieża | Wyprawy |
|---|---|---|
| **Czym jest** | ścieżka — idziesz raz, w jedną stronę | pętla — wracasz setki razy |
| **Daje** | poziom · punkty drzewka · odblokowania wypraw · złoto · exp skilli | sprzęt · składniki · klucze · kamienie umiejętności · narzędzia |
| **Trudność** | **jedna** | **3–5 poziomów przejścia** |

Gdyby oba dawały sprzęt, jedno byłoby zbędne.

### Budowa piętra

**Piętro to 10 walk.** Ściana jest wewnątrz piętra, nie między piętrami:

```
1 … 7   ✓ przeszedłeś        ← wracasz tu farmić
8       ✗ nie dajesz rady
9, 10   🔒 zakryte
```

Nie dajesz rady ósmej — wracasz na szóstą i siódmą, podnosisz Atak, poprawiasz sprzęt, próbujesz znowu. **To jest kompletna pętla wczesnej gry i nie wymaga żadnego dodatkowego systemu:** żadnych bram poziomowych, żadnych komunikatów „wróć, gdy będziesz silniejszy".

### Rytm wieży

| | |
|---|---|
| każde piętro | +1 poziom · **+1 punkt drzewka** |
| co 5 pięter | wariant **„+"** — wyraźny skok trudności |
| co 10 pięter | **boss aktu** — najwięcej punktów drzewka + **waluta specjalna** |
| nowy akt | inne rodziny mobów, własna wyprawa, **własny wyłączny składnik** |

Piętro ma **jedną trudność i przechodzi się je raz**.

**Skutek, który trzeba zaakceptować:** zaparkowana postać zamraża poziom **i drzewko** — rosną jej tylko skille i sprzęt. Parkowanie przestaje być darmowe i staje się realnym wyborem: iść wyżej po punkty, czy zostać tam, gdzie jesteś silny.

### Akty i powroty

Akt = 10 pięter. Każdy ma **własne rodziny mobów** i **wyłączny składnik**, którego nie ma nigdzie indziej w wieży. Przepisy na Mystic i God wymagają składników z **kilku aktów naraz** — więc wracasz na piętro 6 mając poziom 47 i to nie jest strata czasu.

Powrót niczego nie psuje, bo **poziom leci wyłącznie z pierwszego zdobycia piętra**: nie wypadasz z przedziału, nie influjesz się.

Rodziny mobów robią z aktów miejsca, nie numery. Gobliny są w Akcie I i nigdzie indziej — za trzy miesiące nadal będziesz do nich wracał.

### Mgła — wiedza jako zasób społeczny

**Nie wiesz, co jest wyżej.** Piętra, których nie zdobyłeś, są zakryte. Jedyne informacje o tym, co tam jest, pochodzą **od graczy, którzy tam byli**.

```
Piętro 50 — Strażnik Popiołu    przeszło 3 graczy · pierwszy: Kruk
                                dropi: Heroic bronie, Kamień Utrwalenia    ZNANE
Biom 6 — nazwa nieznana         przeszło 2 graczy, nie podzielili się niczym
Piętro 64 i wyżej               nikt nie wszedł, nikt nie wie
```

**Rytm jest znany, zawartość nie.** Wiesz, że na 50 jest boss i nowy akt — nie wiesz, czym jest ani co dropi.

To jedyny system w tej grze, w którym **inny gracz daje Ci coś, czego nie zdobędziesz sam.** World boss, rajdy i rankingi to rywalizacja i logistyka; to jest współpraca.

`OTWARTE` Czy wiedza odsłania się automatycznie po pierwszym przejściu, czy gracz sam decyduje, co opublikować. `PROPOZYCJA` — fakt odsłania się zawsze (jest boss, nazywa się tak), szczegóły publikuje gracz.

### Odkrywanie przedmiotów

**Wiesz CO może wypaść, nie wiesz JAKIE.**

```
Gniazdo Przędzy
  Heroic bronie i tarcze      odkryto 3 z 7
  Kieł Przędącej Matki        składnik
  Legendary broń              ? ? ? nieodkryte
```

Lista dropu odblokowanej wyprawy jest jawna — masz cel. Ale jaka to konkretnie broń, z jakimi statystykami i efektem, dowiesz się dopiero, gdy Ci wypadnie.

**Eksploracja jest ślepa, farmienie jest świadome.** Log Book przestaje być listą kolekcji, a staje się dziennikiem odkryć.

### Nazewnictwo

**Nazwane jest ważne, nienazwane jest tłem.** „Pomiot Goblinów" to gatunek, którego zabijesz tysiąc. „Gruk Rzeźnik" to ktoś. Żadnych rzymskich cyfr przy przeciwnikach.

### Kotwice i przedziały

Content grupuje się wokół poziomów granicznych: **36 · 64 · 100** (przy limicie expa 200).

Na każdej kotwicy stoi komplet:
- **trzy Elity** — jedna daje bronie i tarcze, druga zbroje, trzecia biżuterię, narzędzia i kamienie
- **kategoria PvP** „max 36" / „max 64" / „max 100"
- **własny world boss**

Trzy Elity zamiast jednej to trzy adresy: nie da się ubrać postaci, siedząc na jednym bossie.

**Kolosy stoją między kotwicami** (40 · 80 · 120) — content dla wędrujących, nie dla zaparkowanych. Dzięki temu nie ma martwego poziomu, na którym nie ma czego bić.

**Blokada expa jest darmowa i przełączalna w dowolnym momencie.** Parkujesz się na kotwicy, bo tam jest Twój boss, Twoje PvP i Twoje trzy Elity. Poziom graniczny to adres, nie kompromis.

### Wyprawy — struktura roguelite

Około **15 minut**. Odblokowywane co kilka pięter wieży. Solo i drużynowe to dwa różne tryby, nie ten sam z przełącznikiem.

**3–5 poziomów przejścia, różniących się liczbą fal:**

```
I    —  8 fal    drop ×1      Legendary 0,02%
II   — 12 fal    drop ×2,5    Legendary 0,1%
III  — 16 fal    drop ×6      Legendary 0,4%
IV   — 22 fale   wymaga Mocy 8 000
V    — 30 fal    wymaga Mocy 14 000
```

**Wyższy poziom to więcej fal, nie mocniejsze moby.** Trudność bierze się z **wyczerpania**: HP nie wraca między falami, mikstur jest tyle, ile przyniosłeś. Dlatego wyższy poziom wymaga lepszego **przygotowania** — Alchemy, buffów z Cookingu, rozsądnych rozdroży — a nie tylko wyższej Mocy. Gdyby moby po prostu biły mocniej, jedyną odpowiedzią byłby lepszy sprzęt, a cała warstwa przygotowania stałaby się dekoracją.

**SOLO** — Ty + trzech sojuszników + pet:
- fale, **HP nie odnawia się między nimi**, mikstury się kończą
- **rozdroża** z wyborem drogi, żadna nie jest darmowa
  *Ołtarz: pełne HP, ale boss +25% HP · Kokon: łup ×2, ale elita przy Twoim niskim HP · Szczelina: pomijasz fale i ich łup*
- **poziom ryzyka wybierany przy wejściu**: ×1 / ×2,5 / ×6 łupu
- **nie da się wyjść.** Wyprawę kończy dopiero boss — dopiero wtedy zbierasz łup. Śmierć = zaczynasz od nowa i tracisz wszystko z tej wyprawy. Sprzęt zostaje.
- na końcu **nazwany boss** z unikalnym dropem, składnikami i **kluczami**

To jedyne miejsce w grze bez asekuracji. Dlatego piętnaście minut wyprawy waży więcej niż godzina farmienia.

**DRUŻYNOWE** — **pięciu graczy zajmuje pięć pól**. Bez sojuszników i peta. Stałe fale, bez rozdroży, asynchronicznie, jednakowa nagroda. Role graczy nagle znaczą, bo nie przyniesiesz własnej uzdrowicielki.

`PROPOZYCJA` Wyprawa czeka na graczu na rozdrożu w nieskończoność; fale między rozdrożami liczą się na serwerze. Wtedy da się ją rozłożyć na trzy dni po pięć minut, a decyzje zostają przy graczu.

### World Boss — codziennie, dla wszystkich

- **Okno 16:00–22:00**, osobny boss na każdy przedział.
- **Nigdy nie ginie.** Liczą się obrażenia, nie zabicie — spóźnić się nie da.
- **Trzy osobne rankingi: tank · heal · DPS.**
- Nagrody: **progi obrażeń dla wszystkich + dodatkowa pula dla top 100.**
- **Bez progu wejścia.** Bije każdy, kto mieści się w przedziale.

### Kolos — 10 osób, pokój

- **Próg Mocy** sprawdzany przy wejściu. Poziom masz za darmo z czasu; Moc trzeba zrobić.
- **Założyciel zakłada pokój i decyduje, kiedy odpalić.** Widzi Moc i rolę każdego.
- Wymagany skład: min. 2 tanki, 2 healerzy.
- Po odpaleniu **wszystko dzieje się samo** — serwer liczy, każdy dostaje log i łup.
- **Łup: Mystic, God, kamienie umiejętności, rolle na sojuszników i pety.**

To jedyne miejsce, gdzie **Twój build ma publiczność**. Podatek za tarczę, Runa Życia z RuneCraftingu, komplet sprzętu na Moc — wszystko nagle widoczne dla innych.

### Tytan — 25 osób, weekend, kolejka

- Tylko sobota i niedziela.
- **Wymagany skład: min. 3 tanki, 5 healerów.**
- **Automatyczna kolejka**: wybierasz rolę, dostajesz skład do zatwierdzenia jednym kliknięciem, po komplecie akceptacji walka rusza.
- **Rola wynika ze sprzętu, nie z deklaracji.** Bez tarczy nie wejdziesz jako tank.
- **Łup: Mystic, kamienie umiejętności, Kamień Ocalenia.**

Wymóg składu to nie biurokracja, tylko treść: ekran kolejki pokazuje „1 tank z 3 · 31 DPS-ów czeka". Kto założy tarczę, wchodzi od ręki. **Nie tłumaczysz graczowi, że tank jest przydatny — pokazujesz mu kolejkę.**

**Skutek uboczny, który trzeba znać:** skoro nikt nie klika, rajd wygrywa się w tygodniu poprzedzającym. Sobota jest wynikiem, nie rozgrywką.

### Tabela źródeł łupu

| Źródło | Daje | Zegar |
|---|---|---|
| Zwykłe moby | Common – Unique | bez limitu |
| Wariant „+" | Uncommon – Unique | bez limitu |
| Elita (co 10 etapów) | Heroic | bez limitu |
| Boss wyprawy | Heroic · Legendary (rzadko) · składniki · kamienie umiejętności | ~15 min na wyprawę |
| **Heros** | Legendary · **Kamień Utrwalenia** | **raz dziennie** |
| **Kolos** (10 os.) | Mystic · God · kamienie umiejętności · **rolle** | tygodniowo |
| **Tytan** (25 os.) | Mystic · kamienie umiejętności · **Kamień Ocalenia** | **weekend** |

Każda warstwa ma jedno źródło i jeden zegar. Nigdy nie ma pytania „co dziś bić" — jest tylko „czego mi brakuje".

---

## 8a. PRZYWOŁANIE

Jeden ekran, jedna waluta: **klucze z wypraw i rajdów**.

| Przywołujesz | Czym |
|---|---|
| **Sojusznik** | zwykły klucz → Common–Unique · zdobny → Heroic · pradawny → Legendary z drzewkiem |
| **Pet** | jak wyżej; duplikat podnosi gwiazdkę zamiast marnować klucz |
| **Skrzynia** | sprzęt, kryształy, składniki, kamienie umiejętności |

**To jest źródło sojuszników i petów.** Zaczynasz sam; pierwszego sojusznika przywołujesz kluczem z pierwszej wyprawy. Wysokie tiery lecą wyłącznie z rzadkich kluczy, a te tylko z Kolosów i Tytanów.

Klucza **nie da się kupić**. Gacha jest, ale płaci się w niej czasem i sprzętem.

Trzy systemy chodzą przez jedną kieszeń — gracz uczy się raz.

---

## 8b. ŚMIERĆ

| Gdzie | Co się dzieje |
|---|---|
| **Kampania** | giniesz, leczysz się miksturą, lecisz dalej. Brak kary poza czasem. |
| **Wyprawa** | koniec wyprawy. Tracisz cały zebrany łup, zaczynasz od nowa. |
| **Rajdy** | `OTWARTE` |

---

## 9. DRUŻYNA — 1 + 3 + 1

| Slot | Kto | Ekwipunek | Drzewko |
|---|---|---|---|
| 1 | **Główna postać** | 10 slotów | własne, pełne |
| 2–4 | **Trzech sojuszników** | EQ do założenia | **tylko od Legendary w górę** |
| 5 | **Pet** — atakuje | własny rollowany item | tak |

**Drzewko tylko od Legendary w górę** to najlepsza rzecz w tym układzie: legendarny sojusznik nie jest po prostu mocniejszy, tylko odblokowuje cały nowy system pod siebie.

Towarzysze mają **mnożnik jako procent statystyk gracza**, podnoszony duplikatami. Żaden nie staje się śmieciem przy zmianie przedziału.

Zakładka DRUŻYNA obsługuje: drzewka · pozycje w szyku · skille · rozkazy.

**Pet:** z Przywołania. Rozwój przez duplikaty i **jedzenie na exp gotowane w Cookingu**. Własny rollowany item z efektem.

### Kolejność, w jakiej gracz dostaje drużynę

```
start           sam
potem           pierwszy sojusznik
potem           pet
z biegiem gry   dwóch pozostałych sojuszników
```

Sloty otwierają się po kolei, więc gracz nie dostaje pięciu jednostek i pięciu zestawów ekwipunku naraz.

`OTWARTE` Co konkretnie odblokowuje każdy slot — etap kampanii, pierwsza wyprawa, poziom.
`OTWARTE` Usunięcie frakcji zabrało **synergię frakcyjną** — bonus za skompletowanie drużyny z jednej frakcji. To był główny powód, żeby polować na konkretnego sojusznika, a nie na dowolnego mocnego. Miejsce po niej jest puste. Frakcje wrócą później w nowej formie.

---

## 10. WIELE POSTACI I BANK

**Do 4 postaci na koncie. Bank jest kontowy, nie postaciowy.**

Każda zaparkowana na innej kotwicy, każda w innym przedziale PvP, world bossa i wypraw.

- **Blokada expa przestaje być opcją i staje się główną strategią.**
- **Dopracowanie sprzętu na etap ma cel** — ta postać już nigdzie nie idzie.
- **Stary sprzęt nie umiera.** Przedmiot z przedziału 36 wędruje bankiem do postaci zaparkowanej na 36.

`OTWARTE` Ile postaci startowo, ile odblokowywanych i za co. Czy złoto i kryształy też są wspólne. Limit miejsca w banku.
`OTWARTE` Ryzyko: cztery postacie × dzienna obsługa może zamienić grę w pracę. `PROPOZYCJA` — zadania dzienne i Log Book kontowe, nie postaciowe.

---

## 11. EKONOMIA

**Dwie waluty: złoto i waluta specjalna.**

### Skąd co leci

| Źródło | Daje |
|---|---|
| **Zwykłe walki w wieży** | mikstury, podstawowe kamienie, broń na przepał (składniki) |
| **Boss piętra, co 10** | **waluta specjalna** · punkty drzewka · +3 atrybuty |
| **Wyprawy** | **złoto** · waluta · sprzęt · klucze · składniki |
| **Skrzynia bossa wyprawy** | Heroic 5% · Legendary 0,3% |
| **Heros, raz dziennie** | wybrany slot, **minimum Unique** · Kamień Utrwalenia |
| **Kolos / Tytan** | Mystic, God, kamienie umiejętności, rolle, Kamień Ocalenia |

**Waluta specjalna** jest rzadka z definicji — jest jej dokładnie tyle, ile pięter zdobyłeś. Kupuje zmianę klasy i `OTWARTE` co jeszcze.

### Ujścia złota

**Rynek nie jest ujściem.** Kupno przenosi złoto do drugiego gracza; suma w świecie się nie zmienia. Złoto znika wyłącznie tam, gdzie płaci się systemowi.

| Ujście | Charakter |
|---|---|
| **Losowanie afiksów u kowala** | **główne** — nieskończone, opcjonalne, wprost związane z mocą |
| **Prowizja rynkowa 8%** | skaluje się sama z aktywnością rynku |
| **Przekucie** | jednorazowe przy zmianie sprzętu |
| **Wejście na wyższe poziomy wypraw** | złoto konsumowane przez to, co je generuje |

**Losowanie afiksów jest głównym ujściem, bo spełnia wszystkie trzy warunki dobrego sinka:**

- **Nieskończone** — zawsze może wypaść lepiej.
- **Opcjonalne** — nikt nie musi, więc nie jest podatkiem za granie.
- **Związane z mocą** — więc każdy chce.

**Losowanie dotyczy wszystkich gniazd. Za złoto blokujesz te, które chcesz zachować — a stawkę za blokady płacisz przy KAŻDYM losowaniu.**

To jest cały mechanizm i on jeden decyduje, czy system jest grindem czy ścianą:

```
bez blokad, 4 gniazda, pula 18 afiksów     trafienie 1 na 105 000    ściana
3 zablokowane, losujesz 1 gniazdo          średnio 18 prób           grind
```

**Złoto kupuje precyzję, nie moc.** Kto nie blokuje, płaci mało i liczy na szczęście. Kto blokuje trzy afiksy na przedmiocie God, płaci krocie za każdą próbę — i to jest worek bez dna, którego szuka ekonomia.

**Skala na szczycie:**

| Przedmiot | Koszt rolla | Ostatni afiks |
|---|---|---|
| Legendary, 2 blokady | ~25 tys. | **~450 tys.** |
| Mystic, 3 blokady | ~120 tys. | **~2,2 mln** |
| God, 3 blokady | ~280 tys. | **~5 mln** |

Bardzo drogo i całkowicie realnie — cel na tygodnie farmienia, nie loteria bez końca.

**Mnożnik za powtarzanie ma sufit przy ×5.** Bez niego dwudzieste losowanie kosztuje tyle, że przedmiot jest ekonomicznie zamurowany i nikt go nie kończy.

**Interfejs pokazuje oczekiwaną liczbę prób** („średnio 18, masz za sobą 7") oraz to, ile wynosiłaby bez blokad. Gracz, który wie, że jest w połowie normy, farmi dalej.

**Trafienie afiksu to nie koniec** — każdy losuje się w zakresie wartości (Siła 20–40). Możesz mieć właściwy afiks ze słabym rzutem i losować dalej. Tu leży prawdziwa głębia i tu przepalają się miliony.

**Interfejs mówi wprost, ile prób średnio trzeba** i ile masz za sobą. Gracz, który wie, że jest w połowie normy, farmi dalej. Gracz, który nie wie nic, po trzydziestu próbach uznaje, że gra go oszukuje.

Bogaty gracz przepala tu miliony, nowy wydaje cztery tysiące. Ten sam system obsługuje obu bez strojenia.

`OTWARTE` Handel jest w V1.x, ale **prowizję trzeba zaprojektować teraz**. Rynek dołożony później do gospodarki bez ujść oznacza inflację, której nie da się cofnąć bez kasowania ludziom pieniędzy.

**Krzywa expa: powolna.** Kto chce pędzić, może — ale wejdzie w wyższe wyprawy ze słabym sprzętem i nie da rady sam. **Poziom dostajesz za czas, Moc trzeba zrobić** — i to Moc jest bramką, nie poziom.

`OTWARTE` Sinki złota poza kowalem. Bez nich inflacja w miesiąc.
`OTWARTE` Konkretne liczby: czas do poziomu 36 i 200, długość walki ze zwykłym mobem, szanse dropu, ile killi na komplet sprzętu w przedziale.

---

## 12. MONETYZACJA

**V1: wyłącznie kosmetyka i wygoda.** Zero wpływu na moc.
**Później: battle pass** bez unikalnej mocy.
**Odrzucone: płatne rolle wpływające na moc.**

Rolle na sojuszników to gacha — ale zdrowa: **rolla nie da się kupić i nie leci znikąd poza Kolosem**, na którego trzeba mieć Moc. Płacisz sprzętem i czasem, nie kartą.

Cała gra stoi na wieczornym rankingu. Ranking, który da się kupić, przestaje być powodem, żeby expić.

---

## 13. PLATFORMA I JĘZYK

- Docelowo **Android i iOS**, interfejs projektowany pod oba.
- Faza testowa: **APK bezpośrednio**, bez sklepu. Serwer lokalnie na laptopie.
- Symulacja walki jest serwerowa — „aplikacja do pobrania" znaczy **aplikacja plus serwer**, od pierwszego dnia.
- **Język: polski i angielski.** Od startu, więc żadnego tekstu wypalonego w grafikę i wszystkie napisy muszą znieść rozjazd długości.

---

## 14. INTERFEJS

Pełny opis: `makieta_ui.html`. Tu tylko zasady.

**Ograniczenia, które kształtują wszystko:**

| | |
|---|---|
| **Wszystko PNG, zero animacji** | Feedback niesie tekst, liczba, kolor i układ. Log walki i kolory rzadkości są jedynym efektem specjalnym. |
| **Sesje po 3–5 minut** | Nic głębiej niż dwa dotknięcia od zakładki. |
| **Walka toczy się w tle** | Pasek stanu idzie z graczem przez całą aplikację. |
| **Grafiki robi jedna osoba** | Ramki i ikony wielokrotnego użytku zamiast ilustracji per ekran. |

**Materiał:** ciemny kamień i metal, grafitowe tło, złote i miedziane akcenty. Na ciemnym tle kolory rzadkości świecą; na pergaminie żółty Legendary i biały Common wyglądają tak samo.

**Kolory rzadkości:** Common szary · Uncommon zielony · Unique niebieski · Heroic fioletowy · Legendary pomarańczowy · Mystic czerwony · God złoty.

`PROPOZYCJA` Kolor niesie rzadkość, **ramka niesie ligę** — trzy ramki na siedem tierów. Sam kolor przy siedmiu poziomach zawodzi w gęstym plecaku, a 8% mężczyzn nie odróżni pomarańczowego od czerwonego.

**Zasady:**

- Odbieranie nagród przed pokazywaniem zadań.
- Liczba zbiorcza na wierzchu, szczegóły pod spodem.
- Ryzyko i wartość odzysku widoczne **przed** kliknięciem, nigdy w dialogu po fakcie.
- Nigdy nie zakładaj ekwipunku automatycznie.
- Popup nie przerywa gry, gdy gracz jest gdzie indziej.
- Kropka pojawia się tylko tam, gdzie jest coś do odebrania albo decyzja do podjęcia — nigdy za „nowa treść".
- Powiadomienia gracz sam włącza; domyślnie tylko te, których nie odzyska.

---

## 15. ZAKRES V1

1. **Kampania** — etapy, 3 trudności, warianty „+", Elity co 10
2. **Walka** — 5 na 5, symulacja serwerowa, rotacja, leczenie −10%, Prowokacja
3. **Postać** — 4 atrybuty, 5 skilli bojowych, drzewko, gniazda z umiejętnościami
4. **Itemy** — 10 slotów, 7 rzadkości, bramki, 3 pasma ulepszania, przekucie, bank
5. **Wyprawy solo** — roguelite, ~15 min, rozdroża, poziom ryzyka
6. **World boss** — okno 16–22, nieśmiertelny, 3 rankingi, per przedział
7. **Skille zbierackie** — minimum **Mining + Smithing** (zamknięta pętla karmiąca ulepszanie) + offline

**V1.x:** wyprawy drużynowe · Kolos · Tytan · pozostałe skille · gildie · handel · czat gildyjny · druga czwórka klas towarzyszy
**Później:** sezony · endgame powyżej 200 · frakcje w nowej formie

---

## 16. CZEGO NIE MAMY

**Blokujące pierwszą grywalną wersję:**

- **Onboarding — pierwsze trzydzieści minut.** Mamy klasę jako pierwszą decyzję i kolejność otwierania slotów drużyny. Nie mamy sekwencji: co gracz widzi w minucie pierwszej, piątej, trzydziestej; kiedy pojawia się kowal, wyprawa, skille zbierackie, drzewko, gniazda, ulepszanie.
- **Wszystkie liczby.** Krzywa expa skilli, liczba etapów kampanii, czas zwykłej walki, szanse dropu, ceny, sinki złota, rozmiar drzewka, punkty atrybutów na poziom.

**Ważne:**

- Pełna lista umiejętności w drzewku i zawartość gałęzi.
- Waluta specjalna — co kupuje, skąd leci.
- Śmierć w rajdach.
- Co odblokowuje kolejne sloty drużyny.
- Ile postaci na starcie, za co odblokowujesz kolejne, limit banku.
- Co zastąpi synergię frakcyjną jako powód, żeby polować na konkretnego sojusznika.

**Na później:** sezony, endgame powyżej 200, handel, gildie, frakcje w nowej formie, nazewnictwo warstw przeciwnika.

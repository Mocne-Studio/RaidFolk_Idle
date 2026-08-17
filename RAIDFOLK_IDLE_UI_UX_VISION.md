# RAIDFOLK_IDLE — UI / UX VISION

Wersja 0.1 · dokument kierunku, nie specyfikacja pikseli
Wizja gry: `RAIDFOLK_IDLE_GAME_VISION.md` · zapis decyzji: `RAIDFOLK_IDLE_PRODUCT_DISCOVERY.md`

`PROPOZYCJA` oznacza układ, którego projektant jeszcze nie zatwierdził. `OTWARTE` — nie wiemy.
Szkice są w ASCII celowo. Chodzi o rozmieszczenie i hierarchię, nie o wygląd.

---

## 1. OGRANICZENIA, KTÓRE KSZTAŁTUJĄ WSZYSTKO

| Ograniczenie | Co z niego wynika |
|---|---|
| **Wszystko jest PNG. Zero animacji.** | Feedback niesie tekst, liczby, kolor i układ. Nie ma ruchu, który przykryje słabą czytelność. |
| **Telefon, sesje po 3–5 minut, wielokrotnie dziennie** | Każda ważna akcja w zasięgu kciuka. Nic głębiej niż dwa dotknięcia od zakładki. |
| **Walka toczy się w tle** | Interfejs ma stan globalny, który idzie z graczem przez całą aplikację. |
| **Grafiki generuje jedna osoba** | Im mniej unikalnych elementów, tym lepiej. Ramki i ikony wielokrotnego użytku zamiast ilustracji per ekran. |
| **Gra pokazuje bardzo dużo liczb** | Hierarchia typograficzna jest ważniejsza niż ozdoby. |

---

## 2. MATERIAŁ I TON

**Ciemny kamień i metal.** Grafitowe tło, złote i miedziane akcenty.

Dlaczego nie pergamin: gra wyświetla siedem kolorów rzadkości, paski HP i liczby obrażeń. **Na ciemnym tle kolory rzadkości świecą.** Na pergaminie żółty Legendary i biały Common wyglądają tak samo.

Czego tu nie ma: neonu, kasynowych świateł, płaskiego korporacyjnego UI, morza czerwonych kropek.

---

## 3. NAWIGACJA

Pięć zakładek na dole. Stały pasek walki nad nimi.

```
┌────────────────────────────────────────┐
│                                        │
│           TREŚĆ ZAKŁADKI               │
│                                        │
├────────────────────────────────────────┤
│ ⚔ Nadzorca  ██████░ 61%        🎒 14   │   ← pasek walki
│ TY ████░░ 42%           [ ❤ LECZ ]     │      zawsze widoczny
├────────────────────────────────────────┤
│  ⚔      🏰      🎒      👥      🏆     │
│ WALKA  WIOSKA  POSTAĆ  DRUŻYNA  SPOŁ.  │
└────────────────────────────────────────┘
```

| Zakładka | Co zawiera |
|---|---|
| **⚔ WALKA** | mapa kampanii · wybór wroga · Heros · Tytan · World Boss · ekran walki |
| **🏰 WIOSKA** | budynki · surowce · najemnicy · wyprawy na cudze wioski |
| **🎒 POSTAĆ** | paper doll · plecak · skille · księgi · kowal i ulepszanie |
| **👥 DRUŻYNA** | pet · sojusznik · Bożek |
| **🏆 SPOŁECZNOŚĆ** | rankingi · czat · gildia (V1.x) |

`OTWARTE` Czy kowal zostaje w POSTAĆ, czy przenosi się do WIOSKI jako budynek kuźni. POSTAĆ niesie najwięcej ze wszystkich zakładek — cztery osobne ekrany pod jedną ikoną.

---

## 4. PASEK WALKI — NAJWAŻNIEJSZY ELEMENT INTERFEJSU

Idzie z graczem wszędzie. Dwie linie, około 60 pikseli.

```
│ ⚔ Nadzorca  ██████░ 61%        🎒 14   │
│ TY ████░░ 42%           [ ❤ LECZ ]     │
```

Niesie dokładnie tyle, ile trzeba, żeby zdecydować „wracam czy nie wracam":

- nazwa i HP wroga — czy walka idzie do przodu
- własne HP — czy grozi porażka
- licznik lootu — czy coś się dzieje
- przycisk leczenia — **czerwienieje przy niskim HP**, jedyny element interfejsu, który wolno mu krzyczeć

Dotknięcie paska otwiera pełny ekran walki. Bez walki pasek znika i zakładki wjeżdżają na jego miejsce.

---

## 5. EKRAN WALKI

Zatwierdzony.

```
┌────────────────────────────────────────┐
│ ←  KOPALNIA ZGNIŁEGO KAMIENIA    3/8   │
├────────────────────────────────────────┤
│  [PNG]     [PNG]     [PNG]     [PNG]   │
│  Goblin    Goblin    Nadzorca    —     │
│  ███░░     █████     ██████░           │
│                                        │
│                −340                    │   ← liczba, pojawia się i znika
│                                        │
│  [PNG]     [PNG]     [PNG]     [PNG]   │
│  TY        Pet       Sojusznik  Bożek  │
│  ██████    █████     ████░      ████   │
├────────────────────────────────────────┤
│ Szermierz → Rozłupanie → 340           │
│ Nadzorca → Zatrute Ostrze → −90, jad   │   ← log, 3–4 linie
│ Kapłan → Modlitwa → +180               │
├────────────────────────────────────────┤
│ [Rozłupanie][Cios][❤ LECZ][⏭ SKIP]     │
└────────────────────────────────────────┘
```

Cztery statyczne PNG na cztery. Ruch dają wyłącznie paski HP i liczby obrażeń.

**Log walki jest tu efektem specjalnym.** W grze bez animacji to on niesie dramaturgię — musi być czytelny, zwięzły i mieć wyróżnione trafienia krytyczne, zabicia i efekty statusowe.

`PROPOZYCJA` Tryb automatyczny podmienia pasek akcji na kolejkę rotacji skilli, żeby gracz widział, co gra wykona za niego i mógł to zmienić w miejscu.

---

## 6. EKRAN GŁÓWNY / KWATERA

`PROPOZYCJA` — projektant wybrał kwaterę jako ekran startowy, ale nie widział jeszcze układu.

To pierwsze, co gracz widzi po otwarciu aplikacji. Zadanie: **w dwie sekundy powiedzieć, co się wydarzyło i co czeka.**

```
┌────────────────────────────────────────┐
│  [PNG postaci]      Szermierz  lvl 47  │
│                     Moc 5 140          │
│                     ████████░ 78% exp  │
├────────────────────────────────────────┤
│  DO ODEBRANIA                          │
│   🧱 Wioska: 340 cegły, 120 żelaza  →  │
│   ⚔ Walka skończona: 14 przedmiotów →  │
├────────────────────────────────────────┤
│  DZIŚ                                  │
│   👑 Heros — gotowy              [IDŹ] │
│   🔥 World Boss — 16:00–22:00    [IDŹ] │
│   🗡 Tytan — za 3 dni                  │
├────────────────────────────────────────┤
│  Wczoraj: 412 mln obr. · 87. miejsce   │
└────────────────────────────────────────┘
```

Zasada: **to, co można odebrać, jest wyżej niż to, co można zrobić.** Odbieranie trwa sekundę i daje natychmiastową nagrodę za otwarcie aplikacji.

---

## 7. EKWIPUNEK I PORÓWNANIE PRZEDMIOTÓW

**To jest ekran, na którym gracz spędzi więcej czasu niż na walce.** Dziesięć slotów, siedem rzadkości, afiksy, plusy i kryształy — jeśli porównywanie jest męczące, cała gra jest męcząca.

Zatwierdzone: **side-by-side ze strzałkami + liczba Power na górze.**

```
┌────────────────────────────────────────┐
│  Moc  5 140  →  5 402      ▲ +262      │
├────────────────────────────────────────┤
│   NOWY                 NOSZONY         │
│   Pazur Zimy           Kieł Krwi       │
│   Legendary +0         Legendary +14   │
│                                        │
│   Atak      412  ▲     Atak      340   │
│   Kryt     6,0%  ▬     Kryt     6,0%   │
│   Krwawienie  —  ▼     Krwawienie 8%   │
│   Gniazda   2/3  ▲     Gniazda   1/3   │
├────────────────────────────────────────┤
│      [ ZAŁÓŻ ]        [ ZOSTAW ]       │
└────────────────────────────────────────┘
```

Trzy rzeczy, które ten ekran musi robić dobrze:

- **Power odpowiada na pytanie w pół sekundy.** Strzałki odpowiadają na pytanie „ale dlaczego".
- **Plusy i kryształy muszą być widoczne w porównaniu.** Surowo lepszy przedmiot z +0 bywa gorszy od gorszego z +14. Gracz, który tego nie zobaczy, wyrzuci swój miesiąc pracy.
- **Nigdy nie zakładaj automatycznie.** W grze o buildach automatyczne zakładanie niszczy zamiar gracza.

---

## 8. MOMENT LOOTU

Zatwierdzone: **pełna karta z porównaniem + wpis w logu lootu + ogłoszenie na czacie.**

To emocjonalny szczyt gry, zdarza się może raz dziennie. W grze bez animacji cały ciężar niesie **układ i kolor**.

`PROPOZYCJA` Rozróżnienie zależne od tego, gdzie jest gracz:

| Sytuacja | Zachowanie |
|---|---|
| Gracz patrzy na walkę | Karta przedmiotu wchodzi na wierzch. Walka czeka. |
| Walka jest w tle | **Nic nie wyskakuje.** Pasek walki zmienia kolor na kolor rzadkości i pokazuje nazwę. Karta czeka, aż gracz dotknie. |

Wyrywanie gracza z wioski do pełnoekranowego popupu jest irytujące i uczy go zamykać popupy bez czytania — a wtedy szczyt emocjonalny zamienia się w przeszkodę.

Zwykłe dropy **nigdy** nie przerywają. Lecą do logu.

---

## 9. KOLORY RZADKOŚCI

Zatwierdzone.

```
Common      szary
Uncommon    zielony
Unique      niebieski
Heroic      fioletowy
Legendary   pomarańczowy
Mystic      czerwony
God         złoty
```

**Sam kolor nie wystarczy przy siedmiu poziomach.** Dwa powody:

- Pomarańczowy i czerwony obok siebie w gęstym plecaku na telefonie to zgadywanka.
- Około 8% mężczyzn nie rozróżnia pewnie czerwieni od zieleni. Dla nich Common i Uncommon to jedna para, Legendary i Mystic druga.

`PROPOZYCJA` Kolor niesie rzadkość, **ramka niesie ligę**: bez ramki (Common–Unique), ramka prosta (Heroic–Legendary), ramka zdobiona z rogami (Mystic–God). Trzy ramki zamiast siedmiu — tanio w produkcji, czytelne przy każdym wzroku i rozpoznawalne z odległości.

---

## 10. POWIADOMIENIA

Zatwierdzone: **gracz sam wybiera, o czym chce wiedzieć.** Ekran ustawień z listą przełączników.

`PROPOZYCJA` Domyślnie włączone tylko te, które gracz traci bezpowrotnie:

```
✅ World Boss zaczyna się za 15 minut
✅ Walka skończona
✅ Wypadł przedmiot Legendary lub wyżej
✅ Heros gotowy
✅ Tytan gotowy

☐ Budynek w wiosce ukończony
☐ Najemnicy wrócili z wyprawy
☐ Splądrowano wioskę — ile surowców
☐ Ktoś przebił Twój wynik w rankingu
```

Zasada, która chroni obietnicę „bez morza czerwonych kropek": **kropka pojawia się tylko tam, gdzie jest coś do odebrania albo decyzja do podjęcia.** Nigdy za „jest tu nowa treść".

---

## 11. EKRANY DO ZAPROJEKTOWANIA

Nieprzerobione. Każdy wymaga osobnej rundy.

Wioska · Drużyna (pet, sojusznik, Bożek) · Mapa kampanii z rozgałęzieniami · Kowal i ulepszanie · Skille i księgi · Najemnicy i wyprawy · World Boss w trakcie · Rankingi · Czat · Wybór frakcji i klasy · Ustawienia

---

## 12. ZASADY PROJEKTOWE

**Robimy:**

- Ciemne tło, żeby kolory rzadkości niosły informację.
- Stan walki widoczny zawsze, na każdym ekranie.
- Odbieranie nagród przed pokazywaniem zadań.
- Liczbę zbiorczą na wierzchu, szczegóły pod spodem.
- Kolor plus kształt tam, gdzie kolor niesie znaczenie.
- Powiadomienia, które gracz sam włącza.

**Nie robimy:**

- Popupów przerywających grę, gdy gracz jest gdzie indziej.
- Czerwonych kropek za „nowa treść".
- Automatycznego zakładania ekwipunku.
- Ozdobnych ramek kosztem czytelności liczb.
- Migających świateł, neonu i kasynowej fanfary.
- Interfejsu z komputera zmniejszonego do telefonu.

---

## 13. PLATFORMA

- Docelowo **Android i iOS**. Interfejs projektowany od razu pod oba.
- Faza testowa: **plik APK bezpośrednio**, bez sklepu. W praktyce Android — iOS nie przyjmuje plików spoza sklepu.
- Serwer na czas testów **lokalnie na laptopie projektanta**.

Uwaga do fazy testowej: symulacja walki jest serwerowa, więc gra żyje tylko wtedy, gdy laptop działa i jest osiągalny. Przy dwóch osobach to wystarcza. World Boss w oknie 16:00–22:00 wymaga, żeby maszyna wtedy chodziła.

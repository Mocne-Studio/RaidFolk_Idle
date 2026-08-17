# RAIDFOLK_IDLE — GAME VISION

Wersja 0.2 · dokument wizji, nie specyfikacja techniczna
Zapis decyzji: `RAIDFOLK_IDLE_PRODUCT_DISCOVERY.md` · interfejs: `RAIDFOLK_IDLE_UI_UX_VISION.md` · makieta: `makieta_ui.html`

`PROPOZYCJA` = pomysł Claude, czeka na decyzję. `OTWARTE` = nie wiemy.

**Zmiany w 0.2:** usunięto Bożka i wioskę · dodano Skill Hunting · drużyna 1 + 3 + 1 · nowa nawigacja · bank kontowy i wiele postaci.

---

## 1. CZYM JEST TA GRA

**Mobilne, klikane RPG z prawdziwym grindem.**
Itemizacja w duchu Margonema. Skille w duchu RuneScape. Format podania jak RealmIdle.

Jesteś jednym bohaterem. Idziesz kampanią, zatrzymujesz się tam, gdzie chcesz, i polujesz na sprzęt. Walka jest symulacją matematyczną, więc może się toczyć w tle, gdy Ty grzebiesz w ekwipunku albo kopiesz rudę. Codziennie od 16:00 do 22:00 cały serwer bije jednego bossa.

### Zdanie, którym gracz to opisuje

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
- Nie ma kasynowego UI: migających świateł, popupów, morza czerwonych kropek.
- Nie ma progresji „lvl 10 → miecz +10, lvl 20 → miecz +20".
- Nie ma wspólnych map z walką o respy mobów. Farmienie jest prywatne.
- Nie jest klasycznym idle. Gra chce Twojej obecności i za nią płaci.

---

## 3. NAWIGACJA — PIĘĆ ZAKŁADEK

| Zakładka | Co zawiera |
|---|---|
| **PRZYGODA** | Kampania · Dungeony · World Boss · Skill Hunting |
| **DRUŻYNA** | 5 jednostek · drzewka · pozycje · skille · rozkazy |
| **EKWIPUNEK** | Plecak · **Bank** · ulepszanie · porównanie · przepalanie · przekuwanie |
| **LOG BOOK** | Kolekcje · bestiariusz · zadania dzienne · osiągnięcia |
| **KONTO** | Ustawienia · powiadomienia · blokada expa |

`PROPOZYCJA` Czat jako ikona w nagłówku, wysuwana szuflada. Nie ma dla niego zakładki.
`PROPOZYCJA` Ranking mieszka wewnątrz World Bossa — to jedyna treść rankingowana.

---

## 4. WALKA

- Walka jest **czystą symulacją matematyczną**. Bez fizyki, bez pozycjonowania w czasie rzeczywistym.
- **Attack speed steruje częstotliwością ataków.** Kto szybszy, ten bije częściej.
- Efekty: obrażenia, stun, trucizna, magia.
- Gracz wybiera: **ręcznie co turę** albo **automatycznie z rotacją skilli ustawioną z góry**.
- Walkę można **przyspieszyć** albo **skipnąć**.
- **Walka toczy się na serwerze.** Zamknięcie aplikacji niczego nie psuje, powiadomienie przychodzi po zakończeniu.

`OTWARTE` Ilu przeciwników stoi naprzeciw pięcioosobowej drużyny. Makieta zakłada 5 na 5.

### Walka jako proces w tle

Elity II mają **dużo HP i długie walki — celowo**. Gracz minimalizuje walkę, przechodzi do innych ekranów, a na dole zostaje pasek statusu. Wraca, żeby się uleczyć.

**Walka nie jest oknem modalnym. Jest procesem, który idzie z graczem przez całą aplikację.**

### Leczenie

Ręcznie w swojej turze albo automatycznie. **Każde kolejne użycie w tej samej walce leczy o 10% słabiej.**

- Długa walka ma naturalny sufit.
- Gracz aktywny wygrywa, ale pasywny nie przegrywa. Automat leczy poprawnie i marnuje ładunki; kto trafia z timingiem, przechodzi dalej tym samym sprzętem.
- Walka staje się decyzją, nie czekaniem.

`OTWARTE` 10% liniowo (100/90/80…) czy mnożnie (100/90/81…).

---

## 5. DRUŻYNA — 1 + 3 + 1

| Slot | Kto | Ekwipunek | Drzewko |
|---|---|---|---|
| 1 | **Główna postać** | pełne 10 slotów | **własne, osobne** |
| 2–4 | **Trzech sojuszników** | EQ do założenia | **tylko od Legendary w górę** |
| 5 | **Pet** | własny rollowany item | **tak** |

**Drzewko tylko od Legendary w górę** to najlepsza rzecz w tym układzie. Legendarny sojusznik nie jest po prostu mocniejszy — odblokowuje **cały nowy system pod siebie**. To jest powód, żeby na niego polować, i sam z siebie tłumaczy, po co komu rzadkości.

Zakładka DRUŻYNA obsługuje: edycję drzewek · **ustawianie pozycji w szyku** · zmianę skilli · ogólne rozkazy.

Towarzysze mają **mnożnik liczony jako procent statystyk gracza**, który da się podnosić. Żaden towarzysz nie staje się śmieciem przy zmianie przedziału.

### Pet

- Zdobywany z **dropu ze świata**.
- Rozwój: **duplikaty** + karmienie.
- **Własny rollowany item** z efektem przypisanym do tego peta.
- Ma własne drzewko.

`OTWARTE` Czym karmi się peta, skoro wioska zniknęła. Kandydat: zielarstwo albo łup z walk.

---

## 6. POSTAĆ I PROGRESJA

### Onboarding

1. **Tutorial do poziomu 10.**
2. **Wybór frakcji** — z wypisanymi bonusami.
3. **Wybór klasy** — przez kliknięcie kwadratu z bronią.

Ekran wyboru klasy pokazuje: co robi, ile daje, **jak liczy obrażenia, z czym się skaluje**, i jakie drogi rozwoju otwiera dalej.

### Klasy

| Rola | V1 | Później |
|---|---|---|
| DPS | **Szermierz** | Łucznik |
| TANK | **Paladyn** | Rycerz |
| MAG | **Mag Światła** | Magia Żywiołów |
| HEAL | **Kapłan** | Bard |

### Frakcje

**Ludzie · Demony · Elfy · Krasnoludy** — bonusy na **nieporównywalnych osiach**, nie ma frakcji „najlepszej".

| Frakcja | Bonus |
|---|---|
| **Ludzie** | szybszy exp |
| **Demony** | większe obrażenia, mniej HP |
| **Elfy** | lepsze rolle afiksów, większa szansa na rzadki drop |
| **Krasnoludy** | **mniejsze ryzyko spalenia broni powyżej +10** |

**Synergia frakcyjna:** frakcję wybierasz główną postacią. Dodatkowe bonusy dla całej drużyny dostajesz, gdy **sojusznicy i pet są z tej samej frakcji**.

To jest cichy silnik kolekcjonowania. Na każdym slocie masz decyzję: mocniejszy towarzysz czy ten, który domyka synergię.

**Frakcji nie da się zmienić.**

`OTWARTE` Bonusy frakcyjne dotyczyły też wioski, która zniknęła. Wymagają przepisania.

### Poziomy

- Zakres **1–500**. Statystyki rosną co poziom.
- **Awans klasy co 100 poziomów** (Awaken). Pięć progów.
- Co kilka poziomów odblokowuje się nowy skill.
- Z dropu lecą **księgi** — łączysz je z przedmiotami i uczysz się skilla, którego można **rerollować**. Istnieją **przepisy**.

---

## 7. PRZEDZIAŁY POZIOMÓW I WIELE POSTACI

**To jest oś całej gry po zmianach.**

Content dzieli się na przedziały pokrywające się z progami klasy: **1–99, 100–199, 200–299, 300–399, 400–500**. Elity II, Herosi, Tytani, dungeony i **world bossy** istnieją osobno dla każdego przedziału.

**Gracz może w dowolnym momencie wyłączyć zdobywanie doświadczenia. Za darmo.**

### Do czterech postaci na koncie, wspólny bank

Gracz prowadzi **do 4 postaci**, każdą zaparkowaną na innym poziomie, każdą w innym przedziale world bossa i dungeonów. **Bank jest kontowy, nie postaciowy.**

Konsekwencje, i są duże:

- **Blokada expa przestaje być opcją dla dziwaków i staje się główną strategią.** Parkujesz postać na 99, bo tam jest jej boss i jej dungeon.
- **Dopracowanie sprzętu na etap ma wreszcie cel.** Nie wyrastasz z niego za tydzień, bo ta postać już nigdzie nie idzie. To jest odpowiedź na pytanie „po co ulepszać, skoro za chwilę zmienię".
- **Stary sprzęt nie umiera.** Legendary z przedziału 1–99 wędruje przez bank do postaci zaparkowanej na 99, zamiast trafić do przepalenia.
- **Cztery klasy zyskują sens na jednym koncie.** Rankingi world bossa są trzy — tank, heal, DPS — więc możesz obsadzić wszystkie trzy.

`OTWARTE` Ile postaci startowo, ile odblokowywanych i za co.
`OTWARTE` Czy bank ma limit miejsca i czy złoto i kryształy też są wspólne.

### Ryzyko, które trzeba zaadresować

**Cztery postacie mogą zamienić grę w pracę.** Jeśli każda ma własnego Herosa dziennie, własne zadania dzienne i własne wejście na bossa, dzienna obsługa rośnie czterokrotnie. Gracz przestaje grać i zaczyna odrabiać.

`PROPOZYCJA` Zadania dzienne i Log Book **kontowe, nie postaciowe**. Postać na parkingu ma niski koszt utrzymania — wchodzi na bossa i wychodzi.

---

## 8. PRZYGODA — CO SIĘ ROBI

### Kampania

Etapy numerowane z rozgałęzieniami: `1-1`, `1-2`, `1-3`… **Trzy poziomy trudności** na każdy etap, powtarzalne, z osobnymi **nagrodami za pierwsze przejście**.

- **Co 5 etapów — Elita.**
- **Co 10 etapów — Elita II.**

**Miejsce farmienia to etap, na którym stoisz.** W arenie jest kilka mobów do wyboru.

### Poziomy przeciwnika

| Poziom | Dostępność | Charakter |
|---|---|---|
| Zwykłe moby | bez limitu | szybkie walki |
| Elity | bez limitu | co 5 etapów |
| **Elity II** | bez limitu | **dużo HP, długa walka, gra się nią w tle** |
| **Herosi** | **raz dziennie** | **loot gwarantowany** |
| **Tytani** | **raz w tygodniu** | najwyższy loot |

### Dungeony

**8 osób, asynchronicznie, z przedziałami poziomów.** Zapisujesz drużynę do kolejki; przy komplecie serwer liczy symulację, wszyscy dostają log, nagrodę i powiadomienie. Nagroda jednakowa dla wszystkich uczestników.

`OTWARTE` Jak 8 graczy mieści się w walce mającej 5 pól.

### World Boss

- **Codziennie, w oknie 16:00–22:00.**
- **Boss nigdy nie ginie.** Można go lać sześć godzin albo godzinę.
- **Osobny boss dla każdego przedziału poziomów.**
- **Trzy osobne rankingi: tank · heal · DPS.**
- Nagrody: **progi obrażeń dla wszystkich + dodatkowa pula dla top 100.**

To nie wyścig o zabicie, tylko **wyścig o obrażenia**. Spóźnić się nie da, nikt nie wychodzi z pustymi rękami, a godziny pracy nie wykluczają gracza.

### Skill Hunting

Model RuneScape: **górnictwo · kowalstwo · drwalstwo · zielarstwo · kradzież kieszonkowa** i kolejne.

To zastępuje wioskę jako źródło surowców do ulepszania.

`PROPOZYCJA` **Skille działają offline.** Po usunięciu wioski nic już nie działa przy zamkniętej aplikacji, a gra nazywa się `RaidFolk_idle`. Ustawiasz „kop żelazo", zamykasz aplikację, wracasz do rudy i doświadczenia. To jest jedyny kandydat na warstwę idle i najbardziej naturalny.

`OTWARTE` Ile skilli w V1. Pięć skilli to pięć pętli produkcyjnych plus zastosowania — realnie większy system niż usunięta wioska.

---

## 9. PRZEDMIOTY

### 10 slotów · siedem rzadkości, każda z własnym źródłem

| Rzadkość | Skąd leci |
|---|---|
| Common · Uncommon · Unique | zwykłe moby |
| Heroic | Elity II |
| Legendary | Herosi |
| Mystic · God | Tytani i world boss |

### Ulepszanie

- Poziomy **+1 do +15**.
- **Od +10 bez kamienia ochronnego przedmiot może spłonąć.** Dotyczy wszystkiego, łącznie z God.
- U **kowala** losuje się **afiksy i prefiksy**.
- **Wyższy tier = więcej opcji i lepsza jakość afiksów.**
- **Pule afiksów zależą od slotu.**
- Na broniach legendarnych plusy dają **mocne efekty**, nie tylko liczby.

### Przekucie

U kowala, za złoto: **odzyskujesz włożone kryształy**, które wchodzą w kolejny przedmiot **tego samego tieru**. Kryształy giną tylko wtedy, gdy sam je spalisz.

### Kamienie ochronne to główne pokrętło trudności całej gry

Łatwo dostępne → spalenie jest karą za pośpiech. Rzadkie → nikt nie próbuje powyżej +10 i najciekawszy zakres systemu umiera.

---

## 10. MONETYZACJA

**V1: wyłącznie kosmetyka i wygoda.** Zero wpływu na moc.
**Później: battle pass** bez unikalnej mocy.
**Odrzucone: płatne rolle wpływające na moc.**

Cała gra stoi na wieczornym rankingu. Ranking, który da się kupić, przestaje być powodem, żeby expić.

---

## 11. PLATFORMA

- Docelowo **Android i iOS**, interfejs projektowany pod oba.
- Faza testowa: **APK bezpośrednio**, bez sklepu.
- Serwer testowy **lokalnie na laptopie**.

Symulacja walki jest serwerowa, więc „aplikacja do pobrania" to w praktyce **aplikacja plus serwer**, od pierwszego dnia.

---

## 12. ZAKRES V1

1. **Kampania** — etapy, 3 trudności, Elity co 5, Elity II co 10, Herosi, Tytani
2. **Walka** — 5 jednostek, symulacja serwerowa, rotacja skilli, leczenie −10%
3. **Drużyna** — główna postać + 3 sojuszników + pet, drzewka od Legendary
4. **Itemy** — 10 slotów, 7 rzadkości, ulepszanie, przekucie, bank
5. **World boss** — okno 16–22, nieśmiertelny, 3 rankingi, per przedział

**V1.x:** dungeony · gildie · handel · czat gildyjny · Skill Hunting w pełnym zakresie · wiele postaci
**Później:** sezony · endgame powyżej 500 · druga czwórka klas

`OTWARTE` Ile ze Skill Huntingu wchodzi do V1. Jeśli skille mają być warstwą offline, część musi być od startu.

---

## 13. OTWARTE RYZYKA

| # | Ryzyko | Stan |
|---|---|---|
| R1 | **Kamienie ochronne** — za rzadkie zabijają zakres +10…+15, za częste zabijają napięcie | do wyważenia |
| R3 | **Spalić może się wszystko, łącznie z God.** Decyzja świadoma, ciężar spada na R1 | zaakceptowane |
| R5 | **Dungeon 8 osób vs walka 5-polowa** | do rozstrzygnięcia |
| R6 | **Język gry** — PL czy EN. Rynek PL to ok. 5% potencjału, ale to grupa docelowa | nierozstrzygnięte |
| R7 | **Backend od pierwszego dnia** | zaakceptowane |
| **R9** | **Usunięcie wioski zabrało całą warstwę offline.** Gra nazywa się `idle` i nie ma nic, co działa przy zamkniętej aplikacji | **blokujące — patrz propozycja Skill Hunting** |
| **R10** | **Skill Hunting jest większy niż usunięta wioska.** Pięć skilli to pięć pętli produkcyjnych i ich zastosowania | do oszacowania |
| **R11** | **Cztery postacie × dzienna obsługa = praca.** Jeśli każda ma własne dailies i własnego Herosa, gracz odrabia zamiast grać | propozycja: dailies kontowe |

---

## 14. CZEGO JESZCZE NIE PROJEKTOWALIŚMY

Ekonomia i sinki złota · zastosowania każdego skilla · sezony i endgame powyżej 500 · zawartość drzewek · ekrany: drzewko, kowal, czat, wybór frakcji i klasy · kierunek wizualny poza paletą

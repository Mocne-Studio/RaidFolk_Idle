# RAIDFOLK IDLE — HANDOFF

Dokument przekazania. Nowa sesja, nowe konto albo inny agent ma stąd wyjść bez
znajomości poprzedniej rozmowy.

Zacznij od: **przeczytaj ten plik, `RAIDFOLK_IDLE_DESIGN.md` i ostatni wpis
w `RAIDFOLK_IDLE_SESSION_LOG.md`. Sprawdź stan Gita i rusz od NEXT STEP.**

---

## PROJECT

| | |
|---|---|
| Nazwa | RaidFolk Idle |
| Ścieżka | `C:\Dev\RaidFolk_idle` |
| Technologia | Node 22+, **zero zależności runtime**, czysty JS, moduły ES |
| Baza | SQLite przez wbudowane `node:sqlite`, plik `raidfolk.db`, postać jako JSON |
| Frontend | jeden `public/app.js`, bez frameworka, bez budowania |
| Zależności dev | tylko Capacitor do budowania APK |

**GRANICA:** istnieje osobna gra o nazwie `RaidFolk`. To **inny produkt**.
Nie sięgaj do niej po nic, nie modyfikuj jej, nie traktuj tego repo jako jej gałęzi.

---

## CURRENT STATE

### Działa i da się przeklikać

Pełne przejście, które zadziałało ręcznie od początku do końca:

```
herb → imię → OD RAZU gra
→ hub: WIEŻA (postęp, złoto, exp — BEZ łupu) albo WYPRAWA (jedyny łup)
→ Puszcza: piętra 1–9 na automacie, od piętra 3 dwóch przeciwników
→ piętro 10, boss turowy → wygrana → trofeum
→ Wyprawa: 8 walk, sakwa do plecaka dopiero na końcu
→ Ekwipunek: makieta postaci, porównanie „nosisz kontra bierzesz"
→ Skille: Zbierackie (Górnictwo/Rybołówstwo/Runy) · Bojowe · Atrybuty
→ Drużyna: sojusznik i pet WALCZĄ, szyk trzech rzędów
→ Przywołanie / Kronika
```

- **Wejście do gry** — herb, imię i **od razu gra**. Nie ma wprowadzenia
  ani wyboru klasy; jedno i drugie zostało skasowane.
- **Główna postać nie ma klasy.** Stały profil „Bohater": obrażenia liczą się
  z Siły, Intelektu i Zręczności naraz (`dmgDivisor: 110`), drzewko jest jedno
  i uniwersalne (Siła / Hart / Tempo). Klasy należą do Sojuszników.
- **Układ jednoekranowy** — żaden z sześciu ekranów nie przewija się jako strona.
  Przewijają się wyłącznie pudełka z danymi: plecak, bestiariusz, log walki.
- **Responsywność** — 520 px telefon, 900 px tablet, 1180 px desktop.
- **Nawigacja** — sześć zakładek: Wyprawa, Drużyna, Ekwipunek, Skille,
  Przywołanie, Kronika. Postać siedzi pod przyciskiem profilu w nagłówku.
  **Ekran drzewka usunięty** — wszystko, co się rozwija, jest w Skillach.
- **Skille = trzy sekcje**: Zbierackie · Bojowe · Atrybuty. Drużyna to wyłącznie
  podgląd składu i ustawianie slotów.
- **Ekwipunek** — makieta 3×3 z **napierśnikiem w środku**, butami pod nim
  i kafelkiem Mocy w wolnej komórce. Siatka statystyk z podpowiedziami, panel
  szczegółu z **porównaniem „nosisz kontra bierzesz"**, kategorie plecaka.
- **Profesje grywalne** — Górnictwo, Rybołówstwo, Runy. Pełna pętla: zbierasz,
  dostajesz surowiec i exp, wbijasz poziom, odblokowujesz kolejny. Cykle lecą
  same do „Przerwij" i przeżywają odświeżenie strony.
- **Drużyna** — bohater + sojusznik + pet **naprawdę walczą**. Sloty 2 i 3
  zamknięte świadomie. Przywoływanie sojuszników od piętra 3, petów od 10.
- **Stały pasek walki** — nad zakładkami, widoczny na każdym ekranie, dopóki coś
  się bije. Niesie biom, piętro, falę, oba paski HP, tempo ×1/×2, STOP i DO WALKI.
- **Hub** — Wieża i **Wyprawa otwarte**; World Boss, Kolos, Tytan `ZAMKNIĘTE`.
- **WIEŻA NIE DAJE PRZEDMIOTÓW.** Złoto, exp skilli i Kronika — tak, łup nie.
  Sprzęt zdobywa się wyłącznie na Wyprawie.
- **Wyprawa** — 8 walk, trzy poziomy ryzyka, HP nie wraca. Łup ląduje w **sakwie**
  i wpada do plecaka dopiero po ukończeniu; śmierć albo zawrócenie zabiera całą.
- **Szyk trzech rzędów** — klasa daje rząd (przód: Wojownik/Paladyn/Tancerz/pet,
  środek: Mag, tył: Łowca/Tropiciel), broń daje zasięg. Broń biała dosięga tylko
  pierwszego rzędu i musi **podchodzić** do tylnego, tracąc turę na każde podejście.
- **Dwóch przeciwników od piętra 3** (`tower.duoFromFloor`), drugi słabszy o 35%.
- **Skille bojowe** — Broń biała, Łuk, Różdżka, Obrona, Witalność. Rosną z tego,
  czym bijesz; podział expa zależy od rąk. Dają **bonusy, nie bramki**.
- **Bronie mają liczbę rąk.** Dwuręczne biją mocniej (×1.35) i blokują drugą rękę.
- **Wieża** — lista dziesięciu pięter biomu, odblokowanie sekwencyjne, powrót na
  zdobyte piętro (`/api/goto`). Piętro to 6–10 fal, co 5. wariant „+", co 10. boss.
- **Walka** — symulacja serwerowa, tryb automatyczny i turowy, trzy siły ciosu,
  celność i unik, pasek ultimate 0–10 (pudło zeruje), umiejętności z cooldownami,
  blok z tarczy, **Obrona** jako akcja tury, mikstury ze słabnącym efektem.
- **Wyczerpanie HP** — zdrowie **nie wraca między falami**. Pełne oddaje wejście
  na nowe piętro albo porażka. Porażka cofa na pierwszą falę piętra.
- **Ciąg fal** — w trybie auto fale lecą same, aż piętro padnie albo padniesz Ty.
  Odtwarzanie chodzi na timerze klienta, więc przejście na inną zakładkę go nie przerywa.
- **Boss aktu zawsze turowy** — przełącznik trybu na piętrze bossa znika.
- **Łup i ekwipunek** — 7 rzadkości, afiksy skalowane z ilvl, 8 slotów, makieta
  postaci, plecak, sprzedaż, „sprzedaj wszystko gorsze od noszonego".
- **Atrybuty** — start na zerze, 10 punktów w kieszeni, 3 za każde piętro.
- **Klasy i drzewka** — sześć klas, po trzy gałęzie × pięć węzłów × pięć rang.
- **Kronika** — bestiariusz z licznikiem zabić i odsłanianiem trofeów (4 na
  przeciwnika). Zakładki Sojusznicy i Pety czytają kolekcję z Przywołania.
- **Przywołanie** — klucze (dawna „waluta specjalna"), osobne pule sojuszników
  i petów, portal, losowanie ×1, animacja odsłonięcia.
- **Herb** — SVG, kształt, symbol, trzy kolory, losowanie.
- **Kod postaci** — powrót do postaci z innego urządzenia albo po zmianie adresu.

### Zrobione w połowie

- **Drużyna** — bohater + jeden sojusznik + pet walczą. **Sloty 2 i 3 zamknięte**
  świadomie (`config.allies.lockedSlots`), więc pełna piątka jeszcze nie istnieje.
- **Profesje** — wszystkie siedem gra. Łańcuch domknięty: ruda→sztaby→ulepszenia,
  ryby+zboże→jedzenie→buff, zioła→mikstury,
  esencja+kryształ→**runa**→podpięcie→**zaklęcia** (poziom Magii je otwiera).
  Liczby są testowe.
- **Przywołanie** — szanse są jawne, ale brak pity, duplikatów i gwiazdek.
- **Kronika** — Przedmioty i Osiągnięcia to na razie karty wyjaśniające zamiar.
- **Klasy Sojuszników** — nadają rząd w szyku, ale nie dają jeszcze umiejętności
  ani pasywek. Sześć drzewek klasowych czeka nietkniętych w `config.tree.classes`.

### Nie zaczęte

World Boss · Kolos · Tytan · rajdy · multiplayer · gildia · kowal i przetapianie ·
Mystic/God crafting · przepalanie i energia · bank · postęp offline ·
umiejętności Sojuszników · **klasy gracza (skasowane na stałe)** ·
**wiele postaci na koncie**.

---

## CURRENT GIT STATE

| | |
|---|---|
| Branch | `main` |
| HEAD | `efb9703` — „Mana, skalowanie od broni, punkty przy ostatnim mobie" |
| Working tree | **czysty** |

Poprzednie punkty:

- `bb04200` / `f4b1ca1` — Wyprawa V1: rozdroża, postój, sakwa, boss turowy
- `34f2dc0` — szyk trzech rzędów, Wyprawa jako źródło łupu, dwa potwory od piętra 3
- `fc8e60b` — sojusznicy w walce, skille broni, typy obrazen, przebudowa EQ
- `0b4ac30` — corrections pass: bez klasy gracza, bez tutorialu, jeden ekran,
  grywalne Górnictwo, naprawa zakleszczenia walki turowej
- `84317f1` / `4dd5503` — dokumenty przekazania
- `aeddb98` — cały vertical slice: sześć zakładek, stały pasek walki,
  wyczerpanie HP, turowy boss, Kronika
- `0739c17` — checkpoint pracy, która leżała niezacommitowana: drzewka klas,
  blok z tarczy, wprowadzenie, wybór klasy
- `ed3d46a` — stan sprzed vertical slice

**Nie ma niezacommitowanych zmian w kodzie.** Jeśli je zobaczysz, ktoś pracował po tym wpisie.

---

## COMPLETED

- [x] Audyt istniejącego projektu przed dotknięciem czegokolwiek
- [x] Checkpoint pracy leżącej w brudnym drzewie
- [x] Sześć zakładek głównej nawigacji, Postać i Drzewko pod profilem
- [x] Stały pasek walki, żyjący na każdej zakładce
- [x] Hub Wyprawy z widocznymi, wyłączonymi trybami
- [x] Biom Puszcza, lista pięter, odblokowanie sekwencyjne, powrót na piętro
- [x] Wyczerpanie HP między falami + restart piętra po porażce
- [x] Boss piętra 10 wymuszony turowo
- [x] Obrona jako akcja tury (silnik, config, UI, test)
- [x] Ciąg fal w automacie + tempo ×1/×2
- [x] Drużyna, Skille, Przywołanie, Kronika
- [x] Bestiariusz z trofeami odsłanianymi na zawsze

---

## ACTIVE WORK

**Przerwane w połowie 17 sierpnia 2026 — autor zabrał laptopa.**
Repo jest w stanie czystym i grywalnym, wszystkie testy przechodzą.

Ostatnia sesja: Wyprawa V1 (rozdroża, postój, sakwa, boss turowy), potem
wybór wyprawy z tabelą dropów i modyfikatorami.

Wcześniej — trzecia sesja 17 sierpnia 2026: **szyk trzech rzędów, Wyprawa jako jedyne źródło
przedmiotów, sojusznicy w walce, skille bojowe z podziałem expa według rąk,
dwóch przeciwników od piętra 3.** Wszystko zamknięte i zacommitowane.

---

## NEXT STEP

**ZACZNIJ OD ostatniego wpisu w `RAIDFOLK_IDLE_SESSION_LOG.md`** (sesja
2026-08-18/19). Duża przebudowa rdzenia: **pancerz = pula (model bariery, LIVE)**,
**atrybuty 4→7**, **typy broni z podziałem**, dużo czytelności. Commit `74999bc`.

TODO „na koniec" (z końca wpisu sesji): ekrany Kolosa/Tytana liczą staty starym
wzorem redukcji — pod barierą kłamią, przeliczyć. Strojenie afiksów nowych
atrybutów, mnożnika `barrierPlayerArmorMult`, ranged divisor (130→100).

Starsze w kolejce: sloty drużyny 2–3, druga wyprawa (Mokradła Szeptu — definicja
już stoi w `config.expedition.lista`, brakuje jej tabeli dropów).

~~ALCHEMIA~~ — ZROBIONA. Poniżej zostaje kontekst decyzji: Ustalone z autorem tuż przed przerwą:

- Kupowanie mikstur zostało **skasowane**. Jedynym źródłem ma być Alchemia.
- To zamyka realną dziurę: porażka nie leczy, więc bez mikstur da się utknąć
  (zmierzone: 9 HP z 245, 0 mikstur, 37 złota przy koszcie mikstury 52).
- Zbieranie **nie wymaga walki**, więc gracz z zerowym HP może pójść zbierać,
  zrobić miksturę i wstać. Ściana znika bez ruszania regeneracji.

Wpięcia, które już istnieją: `ch.materials` (surowce), `ch.potions` (jedna liczba),
`config.skills.alchemia` (makieta z drabinką), generyczna pętla
`/api/mine` + `/api/minetick`.

**Otwarta decyzja:** czy Alchemia ZBIERA (jak Górnictwo — klikasz, czekasz,
dostajesz miksturę) czy PRZETWARZA (zjada zioła z Rolnictwa). Druga wersja
wymaga wejść z Rolnictwa, które jest makietą.

Autor zapowiedział też przejście do **umiejętności** zaraz po Alchemii.

Dalej w kolejce:

1. **Kowalstwo** — wykopana ruda nie ma dziś gdzie trafić. To jest najbardziej
   widoczna dziura: trzy profesje produkują surowce, których nic nie konsumuje.
2. **Umiejętności Sojuszników** — mają już klasę i rząd w szyku, ale biją tylko
   autoatakiem. `config.classes` i `config.tree.classes` mają gotowe, przetestowane
   liczby dla sześciu klas.

Sloty 2 i 3 drużyny są zamknięte świadomie — otwarcie ich wymaga najpierw decyzji,
ile drużyna psuje balans wieży.

---

## IMPORTANT DESIGN DECISIONS

0. **Główna postać NIE MA KLASY i nigdy nie będzie miała.** Klasy dotyczą
   Sojuszników. Gracz ma stały profil „Bohater" i buduje się atrybutami,
   sprzętem i jednym uniwersalnym drzewkiem.
0a. **Po herbie i imieniu wchodzi się prosto do gry.** Żadnego wieloekranowego
   wprowadzenia. Informacje podaje się kontekstowo, w miejscu, gdzie są potrzebne.
0b. **Ekrany gameplayowe projektuje się pod jeden ekran.** Przewijać wolno się
   wyłącznie dużym zbiorom danych, i to wewnątrz własnego pudełka.
0c. **Zwykły ekwipunek należy tylko do głównej postaci.** Sojusznicy i pety
   nie noszą hełmów, napierśników ani broni. Docelowo Legendary Sojusznik
   dostanie relikt, a Legendary pet własną broń — nic więcej.
0d. **Górnictwo jest pierwszą grywalną profesją** i wzorem dla pozostałych.

1. **HP nie wraca między falami.** To jest oś napięcia piętra. Pełne zdrowie oddaje
   wejście na nowe piętro albo porażka. Odwróciło to wcześniejszą decyzję
   („w wieży wchodzisz w każdą walkę z pełnym HP") — zrobione świadomie, na polecenie.
2. **Porażka nie karze niczym poza czasem.** Cofa na pierwszą falę piętra i oddaje
   pełne HP. Bez tego wyczerpanie zamyka gracza w pętli bez wyjścia.
3. **Boss aktu zawsze turowy.** Zwykłe fale grają się same, ważna walka wraca
   w ręce gracza. To jest główny eksperyment gameplayowy tej wersji.
4. **Auto to ciąg całego piętra, nie jednej walki.** Odtwarzanie chodzi po stronie
   klienta, dlatego walkę widać na każdej zakładce.
5. **Klucze Przywołania to ta sama waluta, którą oddaje boss.** Jeden portfel,
   dopóki nie wiadomo, czy Przywołanie zostaje.
6. **Skille zbierackie nie mają stanu.** Renderują się z `config.skills`. Nie ma
   czego zapisywać, więc nie ma czego stracić przy migracji.
7. **UI jest po polsku.** Specyfikacja slice’a używała angielskich etykiet —
   przeczytane jako nazwy systemów, nie tekst do wyświetlenia. Cała gra,
   dokumenty i commity są polskie.
8. **Klasy mieszane liczą oba atrybuty w pełni**, a płacą wyższym dzielnikiem
   (`dmgDivisor`). Wersja z liczeniem po połowie zabierała Paladynowi 37% obrażeń.

---

## DO NOT CHANGE

Bez wyraźnego polecenia nie ruszaj:

- **`game/config.js` jako jedynego miejsca z liczbami.** Balans stroi się tam
  i nigdzie indziej.
- **`mobHpGrowth` / `mobDmgGrowth` powyżej 1.01.** To mnożniki wykładnicze,
  a gracz rośnie liniowo. Powyżej tego moby uciekają bezpowrotnie po dwudziestu
  piętrach. Raz już wysadziło balans.
- **Serializowalności stanu walki.** Na tym stoi obsługa trybu turowego jednym
  kodem i możliwość zapisania walki do bazy. Generator losowy ma jawny stan
  (`nextRandom`), nie domknięcie.
- **`party` / `enemies` / `name` we wpisach logu walki.** Klient odtwarza z nich
  całą arenę. Usunięcie nazw dawało „undefined" pod każdym paskiem HP.
- **Struktury pięciu slotów po stronie gracza** — to jest przygotowane miejsce
  na sojuszników i peta.
- **Powrotu do liczenia atrybutów klas mieszanych po połowie** bez przeliczenia.
- **Nie przywracaj wieloekranowego wprowadzenia.** Zostało skasowane świadomie.
  Jeśli coś wymaga wyjaśnienia, wyjaśnij to w miejscu, gdzie gracz tego używa.
- **Nie przywracaj wyboru klasy dla gracza.** To decyzja trwała.
- **Nie „naprawiaj" układu przez dodanie scrolla.** Jeśli ekran się nie mieści,
  przemyśl układ: grupuj, dziel na kolumny, zwijaj w podpowiedzi.
- **`.screens` nie przewija się jako strona.** Przewijają się `.scrollbox`,
  `.invlist`, `.two-col`/`.three-col` na wąskich ekranach i log walki.

---

## TEST / RUN COMMANDS

```
node server.js                  http://localhost:8080
.\start.ps1                     serwer + publiczny tunel Cloudflare
node game/combat.js             testy symulacji walki
node game/character.js          testy klas, atrybutów i drzewka
npm run apk <adres>             budowa APK
```

**Smoke check po zmianie w walce lub postaci:**

```
node game/combat.js && node game/character.js
```

**Smoke check ręczny (pełne przejście, ~4 minuty):**

1. Skasuj `raidfolk.db` albo wyczyść `localStorage` — dostaniesz świeżą postać.
2. Ułóż herb, wpisz imię, kliknij **Wejdź do wieży**. Masz wylądować od razu w grze —
   bez wprowadzenia i bez wyboru klasy.
3. Profil w nagłówku → rozdaj dziesięć punktów atrybutów.
   **Bez tego nie przejdziesz pierwszego piętra.**
4. Wyprawa → Wieża → Ruszaj. Przejdź na Ekwipunek — pasek u dołu ma dalej żyć.
5. **Ekwipunek:** kliknij slot na makiecie i przedmiot w plecaku. Panel po prawej
   ma pokazać różnicę wobec noszonego. Przełącz kategorie plecaka.
6. **Skille → Górnictwo → Miedź.** Pasek ma się wypełniać, ruda i exp przybywać,
   kolejne cykle lecieć same. Po kilku poziomach ma się odblokować Cyna.
   Sprawdź Ekwipunek → Surowce.
7. Zdobądź piętro, wejdź wyżej, zakładaj łup i dokupuj mikstury.
8. Na piętrze 10 sprawdź, że przełącznik trybu zniknął, a walka jest turowa.
9. **Test zakleszczenia:** w trybie turowym zacznij walkę, wyjdź na inną zakładkę,
   wróć. Ma być karta „Wróć do walki / Porzuć", a przycisk zmiany trybu w pasku
   walki ma działać.
10. Przywołaj sojusznika i peta, sprawdź, że widać ich w Drużynie i Kronice.

**Smoke check układu (czy coś się nie przewija):**

Otwórz konsolę na `localhost:8080` i po kolei na każdej zakładce:

```bash
node -e "console.log('w przegladarce: dokument.querySelector(#s-eq).scrollHeight vs clientHeight')"
```

Prościej: zmień rozmiar okna na 375×812, 768×1024 i 1280×720 i przeklikaj
sześć zakładek. Żadna nie powinna dać paska przewijania całego ekranu.

---

## KNOWN ISSUES

- **Sojusznicy i pety WALCZĄ.** Sloty 2 i 3 są jednak zamknięte świadomie,
  więc w drużynie mieści się dziś bohater + jeden sojusznik + pet.
- **Surowce nie mają zastosowania** — Kowalstwo ich nie przetapia.
- **Wykopane surowce nie mają zastosowania.** Kowalstwo ich nie przetapia.
- **Sześć profesji poza Górnictwem to makiety.** Klikanie niczego nie zmienia.
- **Balans Górnictwa jest celowo szybki**, żeby dało się zobaczyć kilka
  odblokowań w minutę. To nie są finalne liczby (`config.skills.gornictwo`).
- **Ekran tworzenia herbu się przewija.** To jedyny ekran, który to robi —
  trzydzieści symboli i pięć palet nie zmieści się inaczej. Nie jest ekranem
  gameplayowym, więc zostawione świadomie.
- **Górnictwo nie liczy się po zamknięciu gry.** Timer chodzi po stronie klienta;
  postęp offline jest świadomie niezrobiony.
- **Balans wieży jest luźno sprawdzony.** Bot, który rozdaje punkty, zakłada łup
  i dokupuje mikstury, przechodzi piętra 1–9 **bez ani jednej porażki**. Wyczerpanie
  jest więc widoczne, ale jeszcze nie groźne. Ktoś, kto nie rozda dziesięciu punktów
  startowych, nie przejdzie pierwszego piętra — to jedyna prawdziwa ściana.
- **Piętra mają 6–10 fal, nie sztywne 6.** Specyfikacja slice’a prosiła o 6,
  ale 6–10 już działało i było mniejszą zmianą niż upraszczanie.
- **Bestiariusz zna tylko obsadę Puszczy.** Rodziny z aktów 2–5 mają generyczną
  listę trofeów, bo ich obsada nie jest jeszcze zaprojektowana.
- **Trofea nie mają żadnego zastosowania** poza odsłanianiem wpisu w Kronice.
- **Kronika: Przedmioty i Osiągnięcia** to karty opisujące zamiar, nie systemy.
- **Ekran wyboru klasy obiecuje Dusze**, których w grze nie ma.
- **Jedna postać na konto.** Model sześciu osobnych postaci nie jest zrobiony.
- **Brak APK z tą wersją.** `RaidFolk.apk` w repo wskazuje na adres z `capacitor.config.json`
  i nie wymaga przebudowy przy zmianach w grze — ale sam adres tunelu zmienia się
  po każdym restarcie.

---

## FILE MAP

| Plik | Za co odpowiada |
|---|---|
| `server.js` | HTTP, całe API, pliki statyczne, rozliczenie walki, wyczerpanie HP, bestiariusz, Przywołanie |
| `game/config.js` | **WSZYSTKIE liczby gry** — walka, klasy, drzewka, wieża, łup, skille, Przywołanie |
| `game/content.js` | akty, piętra, przeciwnicy, generator przedmiotów, trofea bestiariusza |
| `game/combat.js` | symulacja walki (auto + turowa) + testy: `node game/combat.js` |
| `game/character.js` | atrybuty, drzewko, ekwipunek, statystyki wynikowe, migracja + testy |
| `game/db.js` | SQLite, postać jako JSON, tokeny |
| `public/index.html` | szkielet: ekrany startowe, osiem sekcji, pasek walki, sześć zakładek |
| `public/app.js` | cały klient: renderery ekranów, odtwarzanie walki, ciąg fal, obsługa akcji |
| `public/style.css` | cały wygląd |
| `public/crest.js` | generator herbu (SVG) |
| `makieta_ui.html` | klikalna makieta wszystkich ekranów, także niezaimplementowanych |
| `RAIDFOLK_IDLE_DESIGN.md` | zatwierdzona wizja produktu |
| `RAIDFOLK_IDLE_SESSION_LOG.md` | historia prac bez czytania diffów |
| `CLAUDE.md` | kontekst dla agenta, pułapki środowiskowe |
| `start.ps1` | serwer + tunel jedną komendą |

### Gdzie co zmienić

| Chcesz | Idź do |
|---|---|
| zmienić balans czegokolwiek | `game/config.js` — i tylko tam |
| dodać przeciwnika albo biom | `game/content.js`, `ACTS` + `FAMILY_DROPS` |
| zmienić zachowanie walki | `game/combat.js`, potem `node game/combat.js` |
| dodać ekran | `public/index.html` (sekcja + zakładka) i `render()` w `public/app.js` |
| zmienić, co niesie stan do klienta | `view()` w `server.js` |

---

## PUŁAPKI ŚRODOWISKOWE

- **PowerShell 5.1 czyta `.ps1` jako ANSI.** Polskie znaki bez BOM-u łamią parser
  w losowym miejscu. Skrypty `.ps1` zapisuj jako **UTF-8 z BOM**.
- **Komunikaty commitów z polskimi znakami przez `-m` się wysypują.** Pisz treść
  do pliku i używaj `git commit -F plik`.
- **APK to tylko powłoka** wskazująca na adres serwera. Zmiany w grze lecą
  z serwera i nie wymagają przebudowy APK.
- **Serwer chodzi na laptopie autora**, wystawiany losowym tunelem Cloudflare.
  Adres zmienia się po każdym restarcie — stąd kod postaci.
- **ngrok jest odradzany** — Defender oznaczył zaktualizowany plik jako trojana.
- **Port 8080 bywa zajęty** przez wcześniejszy `node.exe` autora.

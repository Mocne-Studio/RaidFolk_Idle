# RAIDFOLK_IDLE — PRODUCT DISCOVERY

Dokument roboczy. Nie GDD. Zapisuje wyłącznie stan ustaleń.

Statusy: `CONFIRMED` decyzja projektanta · `PROPOSED` propozycja Claude, nie decyzja · `OPEN` bez odpowiedzi · `REJECTED` świadomie odrzucone.

Ostatnia aktualizacja: po INTERVIEW 3, runda 1 (walka).

---

## 0. GRANICE PROJEKTU

`CONFIRMED` RaidFolk_idle to osobny produkt. Nie tryb, nie gałąź, nie refaktor RaidFolk.
`CONFIRMED` Główny RaidFolk nietknięty, nieużywany jako źródło wymagań.
`CONFIRMED` Praca wyłącznie w `C:\Dev\RaidFolk_idle`.
`CONFIRMED` Faza PRODUCT / GAME DESIGN / UI-UX. Kod dopiero po `START IMPLEMENTATION`.

---

## 1. CZYM JEST GRA

`CONFIRMED` Klikane RPG na telefon. Punkt odniesienia formatu: **RealmIdle**.
`CONFIRMED` Tożsamość: **itemizacja** w duchu Margonema · **skille** w duchu RuneScape · **format** jak RealmIdle.
`CONFIRMED` Grafiki generuje i ustawia projektant. Design nie zakłada animowanego 2D/3D.
`CONFIRMED` Istnieje **podgląd własnej postaci** (paper doll).
`CONFIRMED` Farmienie jest **prywatne** — własne moby, własne tempo.
`CONFIRMED` Content wspólny: dungeony, eventy, raidy, gildie.

### Pitch

> „Expię, bo na wieczór jest boss i każdy bierze udział, a za top 100 są duże nagrody.
> I może mi wypaść legendarna broń, a zbierałem materiały i kryształy, żeby ją ulepszyć."

`CONFIRMED` Filary: **wieczorny boss z rywalizacją** · **polowanie na legendarny drop** · **ulepszanie broni**.

### Anty-cele

`REJECTED` Klikacz bez celu · progresja „lvl 10 → miecz +10" · energia/stamina · pay-to-win · kasynowe gacha UI.

---

## 2. WALKA — RDZEŃ

`CONFIRMED` Walka rozstrzygana **czysto matematycznie**. Symulacja, nie fizyka.
`CONFIRMED` Walka otwiera się jako **osobne okno/ekran**.
`CONFIRMED` **Attack speed steruje częstotliwością ataków.** Kto ma wyższy AS, bije częściej. Nie sztywne tury 1:1.
`CONFIRMED` Tryb **ręczny**: gracz działa co turę.
`CONFIRMED` Tryb **automatyczny**: gracz **ustawia kolejność skilli z góry** (rotacja), auto ją wykonuje, gracz patrzy na wynik.
`CONFIRMED` Prezentacja: 8 pól z grafiką. Efekty: stun, trucizna, magia.
`CONFIRMED` Można przyspieszyć i skipnąć.

### Walka długa — kluczowe odkrycie UX

`CONFIRMED` **Elity II mają dużo HP, a walka trwa długo — celowo.**
`CONFIRMED` Gracz może **zminimalizować walkę**, przejść do wioski / innych ekranów i mieć **podgląd sytuacji**.
`CONFIRMED` Gracz wraca do walki, **żeby się uleczyć**.

To definiuje główny ekran gry: walka to **proces w tle z paskiem statusu**, nie modal blokujący aplikację.

### Walka po zamknięciu aplikacji

`CONFIRMED` **Walka liczy się dalej na serwerze.** Gracz wraca do wyniku albo do trwającej walki. Powiadomienie push po zakończeniu.

Konsekwencja: symulacja jest **serwerowa i deterministyczna**. Klient tylko odtwarza log. Backend jest potrzebny od V1, nie później.

### Leczenie

`CONFIRMED` Leczenie można odpalić **ręcznie w swojej turze** albo **ustawić automatycznie**.
`CONFIRMED` **Każde kolejne użycie leczy o 10% słabiej** w obrębie jednej walki.

Konsekwencja: długa walka jest zadaniem z zarządzania zasobem, nie testem cierpliwości. Leczenie ma naturalny sufit, więc walka nie może trwać w nieskończoność. To jest też przewaga gracza aktywnego — automat leczy poprawnie, ale marnuje ładunki; gracz, który trafia z timingiem, przechodzi dalej tym samym sprzętem.

`OPEN` Czy można prowadzić więcej niż jedną walkę naraz.
`OPEN` Kto zajmuje 8 pól — drużyna, wrogowie, czy obie strony.
`OPEN` Czy 10% kumuluje się liniowo, czy mnoży.

**Ocena:** symulacja matematyczna + rotacja skilli + walka w tle to bardzo mocny fundament. Tanie w produkcji, działa na słabym łączu, skaluje się na multiplayer asynchroniczny.

---

## 3. PRZECIWNICY

`CONFIRMED` Pięć poziomów:

| Poziom | Dostępność | Charakter |
|---|---|---|
| Zwykłe moby | bez limitu | szybkie walki |
| Elity | bez limitu | — |
| Elity II | bez limitu | **dużo HP, walka długa, walka w tle** |
| Herosi | **raz dziennie** | loot gwarantowany |
| Tytani | **raz w tygodniu** | — |

`CONFIRMED` Lockouty dzienne/tygodniowe są świadome. Grind bez limitu dotyczy poziomów 1–3.
`CONFIRMED` Miejsce farmienia = **etap kampanii, na którym gracz stoi**. W areanie jest kilka mobów do wyboru.
`OPEN` Nazwy poziomów. Układ i rozstawienie potworów — celowo odłożone.

---

## 4. KAMPANIA

`CONFIRMED` Struktura etapów numerowana z **rozgałęzieniami**: `1-1`, `1-1-2`, `1-1-3`, `2-1`, `5-6`…
`CONFIRMED` **Trzy poziomy trudności** na każdy etap.
`CONFIRMED` Etapy **powtarzalne** — dają nagrody za każde przejście.
`CONFIRMED` Osobne **nagrody za pierwsze przejście**.
`OPEN` Czy gałęzie są obowiązkowe, czy opcjonalne.
`OPEN` Co dokładnie zmieniają 3 poziomy trudności.

---

## 5. ONBOARDING, FRAKCJE, KLASY

`CONFIRMED` **Tutorial do poziomu 10.**
`CONFIRMED` Po tutorialu gracz wybiera **frakcję**, mając wypisane bonusy.
`CONFIRMED` Potem wybiera **klasę — klikając kwadrat z bronią**. Klasa jest powiązana z bronią.
`CONFIRMED` Ekran wyboru klasy pokazuje: co robi, ile daje, **jak liczy obrażenia, z czym się skaluje**, jakie drogi rozwoju są dostępne dalej.
`CONFIRMED` **Cztery role/klasy: DPS · TANK · MAG · HEAL.**
`CONFIRMED` Poziomy 1–500, **Awaken co 100 poziomów**.
`CONFIRMED` Co kilka poziomów odblokowuje się nowy skill.
`OPEN` Nazwy klas — DPS/TANK/MAG/HEAL to role, nie tożsamości.
`OPEN` Która broń odpowiada której klasie.
`OPEN` Czy Awaken zmienia klasę, czy ją rozwija.

---

## 6. SKILLE I KSIĄŻKI

`CONFIRMED` Skille odblokowywane co kilka poziomów.
`CONFIRMED` Z dropu lecą **książki**.
`CONFIRMED` Książkę **łączy się z innymi przedmiotami** — wtedy uczysz się skilla.
`CONFIRMED` Nauczony skill **można rerollować**.
`CONFIRMED` Istnieją **przepisy** (recipes).
`OPEN` Co dokładnie rerolluje się w skillu — efekt, siła, koszt.

---

## 7. DRUŻYNA BOJOWA

`CONFIRMED` **Walka to 4 vs 4.**
`CONFIRMED` Cztery stałe sloty po stronie gracza, każdy innego typu:

| Slot | Czym jest | Ekwipunek |
|---|---|---|
| 1 | **Główna postać** — gracz | pełne 10 slotów |
| 2 | **Pet** — **atakuje** | `OPEN` |
| 3 | **Sojusznik / kompan** — postać | **własne, oddzielne EQ** |
| 4 | **Bożek** — **aura dla całej drużyny + efekty** | `OPEN` |

`CONFIRMED` To nie jest drużyna złożona z wymiennych najemników. To cztery różne systemy, każdy zdobywany i rozwijany inaczej.
`CONFIRMED` Mnożnik towarzysza = **procent statystyk gracza**, i **da się go podnosić**. Towarzysz nigdy nie staje się bezużyteczny przy zmianie przedziału.

`OPEN` Czym jest Bożek i czym różni się od peta.
`OPEN` Skąd biorą się pet, sojusznik i Bożek.
`OPEN` Jak wygląda dungeon 8-osobowy, skoro walka ma 4 pola.

---

## 7a. NAJEMNICY — SYSTEM WIOSKI, NIE BOJOWY

`CONFIRMED` Najemnicy **nie walczą w drużynie gracza**. Należą do warstwy wioski.
`CONFIRMED` Najemnicy **atakują wioski innych graczy**.
`CONFIRMED` Najemnicy **zbierają surowce i rzeczy związane z wioską**.
`CONFIRMED` Najemników się **kolekcjonuje**.
`CONFIRMED` Najemnika można **zamienić w kryształ** i wstawić go w broń albo pancerz. Zależy to od posiadanej broni.

To daje najemnikom dwa wyjścia: pracują w wiosce albo zasilają ekwipunek. Duplikaty nie są śmieciem.

`OPEN` Czy „atakują inne wioski" to asynchroniczne PvP o surowce.
`OPEN` Czy kryształ z najemnika to ta sama waluta co kryształy z ulepszania.
`OPEN` Ile jest slotów na kryształy w przedmiocie.
`OPEN` Sposób zdobywania najemników — wcześniej ustalono tawernę i drop ze specjalnym spinem.

---

## 8. WIOSKA I OFFLINE

`CONFIRMED` Wioska = **generator zasobów**: cegła, żelazo, drewno, kryształy.
`CONFIRMED` Rozbudowa daje **statystyki graczowi i najemnikom**.
`CONFIRMED` Wioska zasila **handel między graczami**.
`CONFIRMED` **Offline: farmią się surowce i buduje się wioska. Nic więcej.** Walka nie działa offline.

To jest cała warstwa „idle" w grze. Świadoma i wąska.

---

## 9. PRZEDMIOTY

`CONFIRMED` Siedem poziomów rzadkości:
**Common · Uncommon · Unique · Heroic · Legendary · Mystic · God**

`CONFIRMED` **Rzadkość mapuje się na źródło.** Każdy poziom ma własne miejsce w świecie:
Common–Unique ze zwykłych mobów · Heroic z Elit II · Legendary z Herosów · Mystic/God z Tytanów i world bossa.

### Ulepszanie

`CONFIRMED` Poziomy **+1 do +15**.
`CONFIRMED` **Od +10 ulepszanie bez kamienia ochronnego może zniszczyć broń.** Trzeba dropić nową.
`CONFIRMED` U **kowala** można losować **afiksy i prefiksy**.
`CONFIRMED` **Wyższy tier = więcej opcji ulepszeń i lepsza jakość afiksów.**
`CONFIRMED` **Pule afiksów są zależne od slotu** — broń losuje z innej puli niż zbroja.
`CONFIRMED` W broniach legendarnych plusy dają **mocne efekty**, nie tylko liczby.
`CONFIRMED` **Spłonąć może każdy item, łącznie z Legendary, Mystic i God.** Bez wyjątków.

### Przekucie

`CONFIRMED` Przekucie odbywa się **u kowala, za złoto**.
`CONFIRMED` Przekucie **zwraca kryształy** zainwestowane w ulepszenia.
`CONFIRMED` Odzyskane kryształy można włożyć w kolejną broń, ale **tylko tego samego tieru**.

To ratuje filar „zbierałem materiały, żeby ją ulepszyć". Inwestycja nie ginie przy zmianie sprzętu — przenosi się w obrębie tieru. Ginie tylko przy spaleniu.

`CONFIRMED` **10 slotów ekwipunku.**

`OPEN` Procent zwrotu kryształów przy przekuciu.
`OPEN` Dostępność kamieni ochronnych. To jest główne pokrętło trudności całego systemu.
`OPEN` Czy przekucie duplikatu to ta sama mechanika, czy osobna.
`OPEN` Sety, handel.

---

## 9a. PRZEDZIAŁY POZIOMÓW (level brackets)

`CONFIRMED` Content jest **podzielony na przedziały poziomów**. Elity II, Herosi i Tytani istnieją osobno dla każdego przedziału, a ich itemy są na ten przedział.
`CONFIRMED` Gracz może **wyłączyć zdobywanie doświadczenia** i zatrzymać się w przedziale.
`CONFIRMED` Cel: gracz farmi drop i dopracowuje ekwipunek zamiast być popychanym dalej przez poziom.
`CONFIRMED` Uzasadnienie projektanta: przedziały dają **efekt warstw**.

To jest odpowiedź na pytanie „czy stary sprzęt zostaje użyteczny". Nie przez wieczne itemy, tylko przez **kontrolę gracza nad tempem wychodzenia z warstwy**.

Konsekwencja pozytywna: przedziały to gotowe **ligi rankingowe**. Rozwiązują problem „top 100 to zawsze ci sami" bez dokładania systemu.

`CONFIRMED` Rozkład progresji: **statystyki rosną co poziom**, **klasa awansuje co 100 poziomów**. Między progami treścią gry są itemy, skille, wioska i farmienie dobrego sprzętu.
`CONFIRMED` Sprzęt przy zmianie przedziału nie przepada — **przekuwa się na kryształy** (patrz sekcja 9).

`PROPOSED` Przedziały pokrywają się z progami klasy: 1–99, 100–199, 200–299, 300–399, 400–500. Pięć warstw, zamiast osobnej siatki. Do potwierdzenia.
`OPEN` Czy blokada exp jest darmowa i odwracalna.

---

## 10. WORLD BOSS I DUNGEONY

`CONFIRMED` **Dungeon: 8 osób max, asynchronicznie.** Zapisujesz drużynę, przy komplecie serwer liczy symulację, wszyscy dostają log + nagrodę + powiadomienie.
`CONFIRMED` Dungeon: nagroda jednakowa dla wszystkich.
`CONFIRMED` Raid / world boss: **trzy rankingi — tank, heal, DPS**. Każdy ma własny wynik.
`CONFIRMED` World boss **codziennie, w oknie 16:00–22:00**.
`CONFIRMED` **Jeden globalny pasek HP** dla wszystkich graczy.
`CONFIRMED` Nagrody **progowe dla wszystkich + dodatkowa pula dla top 100**.

`PROPOSED` HP bossa skaluje się do liczby uczestników, żeby przeżył całe okno. Bez tego okno 6-godzinne nie ma sensu — boss padnie w pierwszej godzinie i reszta dnia jest pusta.
`OPEN` Liczba prób na gracza w oknie.

---

## 10a. PvP WIOSEK

`CONFIRMED` Atak najemnikami na cudzą wioskę uderza w **kopię** wioski obrońcy.
`CONFIRMED` **Obrońca nic nie traci.** Łup pochodzi z puli systemowej, nie z jego magazynu.

Konsekwencja: brak spirali, w której silniejszy gracz doi słabszego. Brak potrzeby tarcz, zemsty, ochrony nowych graczy i całej obsługi tych systemów. Tanio i bezpiecznie.

---

## 11. MONETYZACJA

`CONFIRMED` V1: **wyłącznie kosmetyka i wygoda.** Zero wpływu na moc.
`CONFIRMED` Później: **battle pass** bez unikalnej mocy.
`REJECTED` Płatne rolle wpływające na moc.

---

## 12. ZAKRES

`CONFIRMED` Kandydat na rdzeń V1: **strefa farmienia · najemnicy · world boss z rankingiem**.
`CONFIRMED` Gildie i dungeony: **V1.x**, nie V1.0.
`CONFIRMED` Zakres **świadomie nie jest jeszcze domknięty** — najpierw mapujemy, co z czym się je.

---

## 13. KONFLIKTY OTWARTE

**K2 — „klikane RPG" vs walka pomijalna.** `ROZSTRZYGNIĘTE`. Ręcznie co turę albo auto z rotacją ustawioną z góry. Wybór gracza.

**K4 — nagroda za miejsce przy nieznanej populacji.** `PRAWDOPODOBNIE ROZSTRZYGNIĘTE`. Przedziały poziomów działają jak ligi. Ranking liczony w obrębie przedziału × 3 role daje wielokrotnie więcej realnych miejsc do zdobycia. Do potwierdzenia.

**K12 — jeden globalny pasek HP vs nagrody dla wszystkich.** `ROZSTRZYGNIĘTE`. Boss nigdy nie ginie. Event jest wyścigiem o obrażenia, nie o zabicie. Spóźnić się nie da.

**K13 — stała godzina wyklucza pracujących.** `ROZSTRZYGNIĘTE`. Okno 16:00–22:00 plus nieśmiertelny boss. Każdy łapie swój kawałek.

**K14 — osiem klas w V1.** `ROZSTRZYGNIĘTE`. V1 dowozi cztery, po jednej na rolę: Szermierz, Paladyn, Mag Światła, Kapłan.

---

## 14. UI / UX — ROBOCZE

`CONFIRMED` **Wszystko jest PNG. Zero animacji.** Twarde ograniczenie produkcyjne.
`CONFIRMED` Walka jest turowa i statyczna.
`CONFIRMED` Ekran startowy: **kwatera / ekran główny** — postać, podsumowanie dnia, co czeka do odebrania, wejścia do walki i wioski.
`CONFIRMED` Pięć zakładek: **Walka · Wioska · Ekwipunek · Drużyna · Ranking**.
`CONFIRMED` Porównanie przedmiotów: **side-by-side ze strzałkami + liczba Power** na górze.
`CONFIRMED` Legendarny drop: **pełna karta z porównaniem** + **wpis w logu lootu** + **ogłoszenie na czacie**.
`CONFIRMED` **Istnieje czat.**
`CONFIRMED` Powiadomienia są **konfigurowalne przez gracza** — sam wybiera, o czym chce wiedzieć (boss za 15 minut, splądrowana wioska i ile surowców, itd.).

`CONFIRMED` **Czat globalny w V1.** Gildyjny w V1.x. Uzasadnienie: pierwsze testy to kilka osób.
`CONFIRMED` **Dźwięk później.**

### Struktura zakładek — przyjęta bez zastrzeżeń

```
⚔ WALKA        mapa kampanii · wybór wroga · Heros · Tytan · World Boss
🏰 WIOSKA      budynki · surowce · najemnicy · wyprawy na cudze wioski
🎒 POSTAĆ      paper doll · plecak · skille · księgi · kowal i ulepszanie
👥 DRUŻYNA     pet · sojusznik · Bożek
🏆 SPOŁECZNOŚĆ rankingi · czat · gildia (V1.x)
```

`OPEN` Czy kowal zostaje w POSTAĆ, czy przenosi się do WIOSKI jako budynek kuźni.

### Ekran walki — przyjęty bez zastrzeżeń

Statyczne PNG 4 vs 4, paski HP, liczby obrażeń pojawiające się i znikające, log 3–4 linii, pasek akcji.
Pasek w tle: nazwa wroga + jego HP + Twoje HP + licznik lootu + przycisk leczenia.

---

## 15. PLATFORMA

`CONFIRMED` **Aplikacja do pobrania na telefon.** Nie strona, nie przeglądarka.

`CONFIRMED` Docelowo **Android i iOS**. UI projektowane od razu pod oba.
`CONFIRMED` Na razie **bez sklepu — plik APK bezpośrednio**. Tester pobiera i instaluje.
`CONFIRMED` Na czas testów **serwer działa lokalnie na laptopie projektanta**.

Uwagi do fazy testowej:
- APK to Android. iOS nie przyjmuje plików spoza sklepu, więc do czasu wejścia do App Store lub TestFlight testy są w praktyce androidowe.
- Serwer na laptopie oznacza, że gra żyje tylko wtedy, gdy laptop jest włączony i osiągalny z zewnątrz. Na dwie osoby to wystarczy. World boss w oknie 16:00–22:00 wymaga, żeby maszyna wtedy działała.

**Konsekwencja, o której trzeba wiedzieć teraz:** symulacja walki jest serwerowa, więc „aplikacja do pobrania" oznacza w praktyce **aplikację plus serwer**. Sam plik na telefonie nie wystarczy — potrzebny jest hosting, i to od pierwszego dnia, nie przy multiplayerze.

**Konsekwencja braku animacji:** cały feedback musi iść przez **tekst, liczby, kolor i układ**. Nie ma ruchu, który by przykrył słabą czytelność. To podnosi wagę logu walki, liczb obrażeń i kolorów rzadkości — one są jedynym „efektem specjalnym", jaki gra ma.

**K11 — spalenie broni vs przedziały poziomów.** Broń ginie przy +11 bez kamienia, a Legendary lecą z Herosa raz dziennie. Jeśli dodatkowo dopracowany sprzęt traci wartość przy przejściu do wyższego przedziału, to filar „zbierałem materiały, żeby ją ulepszyć" przestaje działać. Wymaga rozstrzygnięcia.

**K6 — warstwa offline.** `ROZSTRZYGNIĘTE`. Offline = surowce + wioska. Wąsko i świadomie.

**K8 — walka długa vs sesja mobilna.** `ROZSTRZYGNIĘTE`. Symulacja leci na serwerze. Zamknięcie aplikacji niczego nie psuje. Cena: backend od V1.

**K9 — DPS/TANK/MAG/HEAL to 4 klasy, ale rankingi raidowe są 3.** MAG i DPS konkurują w tej samej kategorii. Do uzgodnienia.

**K10 — 7 poziomów rzadkości.** Każdy potrzebuje własnego powodu istnienia i własnego źródła, inaczej Uncommon i Unique są tym samym z inną ramką.

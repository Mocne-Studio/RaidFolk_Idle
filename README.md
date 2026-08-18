# RaidFolk_idle — wersja grywalna 0.1

Zero zależności. Node 22+ i już.

## Uruchomienie

```
node server.js
```

Otwiera się na `http://localhost:8080`. W sieci lokalnej: `http://<adres-laptopa>:8080`.

Port zmienisz przez `PORT=3000 node server.js`.

## Co jest w tej wersji

- **Wieża** — piętra po 6–10 walk, wariant „+" co 5, boss aktu co 10, akty po 10 pięter
- **Walka** — symulacja serwerowa, attack speed decyduje o częstotliwości ciosów, log tur
- **Mikstury** — wypijają się same poniżej 30% HP, każda kolejna w tej samej walce o 10% słabsza
- **Łup** — 7 rzadkości, afiksy skalowane z ilvl, bronie w trzech typach (mele / dystans / magia)
- **Ekwipunek** — 10 slotów, dwa progi na przedmiocie: poziom postaci i poziom skilla
- **Skille bojowe** — rosną z tego, czego używasz; tarcza dzieli exp 50/50 z Obroną
- **Atrybuty** — 3 punkty za piętro, Siła/Intelekt/Zręczność skalują odpowiedni styl walki
- **Cztery klasy** — bonus +50% expa do swojego skilla i wyprawka startowa

Czego jeszcze nie ma: drzewko, gniazda, ulepszanie, przepał, wyprawy, przywołanie, skille zbierackie, world boss, rajdy, bank.

## Strojenie

**Wszystkie liczby siedzą w `game/config.js`.** Nigdzie indziej. Zmieniasz, restartujesz serwer, gotowe.

Najważniejsze pokrętła:

| Co | Gdzie |
|---|---|
| jak szybko rosną moby | `tower.mobHpPerFloor`, `mobDmgPerFloor` i `*Growth` |
| trudność bossów | `tower.bossHpMult`, `bossStatMult` |
| tempo skilli | `skills.expPerFight`, `expGrowth` |
| hojność łupu | `loot.dropChance`, `weights*`, `slotWeights` |
| siła rzadkości | `rarities.*.mult` i `affixes` |

**Uwaga na `mobHpGrowth` i `mobDmgGrowth`** — to mnożniki wykładnicze, a gracz rośnie liniowo. Powyżej 1.01 moby uciekają bezpowrotnie po dwudziestu piętrach.

## Struktura

```
server.js            HTTP, API, pliki statyczne
game/config.js       WSZYSTKIE liczby
game/content.js      akty, piętra, przeciwnicy, generator przedmiotów
game/combat.js       symulacja walki + testy (node game/combat.js)
game/character.js    atrybuty, skille, ekwipunek, statystyki wynikowe
game/db.js           SQLite
public/              frontend
raidfolk.db          zapis — skasuj, żeby wyczyścić świat
```

## Testy

```
node game/combat.js
node game/character.js
node game/expedition-scaling.test.js
node game/professions.test.js
```

Sprawdzają walkę, statystyki postaci, ciągłość i skalowanie Wypraw do poziomu 200
oraz pełny pion Górnictwo → sztaby → jakościowy sprzęt → bonusy profesji.

## Uwaga o kontach

Postać identyfikuje token w `localStorage` przeglądarki. **Nie ma haseł i nie ma zabezpieczeń** — to wersja testowa dla dwóch osób w zaufanej sieci, nie system logowania.

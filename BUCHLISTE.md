# Buchliste – nächste Ergänzungen für BuchArena

Zentrale Arbeitsliste für alle Entwickler und KI-Assistenten, die den Buchkatalog erweitern. Hier Vorschläge sammeln, recherchieren, Aufgaben übernehmen und abgeschlossene Einträge dokumentieren.

Angelegt und erweitert am **14.11.2026**. **529 konkrete Buchvorschläge** sind vorgemerkt. Die Auswahl ist ein redaktioneller Vorschlag: zuerst bestehende Reihen ergänzen, danach weitere Genres und Autoren ausbauen. Die Prioritäten können gemeinsam angepasst werden.

## Ausgangsbestand und Abgleich

- Die vorhandene [Katalogübersicht als CSV](./docs/BuchArena_Katalogbuecher_Uebersicht.csv) enthält **80 Bücher** beim Anlegen dieser Liste; zusätzlich gibt es eine [Excel-Übersicht](./docs/BuchArena_Katalogbuecher_Uebersicht.xlsx).
- Keiner der unten vorgeschlagenen Titel steht unter diesem Titel in der gespeicherten CSV. Der **aktuelle Datenbankbestand wurde noch nicht abgeglichen**. Alle Einträge starten deshalb als `Vorschlag`.
- Vor dem Einbau ISBN normalisieren und im aktuellen Bestand prüfen; zusätzlich Titel, Autor und Reihenteil vergleichen, damit andere Ausgaben nicht unbemerkt doppelt angelegt werden. Die öffentliche Katalogansicht kann durch Sichtbarkeitseinstellungen Bücher ausblenden.
- `offen` bedeutet: konkrete deutschsprachige Ausgabe und ISBN müssen noch recherchiert werden. ISBN, Seitenzahl, Erscheinungsjahr und Cover immer auf dieselbe Ausgabe beziehen.

## Umfang und Navigation

| Bereich | Vorgemerkte Bücher |
| --- | ---: |
| [Startauswahl und Reihen-Ergänzungen](#startauswahl-und-reihen-ergänzungen) | 24 |
| [Fantasy und Romantasy](#fantasy-und-romantasy) | 64 |
| [Science-Fiction und Dystopien](#science-fiction-und-dystopien) | 45 |
| [Krimi und Thriller](#krimi-und-thriller) | 75 |
| [Liebe, Familie und Gegenwartsliteratur](#liebe-familie-und-gegenwartsliteratur) | 68 |
| [Historische Romane und Familiensagas](#historische-romane-und-familiensagas) | 34 |
| [Klassiker und Weltliteratur](#klassiker-und-weltliteratur) | 58 |
| [Kinderbücher und Vorlesebücher](#kinderbücher-und-vorlesebücher) | 50 |
| [Jugendbücher und Young Adult](#jugendbücher-und-young-adult) | 46 |
| [Sachbücher, Wissen und Biografien](#sachbücher-wissen-und-biografien) | 40 |
| [Horror, Spannung und dunkle Fantastik](#horror-spannung-und-dunkle-fantastik) | 25 |
| **Gesamt** | **529** |

Die Bereiche dienen der Orientierung; einzelne Bücher passen in mehrere Genres. Die Genrezuordnung in der App wird bei der Recherche festgelegt. Die Liste enthält Werke beziehungsweise klar bezeichnete Reihenteile; verschiedene Ausgaben desselben Titels werden nicht als zusätzliche Vorschläge gezählt.

## Prioritäten und Status

**P1:** bestehende Reihen ergänzen. **P2:** Katalog thematisch verbreitern. **P3:** weitere Klassiker ergänzen.

| Status | Bedeutung |
| --- | --- |
| Vorschlag | In dieser Liste vorgemerkt; aktueller Bestandsabgleich und Recherche stehen aus. |
| Recherche | Jemand bearbeitet den Eintrag; Zuständigkeit und Datum in der Zeile eintragen. |
| Bereit | Bestandsabgleich erfolgt, Ausgabe und benötigte Buchdaten geprüft; Quellen dokumentiert. |
| Eingebaut | Datensatz gespeichert und Detailseite geprüft; Buch-ID/URL und Prüfdatum dokumentiert. |
| Bereits vorhanden | Beim Bestandsabgleich gefunden; vorhandene Buch-ID/URL dokumentieren. |
| Zurückgestellt | Vorerst nicht einbauen; Grund in der Zeile dokumentieren. |

## Geplante Bücher

Die IDs bleiben bei Sortierungen erhalten. Reihenfolge innerhalb einer Priorität nach Möglichkeit nach Reihenteil einhalten. `—` bei Zuständigkeit bedeutet frei; `—` beim Nachweis bedeutet noch kein abgeschlossener Import oder Bestandsabgleich.

### Startauswahl und Reihen-Ergänzungen

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | P1 | Harry Potter und der Gefangene von Askaban | J. K. Rowling | Harry Potter 3; Band 1–2 in der CSV | offen | Vorschlag | — | — |
| B002 | P1 | Harry Potter und der Feuerkelch | J. K. Rowling | Harry Potter 4 | offen | Vorschlag | — | — |
| B003 | P1 | Harry Potter und der Orden des Phönix | J. K. Rowling | Harry Potter 5 | offen | Vorschlag | — | — |
| B004 | P1 | Harry Potter und der Halbblutprinz | J. K. Rowling | Harry Potter 6 | offen | Vorschlag | — | — |
| B005 | P1 | Harry Potter und die Heiligtümer des Todes | J. K. Rowling | Harry Potter 7 | offen | Vorschlag | — | — |
| B006 | P1 | Saphirblau | Kerstin Gier | Edelstein-Trilogie 2; Rubinrot in der CSV | offen | Vorschlag | — | — |
| B007 | P1 | Smaragdgrün | Kerstin Gier | Edelstein-Trilogie 3 | offen | Vorschlag | — | — |
| B008 | P1 | Tintenblut | Cornelia Funke | Tintenwelt 2; Tintenherz in der CSV | offen | Vorschlag | — | — |
| B009 | P1 | Tintentod | Cornelia Funke | Tintenwelt 3 | offen | Vorschlag | — | — |
| B010 | P2 | Momo | Michael Ende | Kinder- und Jugendbuch | offen | Vorschlag | — | — |
| B011 | P2 | Der Herr der Ringe: Die Gefährten | J. R. R. Tolkien | Der Herr der Ringe 1; Der Hobbit in der CSV | offen | Vorschlag | — | — |
| B012 | P2 | Der Herr der Ringe: Die zwei Türme | J. R. R. Tolkien | Der Herr der Ringe 2 | offen | Vorschlag | — | — |
| B013 | P2 | Der Herr der Ringe: Die Rückkehr des Königs | J. R. R. Tolkien | Der Herr der Ringe 3 | offen | Vorschlag | — | — |
| B014 | P2 | Der Wüstenplanet | Frank Herbert | Science-Fiction; Dune 1 | offen | Vorschlag | — | — |
| B015 | P2 | Der Marsianer | Andy Weir | Science-Fiction | offen | Vorschlag | — | — |
| B016 | P2 | Fahrenheit 451 | Ray Bradbury | Dystopie | offen | Vorschlag | — | — |
| B017 | P2 | Schöne neue Welt | Aldous Huxley | Dystopie | offen | Vorschlag | — | — |
| B018 | P2 | Gone Girl – Das perfekte Opfer | Gillian Flynn | Thriller | offen | Vorschlag | — | — |
| B019 | P2 | Friedhof der Kuscheltiere | Stephen King | Horror | offen | Vorschlag | — | — |
| B020 | P2 | Der Drachenläufer | Khaled Hosseini | Gegenwartsliteratur | offen | Vorschlag | — | — |
| B021 | P3 | Pippi Langstrumpf | Astrid Lindgren | Kinderbuch; genaue Einzelausgabe auswählen | offen | Vorschlag | — | — |
| B022 | P3 | Die Brüder Löwenherz | Astrid Lindgren | Kinder- und Jugendbuch | offen | Vorschlag | — | — |
| B023 | P3 | Jane Eyre | Charlotte Brontë | Klassiker | offen | Vorschlag | — | — |
| B024 | P3 | Sturmhöhe | Emily Brontë | Klassiker | offen | Vorschlag | — | — |

### Fantasy und Romantasy

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B025 | P2 | Das Silmarillion | J. R. R. Tolkien | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B026 | P2 | Nachrichten aus Mittelerde | J. R. R. Tolkien | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B027 | P2 | Die Kinder Húrins | J. R. R. Tolkien | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B028 | P2 | Die Furcht des Weisen 1 | Patrick Rothfuss | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B029 | P2 | Die Furcht des Weisen 2 | Patrick Rothfuss | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B030 | P2 | Die Musik der Stille | Patrick Rothfuss | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B031 | P2 | Kinder des Nebels | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B032 | P2 | Krieger des Feuers | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B033 | P2 | Herrscher des Lichts | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B034 | P2 | Der Weg der Könige | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B035 | P2 | Der Pfad der Winde | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B036 | P2 | Die Worte des Lichts | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B037 | P2 | Die Stürme des Zorns | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B038 | P2 | Elantris | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B039 | P2 | Sturmklänge | Brandon Sanderson | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B040 | P2 | Der letzte Wunsch | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B041 | P2 | Das Schwert der Vorsehung | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B042 | P2 | Das Erbe der Elfen | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B043 | P2 | Die Zeit der Verachtung | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B044 | P2 | Feuertaufe | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B045 | P2 | Der Schwalbenturm | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B046 | P2 | Die Dame vom See | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B047 | P2 | Zeit des Sturms | Andrzej Sapkowski | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B048 | P2 | Der Magier der Erdsee | Ursula K. Le Guin | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B049 | P2 | Die Gräber von Atuan | Ursula K. Le Guin | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B050 | P2 | Das ferne Ufer | Ursula K. Le Guin | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B051 | P2 | Die Farben der Magie | Terry Pratchett | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B052 | P2 | Das Licht der Phantasie | Terry Pratchett | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B053 | P2 | Gevatter Tod | Terry Pratchett | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B054 | P2 | Wachen! Wachen! | Terry Pratchett | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B055 | P2 | Alles Sense | Terry Pratchett | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B056 | P2 | Kleine freie Männer | Terry Pratchett | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B057 | P2 | Niemalsland | Neil Gaiman | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B058 | P2 | American Gods | Neil Gaiman | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B059 | P2 | Sternwanderer | Neil Gaiman | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B060 | P2 | Piranesi | Susanna Clarke | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B061 | P2 | Jonathan Strange & Mr Norrell | Susanna Clarke | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B062 | P2 | Fourth Wing – Flammengeküsst | Rebecca Yarros | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B063 | P2 | Iron Flame – Flammengeküsst | Rebecca Yarros | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B064 | P2 | Onyx Storm – Flammengeküsst | Rebecca Yarros | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B065 | P2 | Das Reich der sieben Höfe – Dornen und Rosen | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B066 | P2 | Das Reich der sieben Höfe – Flammen und Finsternis | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B067 | P2 | Das Reich der sieben Höfe – Sterne und Schwerter | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B068 | P2 | Das Reich der sieben Höfe – Frost und Mondlicht | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B069 | P2 | Das Reich der sieben Höfe – Silbernes Feuer | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B070 | P2 | Throne of Glass – Die Erwählte | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B071 | P2 | Throne of Glass – Kriegerin im Schatten | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B072 | P2 | Throne of Glass – Erbin des Feuers | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B073 | P2 | Throne of Glass – Königin der Finsternis | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B074 | P2 | Throne of Glass – Die Sturmbezwingerin | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B075 | P2 | Throne of Glass – Der verwundete Krieger | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B076 | P2 | Throne of Glass – Herrscherin über Asche und Zorn | Sarah J. Maas | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B077 | P2 | Das Lied der Krähen | Leigh Bardugo | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B078 | P2 | Das Gold der Krähen | Leigh Bardugo | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B079 | P2 | Das neunte Haus | Leigh Bardugo | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B080 | P2 | Elfenkrone | Holly Black | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B081 | P2 | Elfenkönig | Holly Black | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B082 | P2 | Elfenkönigin | Holly Black | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B083 | P2 | Das dunkle Herz des Waldes | Naomi Novik | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B084 | P2 | Das kalte Reich des Silbers | Naomi Novik | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B085 | P2 | Scholomance – Tödliche Lektion | Naomi Novik | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B086 | P2 | Rumo & Die Wunder im Dunkeln | Walter Moers | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B087 | P2 | Der Schrecksenmeister | Walter Moers | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B088 | P2 | Das Labyrinth der Träumenden Bücher | Walter Moers | Fantasy und Romantasy | offen | Vorschlag | — | — |

### Science-Fiction und Dystopien

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B089 | P2 | Der Astronaut | Andy Weir | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B090 | P2 | Artemis | Andy Weir | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B091 | P2 | Der Herr des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B092 | P2 | Die Kinder des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B093 | P2 | Der Gottkaiser des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B094 | P2 | Die Ketzer des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B095 | P2 | Die Ordensburg des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B096 | P2 | Ich, der Robot | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B097 | P2 | Die Foundation-Trilogie | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B098 | P2 | Die nackte Sonne | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B099 | P2 | Die Stahlhöhlen | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B100 | P2 | 2001 – Odyssee im Weltraum | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B101 | P2 | Die letzte Generation | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B102 | P2 | Rendezvous mit Rama | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B103 | P2 | Träumen Androiden von elektrischen Schafen? | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B104 | P2 | Das Orakel vom Berge | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B105 | P2 | Ubik | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B106 | P2 | Solaris | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B107 | P2 | Der futurologische Kongress | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B108 | P2 | Sterntagebücher | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B109 | P2 | Die linke Hand der Dunkelheit | Ursula K. Le Guin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B110 | P2 | Freie Geister | Ursula K. Le Guin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B111 | P2 | Die drei Sonnen | Liu Cixin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B112 | P2 | Der dunkle Wald | Liu Cixin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B113 | P2 | Jenseits der Zeit | Liu Cixin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B114 | P2 | Die wandernde Erde | Liu Cixin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B115 | P2 | Leviathan erwacht | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B116 | P2 | Calibans Krieg | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B117 | P2 | Abaddons Tor | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B118 | P2 | Tagebuch eines Killerbots | Martha Wells | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B119 | P2 | Der lange Weg zu einem kleinen zornigen Planeten | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B120 | P2 | Zwischen zwei Sternen | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B121 | P2 | Unter uns die Nacht | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B122 | P2 | Alles, was wir geben mussten | Kazuo Ishiguro | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B123 | P2 | Klara und die Sonne | Kazuo Ishiguro | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B124 | P2 | Der Report der Magd | Margaret Atwood | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B125 | P2 | Die Zeuginnen | Margaret Atwood | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B126 | P2 | Oryx und Crake | Margaret Atwood | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B127 | P2 | Das Licht der letzten Tage | Emily St. John Mandel | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B128 | P2 | Das Meer der endlosen Ruhe | Emily St. John Mandel | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B129 | P2 | Ready Player One | Ernest Cline | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B130 | P2 | Blumen für Algernon | Daniel Keyes | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B131 | P2 | Die Mars-Chroniken | Ray Bradbury | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B132 | P2 | Die Zeitmaschine | H. G. Wells | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B133 | P2 | Der Krieg der Welten | H. G. Wells | Science-Fiction und Dystopien | offen | Vorschlag | — | — |

### Krimi und Thriller

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B134 | P2 | Tod auf dem Nil | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B135 | P2 | Alibi | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B136 | P2 | Die Morde des Herrn ABC | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B137 | P2 | Das Böse unter der Sonne | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B138 | P2 | 16 Uhr 50 ab Paddington | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B139 | P2 | Ein Mord wird angekündigt | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B140 | P2 | Das krumme Haus | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B141 | P2 | Mord im Pfarrhaus | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B142 | P2 | Das Zeichen der Vier | Arthur Conan Doyle | Krimi und Thriller | offen | Vorschlag | — | — |
| B143 | P2 | Das Tal der Angst | Arthur Conan Doyle | Krimi und Thriller | offen | Vorschlag | — | — |
| B144 | P2 | Die Abenteuer des Sherlock Holmes | Arthur Conan Doyle | Krimi und Thriller | offen | Vorschlag | — | — |
| B145 | P2 | Der Augensammler | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B146 | P2 | Der Augenjäger | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B147 | P2 | Das Paket | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B148 | P2 | Flugangst 7A | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B149 | P2 | Der Insasse | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B150 | P2 | Das Geschenk | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B151 | P2 | Der Heimweg | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B152 | P2 | Playlist | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B153 | P2 | Mimik | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B154 | P2 | Die Einladung | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B155 | P2 | Das Kalendermädchen | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B156 | P2 | Abgeschnitten | Sebastian Fitzek / Michael Tsokos | Krimi und Thriller | offen | Vorschlag | — | — |
| B157 | P2 | Die Betrogene | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B158 | P2 | Die Entscheidung | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B159 | P2 | Ohne Schuld | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B160 | P2 | Einsame Nacht | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B161 | P2 | Eine unbeliebte Frau | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B162 | P2 | Mordsfreunde | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B163 | P2 | Tiefe Wunden | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B164 | P2 | Wer Wind sät | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B165 | P2 | Böser Wolf | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B166 | P2 | Die Lebenden und die Toten | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B167 | P2 | Im Wald | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B168 | P2 | Muttertag | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B169 | P2 | In ewiger Freundschaft | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B170 | P2 | Monster | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B171 | P2 | Verdammnis | Stieg Larsson | Krimi und Thriller | offen | Vorschlag | — | — |
| B172 | P2 | Vergebung | Stieg Larsson | Krimi und Thriller | offen | Vorschlag | — | — |
| B173 | P2 | Der Fledermausmann | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B174 | P2 | Kakerlaken | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B175 | P2 | Rotkehlchen | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B176 | P2 | Der Schneemann | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B177 | P2 | Leopard | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B178 | P2 | Mörder ohne Gesicht | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B179 | P2 | Die Hunde von Riga | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B180 | P2 | Die weiße Löwin | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B181 | P2 | Mittsommermord | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B182 | P2 | Erbarmen | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B183 | P2 | Schändung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B184 | P2 | Erlösung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B185 | P2 | Verachtung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B186 | P2 | Erwartung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B187 | P2 | In seinen Händen | Harlan Coben | Krimi und Thriller | offen | Vorschlag | — | — |
| B188 | P2 | Cry Baby – Scharfe Schnitte | Gillian Flynn | Krimi und Thriller | offen | Vorschlag | — | — |
| B189 | P2 | Finstere Orte | Gillian Flynn | Krimi und Thriller | offen | Vorschlag | — | — |
| B190 | P2 | Girl on the Train – Du kennst sie nicht, aber sie kennt dich | Paula Hawkins | Krimi und Thriller | offen | Vorschlag | — | — |
| B191 | P2 | Die verschwundenen Studentinnen | Alex Michaelides | Krimi und Thriller | offen | Vorschlag | — | — |
| B192 | P2 | Sakrileg | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B193 | P2 | Das verlorene Symbol | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B194 | P2 | Inferno | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B195 | P2 | Origin | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B196 | P2 | Diabolus | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B197 | P2 | Meteor | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B198 | P2 | Das Schweigen der Lämmer | Thomas Harris | Krimi und Thriller | offen | Vorschlag | — | — |
| B199 | P2 | Roter Drache | Thomas Harris | Krimi und Thriller | offen | Vorschlag | — | — |
| B200 | P2 | Hannibal | Thomas Harris | Krimi und Thriller | offen | Vorschlag | — | — |
| B201 | P2 | Winterkartoffelknödel | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B202 | P2 | Schweinskopf al dente | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B203 | P2 | Grießnockerlaffäre | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B204 | P2 | Sauerkrautkoma | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B205 | P2 | Zwetschgendatschikomplott | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B206 | P2 | Der Donnerstagsmordclub | Richard Osman | Krimi und Thriller | offen | Vorschlag | — | — |
| B207 | P2 | Der Mann, der zweimal starb | Richard Osman | Krimi und Thriller | offen | Vorschlag | — | — |
| B208 | P2 | Die verirrten Kugeln | Richard Osman | Krimi und Thriller | offen | Vorschlag | — | — |

### Liebe, Familie und Gegenwartsliteratur

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B209 | P2 | Nur noch einmal und für immer | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B210 | P2 | Verity | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B211 | P2 | Weil ich Layken liebe | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B212 | P2 | Weil ich Will liebe | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B213 | P2 | Hope Forever | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B214 | P2 | Maybe Someday | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B215 | P2 | November 9 | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B216 | P2 | Zurück ins Leben geliebt | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B217 | P2 | Save You | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B218 | P2 | Save Us | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B219 | P2 | Begin Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B220 | P2 | Trust Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B221 | P2 | Feel Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B222 | P2 | Hope Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B223 | P2 | Dream Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B224 | P2 | Berühre mich. Nicht. | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B225 | P2 | Verliere mich. Nicht. | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B226 | P2 | Someone New | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B227 | P2 | Someone Else | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B228 | P2 | Someone to Stay | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B229 | P2 | New Beginnings | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B230 | P2 | New Promises | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B231 | P2 | New Dreams | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B232 | P2 | Verliebt in deine schönsten Seiten | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B233 | P2 | Kein Sommer ohne dich | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B234 | P2 | Happy Place – Urlaub mit dem Ex | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B235 | P2 | Die theoretische Unwahrscheinlichkeit von Liebe | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B236 | P2 | Das irrationale Vorkommnis der Liebe | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B237 | P2 | Love, Theoretically | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B238 | P2 | Normale Menschen | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B239 | P2 | Gespräche mit Freunden | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B240 | P2 | Schöne Welt, wo bist du | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B241 | P2 | Ein ganzes halbes Jahr | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B242 | P2 | Ein ganz neues Leben | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B243 | P2 | Mein Herz in zwei Welten | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B244 | P2 | Eine Handvoll Worte | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B245 | P2 | Die Sturmschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B246 | P2 | Die Schattenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B247 | P2 | Die Perlenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B248 | P2 | Die Mondschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B249 | P2 | Die Sonnenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B250 | P2 | Die verschwundene Schwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B251 | P2 | Atlas – Die Geschichte von Pa Salt | Lucinda Riley / Harry Whittaker | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B252 | P2 | Die sieben Männer der Evelyn Hugo | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B253 | P2 | Daisy Jones & The Six | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B254 | P2 | Malibu Rising | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B255 | P2 | Ich und die Menschen | Matt Haig | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B256 | P2 | Wie man die Zeit anhält | Matt Haig | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B257 | P2 | Ein Mann namens Ove | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B258 | P2 | Oma lässt grüßen und sagt, es tut ihr leid | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B259 | P2 | Britt-Marie war hier | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B260 | P2 | Hard Land | Benedict Wells | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B261 | P2 | Die Wahrheit über das Lügen | Benedict Wells | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B262 | P2 | Becks letzter Sommer | Benedict Wells | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B263 | P2 | Mittagsstunde | Dörte Hansen | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B264 | P2 | Zur See | Dörte Hansen | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B265 | P2 | Corpus Delicti | Juli Zeh | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B266 | P2 | Neujahr | Juli Zeh | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B267 | P2 | Über Menschen | Juli Zeh | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B268 | P2 | Der Trafikant | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B269 | P2 | Das Feld | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B270 | P2 | Das Café ohne Namen | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B271 | P2 | Americanah | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B272 | P2 | Die Hälfte der Sonne | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B273 | P2 | Blauer Hibiskus | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B274 | P2 | Tausend strahlende Sonnen | Khaled Hosseini | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B275 | P2 | Traumsammler | Khaled Hosseini | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B276 | P2 | Identitti | Mithu Sanyal | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |

### Historische Romane und Familiensagas

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B277 | P2 | Das Fundament der Ewigkeit | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B278 | P2 | Der Morgen einer neuen Zeit | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B279 | P2 | Die Waffen des Lichts | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B280 | P2 | Sturz der Titanen | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B281 | P2 | Winter der Welt | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B282 | P2 | Kinder der Freiheit | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B283 | P2 | Die Nadel | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B284 | P2 | Das Lächeln der Fortuna | Rebecca Gablé | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B285 | P2 | Die Hüter der Rose | Rebecca Gablé | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B286 | P2 | Das Spiel der Könige | Rebecca Gablé | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B287 | P2 | Der dunkle Thron | Rebecca Gablé | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B288 | P2 | Der Palast der Meere | Rebecca Gablé | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B289 | P2 | Teufelskrone | Rebecca Gablé | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B290 | P2 | Feuer und Stein | Diana Gabaldon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B291 | P2 | Die geliehene Zeit | Diana Gabaldon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B292 | P2 | Ferne Ufer | Diana Gabaldon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B293 | P2 | Der Ruf der Trommel | Diana Gabaldon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B294 | P2 | Der Medicus | Noah Gordon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B295 | P2 | Der Schamane | Noah Gordon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B296 | P2 | Die Erben des Medicus | Noah Gordon | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B297 | P2 | Die Päpstin | Donna W. Cross | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B298 | P2 | Der Name der Rose | Umberto Eco | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B299 | P2 | Die Kathedrale des Meeres | Ildefonso Falcones | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B300 | P2 | Das Spiel des Engels | Carlos Ruiz Zafón | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B301 | P2 | Der Gefangene des Himmels | Carlos Ruiz Zafón | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B302 | P2 | Das Labyrinth der Lichter | Carlos Ruiz Zafón | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B303 | P2 | Alles Licht, das wir nicht sehen | Anthony Doerr | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B304 | P2 | Die Nachtigall | Kristin Hannah | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B305 | P2 | Die vier Winde | Kristin Hannah | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B306 | P2 | Ein einfaches Leben | Min Jin Lee | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B307 | P2 | Heimkehren | Yaa Gyasi | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B308 | P2 | Wölfe | Hilary Mantel | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B309 | P2 | Falken | Hilary Mantel | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B310 | P2 | Spiegel und Licht | Hilary Mantel | Historische Romane und Familiensagas | offen | Vorschlag | — | — |

### Klassiker und Weltliteratur

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B311 | P3 | Verstand und Gefühl | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B312 | P3 | Emma | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B313 | P3 | Überredung | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B314 | P3 | Mansfield Park | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B315 | P3 | Die Abtei von Northanger | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B316 | P3 | Oliver Twist | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B317 | P3 | Große Erwartungen | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B318 | P3 | David Copperfield | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B319 | P3 | Eine Weihnachtsgeschichte | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B320 | P3 | Eine Geschichte aus zwei Städten | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B321 | P3 | Schuld und Sühne | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B322 | P3 | Die Brüder Karamasow | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B323 | P3 | Der Idiot | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B324 | P3 | Die Dämonen | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B325 | P3 | Anna Karenina | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B326 | P3 | Krieg und Frieden | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B327 | P3 | Der Tod des Iwan Iljitsch | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B328 | P3 | Die Elenden | Victor Hugo | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B329 | P3 | Der Glöckner von Notre-Dame | Victor Hugo | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B330 | P3 | Der Graf von Monte Christo | Alexandre Dumas | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B331 | P3 | Die drei Musketiere | Alexandre Dumas | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B332 | P3 | Madame Bovary | Gustave Flaubert | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B333 | P3 | Germinal | Émile Zola | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B334 | P3 | Don Quijote | Miguel de Cervantes | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B335 | P3 | Moby-Dick | Herman Melville | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B336 | P3 | Die Abenteuer des Tom Sawyer | Mark Twain | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B337 | P3 | Die Abenteuer des Huckleberry Finn | Mark Twain | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B338 | P3 | Wer die Nachtigall stört | Harper Lee | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B339 | P3 | Früchte des Zorns | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B340 | P3 | Von Mäusen und Menschen | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B341 | P3 | Jenseits von Eden | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B342 | P3 | In einem andern Land | Ernest Hemingway | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B343 | P3 | Wem die Stunde schlägt | Ernest Hemingway | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B344 | P3 | Hundert Jahre Einsamkeit | Gabriel García Márquez | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B345 | P3 | Die Liebe in den Zeiten der Cholera | Gabriel García Márquez | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B346 | P3 | Chronik eines angekündigten Todes | Gabriel García Márquez | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B347 | P3 | Das Geisterhaus | Isabel Allende | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B348 | P3 | Menschenkind | Toni Morrison | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B349 | P3 | Sehr blaue Augen | Toni Morrison | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B350 | P3 | Mrs Dalloway | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B351 | P3 | Zum Leuchtturm | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B352 | P3 | Orlando | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B353 | P3 | Siddhartha | Hermann Hesse | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B354 | P3 | Demian | Hermann Hesse | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B355 | P3 | Narziss und Goldmund | Hermann Hesse | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B356 | P3 | Unterm Rad | Hermann Hesse | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B357 | P3 | Das Glasperlenspiel | Hermann Hesse | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B358 | P3 | Buddenbrooks | Thomas Mann | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B359 | P3 | Der Zauberberg | Thomas Mann | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B360 | P3 | Der Tod in Venedig | Thomas Mann | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B361 | P3 | Der Prozess | Franz Kafka | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B362 | P3 | Das Schloss | Franz Kafka | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B363 | P3 | Brief an den Vater | Franz Kafka | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B364 | P3 | Schachnovelle | Stefan Zweig | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B365 | P3 | Ungeduld des Herzens | Stefan Zweig | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B366 | P3 | Sternstunden der Menschheit | Stefan Zweig | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B367 | P3 | Im Westen nichts Neues | Erich Maria Remarque | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B368 | P3 | Drei Kameraden | Erich Maria Remarque | Klassiker und Weltliteratur | offen | Vorschlag | — | — |

### Kinderbücher und Vorlesebücher

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B369 | P2 | Pippi geht an Bord | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B370 | P2 | Pippi in Taka-Tuka-Land | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B371 | P2 | Wir Kinder aus Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B372 | P2 | Mehr von uns Kindern aus Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B373 | P2 | Immer lustig in Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B374 | P2 | Michel in der Suppenschüssel | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B375 | P2 | Michel muss mehr Männchen machen | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B376 | P2 | Michel bringt die Welt in Ordnung | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B377 | P2 | Karlsson vom Dach | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B378 | P2 | Kalle Blomquist – Meisterdetektiv | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B379 | P2 | Mio, mein Mio | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B380 | P2 | Ferien auf Saltkrokan | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B381 | P2 | Madita | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B382 | P2 | Die kleine Hexe | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B383 | P2 | Das kleine Gespenst | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B384 | P2 | Der kleine Wassermann | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B385 | P2 | Der Räuber Hotzenplotz | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B386 | P2 | Neues vom Räuber Hotzenplotz | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B387 | P2 | Hotzenplotz 3 | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B388 | P2 | Krabat | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B389 | P2 | Jim Knopf und Lukas der Lokomotivführer | Michael Ende | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B390 | P2 | Jim Knopf und die Wilde 13 | Michael Ende | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B391 | P2 | Der satanarchäolügenialkohöllische Wunschpunsch | Michael Ende | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B392 | P2 | Das doppelte Lottchen | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B393 | P2 | Pünktchen und Anton | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B394 | P2 | Das fliegende Klassenzimmer | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B395 | P2 | Der 35. Mai | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B396 | P2 | Emil und die drei Zwillinge | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B397 | P2 | Eine Woche voller Samstage | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B398 | P2 | Am Samstag kam das Sams zurück | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B399 | P2 | Neue Punkte für das Sams | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B400 | P2 | Lippels Traum | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B401 | P2 | Matilda | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B402 | P2 | Charlie und die Schokoladenfabrik | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B403 | P2 | Hexen hexen | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B404 | P2 | James und der Riesenpfirsich | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B405 | P2 | Der fantastische Mr. Fox | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B406 | P2 | Drachenreiter | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B407 | P2 | Igraine Ohnefurcht | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B408 | P2 | Kleiner Werwolf | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B409 | P2 | Die wilden Hühner | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B410 | P2 | Die wilden Hühner auf Klassenfahrt | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B411 | P2 | Rico, Oskar und die Tieferschatten | Andreas Steinhöfel | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B412 | P2 | Rico, Oskar und das Herzgebreche | Andreas Steinhöfel | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B413 | P2 | Rico, Oskar und der Diebstahlstein | Andreas Steinhöfel | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B414 | P2 | Als Hitler das rosa Kaninchen stahl | Judith Kerr | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B415 | P2 | Oh, wie schön ist Panama | Janosch | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B416 | P2 | Post für den Tiger | Janosch | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B417 | P2 | Urmel aus dem Eis | Max Kruse | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B418 | P2 | Timm Thaler oder Das verkaufte Lachen | James Krüss | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |

### Jugendbücher und Young Adult

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B419 | P2 | Die Tribute von Panem – Gefährliche Liebe | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B420 | P2 | Die Tribute von Panem – Flammender Zorn | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B421 | P2 | Die Tribute von Panem X – Das Lied von Vogel und Schlange | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B422 | P2 | Die Tribute von Panem L – Der Tag bricht an | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B423 | P2 | Percy Jackson – Diebe im Olymp | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B424 | P2 | Percy Jackson – Im Bann des Zyklopen | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B425 | P2 | Percy Jackson – Der Fluch des Titanen | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B426 | P2 | Percy Jackson – Die Schlacht um das Labyrinth | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B427 | P2 | Percy Jackson – Die letzte Göttin | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B428 | P2 | Helden des Olymp – Der verschwundene Halbgott | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B429 | P2 | Helden des Olymp – Der Sohn des Neptun | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B430 | P2 | Helden des Olymp – Das Zeichen der Athene | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B431 | P2 | Helden des Olymp – Das Haus des Hades | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B432 | P2 | Helden des Olymp – Das Blut des Olymp | Rick Riordan | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B433 | P2 | Erebos 2 | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B434 | P2 | Saeculum | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B435 | P2 | Thalamus | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B436 | P2 | Elanus | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B437 | P2 | Aquila | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B438 | P2 | Cryptos | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B439 | P2 | Silber – Das erste Buch der Träume | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B440 | P2 | Silber – Das zweite Buch der Träume | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B441 | P2 | Silber – Das dritte Buch der Träume | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B442 | P2 | Wolkenschloss | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B443 | P2 | Vergissmeinnicht – Was man bei Licht nicht sehen kann | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B444 | P2 | Vergissmeinnicht – Was bisher verloren war | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B445 | P2 | Vergissmeinnicht – Was die Welt zusammenhält | Kerstin Gier | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B446 | P2 | Eine wie Alaska | John Green | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B447 | P2 | Margos Spuren | John Green | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B448 | P2 | Schlaft gut, ihr fiesen Gedanken | John Green | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B449 | P2 | Bis(s) zum Morgengrauen | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B450 | P2 | Bis(s) zur Mittagsstunde | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B451 | P2 | Bis(s) zum Abendrot | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B452 | P2 | Bis(s) zum Ende der Nacht | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B453 | P2 | Die Bestimmung | Veronica Roth | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B454 | P2 | Die Bestimmung – Tödliche Wahrheit | Veronica Roth | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B455 | P2 | Die Bestimmung – Letzte Entscheidung | Veronica Roth | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B456 | P2 | Die Auserwählten – Im Labyrinth | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B457 | P2 | Die Auserwählten – In der Brandwüste | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B458 | P2 | Die Auserwählten – In der Todeszone | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B459 | P2 | Der Goldene Kompass | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B460 | P2 | Das Magische Messer | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B461 | P2 | Das Bernstein-Teleskop | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B462 | P2 | Loveless | Alice Oseman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B463 | P2 | Radio Silence | Alice Oseman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B464 | P2 | The Hate U Give | Angie Thomas | Jugendbücher und Young Adult | offen | Vorschlag | — | — |

### Sachbücher, Wissen und Biografien

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B465 | P2 | Homo Deus | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B466 | P2 | 21 Lektionen für das 21. Jahrhundert | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B467 | P2 | Nexus | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B468 | P2 | Eine kurze Geschichte von fast allem | Bill Bryson | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B469 | P2 | Eine kurze Geschichte des menschlichen Körpers | Bill Bryson | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B470 | P2 | Eine kurze Geschichte der Zeit | Stephen Hawking | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B471 | P2 | Das Universum in der Nussschale | Stephen Hawking | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B472 | P2 | Kurze Antworten auf große Fragen | Stephen Hawking | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B473 | P2 | Kosmos | Carl Sagan | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B474 | P2 | Der Drache in meiner Garage | Carl Sagan | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B475 | P2 | Sieben kurze Lektionen über Physik | Carlo Rovelli | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B476 | P2 | Die Ordnung der Zeit | Carlo Rovelli | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B477 | P2 | Das geheime Leben der Bäume | Peter Wohlleben | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B478 | P2 | Das Seelenleben der Tiere | Peter Wohlleben | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B479 | P2 | Darm mit Charme | Giulia Enders | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B480 | P2 | Komisch, alles chemisch! | Mai Thi Nguyen-Kim | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B481 | P2 | Die kleinste gemeinsame Wirklichkeit | Mai Thi Nguyen-Kim | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B482 | P2 | Factfulness | Hans Rosling / Ola Rosling / Anna Rosling Rönnlund | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B483 | P2 | Im Grunde gut | Rutger Bregman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B484 | P2 | Utopien für Realisten | Rutger Bregman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B485 | P2 | Schnelles Denken, langsames Denken | Daniel Kahneman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B486 | P2 | Die 1%-Methode | James Clear | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B487 | P2 | Die Macht der Gewohnheit | Charles Duhigg | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B488 | P2 | Konzentriert arbeiten | Cal Newport | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B489 | P2 | Digitaler Minimalismus | Cal Newport | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B490 | P2 | … trotzdem Ja zum Leben sagen | Viktor E. Frankl | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B491 | P2 | Ich bin hier, und alles ist jetzt | Edith Eger | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B492 | P2 | Becoming | Michelle Obama | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B493 | P2 | Das Licht in uns | Michelle Obama | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B494 | P2 | Ein verheißenes Land | Barack Obama | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B495 | P2 | Der lange Weg zur Freiheit | Nelson Mandela | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B496 | P2 | Tagebuch | Anne Frank | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B497 | P2 | Ich bin Malala | Malala Yousafzai / Christina Lamb | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B498 | P2 | Befreit | Tara Westover | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B499 | P2 | Die Selbstgerechten | Sahra Wagenknecht | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B500 | P2 | Unsichtbare Frauen | Caroline Criado-Perez | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B501 | P2 | Mehr Feminismus! | Chimamanda Ngozi Adichie | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B502 | P2 | Liebe Ijeawele | Chimamanda Ngozi Adichie | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B503 | P2 | Anfänge | David Graeber / David Wengrow | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B504 | P2 | Bullshit Jobs | David Graeber | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |

### Horror, Spannung und dunkle Fantastik

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B505 | P2 | Carrie | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B506 | P2 | Brennen muss Salem | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B507 | P2 | The Stand – Das letzte Gefecht | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B508 | P2 | Cujo | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B509 | P2 | Christine | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B510 | P2 | Dolores | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B511 | P2 | The Green Mile | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B512 | P2 | Der Anschlag | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B513 | P2 | Joyland | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B514 | P2 | Das Institut | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B515 | P2 | Fairy Tale | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B516 | P2 | Holly | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B517 | P2 | Der dunkle Turm – Schwarz | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B518 | P2 | Der dunkle Turm – Drei | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B519 | P2 | Der dunkle Turm – tot. | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B520 | P2 | Der Talisman | Stephen King / Peter Straub | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B521 | P2 | Spuk in Hill House | Shirley Jackson | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B522 | P2 | Wir haben schon immer im Schloss gelebt | Shirley Jackson | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B523 | P2 | Berge des Wahnsinns | H. P. Lovecraft | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B524 | P2 | Der Ruf des Cthulhu | H. P. Lovecraft | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B525 | P2 | Das Gespenst von Canterville | Oscar Wilde | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B526 | P2 | Der seltsame Fall des Dr. Jekyll und Mr. Hyde | Robert Louis Stevenson | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B527 | P2 | Coraline | Neil Gaiman | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B528 | P2 | Das Graveyard-Buch | Neil Gaiman | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B529 | P2 | Das Haus – House of Leaves | Mark Z. Danielewski | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |

## Vorgehen pro Paket

1. Aus dem Gesamtvorrat das nächste Paket von 20–30 Einträgen nach Priorität auswählen. Status auf `Recherche` setzen und Namen oder KI-/Sitzungskennung mit Datum eintragen; bereits übernommene Einträge respektieren.
2. Gegen den aktuellen Datenbankbestand prüfen. Gefundene Bücher als `Bereits vorhanden` markieren und verlinken. Fehlende Bücher weiter recherchieren.
3. Konkrete Ausgabe wählen und ISBN ergänzen. Titel, Autorenzuordnung, Verlag, Sprache, Erscheinungsjahr, Seitenzahl, Genre, Altersempfehlung, Beschreibung, Cover und Kauf-Link prüfen. Quellen und offene Punkte in den Notizen unten dokumentieren.
4. Wenn vollständig, auf `Bereit` setzen. Beim Einbau vorhandene Autorenprofile wiederverwenden und die bestehende Katalog-/Importlogik beachten.
5. Nach dem Speichern Detailseite einschließlich Cover und Kauf-Link prüfen, dann auf `Eingebaut` setzen. Buch-ID/URL und Prüfdatum ergänzen; vorhandene Katalogübersichten bei einer Aktualisierung konsistent halten.

Die Liste dient der Planung. Ihre Bearbeitung importiert noch keine Bücher in die App.

## Recherchequellen und Notizen

Titel und Reihenfolge der Harry-Potter-Ergänzungen: [Carlsen: Harry Potter](https://www.carlsen.de/reihe/harry-potter). Saphirblau und Smaragdgrün: [Arena-Verlagsvorschau Herbst 2025](https://www.arena-verlag.de/sites/default/files/2025-04/VORSCHAU___2025_HE__JUGENDBUCH.pdf). Diese Quellen dienen als Rechercheeinstieg; eine konkrete Ausgabe wurde für die Liste noch nicht festgelegt. Weitere Rechercheeinstiege: [dtv: Sarah J. Maas](https://www.dtv.de/specials/sarah-j-maas), [Thienemann: Otfried Preußler](https://www.thienemann.de/100-jahre-preussler) und [C.H.Beck: Yuval Noah Harari](https://www.chbeck.de/buehnen/yuval-noah-harari-bei-chbeck/). Die Erweiterung ist eine Sammlung von Vorschlägen, keine vollständig bibliografisch verifizierte Importdatei. Für jeden Eintrag bleiben die Prüfung des exakten Ausgabentitels, die Quellenprüfung, ISBN-Recherche und der aktuelle Bestandsabgleich erforderlich.

Technische Einstiegspunkte: [Buchdatenmodell](./lib/books.ts), [ISBN-Abfrage und Kauf-Links](./lib/book-fetcher.ts), [Katalogabfrage und Sichtbarkeitsfilter](./app/api/books/discover/route.ts) und [bisheriger Katalogleitfaden](./docs/katalog_leitfaden.html).

Neue Erkenntnisse unter der jeweiligen stabilen ID ergänzen, etwa:

> B001 – Datum – Bearbeiter: Quelle für die gewählte Ausgabe; fehlende Angaben oder Ergebnis der Prüfung.

Neue Vorschläge im passenden Bereich mit der nächsten freien ID anfügen (aktuell B530). IDs bereichsübergreifend fortlaufend vergeben und die Zahlen in der Umfangstabelle aktualisieren. Abgeschlossene oder zurückgestellte Einträge zur Nachvollziehbarkeit behalten. Keine Zugangsdaten oder Inhalte aus Umgebungsdateien in diese Liste übernehmen.

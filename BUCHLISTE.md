# Buchliste – nächste Ergänzungen für BuchArena

Zentrale Arbeitsliste für alle Entwickler und KI-Assistenten, die den Buchkatalog erweitern. Hier Vorschläge sammeln, recherchieren, Aufgaben übernehmen und abgeschlossene Einträge dokumentieren.

Angelegt und erweitert am **14.11.2026**. Nach dem Live-Abgleich am **15.11.2026** bleiben **355 offene Buchvorschläge**. Die Auswahl ist ein redaktioneller Vorschlag: zuerst bestehende Reihen ergänzen, danach weitere Genres und Autoren ausbauen. Die Prioritäten können gemeinsam angepasst werden.

## Ausgangsbestand und Abgleich

- Die vorhandene [Katalogübersicht als CSV](./docs/BuchArena_Katalogbuecher_Uebersicht.csv) enthält **80 Bücher** beim Anlegen dieser Liste; zusätzlich gibt es eine [Excel-Übersicht](./docs/BuchArena_Katalogbuecher_Uebersicht.xlsx).
- Beim Live-Abgleich am **15.11.2026** wurden **2.360 Buchdatensätze** geprüft; insgesamt **279 bereits vorhandene Titel** wurden aus dieser offenen Liste entfernt. Die unten verbliebenen 355 Titel waren bei diesem Abgleich nicht im Live-Bestand; vor jedem späteren Import trotzdem erneut prüfen.
- Vor dem Einbau ISBN normalisieren und im aktuellen Bestand prüfen; zusätzlich Titel, Autor und Reihenteil vergleichen, damit andere Ausgaben nicht unbemerkt doppelt angelegt werden. Die öffentliche Katalogansicht kann durch Sichtbarkeitseinstellungen Bücher ausblenden.
- `offen` bedeutet: konkrete **deutschsprachige Ausgabe** und ISBN müssen noch recherchiert werden. In die App werden ausschließlich deutsche Sprachversionen importiert; fremdsprachige ISBNs zählen nicht als Ersatz. ISBN, Seitenzahl, Erscheinungsjahr und Cover immer auf dieselbe Ausgabe beziehen.

## Umfang und Navigation

| Bereich | Offene Vorschläge |
| --- | ---: |
| Fantasy und Romantasy | 1 |
| Fantasy und Science-Fiction | 10 |
| Historische Romane und Familiensagas | 6 |
| Horror, Spannung und dunkle Fantastik | 4 |
| Jugendbücher und Young Adult | 21 |
| Kinder und Jugend | 6 |
| Kinderbücher und Vorlesebücher | 22 |
| Krimi und Thriller | 66 |
| Liebe, Familie und Gegenwartsliteratur | 60 |
| Romane und Gegenwart | 19 |
| Sachbuch und Biografie | 14 |
| Sachbücher, Wissen und Biografien | 40 |
| Science-Fiction und Dystopien | 27 |
| Klassiker und Weltliteratur | 59 |
| **Gesamt** | **355** |

Die Zahlen beziehen sich ausschließlich auf noch nicht im Live-Bestand gefundene Vorschläge. Vor jedem Import erneut gegen MongoDB prüfen.

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

Die IDs werden nach jedem Live-Abgleich fortlaufend vergeben. `Bereits vorhanden`-Titel werden aus der offenen Liste entfernt; der Live-Bestand ist maßgeblich.

| ID | Prio | Titel | Autor/in | Reihe / Schwerpunkt | ISBN-13 | Status | Zuständig / seit | Buch-ID/URL / geprüft am |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B001 | P2 | Das Labyrinth der Träumenden Bücher | Walter Moers | Fantasy und Romantasy | offen | Vorschlag | — | — |
| B002 | P2 | Das Tor der Welt | N. K. Jemisin | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B003 | P2 | Der wilde Planet | John Scalzi | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B004 | P2 | Die Elfenkönigin | Bernhard Hennen | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B005 | P2 | Die fünfte Jahreszeit | N. K. Jemisin | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B006 | P2 | Die Geschichte des Wassers | Maja Lunde | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B007 | P2 | Die große Stille | Ted Chiang | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B008 | P2 | Die Maschinen | Ann Leckie | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B009 | P2 | Die Parabel vom Sämann | Octavia E. Butler | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B010 | P2 | Die Seiten der Welt | Kai Meyer | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B011 | P2 | Künstliche Verhältnisse | Martha Wells | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B012 | P2 | Das Fundament der Ewigkeit | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B013 | P2 | Die Päpstin | Donna W. Cross | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B014 | P2 | Die vier Winde | Kristin Hannah | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B015 | P2 | Die Waffen des Lichts | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B016 | P2 | Ein einfaches Leben | Min Jin Lee | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B017 | P2 | Spiegel und Licht | Hilary Mantel | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B018 | P2 | Berge des Wahnsinns | H. P. Lovecraft | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B019 | P2 | Das Haus – House of Leaves | Mark Z. Danielewski | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B020 | P2 | Der Ruf des Cthulhu | H. P. Lovecraft | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B021 | P2 | Holly | Stephen King | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B022 | P2 | Aquila | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B023 | P2 | Bis(s) zum Abendrot | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B024 | P2 | Bis(s) zum Ende der Nacht | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B025 | P2 | Bis(s) zum Morgengrauen | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B026 | P2 | Bis(s) zur Mittagsstunde | Stephenie Meyer | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B027 | P2 | Cryptos | Ursula Poznanski | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B028 | P2 | Das Bernstein-Teleskop | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B029 | P2 | Das Magische Messer | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B030 | P2 | Der Goldene Kompass | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B031 | P2 | Die Auserwählten – Im Labyrinth | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B032 | P2 | Die Auserwählten – In der Brandwüste | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B033 | P2 | Die Auserwählten – In der Todeszone | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B034 | P2 | Die Bestimmung | Veronica Roth | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B035 | P2 | Die Bestimmung – Letzte Entscheidung | Veronica Roth | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B036 | P2 | Die Bestimmung – Tödliche Wahrheit | Veronica Roth | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B037 | P2 | Die Tribute von Panem – Flammender Zorn | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B038 | P2 | Die Tribute von Panem – Gefährliche Liebe | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B039 | P2 | Die Tribute von Panem L – Der Tag bricht an | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B040 | P2 | Die Tribute von Panem X – Das Lied von Vogel und Schlange | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B041 | P2 | Radio Silence | Alice Oseman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B042 | P2 | Schlaft gut, ihr fiesen Gedanken | John Green | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B043 | P2 | Das längste Schnupfen der Welt | Benji Davies | Kinder und Jugend | offen | Vorschlag | — | — |
| B044 | P2 | Der Streik der Farben | Oliver Jeffers | Kinder und Jugend | offen | Vorschlag | — | — |
| B045 | P2 | Für Hund und Katz ist auch noch Platz | Axel Scheffler | Kinder und Jugend | offen | Vorschlag | — | — |
| B046 | P2 | Reckless – Steinernes Fleisch | Cornelia Funke | Kinder und Jugend | offen | Vorschlag | — | — |
| B047 | P2 | Thabo – Detektiv und Gentleman | Kirsten Boie | Kinder und Jugend | offen | Vorschlag | — | — |
| B048 | P2 | Wolfszeit | Nina Blazon | Kinder und Jugend | offen | Vorschlag | — | — |
| B049 | P2 | Als Hitler das rosa Kaninchen stahl | Judith Kerr | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B050 | P2 | Am Samstag kam das Sams zurück | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B051 | P2 | Charlie und die Schokoladenfabrik | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B052 | P2 | Das doppelte Lottchen | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B053 | P2 | Das fliegende Klassenzimmer | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B054 | P2 | Der 35. Mai | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B055 | P2 | Der fantastische Mr. Fox | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B056 | P2 | Eine Woche voller Samstage | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B057 | P2 | Emil und die drei Zwillinge | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B058 | P2 | Hexen hexen | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B059 | P2 | Hotzenplotz 3 | Otfried Preußler | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B060 | P2 | Igraine Ohnefurcht | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B061 | P2 | Immer lustig in Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B062 | P2 | James und der Riesenpfirsich | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B063 | P2 | Kleiner Werwolf | Cornelia Funke | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B064 | P2 | Lippels Traum | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B065 | P2 | Matilda | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B066 | P2 | Mehr von uns Kindern aus Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B067 | P2 | Neue Punkte für das Sams | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B068 | P2 | Oh, wie schön ist Panama | Janosch | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B069 | P2 | Pippi geht an Bord | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B070 | P2 | Post für den Tiger | Janosch | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B071 | P2 | Das Zeichen der Vier | Arthur Conan Doyle | Krimi und Thriller | offen | Vorschlag | — | — |
| B072 | P2 | Der achte Tag | Nicci French | Krimi und Thriller | offen | Vorschlag | — | — |
| B073 | P2 | Der Schneemann | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B074 | P2 | Der Seidenspinner | Robert Galbraith | Krimi und Thriller | offen | Vorschlag | — | — |
| B075 | P2 | Die Betrogene | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B076 | P2 | Die dunklen Wasser von Aberdeen | Stuart MacBride | Krimi und Thriller | offen | Vorschlag | — | — |
| B077 | P2 | Die Einladung | Sebastian Fitzek | Krimi und Thriller | offen | Vorschlag | — | — |
| B078 | P2 | Die Entscheidung | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B079 | P2 | Die Ernte des Bösen | Robert Galbraith | Krimi und Thriller | offen | Vorschlag | — | — |
| B080 | P2 | Die gute Tochter | Karin Slaughter | Krimi und Thriller | offen | Vorschlag | — | — |
| B081 | P2 | Die Hunde von Riga | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B082 | P2 | Die Lebenden und die Toten | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B083 | P2 | Die Morde des Herrn ABC | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B084 | P2 | Die purpurnen Flüsse | Jean-Christophe Grangé | Krimi und Thriller | offen | Vorschlag | — | — |
| B085 | P2 | Die verirrten Kugeln | Richard Osman | Krimi und Thriller | offen | Vorschlag | — | — |
| B086 | P2 | Die verschwundenen Studentinnen | Alex Michaelides | Krimi und Thriller | offen | Vorschlag | — | — |
| B087 | P2 | Die weiße Löwin | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B088 | P2 | Ein Mord wird angekündigt | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B089 | P2 | Ein Teil von ihr | Karin Slaughter | Krimi und Thriller | offen | Vorschlag | — | — |
| B090 | P2 | Eine unbeliebte Frau | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B091 | P2 | Einsame Nacht | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B092 | P2 | Erbarmen | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B093 | P2 | Erlösung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B094 | P2 | Erwartung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B095 | P2 | Finstere Orte | Gillian Flynn | Krimi und Thriller | offen | Vorschlag | — | — |
| B096 | P2 | Girl on the Train – Du kennst sie nicht, aber sie kennt dich | Paula Hawkins | Krimi und Thriller | offen | Vorschlag | — | — |
| B097 | P2 | Grabesgrün | Tana French | Krimi und Thriller | offen | Vorschlag | — | — |
| B098 | P2 | Grießnockerlaffäre | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B099 | P2 | Hannibal | Thomas Harris | Krimi und Thriller | offen | Vorschlag | — | — |
| B100 | P2 | Im Wald | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B101 | P2 | In ewiger Freundschaft | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B102 | P2 | In seinen Händen | Harlan Coben | Krimi und Thriller | offen | Vorschlag | — | — |
| B103 | P2 | Inferno | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B104 | P2 | Kakerlaken | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B105 | P2 | Leopard | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B106 | P2 | Meteor | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B107 | P2 | Mittsommermord | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B108 | P2 | Monster | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B109 | P2 | Mord im Pfarrhaus | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B110 | P2 | Mörder ohne Gesicht | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B111 | P2 | Mordsfreunde | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B112 | P2 | Muttertag | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B113 | P2 | Mystic River | Dennis Lehane | Krimi und Thriller | offen | Vorschlag | — | — |
| B114 | P2 | Ohne Schuld | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B115 | P2 | Origin | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B116 | P2 | Roter Drache | Thomas Harris | Krimi und Thriller | offen | Vorschlag | — | — |
| B117 | P2 | Rotkehlchen | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B118 | P2 | Sakrileg | Dan Brown | Krimi und Thriller | offen | Vorschlag | — | — |
| B119 | P2 | Sauerkrautkoma | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B120 | P2 | Schändung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B121 | P2 | Schweinskopf al dente | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B122 | P2 | Shutter Island | Dennis Lehane | Krimi und Thriller | offen | Vorschlag | — | — |
| B123 | P2 | Tage der Toten | Don Winslow | Krimi und Thriller | offen | Vorschlag | — | — |
| B124 | P2 | Tiefe Wunden | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B125 | P2 | Tod auf dem Nil | Agatha Christie | Krimi und Thriller | offen | Vorschlag | — | — |
| B126 | P2 | Todesfrist | Andreas Gruber | Krimi und Thriller | offen | Vorschlag | — | — |
| B127 | P2 | Todesurteil | Andreas Gruber | Krimi und Thriller | offen | Vorschlag | — | — |
| B128 | P2 | Tote lügen nicht | Kathy Reichs | Krimi und Thriller | offen | Vorschlag | — | — |
| B129 | P2 | Totengleich | Tana French | Krimi und Thriller | offen | Vorschlag | — | — |
| B130 | P2 | Verachtung | Jussi Adler-Olsen | Krimi und Thriller | offen | Vorschlag | — | — |
| B131 | P2 | Verdammnis | Stieg Larsson | Krimi und Thriller | offen | Vorschlag | — | — |
| B132 | P2 | Vergebung | Stieg Larsson | Krimi und Thriller | offen | Vorschlag | — | — |
| B133 | P2 | Wer Wind sät | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B134 | P2 | Winterkartoffelknödel | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B135 | P2 | Wir sehen uns dort oben | Pierre Lemaitre | Krimi und Thriller | offen | Vorschlag | — | — |
| B136 | P2 | Zwetschgendatschikomplott | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B137 | P2 | Americanah | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B138 | P2 | Atlas – Die Geschichte von Pa Salt | Lucinda Riley / Harry Whittaker | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B139 | P2 | Begin Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B140 | P2 | Berühre mich. Nicht. | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B141 | P2 | Blauer Hibiskus | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B142 | P2 | Britt-Marie war hier | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B143 | P2 | Daisy Jones & The Six | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B144 | P2 | Das Café ohne Namen | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B145 | P2 | Das Feld | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B146 | P2 | Das irrationale Vorkommnis der Liebe | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B147 | P2 | Der Trafikant | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B148 | P2 | Die Hälfte der Sonne | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B149 | P2 | Die Mondschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B150 | P2 | Die Perlenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B151 | P2 | Die Schattenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B152 | P2 | Die sieben Männer der Evelyn Hugo | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B153 | P2 | Die Sonnenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B154 | P2 | Die Sturmschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B155 | P2 | Die theoretische Unwahrscheinlichkeit von Liebe | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B156 | P2 | Die verschwundene Schwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B157 | P2 | Dream Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B158 | P2 | Ein ganz neues Leben | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B159 | P2 | Ein ganzes halbes Jahr | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B160 | P2 | Ein Mann namens Ove | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B161 | P2 | Eine Handvoll Worte | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B162 | P2 | Feel Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B163 | P2 | Gespräche mit Freunden | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B164 | P2 | Happy Place – Urlaub mit dem Ex | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B165 | P2 | Hope Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B166 | P2 | Hope Forever | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B167 | P2 | Ich und die Menschen | Matt Haig | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B168 | P2 | Identitti | Mithu Sanyal | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B169 | P2 | Kein Sommer ohne dich | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B170 | P2 | Love, Theoretically | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B171 | P2 | Malibu Rising | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B172 | P2 | Maybe Someday | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B173 | P2 | Mein Herz in zwei Welten | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B174 | P2 | Mittagsstunde | Dörte Hansen | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B175 | P2 | New Beginnings | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B176 | P2 | New Dreams | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B177 | P2 | New Promises | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B178 | P2 | Normale Menschen | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B179 | P2 | November 9 | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B180 | P2 | Nur noch einmal und für immer | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B181 | P2 | Oma lässt grüßen und sagt, es tut ihr leid | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B182 | P2 | Save Us | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B183 | P2 | Save You | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B184 | P2 | Schöne Welt, wo bist du | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B185 | P2 | Someone Else | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B186 | P2 | Someone New | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B187 | P2 | Someone to Stay | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B188 | P2 | Trust Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B189 | P2 | Verity | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B190 | P2 | Verliebt in deine schönsten Seiten | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B191 | P2 | Verliere mich. Nicht. | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B192 | P2 | Weil ich Layken liebe | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B193 | P2 | Weil ich Will liebe | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B194 | P2 | Wie man die Zeit anhält | Matt Haig | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B195 | P2 | Zur See | Dörte Hansen | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B196 | P2 | Zurück ins Leben geliebt | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B197 | P2 | Atemschaukel | Herta Müller | Romane und Gegenwart | offen | Vorschlag | — | — |
| B198 | P2 | Auf Erden sind wir kurz grandios | Ocean Vuong | Romane und Gegenwart | offen | Vorschlag | — | — |
| B199 | P2 | Brüste und Eier | Mieko Kawakami | Romane und Gegenwart | offen | Vorschlag | — | — |
| B200 | P2 | Der Fluch des Hasen | Bora Chung | Romane und Gegenwart | offen | Vorschlag | — | — |
| B201 | P2 | Der Freund | Sigrid Nunez | Romane und Gegenwart | offen | Vorschlag | — | — |
| B202 | P2 | Der Gesang der Flusskrebse – Das Kochbuch | Delia Owens | Romane und Gegenwart | offen | Vorschlag | — | — |
| B203 | P2 | Der Namensvetter | Jhumpa Lahiri | Romane und Gegenwart | offen | Vorschlag | — | — |
| B204 | P2 | Die Gestirne | Eleanor Catton | Romane und Gegenwart | offen | Vorschlag | — | — |
| B205 | P2 | Die Insel der verlorenen Bäume | Elif Shafak | Romane und Gegenwart | offen | Vorschlag | — | — |
| B206 | P2 | Die Interessanten | Meg Wolitzer | Romane und Gegenwart | offen | Vorschlag | — | — |
| B207 | P2 | Die Jahre | Annie Ernaux | Romane und Gegenwart | offen | Vorschlag | — | — |
| B208 | P2 | Die Vegetarierin | Han Kang | Romane und Gegenwart | offen | Vorschlag | — | — |
| B209 | P2 | Die vierzig Geheimnisse der Liebe | Elif Shafak | Romane und Gegenwart | offen | Vorschlag | — | — |
| B210 | P2 | Himmel | Mieko Kawakami | Romane und Gegenwart | offen | Vorschlag | — | — |
| B211 | P2 | Kummer aller Art | Mariana Leky | Romane und Gegenwart | offen | Vorschlag | — | — |
| B212 | P2 | Morgen und Abend | Jon Fosse | Romane und Gegenwart | offen | Vorschlag | — | — |
| B213 | P2 | Outline | Rachel Cusk | Romane und Gegenwart | offen | Vorschlag | — | — |
| B214 | P2 | Was man von hier aus sehen kann | Mariana Leky | Romane und Gegenwart | offen | Vorschlag | — | — |
| B215 | P2 | Zum Paradies | Hanya Yanagihara | Romane und Gegenwart | offen | Vorschlag | — | — |
| B216 | P2 | Alte Wege | Robert Macfarlane | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B217 | P2 | Challenger | Sally Ride | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B218 | P2 | Das Vermächtnis | Jane Goodall | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B219 | P2 | Der Mann, der seine Frau mit einem Hut verwechselte | Oliver Sacks | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B220 | P2 | Die Macht der Geographie | Tim Marshall | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B221 | P2 | Die Mutter aller Fragen | Rebecca Solnit | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B222 | P2 | Die Welt aus den Angeln | Philipp Blom | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B223 | P2 | Eichmann in Jerusalem | Hannah Arendt | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B224 | P2 | Ein Leben auf unserer Erde | David Attenborough | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B225 | P2 | Haben oder Sein | Erich Fromm | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B226 | P2 | Kollaps | Jared Diamond | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B227 | P2 | Mythos | Stephen Fry | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B228 | P2 | Sapiens – Eine kurze Geschichte der Menschheit | Yuval Noah Harari | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B229 | P2 | Warum Zebras keine Migräne bekommen | Robert Sapolsky | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B230 | P2 | … trotzdem Ja zum Leben sagen | Viktor E. Frankl | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B231 | P2 | 21 Lektionen für das 21. Jahrhundert | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B232 | P2 | Anfänge | David Graeber / David Wengrow | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B233 | P2 | Becoming | Michelle Obama | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B234 | P2 | Befreit | Tara Westover | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B235 | P2 | Bullshit Jobs | David Graeber | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B236 | P2 | Darm mit Charme | Giulia Enders | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B237 | P2 | Das geheime Leben der Bäume | Peter Wohlleben | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B238 | P2 | Das Licht in uns | Michelle Obama | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B239 | P2 | Das Seelenleben der Tiere | Peter Wohlleben | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B240 | P2 | Das Universum in der Nussschale | Stephen Hawking | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B241 | P2 | Der Drache in meiner Garage | Carl Sagan | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B242 | P2 | Der lange Weg zur Freiheit | Nelson Mandela | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B243 | P2 | Die 1%-Methode | James Clear | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B244 | P2 | Die kleinste gemeinsame Wirklichkeit | Mai Thi Nguyen-Kim | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B245 | P2 | Die Macht der Gewohnheit | Charles Duhigg | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B246 | P2 | Die Ordnung der Zeit | Carlo Rovelli | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B247 | P2 | Die Selbstgerechten | Sahra Wagenknecht | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B248 | P2 | Digitaler Minimalismus | Cal Newport | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B249 | P2 | Ein verheißenes Land | Barack Obama | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B250 | P2 | Eine kurze Geschichte der Zeit | Stephen Hawking | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B251 | P2 | Eine kurze Geschichte des menschlichen Körpers | Bill Bryson | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B252 | P2 | Eine kurze Geschichte von fast allem | Bill Bryson | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B253 | P2 | Factfulness | Hans Rosling / Ola Rosling / Anna Rosling Rönnlund | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B254 | P2 | Homo Deus | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B255 | P2 | Ich bin hier, und alles ist jetzt | Edith Eger | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B256 | P2 | Ich bin Malala | Malala Yousafzai / Christina Lamb | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B257 | P2 | Im Grunde gut | Rutger Bregman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B258 | P2 | Komisch, alles chemisch! | Mai Thi Nguyen-Kim | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B259 | P2 | Konzentriert arbeiten | Cal Newport | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B260 | P2 | Kosmos | Carl Sagan | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B261 | P2 | Kurze Antworten auf große Fragen | Stephen Hawking | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B262 | P2 | Liebe Ijeawele | Chimamanda Ngozi Adichie | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B263 | P2 | Mehr Feminismus! | Chimamanda Ngozi Adichie | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B264 | P2 | Nexus | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B265 | P2 | Schnelles Denken, langsames Denken | Daniel Kahneman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B266 | P2 | Sieben kurze Lektionen über Physik | Carlo Rovelli | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B267 | P2 | Tagebuch | Anne Frank | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B268 | P2 | Unsichtbare Frauen | Caroline Criado-Perez | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B269 | P2 | Utopien für Realisten | Rutger Bregman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B270 | P2 | 2001 – Odyssee im Weltraum | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B271 | P2 | Abaddons Tor | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B272 | P2 | Alles, was wir geben mussten | Kazuo Ishiguro | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B273 | P2 | Artemis | Andy Weir | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B274 | P2 | Blumen für Algernon | Daniel Keyes | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B275 | P2 | Calibans Krieg | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B276 | P2 | Das Licht der letzten Tage | Emily St. John Mandel | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B277 | P2 | Das Meer der endlosen Ruhe | Emily St. John Mandel | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B278 | P2 | Das Orakel vom Berge | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B279 | P2 | Der futurologische Kongress | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B280 | P2 | Der lange Weg zu einem kleinen zornigen Planeten | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B281 | P2 | Die letzte Generation | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B282 | P2 | Die nackte Sonne | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B283 | P2 | Die Ordensburg des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B284 | P2 | Die Stahlhöhlen | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B285 | P2 | Die wandernde Erde | Liu Cixin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B286 | P2 | Ich, der Robot | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B287 | P2 | Klara und die Sonne | Kazuo Ishiguro | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B288 | P2 | Leviathan erwacht | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B289 | P2 | Ready Player One | Ernest Cline | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B290 | P2 | Rendezvous mit Rama | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B291 | P2 | Solaris | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B292 | P2 | Sterntagebücher | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B293 | P2 | Träumen Androiden von elektrischen Schafen? | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B294 | P2 | Ubik | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B295 | P2 | Unter uns die Nacht | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B296 | P2 | Zwischen zwei Sternen | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B297 | P3 | Anna Karenina | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B298 | P3 | Brief an den Vater | Franz Kafka | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B299 | P3 | David Copperfield | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B300 | P3 | Der eingebildete Kranke | Molière | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B301 | P3 | Der Ekel | Jean-Paul Sartre | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B302 | P3 | Der Glöckner von Notre-Dame | Victor Hugo | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B303 | P3 | Der Graf von Monte Christo | Alexandre Dumas | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B304 | P3 | Der Idiot | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B305 | P3 | Der letzte Mensch | Mary Shelley | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B306 | P3 | Der Tod des Iwan Iljitsch | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B307 | P3 | Der Tod in Venedig | Thomas Mann | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B308 | P3 | Deutschland. Ein Wintermärchen | Heinrich Heine | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B309 | P3 | Die Abenteuer des Huckleberry Finn | Mark Twain | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B310 | P3 | Die Abenteuer des Tom Sawyer | Mark Twain | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B311 | P3 | Die Abtei von Northanger | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B312 | P3 | Die Brüder Karamasow | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B313 | P3 | Die Dämonen | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B314 | P3 | Die drei Musketiere | Alexandre Dumas | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B315 | P3 | Die Elenden | Victor Hugo | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B316 | P3 | Die göttliche Komödie | Dante Alighieri | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B317 | P3 | Die Pest | Albert Camus | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B318 | P3 | Die Räuber | Friedrich Schiller | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B319 | P3 | Don Quijote | Miguel de Cervantes | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B320 | P3 | Duineser Elegien | Rainer Maria Rilke | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B321 | P3 | Effi Briest | Theodor Fontane | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B322 | P3 | Eine Geschichte aus zwei Städten | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B323 | P3 | Eine Weihnachtsgeschichte | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B324 | P3 | Emma | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B325 | P3 | Faust. Der Tragödie erster Teil | Johann Wolfgang von Goethe | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B326 | P3 | Früchte des Zorns | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B327 | P3 | Germinal | Émile Zola | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B328 | P3 | Große Erwartungen | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B329 | P3 | Hamlet | William Shakespeare | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B330 | P3 | Herz der Finsternis | Joseph Conrad | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B331 | P3 | Ilias | Homer | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B332 | P3 | In einem andern Land | Ernest Hemingway | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B333 | P3 | Jenseits von Eden | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B334 | P3 | König Ödipus | Sophokles | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B335 | P3 | Krieg und Frieden | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B336 | P3 | Macbeth | William Shakespeare | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B337 | P3 | Madame Bovary | Gustave Flaubert | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B338 | P3 | Mansfield Park | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B339 | P3 | Menschenkind | Toni Morrison | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B340 | P3 | Middlemarch | George Eliot | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B341 | P3 | Moby-Dick | Herman Melville | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B342 | P3 | Mrs Dalloway | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B343 | P3 | Odyssee | Homer | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B344 | P3 | Oliver Twist | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B345 | P3 | Orlando | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B346 | P3 | Romeo und Julia | William Shakespeare | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B347 | P3 | Schuld und Sühne | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B348 | P3 | Sehr blaue Augen | Toni Morrison | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B349 | P3 | Überredung | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B350 | P3 | Verstand und Gefühl | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B351 | P3 | Von Mäusen und Menschen | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B352 | P3 | Wem die Stunde schlägt | Ernest Hemingway | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B353 | P3 | Wer die Nachtigall stört | Harper Lee | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B354 | P3 | Woyzeck | Georg Büchner | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B355 | P3 | Zum Leuchtturm | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |

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

Neue Vorschläge im passenden Bereich mit der nächsten freien ID anfügen (aktuell B537). IDs bereichsübergreifend fortlaufend vergeben und die Zahlen in der Umfangstabelle aktualisieren. Abgeschlossene oder zurückgestellte Einträge zur Nachvollziehbarkeit behalten. Keine Zugangsdaten oder Inhalte aus Umgebungsdateien in diese Liste übernehmen.

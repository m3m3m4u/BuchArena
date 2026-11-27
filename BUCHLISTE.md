# Buchliste – nächste Ergänzungen für BuchArena

Zentrale Arbeitsliste für alle Entwickler und KI-Assistenten, die den Buchkatalog erweitern. Hier Vorschläge sammeln, recherchieren, Aufgaben übernehmen und abgeschlossene Einträge dokumentieren.

Angelegt und erweitert am **14.11.2026**. Nach dem Live-Abgleich und Import am **26.11.2026** bleiben **168 offene Buchvorschläge**; 124 Einträge dieses Arbeitsstands sind eingebaut und 1 Eintrag ist zurückgestellt. Die Auswahl ist ein redaktioneller Vorschlag: zuerst bestehende Reihen ergänzen, danach weitere Genres und Autoren ausbauen. Die Prioritäten können gemeinsam angepasst werden.

## Ausgangsbestand und Abgleich

- Die vorhandene [Katalogübersicht als CSV](./docs/BuchArena_Katalogbuecher_Uebersicht.csv) enthält **80 Bücher** beim Anlegen dieser Liste; zusätzlich gibt es eine [Excel-Übersicht](./docs/BuchArena_Katalogbuecher_Uebersicht.xlsx).
- Beim Live-Abgleich am **26.11.2026** wurden vor dem aktuellen Paket **2.615 Buchdatensätze** geprüft. Aus dieser Liste wurden anschließend 62 weitere Titel eingebaut; der aktuelle Live-Bestand umfasst **2.677 Bücher**. Insgesamt sind damit 124 Einträge dieser Arbeitsliste eingebaut. Eingebaute Einträge bleiben mit Buch-ID und Prüfdatum als Arbeitsnachweis in dieser Liste erhalten.
- Vor dem Einbau ISBN normalisieren und im aktuellen Bestand prüfen; zusätzlich Titel, Autor und Reihenteil vergleichen, damit andere Ausgaben nicht unbemerkt doppelt angelegt werden. Die öffentliche Katalogansicht kann durch Sichtbarkeitseinstellungen Bücher ausblenden.
- `offen` bedeutet: konkrete **deutschsprachige Ausgabe** und ISBN müssen noch recherchiert werden. In die App werden ausschließlich deutsche Sprachversionen importiert; fremdsprachige ISBNs zählen nicht als Ersatz. ISBN, Seitenzahl, Erscheinungsjahr und Cover immer auf dieselbe Ausgabe beziehen.

## Umfang und Navigation

| Bereich | Offene Vorschläge |
| --- | ---: |
| Fantasy und Romantasy | 0 |
| Fantasy und Science-Fiction | 1 |
| Historische Romane und Familiensagas | 5 |
| Horror, Spannung und dunkle Fantastik | 2 |
| Jugendbücher und Young Adult | 5 |
| Kinder und Jugend | 3 |
| Kinderbücher und Vorlesebücher | 9 |
| Krimi und Thriller | 13 |
| Liebe, Familie und Gegenwartsliteratur | 23 |
| Romane und Gegenwart | 8 |
| Sachbuch und Biografie | 5 |
| Sachbücher, Wissen und Biografien | 8 |
| Science-Fiction und Dystopien | 27 |
| Klassiker und Weltliteratur | 59 |
| **Gesamt** | **168** |

Die Zahlen beziehen sich ausschließlich auf Einträge mit Status `Vorschlag`, `Recherche` oder `Bereit`. Eingebaute und zurückgestellte Einträge sind nicht mitgezählt. Vor jedem Import erneut gegen MongoDB prüfen.

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
| B001 | P2 | Das Labyrinth der Träumenden Bücher | Walter Moers | Fantasy und Romantasy | 9783813503937 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d6d0764666b9d1dd4f / geprüft am 26.11.2026 |
| B002 | P2 | Brennender Fels | N. K. Jemisin | Fantasy und Science-Fiction | 9783426525166 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d6d0764666b9d1dd51 / geprüft am 26.11.2026 |
| B003 | P2 | Der wilde Planet | John Scalzi | Fantasy und Science-Fiction | offen | Zurückgestellt | Codex / 26.11.2026 | Keine deutsche Buchausgabe dieses Titels von John Scalzi nachweisbar |
| B004 | P2 | Elfenkönigin | Bernhard Hennen | Fantasy und Science-Fiction | 9783453315693 | Eingebaut | Codex / 26.11.2026 | /buch/6b0844085752d09a9bc88773 / geprüft am 26.11.2026 |
| B005 | P2 | Zerrissene Erde | N. K. Jemisin | Fantasy und Science-Fiction | 9783426521786 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d7d0764666b9d1dd52 / geprüft am 26.11.2026 |
| B006 | P2 | Die Geschichte des Wassers | Maja Lunde | Fantasy und Science-Fiction | 9783442718313 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d7d0764666b9d1dd54 / geprüft am 26.11.2026 |
| B007 | P2 | Die große Stille | Ted Chiang | Fantasy und Science-Fiction | 9783965090354 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d7d0764666b9d1dd56 / geprüft am 26.11.2026 |
| B008 | P2 | Die Maschinen | Ann Leckie | Fantasy und Science-Fiction | 9783453316362 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d7d0764666b9d1dd58 / geprüft am 26.11.2026 |
| B009 | P2 | Die Parabel vom Sämann | Octavia E. Butler | Fantasy und Science-Fiction | 9783453534926 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d7d0764666b9d1dd5a / geprüft am 26.11.2026 |
| B010 | P2 | Die Seiten der Welt | Kai Meyer | Fantasy und Science-Fiction | 9783841421654 | Eingebaut | Codex / 26.11.2026 | /buch/6b0843d7d0764666b9d1dd5b / geprüft am 26.11.2026 |
| B011 | P2 | Künstliche Verhältnisse | Martha Wells | Fantasy und Science-Fiction | offen | Vorschlag | — | — |
| B012 | P2 | Das Fundament der Ewigkeit | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B013 | P2 | Die Päpstin | Donna W. Cross | Historische Romane und Familiensagas | 9783746614007 | Eingebaut | Codex / 26.11.2026 | /buch/6b084ba43cc7bfae2d6484d9 / geprüft am 26.11.2026 |
| B014 | P2 | Die vier Winde | Kristin Hannah | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B015 | P2 | Die Waffen des Lichts | Ken Follett | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B016 | P2 | Ein einfaches Leben | Min Jin Lee | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B017 | P2 | Spiegel und Licht | Hilary Mantel | Historische Romane und Familiensagas | offen | Vorschlag | — | — |
| B018 | P2 | Berge des Wahnsinns | H. P. Lovecraft | Horror, Spannung und dunkle Fantastik | 9783518392607 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14b4 / geprüft am 26.11.2026 |
| B019 | P2 | Das Haus – House of Leaves | Mark Z. Danielewski | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B020 | P2 | Der Ruf des Cthulhu | H. P. Lovecraft | Horror, Spannung und dunkle Fantastik | offen | Vorschlag | — | — |
| B021 | P2 | Holly | Stephen King | Horror, Spannung und dunkle Fantastik | 9783453274334 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14b5 / geprüft am 26.11.2026 |
| B022 | P2 | Aquila | Ursula Poznanski | Jugendbücher und Young Adult | 9783785586136 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14b6 / geprüft am 26.11.2026 |
| B023 | P2 | Bis(s) zum Abendrot | Stephenie Meyer | Jugendbücher und Young Adult | 9783551581662 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14b8 / geprüft am 26.11.2026 |
| B024 | P2 | Bis(s) zum Ende der Nacht | Stephenie Meyer | Jugendbücher und Young Adult | 9783551581990 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14b9 / geprüft am 26.11.2026 |
| B025 | P2 | Bis(s) zum Morgengrauen | Stephenie Meyer | Jugendbücher und Young Adult | 9783551581495 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14ba / geprüft am 26.11.2026 |
| B026 | P2 | Bis(s) zur Mittagsstunde | Stephenie Meyer | Jugendbücher und Young Adult | 9783551581617 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14bb / geprüft am 26.11.2026 |
| B027 | P2 | Cryptos | Ursula Poznanski | Jugendbücher und Young Adult | 9783743200500 | Eingebaut | Codex / 26.11.2026 | /buch/6b084b6387682bf05dac14bc / geprüft am 26.11.2026 |
| B028 | P2 | Das Bernstein-Teleskop | Philip Pullman | Jugendbücher und Young Adult | 9783551580375 | Eingebaut | Codex / 26.11.2026 | /buch/6b084ba43cc7bfae2d6484db / geprüft am 26.11.2026 |
| B029 | P2 | Das Magische Messer | Philip Pullman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B030 | P2 | Der Goldene Kompass | Philip Pullman | Jugendbücher und Young Adult | 9783453137448 | Eingebaut | Codex / 26.11.2026 | /buch/6b084ba43cc7bfae2d6484dc / geprüft am 26.11.2026 |
| B031 | P2 | Die Auserwählten – Im Labyrinth | James Dashner | Jugendbücher und Young Adult | 9783551313485 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e8f87389a2bfc7e2ffc / geprüft am 26.11.2026 |
| B032 | P2 | Die Auserwählten – In der Brandwüste | James Dashner | Jugendbücher und Young Adult | 9783551312822 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e2ffd / geprüft am 26.11.2026 |
| B033 | P2 | Die Auserwählten – In der Todeszone | James Dashner | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B034 | P2 | Die Bestimmung | Veronica Roth | Jugendbücher und Young Adult | 9783570161319 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e2fff / geprüft am 26.11.2026 |
| B035 | P2 | Die Bestimmung – Letzte Entscheidung | Veronica Roth | Jugendbücher und Young Adult | 9783570311240 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3000 / geprüft am 26.11.2026 |
| B036 | P2 | Die Bestimmung – Tödliche Wahrheit | Veronica Roth | Jugendbücher und Young Adult | 9783570161562 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3001 / geprüft am 26.11.2026 |
| B037 | P2 | Die Tribute von Panem – Flammender Zorn | Suzanne Collins | Jugendbücher und Young Adult | 9783841501363 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3003 / geprüft am 26.11.2026 |
| B038 | P2 | Die Tribute von Panem – Gefährliche Liebe | Suzanne Collins | Jugendbücher und Young Adult | 9783789132193 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3004 / geprüft am 26.11.2026 |
| B039 | P2 | Die Tribute von Panem L – Der Tag bricht an | Suzanne Collins | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B040 | P2 | Die Tribute von Panem X – Das Lied von Vogel und Schlange | Suzanne Collins | Jugendbücher und Young Adult | 9783789120022 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3005 / geprüft am 26.11.2026 |
| B041 | P2 | Radio Silence | Alice Oseman | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B042 | P2 | Schlaft gut, ihr fiesen Gedanken | John Green | Jugendbücher und Young Adult | offen | Vorschlag | — | — |
| B043 | P2 | Das längste Schnupfen der Welt | Benji Davies | Kinder und Jugend | offen | Vorschlag | — | — |
| B044 | P2 | Der Streik der Farben | Oliver Jeffers | Kinder und Jugend | offen | Vorschlag | — | — |
| B045 | P2 | Für Hund und Katz ist auch noch Platz | Axel Scheffler | Kinder und Jugend | offen | Vorschlag | — | — |
| B046 | P2 | Reckless – Steinernes Fleisch | Cornelia Funke | Kinder und Jugend | 9783791500959 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3006 / geprüft am 26.11.2026 |
| B047 | P2 | Thabo – Detektiv und Gentleman | Kirsten Boie | Kinder und Jugend | 9783789103957 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9087389a2bfc7e3007 / geprüft am 26.11.2026 |
| B048 | P2 | Wolfszeit | Nina Blazon | Kinder und Jugend | 9783473584437 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e3008 / geprüft am 26.11.2026 |
| B049 | P2 | Als Hitler das rosa Kaninchen stahl | Judith Kerr | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B050 | P2 | Am Samstag kam das Sams zurück | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B051 | P2 | Charlie und die Schokoladenfabrik | Roald Dahl | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B052 | P2 | Das doppelte Lottchen | Erich Kästner | Kinderbücher und Vorlesebücher | 9783791530345 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e3009 / geprüft am 26.11.2026 |
| B053 | P2 | Das fliegende Klassenzimmer | Erich Kästner | Kinderbücher und Vorlesebücher | 9783791530154 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e300a / geprüft am 26.11.2026 |
| B054 | P2 | Der 35. Mai | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B055 | P2 | Der fantastische Mr. Fox | Roald Dahl | Kinderbücher und Vorlesebücher | 9783499214110 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e300c / geprüft am 26.11.2026 |
| B056 | P2 | Eine Woche voller Samstage | Paul Maar | Kinderbücher und Vorlesebücher | 9783789119521 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e300e / geprüft am 26.11.2026 |
| B057 | P2 | Emil und die drei Zwillinge | Erich Kästner | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B058 | P2 | Hexen hexen | Roald Dahl | Kinderbücher und Vorlesebücher | 9783150090800 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e300f / geprüft am 26.11.2026 |
| B059 | P2 | Hotzenplotz 3 | Otfried Preußler | Kinderbücher und Vorlesebücher | 9783522119801 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e3010 / geprüft am 26.11.2026 |
| B060 | P2 | Igraine Ohnefurcht | Cornelia Funke | Kinderbücher und Vorlesebücher | 9783791504711 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e3011 / geprüft am 26.11.2026 |
| B061 | P2 | Immer lustig in Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | 9783789129452 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9187389a2bfc7e3012 / geprüft am 26.11.2026 |
| B062 | P2 | James und der Riesenpfirsich | Roald Dahl | Kinderbücher und Vorlesebücher | 9783328301615 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e3013 / geprüft am 26.11.2026 |
| B063 | P2 | Kleiner Werwolf | Cornelia Funke | Kinderbücher und Vorlesebücher | 9783596802890 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e3014 / geprüft am 26.11.2026 |
| B064 | P2 | Lippels Traum | Paul Maar | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B065 | P2 | Matilda | Roald Dahl | Kinderbücher und Vorlesebücher | 9783499217616 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e3015 / geprüft am 26.11.2026 |
| B066 | P2 | Mehr von uns Kindern aus Bullerbü | Astrid Lindgren | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B067 | P2 | Neue Punkte für das Sams | Paul Maar | Kinderbücher und Vorlesebücher | 9783789142048 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e3016 / geprüft am 26.11.2026 |
| B068 | P2 | Oh, wie schön ist Panama | Janosch | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B069 | P2 | Pippi geht an Bord | Astrid Lindgren | Kinderbücher und Vorlesebücher | 9783789118524 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e3017 / geprüft am 26.11.2026 |
| B070 | P2 | Post für den Tiger | Janosch | Kinderbücher und Vorlesebücher | offen | Vorschlag | — | — |
| B071 | P2 | Das Zeichen der Vier | Arthur Conan Doyle | Krimi und Thriller | offen | Vorschlag | — | — |
| B072 | P2 | Der achte Tag | Nicci French | Krimi und Thriller | offen | Vorschlag | — | — |
| B073 | P2 | Der Schneemann | Jo Nesbø | Krimi und Thriller | offen | Vorschlag | — | — |
| B074 | P2 | Der Seidenspinner | Robert Galbraith | Krimi und Thriller | offen | Vorschlag | — | — |
| B075 | P2 | Die Betrogene | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B076 | P2 | Die dunklen Wasser von Aberdeen | Stuart MacBride | Krimi und Thriller | 9783442461653 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e3019 / geprüft am 26.11.2026 |
| B077 | P2 | Die Einladung | Sebastian Fitzek | Krimi und Thriller | 9783426281581 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e301a / geprüft am 26.11.2026 |
| B078 | P2 | Die Entscheidung | Charlotte Link | Krimi und Thriller | 9783764504410 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e301b / geprüft am 26.11.2026 |
| B079 | P2 | Die Ernte des Bösen | Robert Galbraith | Krimi und Thriller | 9783734104091 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9287389a2bfc7e301c / geprüft am 26.11.2026 |
| B080 | P2 | Die gute Tochter | Karin Slaughter | Krimi und Thriller | 9783959671897 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e301e / geprüft am 26.11.2026 |
| B081 | P2 | Die Hunde von Riga | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B082 | P2 | Die Lebenden und die Toten | Nele Neuhaus | Krimi und Thriller | 9783550080548 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e301f / geprüft am 26.11.2026 |
| B083 | P2 | Die Morde des Herrn ABC | Agatha Christie | Krimi und Thriller | 9783502516170 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3020 / geprüft am 26.11.2026 |
| B084 | P2 | Die purpurnen Flüsse | Jean-Christophe Grangé | Krimi und Thriller | 9783404144037 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3022 / geprüft am 26.11.2026 |
| B085 | P2 | Die verirrten Kugeln | Richard Osman | Krimi und Thriller | offen | Vorschlag | — | — |
| B086 | P2 | Die verschwundenen Studentinnen | Alex Michaelides | Krimi und Thriller | offen | Vorschlag | — | — |
| B087 | P2 | Die weiße Löwin | Henning Mankell | Krimi und Thriller | offen | Vorschlag | — | — |
| B088 | P2 | Ein Mord wird angekündigt | Agatha Christie | Krimi und Thriller | 9783502511823 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3023 / geprüft am 26.11.2026 |
| B089 | P2 | Ein Teil von ihr | Karin Slaughter | Krimi und Thriller | 9783959672146 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3024 / geprüft am 26.11.2026 |
| B090 | P2 | Eine unbeliebte Frau | Nele Neuhaus | Krimi und Thriller | 9783548608877 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3025 / geprüft am 26.11.2026 |
| B091 | P2 | Einsame Nacht | Charlotte Link | Krimi und Thriller | offen | Vorschlag | — | — |
| B092 | P2 | Erbarmen | Jussi Adler-Olsen | Krimi und Thriller | 9783423212625 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3026 / geprüft am 26.11.2026 |
| B093 | P2 | Erlösung | Jussi Adler-Olsen | Krimi und Thriller | 9783423248525 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3027 / geprüft am 26.11.2026 |
| B094 | P2 | Erwartung | Jussi Adler-Olsen | Krimi und Thriller | 9783423280204 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9387389a2bfc7e3028 / geprüft am 26.11.2026 |
| B095 | P2 | Finstere Orte | Gillian Flynn | Krimi und Thriller | offen | Vorschlag | — | — |
| B096 | P2 | Girl on the Train – Du kennst sie nicht, aber sie kennt dich | Paula Hawkins | Krimi und Thriller | 9783764506018 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9487389a2bfc7e302a / geprüft am 26.11.2026 |
| B097 | P2 | Grabesgrün | Tana French | Krimi und Thriller | 9783502101918 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9487389a2bfc7e302b / geprüft am 26.11.2026 |
| B098 | P2 | Grießnockerlaffäre | Rita Falk | Krimi und Thriller | 9783423214988 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9487389a2bfc7e302c / geprüft am 26.11.2026 |
| B099 | P2 | Hannibal | Thomas Harris | Krimi und Thriller | 9783453177741 | Eingebaut | Codex / 26.11.2026 | /buch/6b084e9487389a2bfc7e302d / geprüft am 26.11.2026 |
| B100 | P2 | Monster | Nele Neuhaus | Krimi und Thriller | offen | Vorschlag | — | — |
| B101 | P2 | Verachtung | Jussi Adler-Olsen | Krimi und Thriller | 9783423280020 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850746fdbc42356c416a7 / geprüft am 26.11.2026 |
| B102 | P2 | Verdammnis | Stieg Larsson | Krimi und Thriller | 9783453433175 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850746fdbc42356c416a9 / geprüft am 26.11.2026 |
| B103 | P2 | Vergebung | Stieg Larsson | Krimi und Thriller | 9783453013803 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850746fdbc42356c416aa / geprüft am 26.11.2026 |
| B104 | P2 | Wer Wind sät | Nele Neuhaus | Krimi und Thriller | 9783548284675 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416ab / geprüft am 26.11.2026 |
| B105 | P2 | Winterkartoffelknödel | Rita Falk | Krimi und Thriller | 9783423405546 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416ac / geprüft am 26.11.2026 |
| B106 | P2 | Wir sehen uns dort oben | Pierre Lemaitre | Krimi und Thriller | 9783608980165 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416ae / geprüft am 26.11.2026 |
| B107 | P2 | Zwetschgendatschikomplott | Rita Falk | Krimi und Thriller | offen | Vorschlag | — | — |
| B108 | P2 | Americanah | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | 9783596185986 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416b0 / geprüft am 26.11.2026 |
| B109 | P2 | Atlas – Die Geschichte von Pa Salt | Lucinda Riley / Harry Whittaker | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B110 | P2 | Begin Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | 9783736302471 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416b1 / geprüft am 26.11.2026 |
| B111 | P2 | Berühre mich. Nicht. | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | 9783736319936 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416b2 / geprüft am 26.11.2026 |
| B112 | P2 | Blauer Hibiskus | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | 9783596032440 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416b3 / geprüft am 26.11.2026 |
| B113 | P2 | Britt-Marie war hier | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | 9783596033317 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416b4 / geprüft am 26.11.2026 |
| B114 | P2 | Daisy Jones & The Six | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B115 | P2 | Das Café ohne Namen | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | 9783546100328 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850756fdbc42356c416b6 / geprüft am 26.11.2026 |
| B116 | P2 | Das Feld | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | 9783446260382 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416b7 / geprüft am 26.11.2026 |
| B117 | P2 | Das irrationale Vorkommnis der Liebe | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B118 | P2 | Der Trafikant | Robert Seethaler | Liebe, Familie und Gegenwartsliteratur | 9783036956459 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416b8 / geprüft am 26.11.2026 |
| B119 | P2 | Die Hälfte der Sonne | Chimamanda Ngozi Adichie | Liebe, Familie und Gegenwartsliteratur | 9783630872476 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416b9 / geprüft am 26.11.2026 |
| B120 | P2 | Die Mondschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B121 | P2 | Die Perlenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B122 | P2 | Die Schattenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B123 | P2 | Die sieben Männer der Evelyn Hugo | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B124 | P2 | Die Sonnenschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B125 | P2 | Die Sturmschwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B126 | P2 | Die theoretische Unwahrscheinlichkeit von Liebe | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B127 | P2 | Die verschwundene Schwester | Lucinda Riley | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B128 | P2 | Dream Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | 9783736311879 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416ba / geprüft am 26.11.2026 |
| B129 | P2 | Ein ganz neues Leben | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | 9783805250948 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416bb / geprüft am 26.11.2026 |
| B130 | P2 | Ein ganzes halbes Jahr | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | 9783499267031 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416bc / geprüft am 26.11.2026 |
| B131 | P2 | Ein Mann namens Ove | Fredrik Backman | Liebe, Familie und Gegenwartsliteratur | 9783810504807 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416bd / geprüft am 26.11.2026 |
| B132 | P2 | Eine Handvoll Worte | Jojo Moyes | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B133 | P2 | Feel Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | 9783736304451 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416be / geprüft am 26.11.2026 |
| B134 | P2 | Gespräche mit Freunden | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B135 | P2 | Happy Place – Urlaub mit dem Ex | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B136 | P2 | Hope Again | Mona Kasten | Liebe, Familie und Gegenwartsliteratur | 9783736308343 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416bf / geprüft am 26.11.2026 |
| B137 | P2 | Hope Forever | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | 9783423716062 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850766fdbc42356c416c0 / geprüft am 26.11.2026 |
| B138 | P2 | Ich und die Menschen | Matt Haig | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B139 | P2 | Identitti | Mithu Sanyal | Liebe, Familie und Gegenwartsliteratur | 9783446269217 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c2 / geprüft am 26.11.2026 |
| B140 | P2 | Kein Sommer ohne dich | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B141 | P2 | Love, Theoretically | Ali Hazelwood | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B142 | P2 | Malibu Rising | Taylor Jenkins Reid | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B143 | P2 | New Dreams | Lilly Lucas | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B144 | P2 | Schöne Welt, wo bist du | Sally Rooney | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B145 | P2 | Verity | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | 9783423230124 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c3 / geprüft am 26.11.2026 |
| B146 | P2 | Verliebt in deine schönsten Seiten | Emily Henry | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B147 | P2 | Verliere mich. Nicht. | Laura Kneidl | Liebe, Familie und Gegenwartsliteratur | 9783736319943 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c4 / geprüft am 26.11.2026 |
| B148 | P2 | Weil ich Layken liebe | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | 9783423715621 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c5 / geprüft am 26.11.2026 |
| B149 | P2 | Weil ich Will liebe | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | 9783423715843 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c6 / geprüft am 26.11.2026 |
| B150 | P2 | Wie man die Zeit anhält | Matt Haig | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B151 | P2 | Zur See | Dörte Hansen | Liebe, Familie und Gegenwartsliteratur | 9783328602224 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c7 / geprüft am 26.11.2026 |
| B152 | P2 | Zurück ins Leben geliebt | Colleen Hoover | Liebe, Familie und Gegenwartsliteratur | offen | Vorschlag | — | — |
| B153 | P2 | Atemschaukel | Herta Müller | Romane und Gegenwart | 9783446233911 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416c9 / geprüft am 26.11.2026 |
| B154 | P2 | Auf Erden sind wir kurz grandios | Ocean Vuong | Romane und Gegenwart | offen | Vorschlag | — | — |
| B155 | P2 | Brüste und Eier | Mieko Kawakami | Romane und Gegenwart | 9783832165994 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850776fdbc42356c416cb / geprüft am 26.11.2026 |
| B156 | P2 | Der Fluch des Hasen | Bora Chung | Romane und Gegenwart | offen | Vorschlag | — | — |
| B157 | P2 | Der Freund | Sigrid Nunez | Romane und Gegenwart | offen | Vorschlag | — | — |
| B158 | P2 | Der Gesang der Flusskrebse – Das Kochbuch | Delia Owens | Romane und Gegenwart | offen | Vorschlag | — | — |
| B159 | P2 | Der Namensvetter | Jhumpa Lahiri | Romane und Gegenwart | offen | Vorschlag | — | — |
| B160 | P2 | Die Insel der verlorenen Bäume | Elif Shafak | Romane und Gegenwart | offen | Vorschlag | — | — |
| B161 | P2 | Die Interessanten | Meg Wolitzer | Romane und Gegenwart | offen | Vorschlag | — | — |
| B162 | P2 | Die vierzig Geheimnisse der Liebe | Elif Shafak | Romane und Gegenwart | 9783036959122 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416cd / geprüft am 26.11.2026 |
| B163 | P2 | Himmel | Mieko Kawakami | Romane und Gegenwart | offen | Vorschlag | — | — |
| B164 | P2 | Outline | Rachel Cusk | Romane und Gegenwart | 9783518425282 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416cf / geprüft am 26.11.2026 |
| B165 | P2 | Alte Wege | Robert Macfarlane | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B166 | P2 | Challenger | Sally Ride | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B167 | P2 | Das Vermächtnis | Jane Goodall | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B168 | P2 | Die Mutter aller Fragen | Rebecca Solnit | Sachbuch und Biografie | 9783455001785 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416d1 / geprüft am 26.11.2026 |
| B169 | P2 | Ein Leben auf unserer Erde | David Attenborough | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B170 | P2 | Warum Zebras keine Migräne bekommen | Robert Sapolsky | Sachbuch und Biografie | offen | Vorschlag | — | — |
| B171 | P2 | … trotzdem Ja zum Leben sagen | Viktor E. Frankl | Sachbücher, Wissen und Biografien | 9783423301428 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416d3 / geprüft am 26.11.2026 |
| B172 | P2 | Befreit | Tara Westover | Sachbücher, Wissen und Biografien | 9783462050127 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416d5 / geprüft am 26.11.2026 |
| B173 | P2 | Bullshit Jobs | David Graeber | Sachbücher, Wissen und Biografien | 9783608982459 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416d7 / geprüft am 26.11.2026 |
| B174 | P2 | Darm mit Charme | Giulia Enders | Sachbücher, Wissen und Biografien | 9783550080418 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416d9 / geprüft am 26.11.2026 |
| B175 | P2 | Das geheime Leben der Bäume | Peter Wohlleben | Sachbücher, Wissen und Biografien | 9783453281608 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416db / geprüft am 26.11.2026 |
| B176 | P2 | Das Licht in uns | Michelle Obama | Sachbücher, Wissen und Biografien | 9783442317134 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850786fdbc42356c416dc / geprüft am 26.11.2026 |
| B177 | P2 | Das Seelenleben der Tiere | Peter Wohlleben | Sachbücher, Wissen und Biografien | 9783453280823 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416dd / geprüft am 26.11.2026 |
| B178 | P2 | Das Universum in der Nussschale | Stephen Hawking | Sachbücher, Wissen und Biografien | 9783423340892 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416df / geprüft am 26.11.2026 |
| B179 | P2 | Der Drache in meiner Garage | Carl Sagan | Sachbücher, Wissen und Biografien | 9783426269121 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416e1 / geprüft am 26.11.2026 |
| B180 | P2 | Der lange Weg zur Freiheit | Nelson Mandela | Sachbücher, Wissen und Biografien | 9783596138043 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416e3 / geprüft am 26.11.2026 |
| B181 | P2 | Die 1%-Methode | James Clear | Sachbücher, Wissen und Biografien | 9783442178582 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416e5 / geprüft am 26.11.2026 |
| B182 | P2 | Die kleinste gemeinsame Wirklichkeit | Mai Thi Nguyen-Kim | Sachbücher, Wissen und Biografien | 9783426278222 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416e7 / geprüft am 26.11.2026 |
| B183 | P2 | Die Macht der Gewohnheit | Charles Duhigg | Sachbücher, Wissen und Biografien | 9783492304078 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416e9 / geprüft am 26.11.2026 |
| B184 | P2 | Die Ordnung der Zeit | Carlo Rovelli | Sachbücher, Wissen und Biografien | 9783498053994 | Eingebaut | Codex / 26.11.2026 | /buch/6b0850796fdbc42356c416eb / geprüft am 26.11.2026 |
| B185 | P2 | Die Selbstgerechten | Sahra Wagenknecht | Sachbücher, Wissen und Biografien | 9783593513904 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416ed / geprüft am 26.11.2026 |
| B186 | P2 | Digitaler Minimalismus | Cal Newport | Sachbücher, Wissen und Biografien | 9783868817256 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416ef / geprüft am 26.11.2026 |
| B187 | P2 | Ein verheißenes Land | Barack Obama | Sachbücher, Wissen und Biografien | 9783328600626 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416f1 / geprüft am 26.11.2026 |
| B188 | P2 | Eine kurze Geschichte der Zeit | Stephen Hawking | Sachbücher, Wissen und Biografien | 9783499188503 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416f2 / geprüft am 26.11.2026 |
| B189 | P2 | Eine kurze Geschichte des menschlichen Körpers | Bill Bryson | Sachbücher, Wissen und Biografien | 9783442313983 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416f4 / geprüft am 26.11.2026 |
| B190 | P2 | Eine kurze Geschichte von fast allem | Bill Bryson | Sachbücher, Wissen und Biografien | 9783442310029 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416f5 / geprüft am 26.11.2026 |
| B191 | P2 | Factfulness | Hans Rosling / Ola Rosling / Anna Rosling Rönnlund | Sachbücher, Wissen und Biografien | 9783548060415 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416f7 / geprüft am 26.11.2026 |
| B192 | P2 | Homo Deus | Yuval Noah Harari | Sachbücher, Wissen und Biografien | 9783406727863 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416f8 / geprüft am 26.11.2026 |
| B193 | P2 | Ich bin hier, und alles ist jetzt | Edith Eger | Sachbücher, Wissen und Biografien | 9783442756964 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507a6fdbc42356c416fa / geprüft am 26.11.2026 |
| B194 | P2 | Ich bin Malala | Malala Yousafzai / Christina Lamb | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B195 | P2 | Im Grunde gut | Rutger Bregman | Sachbücher, Wissen und Biografien | 9783499004162 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507b6fdbc42356c416fc / geprüft am 26.11.2026 |
| B196 | P2 | Komisch, alles chemisch! | Mai Thi Nguyen-Kim | Sachbücher, Wissen und Biografien | 9783426277676 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507b6fdbc42356c416fd / geprüft am 26.11.2026 |
| B197 | P2 | Konzentriert arbeiten | Cal Newport | Sachbücher, Wissen und Biografien | 9783864149351 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507b6fdbc42356c416fe / geprüft am 26.11.2026 |
| B198 | P2 | Kosmos | Carl Sagan | Sachbücher, Wissen und Biografien | 9783426260586 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507b6fdbc42356c416ff / geprüft am 26.11.2026 |
| B199 | P2 | Kurze Antworten auf große Fragen | Stephen Hawking | Sachbücher, Wissen und Biografien | 9783608983838 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507b6fdbc42356c41700 / geprüft am 26.11.2026 |
| B200 | P2 | Liebe Ijeawele | Chimamanda Ngozi Adichie | Sachbücher, Wissen und Biografien | 9783596299683 | Eingebaut | Codex / 26.11.2026 | /buch/6b08507b6fdbc42356c41701 / geprüft am 26.11.2026 |
| B201 | P2 | Mehr Feminismus! | Chimamanda Ngozi Adichie | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B202 | P2 | Nexus | Yuval Noah Harari | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B203 | P2 | Schnelles Denken, langsames Denken | Daniel Kahneman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B204 | P2 | Sieben kurze Lektionen über Physik | Carlo Rovelli | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B205 | P2 | Tagebuch | Anne Frank | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B206 | P2 | Unsichtbare Frauen | Caroline Criado-Perez | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B207 | P2 | Utopien für Realisten | Rutger Bregman | Sachbücher, Wissen und Biografien | offen | Vorschlag | — | — |
| B208 | P2 | 2001 – Odyssee im Weltraum | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B209 | P2 | Abaddons Tor | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B210 | P2 | Alles, was wir geben mussten | Kazuo Ishiguro | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B211 | P2 | Artemis | Andy Weir | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B212 | P2 | Blumen für Algernon | Daniel Keyes | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B213 | P2 | Calibans Krieg | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B214 | P2 | Das Licht der letzten Tage | Emily St. John Mandel | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B215 | P2 | Das Meer der endlosen Ruhe | Emily St. John Mandel | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B216 | P2 | Das Orakel vom Berge | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B217 | P2 | Der futurologische Kongress | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B218 | P2 | Der lange Weg zu einem kleinen zornigen Planeten | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B219 | P2 | Die letzte Generation | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B220 | P2 | Die nackte Sonne | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B221 | P2 | Die Ordensburg des Wüstenplaneten | Frank Herbert | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B222 | P2 | Die Stahlhöhlen | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B223 | P2 | Die wandernde Erde | Liu Cixin | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B224 | P2 | Ich, der Robot | Isaac Asimov | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B225 | P2 | Klara und die Sonne | Kazuo Ishiguro | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B226 | P2 | Leviathan erwacht | James S. A. Corey | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B227 | P2 | Ready Player One | Ernest Cline | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B228 | P2 | Rendezvous mit Rama | Arthur C. Clarke | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B229 | P2 | Solaris | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B230 | P2 | Sterntagebücher | Stanisław Lem | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B231 | P2 | Träumen Androiden von elektrischen Schafen? | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B232 | P2 | Ubik | Philip K. Dick | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B233 | P2 | Unter uns die Nacht | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B234 | P2 | Zwischen zwei Sternen | Becky Chambers | Science-Fiction und Dystopien | offen | Vorschlag | — | — |
| B235 | P3 | Anna Karenina | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B236 | P3 | Brief an den Vater | Franz Kafka | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B237 | P3 | David Copperfield | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B238 | P3 | Der eingebildete Kranke | Molière | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B239 | P3 | Der Ekel | Jean-Paul Sartre | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B240 | P3 | Der Glöckner von Notre-Dame | Victor Hugo | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B241 | P3 | Der Graf von Monte Christo | Alexandre Dumas | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B242 | P3 | Der Idiot | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B243 | P3 | Der letzte Mensch | Mary Shelley | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B244 | P3 | Der Tod des Iwan Iljitsch | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B245 | P3 | Der Tod in Venedig | Thomas Mann | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B246 | P3 | Deutschland. Ein Wintermärchen | Heinrich Heine | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B247 | P3 | Die Abenteuer des Huckleberry Finn | Mark Twain | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B248 | P3 | Die Abenteuer des Tom Sawyer | Mark Twain | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B249 | P3 | Die Abtei von Northanger | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B250 | P3 | Die Brüder Karamasow | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B251 | P3 | Die Dämonen | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B252 | P3 | Die drei Musketiere | Alexandre Dumas | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B253 | P3 | Die Elenden | Victor Hugo | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B254 | P3 | Die göttliche Komödie | Dante Alighieri | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B255 | P3 | Die Pest | Albert Camus | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B256 | P3 | Die Räuber | Friedrich Schiller | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B257 | P3 | Don Quijote | Miguel de Cervantes | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B258 | P3 | Duineser Elegien | Rainer Maria Rilke | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B259 | P3 | Effi Briest | Theodor Fontane | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B260 | P3 | Eine Geschichte aus zwei Städten | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B261 | P3 | Eine Weihnachtsgeschichte | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B262 | P3 | Emma | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B263 | P3 | Faust. Der Tragödie erster Teil | Johann Wolfgang von Goethe | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B264 | P3 | Früchte des Zorns | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B265 | P3 | Germinal | Émile Zola | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B266 | P3 | Große Erwartungen | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B267 | P3 | Hamlet | William Shakespeare | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B268 | P3 | Herz der Finsternis | Joseph Conrad | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B269 | P3 | Ilias | Homer | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B270 | P3 | In einem andern Land | Ernest Hemingway | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B271 | P3 | Jenseits von Eden | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B272 | P3 | König Ödipus | Sophokles | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B273 | P3 | Krieg und Frieden | Lew Tolstoi | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B274 | P3 | Macbeth | William Shakespeare | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B275 | P3 | Madame Bovary | Gustave Flaubert | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B276 | P3 | Mansfield Park | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B277 | P3 | Menschenkind | Toni Morrison | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B278 | P3 | Middlemarch | George Eliot | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B279 | P3 | Moby-Dick | Herman Melville | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B280 | P3 | Mrs Dalloway | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B281 | P3 | Odyssee | Homer | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B282 | P3 | Oliver Twist | Charles Dickens | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B283 | P3 | Orlando | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B284 | P3 | Romeo und Julia | William Shakespeare | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B285 | P3 | Schuld und Sühne | Fjodor Dostojewski | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B286 | P3 | Sehr blaue Augen | Toni Morrison | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B287 | P3 | Überredung | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B288 | P3 | Verstand und Gefühl | Jane Austen | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B289 | P3 | Von Mäusen und Menschen | John Steinbeck | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B290 | P3 | Wem die Stunde schlägt | Ernest Hemingway | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B291 | P3 | Wer die Nachtigall stört | Harper Lee | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B292 | P3 | Woyzeck | Georg Büchner | Klassiker und Weltliteratur | offen | Vorschlag | — | — |
| B293 | P3 | Zum Leuchtturm | Virginia Woolf | Klassiker und Weltliteratur | offen | Vorschlag | — | — |

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

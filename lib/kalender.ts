import type { ObjectId } from "mongodb";

export type KalenderCategory = "Buchmesse" | "Lesung" | "Release" | "Sonstiges";

export const VALID_COUNTRIES = [
  "Afghanistan", "Ägypten", "Albanien", "Algerien", "Andorra", "Angola", "Antigua und Barbuda",
  "Äquatorialguinea", "Argentinien", "Armenien", "Aserbaidschan", "Äthiopien", "Australien",
  "Bahamas", "Bahrain", "Bangladesch", "Barbados", "Belarus", "Belgien", "Belize", "Benin",
  "Bhutan", "Bolivien", "Bosnien und Herzegowina", "Botswana", "Brasilien", "Brunei", "Bulgarien",
  "Burkina Faso", "Burundi", "Cabo Verde", "Chile", "China", "Costa Rica", "Dänemark",
  "Deutschland", "Dominica", "Dominikanische Republik", "Dschibuti", "Ecuador", "El Salvador",
  "Elfenbeinküste", "Eritrea", "Estland", "Eswatini", "Fidschi", "Finnland", "Frankreich",
  "Gabun", "Gambia", "Georgien", "Ghana", "Grenada", "Griechenland", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Indien", "Indonesien", "Irak", "Iran",
  "Irland", "Island", "Israel", "Italien", "Jamaika", "Japan", "Jemen", "Jordanien",
  "Kambodscha", "Kamerun", "Kanada", "Kasachstan", "Katar", "Kenia", "Kirgisistan", "Kiribati",
  "Kolumbien", "Komoren", "Kongo", "Kroatien", "Kuba", "Kuwait", "Laos", "Lesotho", "Lettland",
  "Libanon", "Liberia", "Libyen", "Liechtenstein", "Litauen", "Luxemburg", "Madagaskar",
  "Malawi", "Malaysia", "Malediven", "Mali", "Malta", "Marokko", "Marshallinseln", "Mauretanien",
  "Mauritius", "Mexiko", "Mikronesien", "Moldau", "Monaco", "Mongolei", "Montenegro", "Mosambik",
  "Myanmar", "Namibia", "Nauru", "Nepal", "Neuseeland", "Nicaragua", "Niederlande", "Niger",
  "Nigeria", "Nordkorea", "Nordmazedonien", "Norwegen", "Oman", "Österreich", "Osttimor",
  "Pakistan", "Palau", "Panama", "Papua-Neuguinea", "Paraguay", "Peru", "Philippinen", "Polen",
  "Portugal", "Ruanda", "Rumänien", "Russland", "Salomonen", "Sambia", "Samoa",
  "San Marino", "São Tomé und Príncipe", "Saudi-Arabien", "Schweden", "Schweiz", "Senegal",
  "Serbien", "Seychellen", "Sierra Leone", "Simbabwe", "Singapur", "Slowakei", "Slowenien",
  "Somalia", "Spanien", "Sri Lanka", "St. Kitts und Nevis", "St. Lucia",
  "St. Vincent und die Grenadinen", "Südafrika", "Sudan", "Südkorea", "Südsudan", "Suriname",
  "Syrien", "Tadschikistan", "Tansania", "Thailand", "Togo", "Tonga", "Trinidad und Tobago",
  "Tschad", "Tschechien", "Tunesien", "Türkei", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "Ungarn", "Uruguay", "USA", "Usbekistan", "Vanuatu", "Vatikanstadt", "Venezuela",
  "Vereinigte Arabische Emirate", "Vereinigtes Königreich", "Vietnam", "Zentralafrikanische Republik",
  "Zypern",
] as const;

export interface KalenderLocation {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface KalenderEvent {
  _id?: ObjectId;
  title: string;
  description: string;
  category: KalenderCategory;
  date: string;          // ISO date string YYYY-MM-DD
  dateTo?: string;       // ISO date string YYYY-MM-DD (optional, for multi-day events)
  timeFrom?: string;     // HH:mm (optional)
  timeTo?: string;       // HH:mm (optional)
  location?: KalenderLocation;
  link?: string;         // optional URL
  createdBy: string;     // username
  participants: string[]; // usernames
  createdAt: Date;
  updatedAt: Date;
}

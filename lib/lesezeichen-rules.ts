export type LesezeichenReason =
  | "profil_ausgefuellt"
  | "buecher_hochgeladen"
  | "tages_login"
  | "wochen_streak"
  | "treffpunkt_beitrag"
  | "quiz_tag"
  | "mc_quiz_10_punkte"
  | "buchempfehlung";

export const LESEZEICHEN_RULES: {
  reason: LesezeichenReason;
  label: string;
  description: string;
  amount: string;
}[] = [
  {
    reason: "profil_ausgefuellt",
    label: "Profil ausgefüllt",
    description: "Fülle dein Profil vollständig aus (Name, Motto, Bild).",
    amount: "10 Lesezeichen",
  },
  {
    reason: "buecher_hochgeladen",
    label: "Buch hochgeladen",
    description: "Lade ein Buch hoch.",
    amount: "3 Lesezeichen pro Buch",
  },
  {
    reason: "tages_login",
    label: "Täglicher Login",
    description: "Melde dich jeden Tag an.",
    amount: "1 Lesezeichen pro Tag",
  },
  {
    reason: "wochen_streak",
    label: "Wochen-Streak",
    description: "Logge dich 7 Tage hintereinander ein.",
    amount: "+7 Bonus-Lesezeichen",
  },
  {
    reason: "treffpunkt_beitrag",
    label: "Treffpunkt-Beitrag",
    description: "Schreibe etwas im Treffpunkt (Diskussionen).",
    amount: "1 Lesezeichen pro Beitrag",
  },
  {
    reason: "quiz_tag",
    label: "Quiz gespielt",
    description: "Spiele an einem Tag ein Quiz.",
    amount: "1 Lesezeichen pro Tag",
  },
  {
    reason: "mc_quiz_10_punkte",
    label: "10 Punkte im MC-Quiz",
    description: "Erreiche mindestens 10 Punkte im Multiple-Choice-Quiz.",
    amount: "1 Lesezeichen",
  },
  {
    reason: "buchempfehlung",
    label: "Buchempfehlung",
    description: "Empfiehl ein Buch auf dessen Buchseite.",
    amount: "1 Lesezeichen (max. 3 pro Tag)",
  },
];

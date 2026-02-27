import { redirect } from "next/navigation";

export default function DatenschutzRedirect() {
  redirect("/impressum#datenschutz");
}

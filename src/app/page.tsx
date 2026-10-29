import { redirect } from "next/navigation";

/** The console has no landing page of its own; start at the overview. */
export default function Home() {
  redirect("/admin");
}

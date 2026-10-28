import { redirect } from "next/navigation";
// Review-first rollout: the public site uses isolated demo state until live migration is configured.
export default function Page() {
  redirect("/preview");
}

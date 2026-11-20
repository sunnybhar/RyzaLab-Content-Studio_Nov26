import { redirect } from "next/navigation";
export default function Page() {
  redirect(
    process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_STUDIO_LOCAL === "1"
      ? "/studio"
      : "/preview",
  );
}

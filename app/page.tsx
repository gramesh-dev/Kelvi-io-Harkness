import { redirect } from "next/navigation";

/**
 * Phase A (integrated branch): marketing shell comes from `public/index.html`
 * (synced from `main` / April-18). The old React landing is replaced so `/`
 * matches production static HTML while Next handles auth routes elsewhere.
 */
export default function Home() {
  redirect("/index.html");
}

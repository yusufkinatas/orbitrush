import type { Metadata } from "next";
import { OrbitRushGame } from "./OrbitRushGame";

export const metadata: Metadata = {
  title: "Orbitrush — Neon Orbit Runner",
  description:
    "Break orbit, lock onto the next planet, and keep the combo alive in an endless neon space run.",
};

export default function Home() {
  return <OrbitRushGame />;
}

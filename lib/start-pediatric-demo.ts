import type { Locale } from "./types";
import { DEMO_ID } from "./demo-catalog";
import { seedDemo, startDemoFlow } from "./start-demo";

export { startDemoFlow } from "./start-demo";

export function seedPediatricDemo(locale?: Locale) {
  seedDemo(DEMO_ID, locale);
}

export function startPediatricDemoFlow(locale?: Locale) {
  startDemoFlow(DEMO_ID, locale);
}

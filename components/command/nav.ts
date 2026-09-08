import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Compass,
  Fingerprint,
  FlaskConical,
  Folder,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  Pencil,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  WandSparkles,
  Coins,
  Activity,
  Share2,
} from "lucide-react";

export type NavKey =
  | "nav.command"
  | "nav.create"
  | "nav.campaigns"
  | "nav.studio"
  | "nav.intel"
  | "nav.dna"
  | "nav.experiments"
  | "nav.leads"
  | "nav.build"
  | "nav.discovery"
  | "nav.strategy"
  | "nav.viral"
  | "nav.media"
  | "nav.growth"
  | "nav.analytics"
  | "nav.lab"
  | "nav.medical"
  | "nav.self"
  | "nav.pricing"
  | "nav.about"
  | "nav.social"
  | "nav.status"
  | "nav.more";

export type NavItem = {
  href: string;
  key: NavKey;
  icon: LucideIcon;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", key: "nav.command", icon: LayoutDashboard },
  { href: "/task/ad", key: "nav.create", icon: WandSparkles },
  { href: "/campaigns", key: "nav.campaigns", icon: Folder },
  { href: "/studio", key: "nav.studio", icon: Pencil },
  { href: "/growth/market", key: "nav.intel", icon: Radar },
];

export const MORE_NAV: NavItem[] = [
  { href: "/", key: "nav.build", icon: WandSparkles },
  { href: "/growth/dna", key: "nav.dna", icon: Fingerprint },
  { href: "/growth/experiments", key: "nav.experiments", icon: FlaskConical },
  { href: "/leads", key: "nav.leads", icon: Users },
  { href: "/discovery", key: "nav.discovery", icon: Search },
  { href: "/strategy", key: "nav.strategy", icon: Compass },
  { href: "/viral", key: "nav.viral", icon: Sparkles },
  { href: "/media", key: "nav.media", icon: Megaphone },
  { href: "/growth", key: "nav.growth", icon: Brain },
  { href: "/growth/performance", key: "nav.analytics", icon: Activity },
  { href: "/lab", key: "nav.lab", icon: FlaskConical },
  { href: "/medical/optibrain", key: "nav.medical", icon: Brain },
  { href: "/self", key: "nav.self", icon: SlidersHorizontal },
  { href: "/settings/social", key: "nav.social", icon: Share2 },
  { href: "/pricing", key: "nav.pricing", icon: Coins },
  { href: "/about", key: "nav.about", icon: HelpCircle },
  { href: "/status", key: "nav.status", icon: Activity },
];

export const DOCK_NAV: NavItem[] = [
  { href: "/dashboard", key: "nav.command", icon: LayoutDashboard },
  { href: "/task/ad", key: "nav.create", icon: WandSparkles },
  { href: "/campaigns", key: "nav.campaigns", icon: Folder },
  { href: "/growth/market", key: "nav.intel", icon: Radar },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];

export function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/growth") return pathname === "/growth";
  return pathname === href || pathname.startsWith(`${href}/`);
}

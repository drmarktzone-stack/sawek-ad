import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Compass,
  Fingerprint,
  Folder,
  HelpCircle,
  LayoutDashboard,
  Link2,
  Megaphone,
  Sparkles,
  WandSparkles,
  Coins,
  Activity,
  Users,
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
  | "nav.more"
  | "nav.voice"
  | "nav.offerTool"
  | "nav.hso"
  | "nav.list"
  | "nav.trust";

export type NavItem = {
  href: string;
  key: NavKey;
  icon: LucideIcon;
};

/** Primary = scan + 4 pillars. Everything else is More or hidden. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", key: "nav.build", icon: Link2 },
  { href: "/tools/core-message", key: "nav.voice", icon: Fingerprint },
  { href: "/tools/offer", key: "nav.offerTool", icon: Compass },
  { href: "/task/ad", key: "nav.trust", icon: WandSparkles },
  { href: "/tools/list", key: "nav.list", icon: Users },
];

export const MORE_NAV: NavItem[] = [
  { href: "/viral", key: "nav.viral", icon: Sparkles },
  { href: "/tools/hso", key: "nav.hso", icon: Megaphone },
  { href: "/campaigns", key: "nav.campaigns", icon: Folder },
  { href: "/dashboard", key: "nav.command", icon: LayoutDashboard },
  { href: "/medical/optibrain", key: "nav.medical", icon: Brain },
  { href: "/pricing", key: "nav.pricing", icon: Coins },
  { href: "/about", key: "nav.about", icon: HelpCircle },
  { href: "/status", key: "nav.status", icon: Activity },
];

export const DOCK_NAV: NavItem[] = [
  { href: "/", key: "nav.build", icon: Link2 },
  { href: "/tools/offer", key: "nav.offerTool", icon: Compass },
  { href: "/task/ad", key: "nav.trust", icon: WandSparkles },
  { href: "/tools/list", key: "nav.list", icon: Users },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];

export function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/growth") return pathname === "/growth";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type PrimaryNavigationKey = "home" | "discover" | "create" | "plans" | "chefs";

export interface PrimaryNavigationItem {
  key: PrimaryNavigationKey;
  href: string | null;
  active: boolean;
}

const PRIMARY_NAVIGATION: Omit<PrimaryNavigationItem, "active">[] = [
  { key: "home", href: "/market" },
  { key: "discover", href: "/discover" },
  { key: "create", href: null },
  { key: "plans", href: "/explore" },
  { key: "chefs", href: "/chefs" },
];

function isActivePath(key: PrimaryNavigationKey, pathname: string): boolean {
  if (key === "home") return pathname === "/market" || pathname.startsWith("/market/");
  if (key === "discover") return pathname === "/discover" || pathname.startsWith("/discover/");
  if (key === "plans") {
    return pathname === "/explore" || pathname.startsWith("/explore/") || pathname.startsWith("/dashboard/plans");
  }
  if (key === "chefs") return pathname === "/chefs" || pathname.startsWith("/chefs/");
  return false;
}

export function getPrimaryNavigation(pathname: string): PrimaryNavigationItem[] {
  return PRIMARY_NAVIGATION.map((item) => ({
    ...item,
    active: isActivePath(item.key, pathname),
  }));
}

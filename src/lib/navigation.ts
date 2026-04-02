export type AppNavItem = {
  href: string
  label: string
}

export const protectedNavItems: AppNavItem[] = [
  { href: "/send", label: "Kirim" },
  { href: "/admin/settings", label: "Pengaturan" },
  { href: "/admin/guests", label: "Tamu" },
]

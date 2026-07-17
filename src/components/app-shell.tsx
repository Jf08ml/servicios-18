import { AppNav, type NavItem } from "@/components/nav";
import { SosButton } from "@/components/sos-button";
import { unreadCount } from "@/lib/notifications";
import type { Role } from "@prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  WORKER: "Profesional",
  CLIENT: "Cliente",
  HOTEL: "Hotel aliado",
  ADMIN: "Administración",
};

function navFor(role: Role): NavItem[] {
  switch (role) {
    case "WORKER":
      return [
        { href: "/panel", label: "Panel" },
        { href: "/agenda", label: "Agenda" },
        { href: "/chat", label: "Chat" },
        { href: "/hoteles", label: "Hoteles" },
        { href: "/reservas", label: "Reservas" },
        { href: "/perfil", label: "Mi perfil" },
        { href: "/verificacion", label: "Verificación" },
        { href: "/reportes", label: "Reportes" },
      ];
    case "CLIENT":
      return [
        { href: "/panel", label: "Panel" },
        { href: "/perfiles", label: "Perfiles" },
        { href: "/agenda", label: "Mis citas" },
        { href: "/chat", label: "Chat" },
        { href: "/hoteles", label: "Hoteles" },
        { href: "/reservas", label: "Reservas" },
        { href: "/perfil", label: "Mi cuenta" },
        { href: "/verificacion", label: "Verificación" },
        { href: "/reportes", label: "Reportes" },
      ];
    case "HOTEL":
      return [
        { href: "/panel", label: "Panel" },
        { href: "/hotel", label: "Mi hotel" },
        { href: "/reportes", label: "Reportes" },
      ];
    case "ADMIN":
      return [
        { href: "/panel", label: "Panel" },
        { href: "/admin", label: "Administración" },
      ];
  }
}

export async function AppShell({
  user,
  children,
}: {
  user: { id: string; displayName: string; role: Role };
  children: React.ReactNode;
}) {
  const unread = await unreadCount(user.id);

  return (
    <div className="min-h-dvh">
      <AppNav
        items={navFor(user.role)}
        displayName={user.displayName}
        roleLabel={ROLE_LABELS[user.role]}
        unreadNotifications={unread}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
      <SosButton />
    </div>
  );
}

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ToastProvider } from "@/components/ui/Toast";
import { Grain } from "@/components/svg/Grain";

// The authed chrome: providers, the grain overlay, the desktop rail, the mobile
// bar, and a centered main column. Wraps every signed in page.
export function AppShell({
  displayName,
  isSuperAdmin,
  signOut,
  children,
}: {
  displayName: string;
  isSuperAdmin: boolean;
  signOut: () => void;
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <Grain />
      <Sidebar
        displayName={displayName}
        isSuperAdmin={isSuperAdmin}
        signOut={signOut}
      />
      <div className="md:pl-[220px]">
        <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-6 md:px-8 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </ToastProvider>
  );
}

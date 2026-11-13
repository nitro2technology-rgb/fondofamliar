import { Suspense } from "react";
import BottomNav from "@/components/BottomNav";
import Cascaron from "@/components/Cascaron";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Cascaron
      menu={
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      }
    >
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+4.75rem)]">{children}</main>
    </Cascaron>
  );
}

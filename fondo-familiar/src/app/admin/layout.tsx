import { Suspense } from "react";
import AdminNav from "@/components/AdminNav";
import Cascaron from "@/components/Cascaron";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Cascaron
      menu={
        <Suspense fallback={null}>
          <AdminNav />
        </Suspense>
      }
    >
      <div className="flex flex-1 flex-col pb-8 pt-[calc(env(safe-area-inset-top)+4.25rem)]">{children}</div>
    </Cascaron>
  );
}

import { Suspense } from "react";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <Suspense fallback={null}>
        <AdminNav />
      </Suspense>
    </>
  );
}

import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-32 pt-8">{children}</main>
      <BottomNav />
    </>
  );
}

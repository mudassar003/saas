export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Content - No Sidebar */}
      <main className="min-h-screen p-6">
        {children}
      </main>
    </div>
  );
}

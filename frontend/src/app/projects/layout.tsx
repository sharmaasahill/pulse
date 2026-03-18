import { Sidebar } from "@/app/components/Sidebar";
import { Navbar } from "@/app/components/Navbar";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text-primary)" }}>
      <Navbar />
      <Sidebar />
      <div style={{ marginLeft: "260px", paddingTop: "64px" }}>
        {children}
      </div>
    </div>
  );
}

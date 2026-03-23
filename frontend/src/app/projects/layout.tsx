"use client";
import { Sidebar } from "@/app/components/Sidebar";
import { Navbar } from "@/app/components/Navbar";
import { useState, useCallback } from "react";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [createBoardOpen, setCreateBoardOpen] = useState(false);

  const openCreateBoard = useCallback(() => setCreateBoardOpen(true), []);
  const closeCreateBoard = useCallback(() => setCreateBoardOpen(false), []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
    }}>
      <Navbar />
      <Sidebar onCreateBoard={openCreateBoard} />
      <div
        className="main-content"
        style={{
          marginLeft: "var(--sidebar-width)",
          paddingTop: "var(--navbar-height)",
          transition: "margin-left var(--transition-slow)",
          minHeight: "100vh",
        }}
      >
        {children}
      </div>

      {/* Global create board event — children listen via custom event */}
      {createBoardOpen && (
        <div style={{ display: "none" }} data-create-board-trigger="true" />
      )}
    </div>
  );
}

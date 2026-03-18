"use client";
import { Sidebar } from "@/app/components/Sidebar";
import { Navbar } from "@/app/components/Navbar";
import { useState } from "react";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
    }}>
      <Navbar />
      <Sidebar />
      <div style={{
        marginLeft: "var(--sidebar-width)",
        paddingTop: "var(--navbar-height)",
        transition: "margin-left var(--transition-slow)",
        minHeight: "100vh",
      }}>
        {children}
      </div>
    </div>
  );
}

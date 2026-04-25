export const dynamic = "force-static";
export const runtime = "nodejs";
import React from "react";
// import fs from "fs";
// import path from "path";
import { notFound } from "next/navigation";
import { marked } from "marked";

// This page renders the April 2026 security incident bulletin as HTML from the Markdown file.
export default async function SecurityIncidentPage() {
  // Fetch the markdown file from the public directory for Vercel compatibility
  let mdContent = "";
  try {
    const res = await fetch("/bulletins/SECURITY-INCIDENT-APRIL-2026.md");
    if (!res.ok) throw new Error("Not found");
    mdContent = await res.text();
  } catch (e) {
    notFound();
  }
  const html = marked.parse(mdContent);
  return (
    <main className="prose mx-auto px-4 py-8">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}

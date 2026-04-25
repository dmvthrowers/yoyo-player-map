import React from "react";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { marked } from "marked";

// This page renders the April 2026 security incident bulletin as HTML from the Markdown file.
export default async function SecurityIncidentPage() {
  // Path to the markdown file (relative to project root)
  const mdPath = path.join(process.cwd(), "yoyomap", "docs", "SECURITY-INCIDENT-APRIL-2026.md");
  let mdContent = "";
  try {
    mdContent = fs.readFileSync(mdPath, "utf-8");
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

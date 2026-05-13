export const dynamic = "force-static";
import React from "react";
import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { marked } from "marked";

// This page renders the April 2026 security incident bulletin as HTML from the Markdown file.
export default async function SecurityIncidentPage() {
  // Read the markdown file directly from the filesystem
  let mdContent = "";
  try {
    const filePath = path.join(process.cwd(), "public", "bulletins", "SECURITY-INCIDENT-APRIL-2026.md");
    mdContent = await fs.readFile(filePath, "utf-8");
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

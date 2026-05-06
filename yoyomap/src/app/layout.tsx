export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The real <html>/<body> live in [locale]/layout.tsx
  // This pass-through satisfies Next.js' "root layout" requirement
  return <>{children}</>;
}
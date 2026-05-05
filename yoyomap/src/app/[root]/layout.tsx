export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal document shell for the non-localized / route
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
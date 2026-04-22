'use client';

import { useState, useEffect } from 'react';

export function ApiBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Auto-hide after 1am EDT on April 23, 2026 (05:00 UTC)
    const deadline = new Date('2026-04-23T05:00:00Z');
    if (new Date() >= deadline) setDismissed(true);
  }, []);

  if (dismissed) return null;

  return (
    <div role="alert" className="bg-amber-400 text-black px-4 py-3 text-center text-sm font-semibold">
      API call limit reached — signups may not work until the limit resets at midnight EDT.
    </div>
  );
}

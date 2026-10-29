'use client';

import dynamic from 'next/dynamic';

// The workshop depends on WebGL, localStorage and IndexedDB: render it only in the browser.
const Workshop = dynamic(() => import('@/components/Workshop'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center bg-[#fbfaf8] text-sm text-stone-500">Abriendo el taller…</div>
  ),
});

export default function HomePage() {
  return <Workshop />;
}

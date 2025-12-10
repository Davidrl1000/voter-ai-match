'use client';

import { trackGTMEvent, GTMEvents } from '@/lib/gtm';

export default function Flag() {
  return (
    <div
      className="fixed top-0 left-0 w-full z-[100] cursor-pointer"
      onClick={() => {
        trackGTMEvent(GTMEvents.FLAG_CLICKED);
      }}
    >
      <div className="h-2 bg-[#000b8b] w-full" />
      <div className="h-2 bg-white w-full" />
      <div className="h-4 bg-[#dc3226] w-full" />
      <div className="h-2 bg-white w-full" />
      <div className="h-2 bg-[#000b8b] w-full" />
    </div>
  );
}

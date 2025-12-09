'use client';

import Image from 'next/image';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';

export default function GitHubLink() {
  return (
    <a
      href="https://github.com/Davidrl1000/voter-ai-match"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackGTMEvent(GTMEvents.HOME_GITHUB_CLICK);
      }}
      className="fixed bottom-4 right-4 z-[200] w-[40px] h-[40px] opacity-80 hover:scale-110 transition-transform duration-200"
      aria-label="View source on GitHub"
    >
      <Image
        src="/assets/icons/git.svg"
        alt="GitHub"
        width={40}
        height={40}
        className="w-full h-full"
      />
    </a>
  );
}

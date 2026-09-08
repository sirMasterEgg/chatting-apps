import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  send: 'M4.5 19.5l16-7.5-16-7.5v6l10 1.5-10 1.5v6z',
  paperclip:
    'M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l9.2-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48',
  copy: 'M8 8V5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-3M5 8h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  x: 'M18 6L6 18M6 6l12 12',
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm7 2a4 4 0 10-3-6.87',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z M14 2v6h6',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9',
  login: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5m5 5H3',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  arrowDown: 'M12 5v14m0 0l-6-6m6 6l6-6',
  image: 'M4 5h16v14H4z M9 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M20 15l-4.5-4.5L8 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = 'h-5 w-5',
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

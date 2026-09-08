import type { Opts } from 'linkifyjs';

/**
 * linkify-react options for rendering message text. Only http/https URLs are
 * turned into links (emails and other schemes are left as plain text), and
 * every generated `<a>` gets a safe `rel`/`target` so a malicious message
 * can't abuse `window.opener` or open exotic schemes.
 */
export const linkifyOptions: Opts = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow',
  className: 'text-sky-400 underline underline-offset-2 hover:text-sky-300 break-all',
  validate: {
    url: (_value, token) => /^https?:\/\//i.test(token.toHref()),
    email: () => false,
  },
};

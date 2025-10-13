/**
 * Strips markdown-style user mention links from a string,
 * replacing them with just the @username.
 * e.g., "[@NghiaDepTry](/profile/uuid)" becomes "@NghiaDepTry"
 * @param {string} text - The input text containing markdown links.
 * @returns {string} The cleaned text with only @username mentions.
 */
export const stripMentionLinks = (text) => {
  if (!text) return '';
  // This regex finds the markdown link pattern and replaces it with the captured username.
  return text.replace(/\[@([^\]]+)\]\(\/profile\/[a-f0-9-]+\)/g, '@$1');
};

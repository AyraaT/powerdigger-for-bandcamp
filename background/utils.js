// Shared utility: allow only requests to known hosts.
// Defence-in-depth against a compromised content script asking the SW to
// fetch arbitrary URLs.
export function isAllowedFetch(url, allowedSuffixes) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return allowedSuffixes.some(
      (suffix) => u.hostname === suffix || u.hostname.endsWith('.' + suffix),
    );
  } catch {
    return false;
  }
}

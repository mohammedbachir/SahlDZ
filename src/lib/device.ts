export function isEmbeddedWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  if (/android/i.test(ua) && /; wv/i.test(ua)) return true;
  if (
    /iphone|ipad|ipod/i.test(ua) &&
    /applewebkit/i.test(ua) &&
    !/safari/i.test(ua) &&
    !/crios|fxios|opios|edgios/i.test(ua)
  ) {
    return true;
  }
  return false;
}

/**
 * Platform-agnostic URL opener.
 *
 * Web:    register via setOpenUrlImpl() in apps/web/src/platform/openUrl.web.ts
 * Mobile: register via setOpenUrlImpl() in apps/mobile/src/setup.ts using Linking.openURL
 */

export type OpenUrlFn = (url: string) => void;

// Default: no-op until a platform registers its implementation
let _impl: OpenUrlFn = (_url) => { /* no-op — call setOpenUrlImpl() with a platform adapter */ };

export function setOpenUrlImpl(fn: OpenUrlFn): void {
  _impl = fn;
}

export function openUrl(url: string): void {
  _impl(url);
}

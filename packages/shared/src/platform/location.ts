/**
 * Platform-agnostic location adapter.
 *
 * Web:    register via setLocationImpl() in apps/web/src/platform/location.web.ts
 * Mobile: register via setLocationImpl() in apps/mobile/src/setup.ts using expo-location
 */

export interface LocationResult {
  latitude: number;
  longitude: number;
  name?: string;
}

export type RequestLocationFn = () => Promise<LocationResult | null>;

// Default: no-op until a platform registers its implementation
let _impl: RequestLocationFn = async () => null;

export function setLocationImpl(fn: RequestLocationFn): void {
  _impl = fn;
}

export function requestLocation(): Promise<LocationResult | null> {
  return _impl();
}

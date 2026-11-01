import type { FeatureCollection } from 'geojson';

interface SharedRoutePayload {
  version: 1;
  name: string;
  geoJson: FeatureCollection;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createSharedRouteUrl(name: string, geoJson: FeatureCollection): string {
  const payload: SharedRoutePayload = { version: 1, name, geoJson };
  const url = new URL(window.location.href);
  url.hash = `route=${encodeBase64Url(JSON.stringify(payload))}`;
  return url.toString();
}

export function parseSharedRouteHash(hash: string): SharedRoutePayload {
  if (!hash.startsWith('#route=')) {
    throw new Error('URL does not contain shared route data.');
  }

  const parsed: unknown = JSON.parse(decodeBase64Url(hash.slice('#route='.length)));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Shared route data is invalid.');
  }

  const payload = parsed as Partial<SharedRoutePayload>;
  if (
    payload.version !== 1 ||
    typeof payload.name !== 'string' ||
    !payload.geoJson ||
    payload.geoJson.type !== 'FeatureCollection' ||
    !Array.isArray(payload.geoJson.features)
  ) {
    throw new Error('Shared route data is invalid.');
  }

  return payload as SharedRoutePayload;
}

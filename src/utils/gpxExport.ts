import type { FeatureCollection } from 'geojson';
import { downloadBlob } from './mapExport';

/**
 * Escapes special XML characters for GPX output
 */
function escapeXml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a GeoJSON FeatureCollection into standard GPX 1.1 format
 * compatible with Mapy.cz, Garmin, OsmAnd, and Google Earth.
 */
export function geoJsonToGpx(geoJson: FeatureCollection, title: string): string {
  const safeTitle = escapeXml(title || 'Trasa');
  const nowIso = new Date().toISOString();

  let waypointsXml = '';
  let tracksXml = '';

  for (const feature of geoJson.features) {
    if (!feature.geometry) continue;

    const props = feature.properties || {};
    const name = escapeXml(props.name || props.categoryName || '');
    const desc = escapeXml(props.description || '');

    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const [lon, lat] = coords;
        waypointsXml += `  <wpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">\n`;
        if (name) waypointsXml += `    <name>${name}</name>\n`;
        if (desc) waypointsXml += `    <desc>${desc}</desc>\n`;
        waypointsXml += `    <sym>Flag</sym>\n`;
        waypointsXml += `  </wpt>\n`;
      }
    } else if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        tracksXml += `  <trk>\n`;
        tracksXml += `    <name>${name || safeTitle}</name>\n`;
        if (desc) tracksXml += `    <desc>${desc}</desc>\n`;
        tracksXml += `    <trkseg>\n`;
        for (const pt of coords) {
          const [lon, lat] = pt;
          tracksXml += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}" />\n`;
        }
        tracksXml += `    </trkseg>\n`;
        tracksXml += `  </trk>\n`;
      }
    } else if (feature.geometry.type === 'MultiLineString') {
      const lines = feature.geometry.coordinates;
      if (Array.isArray(lines) && lines.length > 0) {
        tracksXml += `  <trk>\n`;
        tracksXml += `    <name>${name || safeTitle}</name>\n`;
        if (desc) tracksXml += `    <desc>${desc}</desc>\n`;
        for (const line of lines) {
          if (Array.isArray(line) && line.length >= 2) {
            tracksXml += `    <trkseg>\n`;
            for (const pt of line) {
              const [lon, lat] = pt;
              tracksXml += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}" />\n`;
            }
            tracksXml += `    </trkseg>\n`;
          }
        }
        tracksXml += `  </trk>\n`;
      }
    } else if (feature.geometry.type === 'Polygon') {
      const rings = feature.geometry.coordinates;
      if (Array.isArray(rings) && rings.length > 0 && Array.isArray(rings[0])) {
        tracksXml += `  <trk>\n`;
        tracksXml += `    <name>${name ? `Oblast: ${name}` : 'Oblast'}</name>\n`;
        tracksXml += `    <trkseg>\n`;
        for (const pt of rings[0]) {
          const [lon, lat] = pt;
          tracksXml += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}" />\n`;
        }
        tracksXml += `    </trkseg>\n`;
        tracksXml += `  </trk>\n`;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CRP - Complex Route Planning App"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${safeTitle}</name>
    <time>${nowIso}</time>
  </metadata>
${waypointsXml}${tracksXml}</gpx>
`;
}

/**
 * Exports GeoJSON feature collection as a downloadable .gpx file
 */
export function exportMapToGpx(geoJson: FeatureCollection, title: string): void {
  const gpxContent = geoJsonToGpx(geoJson, title);
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });

  const cleanName = (title || 'trasa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');

  downloadBlob(blob, `${cleanName || 'trasa'}.gpx`);
}

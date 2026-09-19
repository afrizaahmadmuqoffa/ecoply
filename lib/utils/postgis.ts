/**
 * Parse hex EWKB (Extended Well-Known Binary) dari PostGIS.
 * Format: [endian:1][type:4][srid:4 optional][x:8][y:8]
 * Contoh: 0101000020E6100000F88B4EB55A955A40A8C64B3789DD5A40
 */
function parseHexEWKB(hex: string): { lat: number; lng: number } | null {
  try {
    // Strip prefix \x jika ada (PostgreSQL bytea text format)
    const cleanHex = hex.startsWith('\\x') ? hex.slice(2) : hex

    // Validasi: harus hex string dengan panjang genap
    if (!/^[0-9a-fA-F]+$/.test(cleanHex) || cleanHex.length % 2 !== 0) {
      return null
    }

    // Minimal length: 1 (endian) + 4 (type) + 8 (x) + 8 (y) = 21 bytes = 42 chars
    if (cleanHex.length < 42) return null

    // Convert hex → Uint8Array
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16)
    }

    const dv = new DataView(bytes.buffer)
    const littleEndian = bytes[0] === 0x01

    // Read geometry type (4 bytes setelah endian byte)
    const geomTypeRaw = dv.getUint32(1, littleEndian)
    const hasSRID = (geomTypeRaw & 0x20000000) !== 0
    const baseType = geomTypeRaw & 0x0fffffff

    // Hanya handle Point (type = 1)
    if (baseType !== 1) return null

    let offset = 5

    // Skip 4 bytes SRID jika ada
    if (hasSRID) {
      offset += 4
    }

    // Pastikan cukup bytes untuk 2 double (16 bytes)
    if (bytes.length < offset + 16) return null

    // Read X (lng) dan Y (lat) sebagai float64
    const lng = dv.getFloat64(offset, littleEndian)
    const lat = dv.getFloat64(offset + 8, littleEndian)

    // Validasi range koordinat
    if (isNaN(lng) || isNaN(lat)) return null
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null

    return { lat, lng }
  } catch {
    return null
  }
}

/**
 * Parse lokasi dari Supabase PostGIS.
 * PostgREST bisa mengembalikan GEOGRAPHY/GEOMETRY dalam beberapa format:
 * 1. GeoJSON object: { type: "Point", coordinates: [lng, lat] }
 * 2. GeoJSON string: '{"type":"Point","coordinates":[lng,lat]}'
 * 3. WKT string: 'POINT(lng lat)'
 * 4. EWKT string: 'SRID=4326;POINT(lng lat)'
 * 5. Hex EWKB: '0101000020E6100000...' ← format default PostgREST untuk geography
 */
export function parsePostGISLocation(
  location: unknown,
): { lat: number; lng: number } | null {
  if (!location) return null

  try {
    // Case 1: GeoJSON object
    if (typeof location === 'object' && location !== null) {
      const geo = location as Record<string, unknown>
      if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
        const [lng, lat] = geo.coordinates as number[]
        if (typeof lng === 'number' && typeof lat === 'number') {
          return { lat, lng }
        }
      }
    }

    if (typeof location === 'string') {
      const str = location.trim()

      // Case 5: Hex EWKB (format paling umum dari PostgREST untuk geography)
      if (/^[0-9a-fA-F]+$/.test(str) || str.startsWith('\\x')) {
        const result = parseHexEWKB(str)
        if (result) return result
      }

      // Case 2: GeoJSON string
      if (str.startsWith('{')) {
        try {
          const geo = JSON.parse(str)
          if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
            const [lng, lat] = geo.coordinates
            return { lat: Number(lat), lng: Number(lng) }
          }
        } catch {
          // Bukan JSON valid, lanjut ke WKT
        }
      }

      // Case 3: WKT — POINT(lng lat) atau POINT (lng lat)
      const wktMatch = str.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
      if (wktMatch) {
        return { lng: parseFloat(wktMatch[1]), lat: parseFloat(wktMatch[2]) }
      }

      // Case 4: EWKT — SRID=4326;POINT(lng lat)
      const ewktMatch = str.match(
        /SRID=\d+;\s*POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i,
      )
      if (ewktMatch) {
        return { lng: parseFloat(ewktMatch[1]), lat: parseFloat(ewktMatch[2]) }
      }
    }
  } catch (err) {
    console.error('parsePostGISLocation error:', err, location)
  }

  // Jika semua parser gagal, log untuk debugging
  console.warn('parsePostGISLocation: format tidak dikenali:', location)
  return null
}
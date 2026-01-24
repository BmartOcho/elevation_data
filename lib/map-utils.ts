/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate bearing between two coordinates
 * @returns bearing in degrees
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
  const bearing = Math.atan2(y, x)
  return ((bearing * 180) / Math.PI + 360) % 360
}

/**
 * Generate intermediate points along a path between two coordinates
 * @param numPoints number of intermediate points to generate
 * @returns array of {lat, lng} coordinates
 */
export function generatePathPoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  numPoints = 100,
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = []

  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints
    const lat = lat1 + (lat2 - lat1) * fraction
    const lng = lng1 + (lng2 - lng1) * fraction
    points.push({ lat, lng })
  }

  return points
}

import type { Node, ElevationPoint } from "@/lib/types"
import { generatePathPoints } from "@/lib/map-utils"
import { fetchElevationDataBatched } from "@/lib/elevation-api"

/**
 * Generate path profile with elevation data between two nodes
 */
export async function generatePathProfile(nodeA: Node, nodeB: Node, numPoints = 100): Promise<ElevationPoint[]> {
  // Generate intermediate points along the path
  const pathPoints = generatePathPoints(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng, numPoints)

  // Fetch elevation data for all points
  const locations = pathPoints.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }))

  const elevationData = await fetchElevationDataBatched(locations)

  // Calculate distance from nodeA for each point
  const elevationPoints: ElevationPoint[] = elevationData.map((data, index) => {
    const fraction = index / numPoints
    const distance =
      fraction * Math.sqrt(Math.pow(nodeB.lat - nodeA.lat, 2) + Math.pow(nodeB.lng - nodeA.lng, 2)) * 111.32 // Approximate km per degree

    return {
      distance,
      elevation: data.elevation,
      lat: data.latitude,
      lng: data.longitude,
    }
  })

  return elevationPoints
}

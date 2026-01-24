import type { Node, ElevationPoint } from "@/lib/types"
import { calculateDistance } from "@/lib/map-utils"

/**
 * Calculate free space path loss using Friis transmission equation
 * FSPL (dB) = 20log10(d) + 20log10(f) + 32.45
 * where d is distance in km and f is frequency in MHz
 */
export function calculateFreeSpacePathLoss(distanceKm: number, frequencyMHz: number): number {
  return 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMHz) + 32.45
}

/**
 * Calculate received signal strength
 * RSS (dBm) = Tx Power (dBm) + Tx Gain (dBi) - Path Loss (dB) + Rx Gain (dBi) - Cable Loss (dB)
 */
export function calculateReceivedSignalStrength(
  txPowerWatts: number,
  txGainDbi: number,
  pathLossDb: number,
  rxGainDbi: number,
  cableLossDb: number,
): number {
  // Convert power from watts to dBm: P(dBm) = 10 * log10(P(mW))
  const txPowerDbm = 10 * Math.log10(txPowerWatts * 1000)

  return txPowerDbm + txGainDbi - pathLossDb + rxGainDbi - cableLossDb
}

/**
 * Calculate link margin
 * Link Margin = RSS - Receiver Sensitivity
 * Positive margin means the link should work
 */
export function calculateLinkMargin(rssDbm: number, sensitivityDbm: number): number {
  return rssDbm - sensitivityDbm
}

/**
 * Calculate Fresnel zone radius at a given point
 * r = sqrt((n * λ * d1 * d2) / (d1 + d2))
 * where n is the zone number (1 for first Fresnel zone)
 * λ is wavelength in meters
 * d1 and d2 are distances from the point to each end
 */
export function calculateFresnelRadius(
  frequencyMHz: number,
  totalDistanceKm: number,
  pointDistanceKm: number,
  zoneNumber = 1,
): number {
  const wavelengthM = (299.792458 / frequencyMHz) * 1000 // speed of light / frequency
  const d1 = pointDistanceKm * 1000 // convert to meters
  const d2 = (totalDistanceKm - pointDistanceKm) * 1000
  const totalDistanceM = totalDistanceKm * 1000

  if (d1 === 0 || d2 === 0) return 0

  return Math.sqrt((zoneNumber * wavelengthM * d1 * d2) / totalDistanceM)
}

/**
 * Calculate Earth bulge (curvature) at a given point
 * h = (d1 * d2) / (2 * R)
 * where d1 and d2 are distances in km and R is Earth radius (using 4/3 for radio waves)
 * This accounts for atmospheric refraction
 */
export function calculateEarthBulge(totalDistanceKm: number, pointDistanceKm: number): number {
  const R = 6371 * (4 / 3) // Earth radius with 4/3 correction for standard atmosphere
  const d1 = pointDistanceKm
  const d2 = totalDistanceKm - pointDistanceKm

  return (d1 * d2) / (2 * R)
}

/**
 * Calculate line of sight elevation including antenna heights and Earth bulge
 */
export function calculateLineOfSight(
  nodeAHeightAgl: number,
  nodeBHeightAgl: number,
  nodeAElevation: number,
  nodeBElevation: number,
  totalDistanceKm: number,
  pointDistanceKm: number,
): number {
  const nodeAHeightMsl = nodeAElevation + nodeAHeightAgl // Mean sea level
  const nodeBHeightMsl = nodeBElevation + nodeBHeightAgl

  // Linear interpolation between the two node heights
  const fraction = pointDistanceKm / totalDistanceKm
  const losElevation = nodeAHeightMsl + (nodeBHeightMsl - nodeAHeightMsl) * fraction

  // Subtract Earth bulge
  const earthBulge = calculateEarthBulge(totalDistanceKm, pointDistanceKm)
  return losElevation - earthBulge
}

/**
 * Check if there's line of sight clearance
 * Returns percentage of first Fresnel zone that is clear
 */
export function calculateFresnelClearance(
  elevationPoints: ElevationPoint[],
  nodeAHeightAgl: number,
  nodeBHeightAgl: number,
  frequencyMHz: number,
  totalDistanceKm: number,
): { clearancePercent: number; hasLineOfSight: boolean; obstructionPoint: ElevationPoint | null } {
  if (elevationPoints.length < 2) {
    return { clearancePercent: 100, hasLineOfSight: true, obstructionPoint: null }
  }

  const nodeAElevation = elevationPoints[0].elevation
  const nodeBElevation = elevationPoints[elevationPoints.length - 1].elevation

  let minClearance = Number.POSITIVE_INFINITY
  let obstructionPoint: ElevationPoint | null = null

  for (const point of elevationPoints) {
    const losHeight = calculateLineOfSight(
      nodeAHeightAgl,
      nodeBHeightAgl,
      nodeAElevation,
      nodeBElevation,
      totalDistanceKm,
      point.distance,
    )

    const fresnelRadius = calculateFresnelRadius(frequencyMHz, totalDistanceKm, point.distance, 1)

    // Calculate clearance: how much higher the LOS is above terrain
    const clearance = losHeight - point.elevation

    // Calculate what percentage of the Fresnel zone is clear
    const clearancePercent = fresnelRadius > 0 ? (clearance / fresnelRadius) * 100 : 100

    if (clearancePercent < minClearance) {
      minClearance = clearancePercent
      obstructionPoint = point
    }
  }

  // 60% of first Fresnel zone clearance is considered acceptable
  const hasLineOfSight = minClearance >= 60

  return {
    clearancePercent: minClearance,
    hasLineOfSight,
    obstructionPoint,
  }
}

/**
 * Comprehensive RF link analysis
 */
export interface RFLinkAnalysis {
  distance: number // km
  freeSpacePathLoss: number // dB
  receivedSignalStrength: number // dBm
  linkMargin: number // dB
  fresnelClearance: number // percentage
  hasLineOfSight: boolean
  obstructionPoint: ElevationPoint | null
  maxFresnelRadius: number // meters
  linkQuality: "excellent" | "good" | "marginal" | "poor" | "no-link"
}

export function analyzeRFLink(nodeA: Node, nodeB: Node, elevationPoints: ElevationPoint[]): RFLinkAnalysis {
  const distance = calculateDistance(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng)

  // Use average frequency if nodes have different frequencies
  const avgFrequency = (nodeA.frequency + nodeB.frequency) / 2

  const freeSpacePathLoss = calculateFreeSpacePathLoss(distance, avgFrequency)

  const receivedSignalStrength = calculateReceivedSignalStrength(
    nodeA.power,
    nodeA.antenna_gain,
    freeSpacePathLoss,
    nodeB.antenna_gain,
    nodeB.cable_loss,
  )

  const linkMargin = calculateLinkMargin(receivedSignalStrength, nodeB.sensitivity)

  const { clearancePercent, hasLineOfSight, obstructionPoint } = calculateFresnelClearance(
    elevationPoints,
    nodeA.height_agl,
    nodeB.height_agl,
    avgFrequency,
    distance,
  )

  // Calculate maximum Fresnel radius (at midpoint)
  const maxFresnelRadius = calculateFresnelRadius(avgFrequency, distance, distance / 2, 1)

  // Determine link quality
  let linkQuality: RFLinkAnalysis["linkQuality"]
  if (!hasLineOfSight || linkMargin < 0) {
    linkQuality = "no-link"
  } else if (linkMargin >= 20) {
    linkQuality = "excellent"
  } else if (linkMargin >= 10) {
    linkQuality = "good"
  } else if (linkMargin >= 5) {
    linkQuality = "marginal"
  } else {
    linkQuality = "poor"
  }

  return {
    distance,
    freeSpacePathLoss,
    receivedSignalStrength,
    linkMargin,
    fresnelClearance: clearancePercent,
    hasLineOfSight,
    obstructionPoint,
    maxFresnelRadius,
    linkQuality,
  }
}

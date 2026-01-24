export interface Project {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Node {
  id: string
  project_id: string
  name: string
  lat: number
  lng: number
  height_agl: number // Height above ground level in meters
  frequency: number // Frequency in MHz
  power: number // Power in Watts
  antenna_gain: number // Antenna gain in dBi
  sensitivity: number // Sensitivity in dBm (receiver only)
  cable_loss: number // Cable loss in dB (receiver only)
  position: number
  created_at: string
}

export interface Connection {
  nodeA: Node
  nodeB: Node
  distance: number // Distance in kilometers
  pathLoss: number // Path loss in dB
  fresnelClearance: number // Fresnel zone clearance percentage
  hasLineOfSight: boolean
}

export interface ElevationPoint {
  distance: number // Distance along path in kilometers
  elevation: number // Elevation in meters
  lat: number
  lng: number
}

export interface PathProfile {
  connection: Connection
  elevationPoints: ElevationPoint[]
  maxFresnelRadius: number // Maximum Fresnel zone radius in meters
}

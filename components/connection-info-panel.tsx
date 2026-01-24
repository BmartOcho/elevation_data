"use client"

import { useEffect, useState } from "react"
import type { Node, ElevationPoint } from "@/lib/types"
import { generatePathProfile } from "@/lib/path-profile"
import { analyzeRFLink, type RFLinkAnalysis } from "@/lib/rf-calculations"

interface ConnectionInfoPanelProps {
  nodeA: Node
  nodeB: Node
  onClose: () => void
}

export function ConnectionInfoPanel({ nodeA, nodeB, onClose }: ConnectionInfoPanelProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [analysis, setAnalysis] = useState<RFLinkAnalysis | null>(null)
  const [elevationPoints, setElevationPoints] = useState<ElevationPoint[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPathProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const points = await generatePathProfile(nodeA, nodeB, 100)
        setElevationPoints(points)

        const rfAnalysis = analyzeRFLink(nodeA, nodeB, points)
        setAnalysis(rfAnalysis)
      } catch (err) {
        console.error("[v0] Error loading path profile:", err)
        setError("Failed to load elevation data")
      } finally {
        setIsLoading(false)
      }
    }

    loadPathProfile()
  }, [nodeA, nodeB])

  const getLinkQualityColor = (quality: RFLinkAnalysis["linkQuality"]) => {
    switch (quality) {
      case "excellent":
        return "bg-green-400"
      case "good":
        return "bg-cyan-400"
      case "marginal":
        return "bg-yellow-400"
      case "poor":
        return "bg-orange-400"
      case "no-link":
        return "bg-red-400"
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b-4 border-black bg-pink-400 p-4">
        <h2 className="text-xl font-black uppercase">RF Analysis</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <div className="border-4 border-black bg-white p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-bold">Loading elevation data...</p>
          </div>
        ) : error ? (
          <div className="border-4 border-black bg-red-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-bold text-red-900">{error}</p>
          </div>
        ) : analysis ? (
          <>
            {/* Link Quality Badge */}
            <div
              className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getLinkQualityColor(analysis.linkQuality)}`}
            >
              <p className="text-center text-2xl font-black uppercase">{analysis.linkQuality}</p>
              <p className="text-center text-xs font-bold">Link Quality</p>
            </div>

            {/* Connection Details */}
            <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-2 font-black">Path Details</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-bold">From:</span> {nodeA.name}
                </p>
                <p>
                  <span className="font-bold">To:</span> {nodeB.name}
                </p>
                <p>
                  <span className="font-bold">Distance:</span> {analysis.distance.toFixed(2)} km
                </p>
              </div>
            </div>

            {/* RF Metrics */}
            <div className="border-4 border-black bg-cyan-100 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-2 font-black">RF Metrics</p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-bold">Free Space Path Loss:</span> {analysis.freeSpacePathLoss.toFixed(2)} dB
                </p>
                <p>
                  <span className="font-bold">Received Signal:</span> {analysis.receivedSignalStrength.toFixed(2)} dBm
                </p>
                <p>
                  <span className="font-bold">Link Margin:</span>{" "}
                  <span
                    className={
                      analysis.linkMargin >= 10
                        ? "text-green-700"
                        : analysis.linkMargin >= 0
                          ? "text-orange-700"
                          : "text-red-700"
                    }
                  >
                    {analysis.linkMargin.toFixed(2)} dB
                  </span>
                </p>
              </div>
            </div>

            {/* Line of Sight */}
            <div
              className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${analysis.hasLineOfSight ? "bg-green-100" : "bg-red-100"}`}
            >
              <p className="mb-2 font-black">Line of Sight</p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-bold">Status:</span> {analysis.hasLineOfSight ? "Clear" : "Obstructed"}
                </p>
                <p>
                  <span className="font-bold">Fresnel Clearance:</span> {analysis.fresnelClearance.toFixed(1)}%
                </p>
                <p className="text-gray-600">{">"}60% clearance recommended</p>
              </div>
            </div>

            {/* Fresnel Zone */}
            <div className="border-4 border-black bg-yellow-100 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-2 font-black">Fresnel Zone</p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-bold">Max Radius:</span> {analysis.maxFresnelRadius.toFixed(2)} m
                </p>
                <p className="text-gray-600">First Fresnel zone at midpoint</p>
              </div>
            </div>

            {/* Node A Info */}
            <div className="border-2 border-black bg-white p-3">
              <p className="mb-2 font-bold">{nodeA.name}</p>
              <div className="space-y-1 text-xs">
                <p>Frequency: {nodeA.frequency} MHz</p>
                <p>
                  Power: {nodeA.power} W ({(10 * Math.log10(nodeA.power * 1000)).toFixed(1)} dBm)
                </p>
                <p>Antenna Gain: {nodeA.antenna_gain} dBi</p>
                <p>Height AGL: {nodeA.height_agl} m</p>
              </div>
            </div>

            {/* Node B Info */}
            <div className="border-2 border-black bg-white p-3">
              <p className="mb-2 font-bold">{nodeB.name}</p>
              <div className="space-y-1 text-xs">
                <p>Frequency: {nodeB.frequency} MHz</p>
                <p>Sensitivity: {nodeB.sensitivity} dBm</p>
                <p>Antenna Gain: {nodeB.antenna_gain} dBi</p>
                <p>Cable Loss: {nodeB.cable_loss} dB</p>
                <p>Height AGL: {nodeB.height_agl} m</p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="border-t-4 border-black p-4">
        <button
          onClick={onClose}
          className="w-full border-2 border-black bg-white p-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  )
}

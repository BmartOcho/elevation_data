"use client"

import { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"
import type { Node, ElevationPoint } from "@/lib/types"
import { calculateLineOfSight, calculateFresnelRadius } from "@/lib/rf-calculations"

interface PathProfileChartProps {
  elevationPoints: ElevationPoint[]
  nodeA: Node
  nodeB: Node
  totalDistance: number
  onCursorMove?: (point: ElevationPoint | null) => void
}

export function PathProfileChart({
  elevationPoints,
  nodeA,
  nodeB,
  totalDistance,
  onCursorMove,
}: PathProfileChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  const chartData = useMemo(() => {
    if (elevationPoints.length < 2) return []

    const nodeAElevation = elevationPoints[0].elevation
    const nodeBElevation = elevationPoints[elevationPoints.length - 1].elevation
    const avgFrequency = (nodeA.frequency + nodeB.frequency) / 2

    return elevationPoints.map((point, index) => {
      const losHeight = calculateLineOfSight(
        nodeA.height_agl,
        nodeB.height_agl,
        nodeAElevation,
        nodeBElevation,
        totalDistance,
        point.distance,
      )

      const fresnelRadius = calculateFresnelRadius(avgFrequency, totalDistance, point.distance, 1)

      return {
        distance: point.distance,
        elevation: point.elevation,
        los: losHeight,
        fresnelUpper: losHeight + fresnelRadius,
        fresnelLower: losHeight - fresnelRadius,
        nodeAHeight: index === 0 ? nodeAElevation + nodeA.height_agl : null,
        nodeBHeight: index === elevationPoints.length - 1 ? nodeBElevation + nodeB.height_agl : null,
      }
    })
  }, [elevationPoints, nodeA, nodeB, totalDistance])

  const handleMouseMove = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined) {
      const index = state.activeTooltipIndex
      setHoveredPoint(index)
      onCursorMove?.(elevationPoints[index])
    } else {
      setHoveredPoint(null)
      onCursorMove?.(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
    onCursorMove?.(null)
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center border-4 border-black bg-white p-4">
        <p className="font-bold">No elevation data available</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full border-4 border-black bg-white p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeWidth={1} />
          <XAxis
            dataKey="distance"
            label={{ value: "Distance (km)", position: "insideBottom", offset: -5, fontWeight: "bold" }}
            stroke="#000"
            strokeWidth={2}
            tick={{ fontWeight: "bold", fontSize: 12 }}
          />
          <YAxis
            label={{ value: "Elevation (m)", angle: -90, position: "insideLeft", fontWeight: "bold" }}
            stroke="#000"
            strokeWidth={2}
            tick={{ fontWeight: "bold", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              border: "3px solid black",
              backgroundColor: "white",
              fontWeight: "bold",
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
            }}
            labelStyle={{ fontWeight: "bold" }}
            formatter={(value: number, name: string) => {
              if (name === "elevation") return [value.toFixed(1) + " m", "Terrain"]
              if (name === "los") return [value.toFixed(1) + " m", "Line of Sight"]
              return [value.toFixed(1) + " m", name]
            }}
            labelFormatter={(value) => `Distance: ${Number(value).toFixed(2)} km`}
          />

          {/* Fresnel Zone Area */}
          <Area
            type="monotone"
            dataKey="fresnelUpper"
            stroke="none"
            fill="#fde047"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="fresnelLower"
            stroke="none"
            fill="#fde047"
            fillOpacity={0.3}
            isAnimationActive={false}
          />

          {/* Line of Sight */}
          <Line
            type="monotone"
            dataKey="los"
            stroke="#000000"
            strokeWidth={2}
            dot={false}
            name="Line of Sight"
            isAnimationActive={false}
          />

          {/* Terrain Elevation */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#000000"
            strokeWidth={3}
            fill="#22c55e"
            fillOpacity={0.6}
            name="Terrain"
            isAnimationActive={false}
          />

          {/* Node A Position */}
          {chartData[0].nodeAHeight && (
            <ReferenceDot
              x={chartData[0].distance}
              y={chartData[0].nodeAHeight}
              r={6}
              fill="#06b6d4"
              stroke="#000000"
              strokeWidth={2}
            />
          )}

          {/* Node B Position */}
          {chartData[chartData.length - 1].nodeBHeight && (
            <ReferenceDot
              x={chartData[chartData.length - 1].distance}
              y={chartData[chartData.length - 1].nodeBHeight}
              r={6}
              fill="#ec4899"
              stroke="#000000"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

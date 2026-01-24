"use client"

import { useEffect, useRef, useState } from "react"
import type { Node, ElevationPoint } from "@/lib/types"

interface InteractiveMapProps {
  nodes: Node[]
  selectedNodeId: string | null
  selectedConnection: { nodeAId: string; nodeBId: string } | null
  hoveredPathPoint: ElevationPoint | null
  onNodeAdd: (lat: number, lng: number) => void
  onNodeMove: (nodeId: string, lat: number, lng: number) => void
  onNodeSelect: (nodeId: string | null) => void
  onConnectionSelect: (nodeAId: string, nodeBId: string) => void
}

export function InteractiveMap({
  nodes,
  selectedNodeId,
  selectedConnection,
  hoveredPathPoint,
  onNodeAdd,
  onNodeMove,
  onNodeSelect,
  onConnectionSelect,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const linesRef = useRef<Map<string, any>>(new Map())
  const hoverMarkerRef = useRef<any>(null)
  const onNodeAddRef = useRef(onNodeAdd)
  const leafletRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    onNodeAddRef.current = onNodeAdd
  }, [onNodeAdd])

  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === "undefined") return

      const L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")
      leafletRef.current = L.default || L
      setLeafletLoaded(true)
    }

    loadLeaflet()
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return

    const L = leafletRef.current
    console.log("[v0] Initializing Leaflet map")

    // Fix for default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })

    const map = L.map(mapRef.current!, {
      center: [39.8283, -98.5795], // Center of USA
      zoom: 5,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on("click", (e: any) => {
      console.log("[v0] Map clicked at:", e.latlng.lat, e.latlng.lng)
      console.log("[v0] onNodeAddRef.current exists:", !!onNodeAddRef.current)
      onNodeAddRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapInstanceRef.current = map
    console.log("[v0] Map initialized successfully with click handler")
    setIsLoading(false)

    return () => {
      if (mapInstanceRef.current) {
        console.log("[v0] Cleaning up map")
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [leafletLoaded])

  // Update markers when nodes change
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading || !leafletLoaded) return

    const L = leafletRef.current
    const updateMarkers = () => {
      console.log("[v0] Updating markers, node count:", nodes.length)

      // Remove markers that no longer exist
      const currentNodeIds = new Set(nodes.map((n) => n.id))
      for (const [id, marker] of markersRef.current.entries()) {
        if (!currentNodeIds.has(id)) {
          console.log("[v0] Removing marker:", id)
          marker.remove()
          markersRef.current.delete(id)
        }
      }

      // Add or update markers
      nodes.forEach((node) => {
        let marker = markersRef.current.get(node.id)

        if (!marker) {
          // Create new marker
          console.log("[v0] Creating new marker for node:", node.id, "at", node.lat, node.lng)

          const nodeIcon = L.divIcon({
            className: "custom-node-marker",
            html: `<div style="
              width: 24px; 
              height: 24px; 
              background: ${node.id === selectedNodeId ? "#ec4899" : "#06b6d4"}; 
              border: 3px solid #000; 
              border-radius: 50%;
              box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })

          marker = L.marker([node.lat, node.lng], {
            draggable: true,
            title: node.name,
            icon: nodeIcon,
          })

          marker.on("click", (e: any) => {
            console.log("[v0] Marker clicked:", node.id)
            L.DomEvent.stopPropagation(e) // Prevent map click
            onNodeSelect(node.id)
          })

          marker.on("dragend", (e: any) => {
            const latlng = e.target.getLatLng()
            console.log("[v0] Marker dragged to:", latlng.lat, latlng.lng)
            onNodeMove(node.id, latlng.lat, latlng.lng)
          })

          marker.bindPopup(`<strong>${node.name}</strong><br/>Freq: ${node.frequency} MHz`)
          marker.addTo(mapInstanceRef.current)
          markersRef.current.set(node.id, marker)
          console.log("[v0] Marker added successfully, total markers:", markersRef.current.size)
        } else {
          // Update existing marker position and icon
          marker.setLatLng([node.lat, node.lng])
          marker.setPopupContent(`<strong>${node.name}</strong><br/>Freq: ${node.frequency} MHz`)

          const nodeIcon = L.divIcon({
            className: "custom-node-marker",
            html: `<div style="
              width: 24px; 
              height: 24px; 
              background: ${node.id === selectedNodeId ? "#ec4899" : "#06b6d4"}; 
              border: 3px solid #000; 
              border-radius: 50%;
              box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
          marker.setIcon(nodeIcon)
        }
      })
    }

    updateMarkers()
  }, [nodes, selectedNodeId, isLoading, leafletLoaded, onNodeMove, onNodeSelect])

  // Draw lines between all nodes (full mesh)
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading || !leafletLoaded) return

    const L = leafletRef.current
    const updateLines = () => {
      console.log("[v0] Updating lines, node count:", nodes.length)

      // Clear existing lines
      for (const line of linesRef.current.values()) {
        line.remove()
      }
      linesRef.current.clear()

      // Draw lines between all pairs of nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i]
          const nodeB = nodes[j]
          const lineKey = `${nodeA.id}-${nodeB.id}`

          const isSelected =
            selectedConnection &&
            ((selectedConnection.nodeAId === nodeA.id && selectedConnection.nodeBId === nodeB.id) ||
              (selectedConnection.nodeAId === nodeB.id && selectedConnection.nodeBId === nodeA.id))

          const line = L.polyline(
            [
              [nodeA.lat, nodeA.lng],
              [nodeB.lat, nodeB.lng],
            ],
            {
              color: isSelected ? "#ec4899" : "#000000",
              weight: isSelected ? 4 : 3,
              opacity: isSelected ? 1.0 : 0.7,
            },
          )

          line.on("click", () => {
            onConnectionSelect(nodeA.id, nodeB.id)
          })

          line.addTo(mapInstanceRef.current)
          linesRef.current.set(lineKey, line)
        }
      }
    }

    updateLines()
  }, [nodes, selectedConnection, isLoading, leafletLoaded, onConnectionSelect])

  useEffect(() => {
    if (!mapInstanceRef.current || isLoading || !leafletLoaded) return

    const L = leafletRef.current
    const updateHoverMarker = () => {
      // Remove existing hover marker
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove()
        hoverMarkerRef.current = null
      }

      // Add hover marker if there's a hovered point
      if (hoveredPathPoint) {
        const hoverIcon = L.divIcon({
          className: "custom-hover-marker",
          html: '<div style="width: 12px; height: 12px; background: #f59e0b; border: 3px solid #000; border-radius: 50%;"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })

        hoverMarkerRef.current = L.marker([hoveredPathPoint.lat, hoveredPathPoint.lng], {
          icon: hoverIcon,
          interactive: false,
        }).addTo(mapInstanceRef.current)
      }
    }

    updateHoverMarker()
  }, [hoveredPathPoint, isLoading, leafletLoaded])

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <p className="font-bold text-black">Loading map...</p>
        </div>
      )}
    </div>
  )
}

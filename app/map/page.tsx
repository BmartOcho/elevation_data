"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { InteractiveMap } from "@/components/interactive-map"
import { NodeSettingsPanel } from "@/components/node-settings-panel"
import { ConnectionInfoPanel } from "@/components/connection-info-panel"
import { PathProfileChart } from "@/components/path-profile-chart"
import { ProjectManager } from "@/components/project-manager"
import { createClient } from "@/lib/supabase/client"
import type { Node, ElevationPoint } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { generatePathProfile } from "@/lib/path-profile"
import { calculateDistance } from "@/lib/map-utils"

export default function MapPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<{ nodeAId: string; nodeBId: string } | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>("My RF Project")
  const [isLoading, setIsLoading] = useState(true)
  const [pathProfileData, setPathProfileData] = useState<{
    elevationPoints: ElevationPoint[]
    nodeA: Node
    nodeB: Node
    distance: number
  } | null>(null)
  const [hoveredPathPoint, setHoveredPathPoint] = useState<ElevationPoint | null>(null)
  const [showProjectManager, setShowProjectManager] = useState(false)
  const nodesRef = useRef<Node[]>([])
  const projectIdRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    projectIdRef.current = projectId
  }, [projectId])

  const loadProject = async (targetProjectId?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      let currentProjectId: string

      if (targetProjectId) {
        currentProjectId = targetProjectId

        const { data: projectData } = await supabase.from("projects").select("name").eq("id", targetProjectId).single()

        if (projectData) {
          setProjectName(projectData.name)
        }

        setProjectId(currentProjectId)
        projectIdRef.current = currentProjectId

        const { data: nodesData, error: nodesError } = await supabase
          .from("nodes")
          .select("*")
          .eq("project_id", currentProjectId)
          .order("position", { ascending: true })

        if (nodesError) throw nodesError

        setNodes(nodesData || [])
        nodesRef.current = nodesData || []
        setSelectedNodeId(null)
        setSelectedConnection(null)
        setPathProfileData(null)
      } else {
        const { data: projects, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)

        if (projectsError) throw projectsError

        if (projects && projects.length > 0) {
          currentProjectId = projects[0].id
          setProjectName(projects[0].name)
          setProjectId(currentProjectId)
          projectIdRef.current = currentProjectId
          setNodes([])
          nodesRef.current = []
        } else {
          const { data: newProject, error: createError } = await supabase
            .from("projects")
            .insert({
              name: "My RF Project",
              user_id: user.id,
            })
            .select()
            .single()

          if (createError) throw createError
          currentProjectId = newProject.id
          setProjectName(newProject.name)
          setProjectId(currentProjectId)
          projectIdRef.current = currentProjectId
          setNodes([])
          nodesRef.current = []
        }
      }

      console.log("[v0] Project loaded, projectId:", projectIdRef.current)
    } catch (error) {
      console.error("[v0] Error loading project:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
  }, [])

  const handleProjectSwitch = async (newProjectId: string) => {
    setIsLoading(true)
    await loadProject(newProjectId)
  }

  useEffect(() => {
    const loadPathProfile = async () => {
      if (!selectedConnection) {
        setPathProfileData(null)
        return
      }

      const nodeA = nodes.find((n) => n.id === selectedConnection.nodeAId)
      const nodeB = nodes.find((n) => n.id === selectedConnection.nodeBId)

      if (!nodeA || !nodeB) return

      try {
        const elevationPoints = await generatePathProfile(nodeA, nodeB, 100)
        const distance = calculateDistance(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng)

        setPathProfileData({
          elevationPoints,
          nodeA,
          nodeB,
          distance,
        })
      } catch (error) {
        console.error("[v0] Error loading path profile:", error)
      }
    }

    loadPathProfile()
  }, [selectedConnection, nodes])

  const handleNodeAdd = useCallback(
    async (lat: number, lng: number) => {
      const currentProjectId = projectIdRef.current
      const currentNodes = nodesRef.current

      console.log("[v0] handleNodeAdd called with:", lat, lng)
      console.log("[v0] projectIdRef.current:", currentProjectId)
      console.log("[v0] nodesRef.current length:", currentNodes.length)

      if (!currentProjectId) {
        console.log("[v0] No projectId, skipping node add")
        alert("Project not loaded yet. Please wait.")
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("[v0] No authenticated user found")
          alert("You must be logged in to add nodes")
          return
        }

        const newNode = {
          project_id: currentProjectId,
          name: `Node ${currentNodes.length + 1}`,
          lat,
          lng,
          height_agl: 10.0,
          frequency: 915.0,
          power: 1.0,
          antenna_gain: 2.15,
          sensitivity: -110.0,
          cable_loss: 0.5,
          position: currentNodes.length,
        }

        console.log("[v0] Inserting node into database:", newNode)

        const { data, error } = await supabase.from("nodes").insert(newNode).select().single()

        if (error) {
          console.error("[v0] Error inserting node:", error)
          alert(`Error adding node: ${error.message}`)
          throw error
        }

        console.log("[v0] Node inserted successfully:", data)
        const updatedNodes = [...currentNodes, data]
        setNodes(updatedNodes)
        nodesRef.current = updatedNodes
      } catch (error) {
        console.error("[v0] Error adding node:", error)
      }
    },
    [supabase],
  )

  const handleNodeMove = useCallback(
    async (nodeId: string, lat: number, lng: number) => {
      console.log("[v0] Moving node:", nodeId, "to", lat, lng)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("[v0] No authenticated user found")
          alert("You must be logged in to move nodes")
          return
        }

        const { error } = await supabase.from("nodes").update({ lat, lng }).eq("id", nodeId)

        if (error) {
          console.error("[v0] Error moving node:", error)
          alert(`Error moving node: ${error.message}`)
          throw error
        }

        const updatedNodes = nodesRef.current.map((node) => (node.id === nodeId ? { ...node, lat, lng } : node))
        setNodes(updatedNodes)
        nodesRef.current = updatedNodes
      } catch (error) {
        console.error("[v0] Error moving node:", error)
      }
    },
    [supabase],
  )

  const handleNodeUpdate = useCallback(
    async (nodeId: string, updates: Partial<Node>) => {
      console.log("[v0] Updating node:", nodeId, updates)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("[v0] No authenticated user found")
          alert("You must be logged in to update nodes")
          return
        }

        const { error } = await supabase.from("nodes").update(updates).eq("id", nodeId)

        if (error) {
          console.error("[v0] Error updating node:", error)
          alert(`Error updating node: ${error.message}`)
          throw error
        }

        const updatedNodes = nodesRef.current.map((node) => (node.id === nodeId ? { ...node, ...updates } : node))
        setNodes(updatedNodes)
        nodesRef.current = updatedNodes
      } catch (error) {
        console.error("[v0] Error updating node:", error)
      }
    },
    [supabase],
  )

  const handleNodeDelete = useCallback(
    async (nodeId: string) => {
      console.log("[v0] Deleting node:", nodeId)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("[v0] No authenticated user found")
          alert("You must be logged in to delete nodes")
          return
        }

        const { error } = await supabase.from("nodes").delete().eq("id", nodeId)

        if (error) {
          console.error("[v0] Error deleting node:", error)
          alert(`Error deleting node: ${error.message}`)
          throw error
        }

        const updatedNodes = nodesRef.current.filter((node) => node.id !== nodeId)
        setNodes(updatedNodes)
        nodesRef.current = updatedNodes
        setSelectedNodeId(null)
      } catch (error) {
        console.error("[v0] Error deleting node:", error)
      }
    },
    [supabase],
  )

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    console.log("[v0] Selecting node:", nodeId)
    setSelectedNodeId(nodeId)
    setSelectedConnection(null)
    setPathProfileData(null)
  }, [])

  const handleConnectionSelect = useCallback((nodeAId: string, nodeBId: string) => {
    console.log("[v0] Selecting connection:", nodeAId, nodeBId)
    setSelectedConnection({ nodeAId, nodeBId })
    setSelectedNodeId(null)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
  const connectionNodes = selectedConnection
    ? {
        nodeA: nodes.find((n) => n.id === selectedConnection.nodeAId),
        nodeB: nodes.find((n) => n.id === selectedConnection.nodeBId),
      }
    : null

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-xl font-bold">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-yellow-300">
      {/* Header */}
      <header className="border-b-4 border-black bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase">PlexMesh RF Analyzer</h1>
            <p className="text-sm font-bold text-gray-600">Project: {projectName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold">
              Nodes: <span className="text-cyan-600">{nodes.length}</span>
            </div>
            <Button
              onClick={() => setShowProjectManager(true)}
              className="border-2 border-black bg-pink-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-500"
            >
              Projects
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-2 border-black bg-white font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Map container */}
          <div className="flex-1 p-4">
            <InteractiveMap
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              selectedConnection={selectedConnection}
              hoveredPathPoint={hoveredPathPoint}
              onNodeAdd={handleNodeAdd}
              onNodeMove={handleNodeMove}
              onNodeSelect={handleNodeSelect}
              onConnectionSelect={handleConnectionSelect}
            />
          </div>

          {/* Side panel */}
          <div className="w-96 border-l-4 border-black bg-white">
            {selectedNode ? (
              <NodeSettingsPanel
                node={selectedNode}
                onUpdate={handleNodeUpdate}
                onDelete={handleNodeDelete}
                onClose={() => setSelectedNodeId(null)}
              />
            ) : connectionNodes?.nodeA && connectionNodes?.nodeB ? (
              <ConnectionInfoPanel
                nodeA={connectionNodes.nodeA}
                nodeB={connectionNodes.nodeB}
                onClose={() => {
                  setSelectedConnection(null)
                  setPathProfileData(null)
                }}
              />
            ) : (
              <div className="p-6">
                <h2 className="mb-4 text-xl font-black uppercase">Welcome</h2>
                <div className="space-y-4 text-sm">
                  <div className="border-4 border-black bg-cyan-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold">1. Add Nodes</p>
                    <p className="text-xs">Click anywhere on the map to add a station</p>
                  </div>
                  <div className="border-4 border-black bg-pink-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold">2. Configure</p>
                    <p className="text-xs">Click a node to edit its settings</p>
                  </div>
                  <div className="border-4 border-black bg-green-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold">3. Analyze</p>
                    <p className="text-xs">Click a connection line to view RF analysis</p>
                  </div>
                  <div className="border-4 border-black bg-yellow-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold">4. Reposition</p>
                    <p className="text-xs">Drag nodes to move them</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Path Profile Panel */}
        {pathProfileData && (
          <div className="h-80 border-t-4 border-black bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-black uppercase">Path Profile</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-black bg-green-400"></div>
                  <span className="font-bold">Terrain</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-8 border-2 border-black bg-black"></div>
                  <span className="font-bold">Line of Sight</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-8 bg-yellow-300"></div>
                  <span className="font-bold">Fresnel Zone</span>
                </div>
              </div>
            </div>
            <PathProfileChart
              elevationPoints={pathProfileData.elevationPoints}
              nodeA={pathProfileData.nodeA}
              nodeB={pathProfileData.nodeB}
              totalDistance={pathProfileData.distance}
              onCursorMove={setHoveredPathPoint}
            />
          </div>
        )}
      </div>

      {/* Project Manager Modal */}
      {showProjectManager && (
        <ProjectManager
          currentProjectId={projectId}
          onProjectSwitch={handleProjectSwitch}
          onClose={() => setShowProjectManager(false)}
        />
      )}
    </div>
  )
}

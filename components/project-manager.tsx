"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/types"

interface ProjectManagerProps {
  currentProjectId: string | null
  onProjectSwitch: (projectId: string) => void
  onClose: () => void
}

export function ProjectManager({ currentProjectId, onProjectSwitch, onClose }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setProjects(data || [])
    } catch (error) {
      console.error("[v0] Error loading projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setIsCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: newProjectName,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      setProjects([data, ...projects])
      setNewProjectName("")
      onProjectSwitch(data.id)
      onClose()
    } catch (error) {
      console.error("[v0] Error creating project:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? All nodes will be permanently deleted.")) return

    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId)

      if (error) throw error

      setProjects(projects.filter((p) => p.id !== projectId))

      // If we deleted the current project, switch to another one
      if (projectId === currentProjectId) {
        const remainingProjects = projects.filter((p) => p.id !== projectId)
        if (remainingProjects.length > 0) {
          onProjectSwitch(remainingProjects[0].id)
        }
      }
    } catch (error) {
      console.error("[v0] Error deleting project:", error)
    }
  }

  const handleRenameProject = async (projectId: string, newName: string) => {
    try {
      const { error } = await supabase.from("projects").update({ name: newName }).eq("id", projectId)

      if (error) throw error

      setProjects(projects.map((p) => (p.id === projectId ? { ...p, name: newName } : p)))
    } catch (error) {
      console.error("[v0] Error renaming project:", error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-6 flex items-center justify-between border-b-4 border-black pb-4">
          <h2 className="text-2xl font-black uppercase">Project Manager</h2>
          <button
            onClick={onClose}
            className="border-2 border-black bg-red-400 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500"
          >
            Close
          </button>
        </div>

        {/* Create New Project */}
        <div className="mb-6 border-4 border-black bg-cyan-100 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="mb-3 font-black uppercase">Create New Project</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="project-name" className="mb-1 font-bold">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My RF Project"
                className="border-2 border-black"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject()
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
                className="border-2 border-black bg-green-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-500"
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>

        {/* Project List */}
        <div>
          <h3 className="mb-3 font-black uppercase">Your Projects</h3>
          {isLoading ? (
            <div className="border-4 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="border-4 border-black bg-yellow-100 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold">No projects yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center justify-between border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                    project.id === currentProjectId ? "bg-pink-200" : "bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-black">{project.name}</p>
                    <p className="text-xs text-gray-600">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                    {project.id === currentProjectId && (
                      <span className="mt-1 inline-block border-2 border-black bg-cyan-400 px-2 py-1 text-xs font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {project.id !== currentProjectId && (
                      <button
                        onClick={() => {
                          onProjectSwitch(project.id)
                          onClose()
                        }}
                        className="border-2 border-black bg-cyan-400 px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-cyan-500"
                      >
                        Load
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const newName = prompt("Enter new project name:", project.name)
                        if (newName && newName.trim()) {
                          handleRenameProject(project.id, newName)
                        }
                      }}
                      className="border-2 border-black bg-yellow-400 px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-500"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="border-2 border-black bg-red-400 px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

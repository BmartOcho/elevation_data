"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@/lib/types"

interface NodeSettingsPanelProps {
  node: Node
  onUpdate: (nodeId: string, updates: Partial<Node>) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
}

export function NodeSettingsPanel({ node, onUpdate, onDelete, onClose }: NodeSettingsPanelProps) {
  const [name, setName] = useState(node.name)
  const [heightAgl, setHeightAgl] = useState(node.height_agl.toString())
  const [frequency, setFrequency] = useState(node.frequency.toString())
  const [power, setPower] = useState(node.power.toString())
  const [antennaGain, setAntennaGain] = useState(node.antenna_gain.toString())
  const [sensitivity, setSensitivity] = useState(node.sensitivity.toString())
  const [cableLoss, setCableLoss] = useState(node.cable_loss.toString())

  useEffect(() => {
    setName(node.name)
    setHeightAgl(node.height_agl.toString())
    setFrequency(node.frequency.toString())
    setPower(node.power.toString())
    setAntennaGain(node.antenna_gain.toString())
    setSensitivity(node.sensitivity.toString())
    setCableLoss(node.cable_loss.toString())
  }, [node])

  const handleSave = () => {
    onUpdate(node.id, {
      name,
      height_agl: Number.parseFloat(heightAgl),
      frequency: Number.parseFloat(frequency),
      power: Number.parseFloat(power),
      antenna_gain: Number.parseFloat(antennaGain),
      sensitivity: Number.parseFloat(sensitivity),
      cable_loss: Number.parseFloat(cableLoss),
    })
  }

  const handleDelete = () => {
    onDelete(node.id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b-4 border-black bg-cyan-400 p-4">
        <h2 className="text-xl font-black uppercase">Node Settings</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Node Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="font-bold">
            Node Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-2 border-black"
            placeholder="Node 1"
          />
        </div>

        {/* Coordinates Display */}
        <div className="border-2 border-black bg-gray-100 p-3">
          <p className="text-sm font-bold">Location</p>
          <p className="text-xs">Lat: {node.lat.toFixed(6)}</p>
          <p className="text-xs">Lng: {node.lng.toFixed(6)}</p>
        </div>

        {/* Height Above Ground */}
        <div className="space-y-2">
          <Label htmlFor="height" className="font-bold">
            Height AGL (meters)
          </Label>
          <Input
            id="height"
            type="number"
            step="0.1"
            value={heightAgl}
            onChange={(e) => setHeightAgl(e.target.value)}
            className="border-2 border-black"
          />
          <p className="text-xs text-gray-600">Height above ground level</p>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label htmlFor="frequency" className="font-bold">
            Frequency (MHz)
          </Label>
          <Input
            id="frequency"
            type="number"
            step="0.1"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="border-2 border-black"
          />
          <p className="text-xs text-gray-600">Operating frequency</p>
        </div>

        {/* Power */}
        <div className="space-y-2">
          <Label htmlFor="power" className="font-bold">
            Power (W)
          </Label>
          <Input
            id="power"
            type="number"
            step="0.1"
            value={power}
            onChange={(e) => setPower(e.target.value)}
            className="border-2 border-black"
          />
          <p className="text-xs text-gray-600">Transmit power in watts</p>
        </div>

        {/* Antenna Gain */}
        <div className="space-y-2">
          <Label htmlFor="antenna-gain" className="font-bold">
            Antenna Gain (dBi)
          </Label>
          <Input
            id="antenna-gain"
            type="number"
            step="0.1"
            value={antennaGain}
            onChange={(e) => setAntennaGain(e.target.value)}
            className="border-2 border-black"
          />
          <p className="text-xs text-gray-600">Antenna gain in dBi</p>
        </div>

        <div className="border-t-4 border-black pt-4">
          <p className="mb-2 text-sm font-black uppercase">Receiver Settings</p>

          {/* Sensitivity */}
          <div className="space-y-2">
            <Label htmlFor="sensitivity" className="font-bold">
              Sensitivity (dBm)
            </Label>
            <Input
              id="sensitivity"
              type="number"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
              className="border-2 border-black"
            />
            <p className="text-xs text-gray-600">Receiver sensitivity</p>
          </div>

          {/* Cable Loss */}
          <div className="space-y-2">
            <Label htmlFor="cable-loss" className="font-bold">
              Cable Loss (dB)
            </Label>
            <Input
              id="cable-loss"
              type="number"
              step="0.1"
              value={cableLoss}
              onChange={(e) => setCableLoss(e.target.value)}
              className="border-2 border-black"
            />
            <p className="text-xs text-gray-600">Cable/connector losses</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 border-t-4 border-black p-4">
        <Button
          onClick={handleSave}
          className="w-full border-2 border-black bg-green-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-500"
        >
          Save Changes
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full border-2 border-black bg-white font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
        >
          Close
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          className="w-full border-2 border-black bg-red-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500"
        >
          Delete Node
        </Button>
      </div>
    </div>
  )
}

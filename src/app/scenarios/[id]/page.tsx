"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AlertScenario } from "@/types/events"
import ScenarioEditor from "@/components/scenario-editor"

export default function ScenarioPage() {
  const params = useParams()
  const router = useRouter()
  const [scenario, setScenario] = useState<AlertScenario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadScenario = async () => {
      try {
        if (!params.id) {
          setError("No scenario ID provided")
          return
        }

        const response = await fetch(`/api/scenarios/${params.id}`)
        if (!response.ok) {
          throw new Error("Failed to load scenario")
        }

        const data = await response.json()
        setScenario(data)
      } catch (err) {
        console.error("Error loading scenario:", err)
        setError("Failed to load scenario")
      } finally {
        setLoading(false)
      }
    }

    loadScenario()
  }, [params.id])

  const handleSave = async (updatedScenario: AlertScenario) => {
    try {
      // Ensure dates are properly formatted for JSON
      const scenarioToSave = {
        ...updatedScenario,
        updatedAt: new Date(),
        createdAt: updatedScenario.createdAt || new Date(),
      }

      const response = await fetch(`/api/scenarios/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scenarioToSave),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to save scenario")
      }

      const savedScenario = await response.json()
      setScenario(savedScenario)
    } catch (err) {
      console.error("Error saving scenario:", err)
      throw err
    }
  }

  const handleCancel = () => {
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading scenario...</div>
      </div>
    )
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error || "Scenario not found"}</div>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ScenarioEditor
        scenario={scenario}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
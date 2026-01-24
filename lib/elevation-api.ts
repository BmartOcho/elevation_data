/**
 * Fetch elevation data from Open-Elevation API
 */
export async function fetchElevationData(
  locations: Array<{ latitude: number; longitude: number }>,
): Promise<Array<{ latitude: number; longitude: number; elevation: number }>> {
  try {
    const response = await fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locations }),
    })

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.status}`)
    }

    const data = await response.json()
    return data.results
  } catch (error) {
    console.error("[v0] Error fetching elevation data:", error)
    throw error
  }
}

/**
 * Batch elevation requests to avoid overwhelming the API
 * Open-Elevation recommends batches of 100-200 points
 */
export async function fetchElevationDataBatched(
  locations: Array<{ latitude: number; longitude: number }>,
  batchSize = 100,
): Promise<Array<{ latitude: number; longitude: number; elevation: number }>> {
  const results: Array<{ latitude: number; longitude: number; elevation: number }> = []

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize)
    const batchResults = await fetchElevationData(batch)
    results.push(...batchResults)

    // Small delay between batches to be respectful to the API
    if (i + batchSize < locations.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}

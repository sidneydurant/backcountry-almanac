import Map from './components/Map'
import './App.css'

function App() {

  // Sample heatmap data for Lassen National Park
  const sampleHeatmapData: {
    coordinates: [number, number][];
    colors: number[];
  } = {
    coordinates: [
      [-121.53, 40.46],
      [-121.58, 40.41]
      //, [-121.58, 40.415], [-121.58, 40.421], 
      //[-121.575, 40.41], [-121.575, 40.415], [-121.575, 40.421],
    ],
    colors: [
      0.82, 0.5//, 0.68, 0.91, 0.85, 0.72
      // ... more color values between 0 and 1
    ]
  };

  return (
    <main className="h-full w-full flex flex-col">
      <Map/>
    </main>
  )
}

export default App
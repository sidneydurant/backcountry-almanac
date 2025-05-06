import Map from './components/Map'
import Sidebar from './components/Sidebar'
import './App.css'
import { VisualizationProvider } from './components/VisualizationContext'

function App() {

    return (
        <main className="h-full w-full">
            <VisualizationProvider>
                <Sidebar/>
                <Map/>
            </VisualizationProvider>
        </main>
    )
}

export default App
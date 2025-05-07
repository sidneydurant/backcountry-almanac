import Map from './components/Map'
import Sidebar from './components/Sidebar'
import './App.css'
import { VisualizationProvider } from './components/VisualizationContext'
import Legend from './components/Legend'

function App() {

    return (
        <main className="h-full w-full">
            <VisualizationProvider>
                <Sidebar/>
                <Map/>
                <Legend/>
            </VisualizationProvider>
        </main>
    );
}

export default App
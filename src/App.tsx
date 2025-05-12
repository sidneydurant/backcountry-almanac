import Map from './components/Map'
import Sidebar from './components/Sidebar'
import './App.css'
import { OverlayProvider } from './components/OverlaySettingsProvider'
import Legend from './components/Legend'

function App() {

    return (
        <main className="h-full w-full">
            <OverlayProvider>
                <Sidebar/>
                <Map/>
                <Legend/>
            </OverlayProvider>
        </main>
    );
}

export default App
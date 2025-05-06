// This component is a sidebar that lets you change settings for the map display
import { VisualizationContext, VisualizationType } from './VisualizationContext';
import { useContext } from 'react';

// TODO: split sidebar into various components. Add a legend with units when any particular option is selected
// TODO: figure out how best to do this. Add an infobubble.
const Sidebar = () => {
    const { activeVisualization, setActiveVisualization } = useContext(VisualizationContext);

    const onRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setActiveVisualization(event.target.value as VisualizationType);
    };

    return <div id="sidebar"className="fixed left-0 top-0 w-1/4 bg-white z-50 m-4 rounded-lg drop-shadow-xl">
        <div className="p-8">
            <h2 className="text-lg font-semibold mb-4">Map Settings</h2>
            <div className="space-y-2">
                <div className="flex items-center justify-left">
                    <input checked={activeVisualization === 'elevation'} onChange={onRadioChange} type="radio" value="elevation" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Elevation</label>
                </div>
                <div className="flex items-center justify-left">
                    <input checked={activeVisualization === 'slope'} onChange={onRadioChange} type="radio" value="slope" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Slope Angle</label>
                </div>
                <div className="flex items-center justify-left">
                    <input checked={activeVisualization === 'aspect'} onChange={onRadioChange} type="radio" value="aspect" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Aspect</label>
                </div>
            </div>
        </div>
    </div>
  };
  
  export default Sidebar;
// This component is a sidebar that lets you change settings for the map display
import { VisualizationContext, VisualizationType } from './VisualizationContext';
import { useContext } from 'react';
import RadioOption from './RadioOption';

// TODO: split sidebar into various components. Add a legend with units when any particular option is selected
// TODO: figure out how best to do this. Add an infobubble.
const Sidebar = () => {
    const { activeVisualization, setActiveVisualization } = useContext(VisualizationContext);

    const visualizationOptions = [
        { value: 'elevation', label: 'Elevation' },
        { value: 'slope', label: 'Slope Angle' },
        { value: 'aspect', label: 'Aspect' }
    ];

    const onRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setActiveVisualization(event.target.value as VisualizationType);
    };

    return (
        <div id="sidebar" className="fixed left-0 top-0 w-1/4 bg-white z-50 m-4 rounded-lg drop-shadow-xl">
            <div className="p-8">
                <h2 className="text-lg font-semibold mb-4">Overlay</h2>
                <div className="space-y-2">
                    {visualizationOptions.map((option) => (
                        <RadioOption
                            key={option.value}
                            value={option.value}
                            name="layer"
                            label={option.label}
                            checked={activeVisualization === option.value}
                            onChange={onRadioChange}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
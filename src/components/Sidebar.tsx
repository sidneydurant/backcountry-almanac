// The main sidebar component that lets you change map settings
import { VisualizationContext, VisualizationType } from './VisualizationProvider';
import { useContext } from 'react';
import RadioOption from './RadioOption';

const visualizationOptions = [
    { value: 'elevation', label: 'Elevation' },
    { value: 'slope', label: 'Slope Angle' },
    { value: 'aspect', label: 'Aspect' },
    { value: 'none', label: 'None' }
];

const Sidebar = () => {
    const { activeVisualization, setActiveVisualization } = useContext(VisualizationContext);

    const onRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setActiveVisualization(event.target.value as VisualizationType);
    };

    return (
        <div id="sidebar" className="fixed left-0 top-0 bg-white z-50 m-4 rounded-lg shadow-xl ring">
            <div className="p-6">
                <h1 className="text-2xl font-mono font-bold mb-4 text-slate-500 rounded-lg">Backcountry Almanac</h1>
                <h2 className="text-md font-semibold text-slate-800 mt-2 mb-2">Base Map</h2>
                <div className="space-y-2 pl-4">
                    <RadioOption
                        value="outdoors"
                        name="basemap"
                        label="Terrain"
                        checked={true}
                        onChange={() => {}}
                    />
                    <RadioOption
                        value="satellite"
                        name="basemap"
                        label="Satellite (Coming soon!)"
                        checked={false}
                        onChange={() => {}}
                        disabled
                    />
                </div>
                <h2 className="text-md font-semibold text-slate-800 mt-4 mb-2">Overlay</h2>
                <div className="space-y-2 pl-4">
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
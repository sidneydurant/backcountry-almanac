// This component is a legend for the currently selected layer
import { VisualizationContext } from './VisualizationContext';
import { useContext } from 'react';

const legendDetails = [
    { 
        value: 'elevation',
        info: 'This layer shows the elevation of the terrain.',
        scale: (
            <div>
                <span className="text-green-500 mr-4">1750m</span>
                <span className="text-cyan-500 mr-4">2000m</span>
                <span className="text-purple-500 mr-4">2250m</span>
                <span className="text-pink-500 mr-4">2500m</span>
                <span className="text-orange-500 mr-4">2750m</span>
                <span className="text-yellow-500 mr-4">3000m</span>
                <span className="text-green-500 mr-4">3250m</span>
            </div>
        )
    },
    { 
        value: 'slope',
        info: 'This layer shows the slope angle of the terrain.', 
        scale: (
            <div>
                <span className="text-green-500 mr-4">&lt;20°</span>
                <span className="text-yellow-500 mr-4">30°</span>
                <span className="text-orange-500 mr-4">40°</span>
                <span className="text-red-500 mr-4">50°</span>
                <span className="text-purple-500 mr-4">&gt;60°</span>
            </div>
        )
    },
    { 
        value: 'aspect',
        info: 'This layer shows the aspect of the terrain.',
        scale: (<div>
            <span className="text-yellow-500 mr-4">North</span>
            <span className="text-orange-500 mr-4">East</span>
            <span className="text-purple-500 mr-4">South</span>
            <span className="text-green-500 mr-4">West</span>
        </div>)
    }
];

const Legend = () => {

    const { activeVisualization } = useContext(VisualizationContext);

    const activeLegend = legendDetails.find(legend => legend.value === activeVisualization)

    return (
        <div id="legend" className="fixed right-0 top-0 bg-white z-50 m-4 rounded-lg drop-shadow-xl">
            <div className="p-4">
                {activeLegend ? (
                    <div>
                        <p>{activeLegend.info}</p>
                        {activeLegend.scale}
                    </div>
                ) : (
                    <p>Select a visualization to see its legend.</p>
                )}
            </div>
        </div>
    );
};

export default Legend;
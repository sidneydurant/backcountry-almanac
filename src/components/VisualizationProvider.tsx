import { createContext, useState, ReactNode } from 'react';

// TODO: rename... 'VisualizationProvider' is really not clear
// maybe OverlaySettingsProvider? And then rename LayerSettings to LayerOptions or something?
// Overlay being the 'full overlay with everything, which may contain multiple layers', 
// and then Layer being a single layer, with opacity settings etc

// Define the available visualization types
export type VisualizationType = 'elevation' | 'slope' | 'aspect' | 'none'; // TODO: 'exposure', 'irradiance', 'insolation'

// Define the context interface
interface VisualizationContextType {
    activeVisualization: VisualizationType;
    setActiveVisualization: (type: VisualizationType) => void;
    layerOpacity: number;
    setLayerOpacity: (opacity: number) => void;
}

// Create the context with a default value in case VisualizationContext is used from outside of the provider
export const VisualizationContext = createContext<VisualizationContextType>({
    activeVisualization: 'elevation',
    setActiveVisualization: () => {},
    layerOpacity: 0.3,
    setLayerOpacity: () => {}
});

// Create a provider component
export const VisualizationProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [activeVisualization, setActiveVisualization] = useState<VisualizationType>('elevation');
    const [layerOpacity, setLayerOpacity] = useState<number>(0.3);

    return (
        <VisualizationContext.Provider value={{ activeVisualization, setActiveVisualization, layerOpacity, setLayerOpacity }}>
            {children}
        </VisualizationContext.Provider>
    );
};

import { createContext, useState, ReactNode } from 'react';

// Define the available visualization types
export type VisualizationType = 'elevation' | 'slope' | 'aspect'; // TODO: Solar Exposure, Solar Irradiance, Insolation

// Define the context interface
interface VisualizationContextType {
    activeVisualization: VisualizationType;
    setActiveVisualization: (type: VisualizationType) => void;
}

// Create the context with a default value
export const VisualizationContext = createContext<VisualizationContextType>({
    activeVisualization: 'elevation',
    setActiveVisualization: () => {}
});

// Create a provider component
export const VisualizationProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [activeVisualization, setActiveVisualization] = useState<VisualizationType>('elevation');

    return (
        <VisualizationContext.Provider value={{ activeVisualization, setActiveVisualization }}>
            {children}
        </VisualizationContext.Provider>
    );
};

import { createContext, useState, ReactNode } from 'react';

// Define the available overlay types
export type OverlayType = 'elevation' | 'slope' | 'aspect' | 'none'; // TODO: 'exposure', 'irradiance', 'insolation'

// Define the context interface
interface OverlayContextType {
  activeOverlay: OverlayType;
  setActiveOverlay: (type: OverlayType) => void;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
}

// Create the context with a default value in case OverlayContext is used from outside of the provider
export const OverlayContext = createContext<OverlayContextType>({
  activeOverlay: 'elevation',
  setActiveOverlay: () => {},
  overlayOpacity: 0.2,
  setOverlayOpacity: () => {},
});

// Create a provider component
export const OverlayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('elevation');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.2);

  return (
    <OverlayContext.Provider
      value={{
        activeOverlay,
        setActiveOverlay,
        overlayOpacity,
        setOverlayOpacity,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
};

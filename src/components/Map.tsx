// This component creates an interactive map using Mapbox GL JS and adds a custom WebGL layer for visualization
import { useEffect, useRef, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createVisualizationLayer } from '../modules/visualizationLayer';
import { VisualizationContext } from './VisualizationContext';

// Set Mapbox API token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view (Lassen Volcanic National Park)
const LASSEN_CENTER: [number, number] = [-121.53, 40.47];

const Map = () => {
    // React refs to store references to the map container DOM element and the mapbox instance
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    
    // Reference to store the mapbox instance
    const mapRef = useRef<mapboxgl.Map | null>(null);

    // Reference to track the currently active layer
    const activeLayerRef = useRef<string | null>(null);

    // Get the active visualization from context
    const { activeVisualization } = useContext(VisualizationContext);

    useEffect(() => {
        if (!mapContainerRef.current) return; // Add early return if container is not available
        
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            zoom: 12.8,
            center: LASSEN_CENTER,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            antialias: true,
            projection: 'mercator'
        });

        mapRef.current = map;
    
        // Cleanup function to remove the map when component unmounts
        return () => {
            map.remove();
        };
    }, []);  // Run once on mount

    // Effect to handle visualization layer changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        
        // Wait for map to be loaded
        if (!map.loaded()) {
            map.on('load', () => updateVisualizationLayer(map));
        } else {
            updateVisualizationLayer(map);
        }
    }, [activeVisualization]); // Run anytime activeVisualization changes

    // Function to update the visualization layer
    const updateVisualizationLayer = (map: mapboxgl.Map) => {
        // Remove the existing layer if it exists
        if (activeLayerRef.current && map.getLayer(activeLayerRef.current)) {
            map.removeLayer(activeLayerRef.current);
        }
        
        // Create and add the new layer
        const newLayer = createVisualizationLayer(activeVisualization);
        map.addLayer(newLayer, 'building');
        
        // Update the active layer reference
        activeLayerRef.current = newLayer.id;
    };

    // Render a div container for the map
    return (
        <div className="h-full w-full" ref={mapContainerRef} id="map"></div>
    );
};

export default Map;
// This component creates an interactive map using Mapbox GL JS and adds a custom WebGL layer for visualization
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { visualizationLayer } from '../modules/visualizationLayer';

// Set Mapbox API token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view (Lassen Volcanic National Park)
const LASSEN_CENTER: [number, number] = [-121.53, 40.46];

const Map = () => {
    // React refs to store references to the map container DOM element and the mapbox instance
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    // const mapRef = useRef<mapboxgl.Map | null>(null); // TODO: currently unused - may be used in the future

    useEffect(() => {
        if (!mapContainerRef.current) return; // Add early return if container is not available
        
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            zoom: 12,
            center: LASSEN_CENTER,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            antialias: true,
            projection: 'mercator'
        });
    
        // Add our custom layer when the map loads
        map.on('load', () => {
            map.addLayer(visualizationLayer, 'building');
        });

        // Cleanup function to remove the map when component unmounts
        return () => {
            map.remove();
        };
    }, []);  // Empty dependency array means this effect runs once on mount

    // Render a div container for the map
    return <div className="h-full w-full" ref={mapContainerRef} id="map"></div>;
};

export default Map;
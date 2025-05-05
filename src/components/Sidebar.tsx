// This component is a sidebar that lets you change settings for the map display
import React from 'react';

// TODO: split sidebar into various components. Add a legend when any particular option is selected
// TODO: figure out how best to do this
const Sidebar = () => {
    return <div id="sidebar"className="fixed left-0 top-0 w-1/4 bg-white z-50 m-4 rounded-lg drop-shadow-xl">
        <div className="p-8">
            <h2 className="text-lg font-semibold mb-4">Map Settings</h2>
            <div className="space-y-2">
                <div className="flex items-center justify-left">
                    <input type="radio" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Sun Exposure</label>
                </div>
                <div className="flex items-center justify-left">
                    <input type="radio" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Cumulative Sun Exposure</label>
                </div>
                <div className="flex items-center justify-left">
                    <input type="radio" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Solar Irradiance</label>
                </div>
                <div className="flex items-center justify-left">
                    <input type="radio" name="layer" className="w-4 h-4" />
                    <label className="text-sm font-medium pl-4">Solar Insolation</label>
                </div>
            </div>
        </div>
    </div>
  };
  
  export default Sidebar;
// The main sidebar component that lets you change map settings
import OverlaySettings from './OverlaySettings';
import BaseMapSettings from './BaseMapSettings';

const Sidebar = () => {
  return (
    <div id="sidebar" className="p-6 fixed left-0 top-0 bg-white z-50 m-4 rounded-lg shadow-xl ring">
      <h1 className="text-2xl font-mono font-bold mb-4 text-slate-500 rounded-lg">Backcountry Almanac</h1>
      <BaseMapSettings />
      <OverlaySettings />
    </div>
  );
};

export default Sidebar;

import { OverlayContext, OverlayType } from './OverlaySettingsProvider';
import { useContext } from 'react';

import RadioOption from './RadioOption';

const overlayOptions = [
  { value: 'elevation', label: 'Elevation' },
  { value: 'slope', label: 'Slope Angle' },
  { value: 'aspect', label: 'Aspect' },
  { value: 'none', label: 'None' },
];

const OverlaySettings: React.FC = () => {
  const { activeOverlay, setActiveOverlay, overlayOpacity, setOverlayOpacity } = useContext(OverlayContext);

  const onOverlaySelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setActiveOverlay(event.target.value as OverlayType);
  };

  const onOverlayOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOverlayOpacity(Number(event.target.value));
  };

  return (
    <>
      <h2 className="text-md font-semibold text-slate-800 mt-4 mb-2">Overlay</h2>
      <div className="flex items-center mb-2 pl-4">
        <label className="text-sm font-medium mr-2">Opacity</label>
        <input
          name="opacity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={overlayOpacity}
          onChange={onOverlayOpacityChange}
        />
      </div>
      <div className="space-y-2 pl-4">
        {overlayOptions.map(option => (
          <div key={option.value}>
            <RadioOption
              value={option.value}
              name="layer"
              label={option.label}
              checked={activeOverlay === option.value}
              onChange={onOverlaySelectionChange}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default OverlaySettings;

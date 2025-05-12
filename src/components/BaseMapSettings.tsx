import RadioOption from './RadioOption';

const BaseMapSettings: React.FC = () => {
  return (
    <>
      <h2 className="text-md font-semibold text-slate-800 mt-2 mb-2">Base Map</h2>
      <div className="space-y-2 pl-4">
        <RadioOption value="outdoors" name="basemap" label="Terrain" checked={true} onChange={() => {}} />
        <RadioOption
          value="satellite"
          name="basemap"
          label="Satellite (Coming soon!)"
          checked={false}
          onChange={() => {}}
          disabled
        />
      </div>
    </>
  );
};

export default BaseMapSettings;

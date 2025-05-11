
interface LayerSettingsProps {
    value: number;
    name: string;
    label: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    labelClassName? : string;
}

const LayerSettings: React.FC<LayerSettingsProps> = ({
    value,
    name,
    label,
    onChange,
    labelClassName = 'text-sm font-medium pl-4'
}) => {
    return (
        <div className="flex items-center">
            <label className={labelClassName}>{label}</label>
            <input 
                className="ml-2"
                name={name}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={value}
                onChange={onChange} />
        </div>
    )
}

export default LayerSettings;
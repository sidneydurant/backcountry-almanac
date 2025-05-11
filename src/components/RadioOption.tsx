// NOTE: in a production environment I'd use an existing component library but building 
// components from the ground up is one of my goals for this project
interface RadioOptionProps {
    value: string;
    name: string;
    label: string;
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    className?: string;
    labelClassName?: string;
}

const RadioOption: React.FC<RadioOptionProps> = ({
    value,
    name,
    label,
    checked,
    onChange,
    disabled = false,
    className = '',
    labelClassName = 'text-sm font-medium pl-4' + (disabled ? ' text-gray-400':'')
}) => {
    return (
        <div className={`flex items-center justify-left ${className}`}>
            <input
                checked={checked}
                onChange={onChange}
                type="radio"
                value={value}
                name={name}
                disabled={disabled}
                className='w-4 h-4'
            />
            <label className={labelClassName}>{label}</label>
        </div>
    );
};

export default RadioOption;
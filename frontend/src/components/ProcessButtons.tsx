interface ProcessButtonsProps {
  noteId: string;
  onProcess: (processType: string) => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export function ProcessButtons({
  noteId,
  onProcess,
  isProcessing,
  disabled = false,
}: ProcessButtonsProps) {
  const processes = [
    {
      type: 'research',
      label: 'Research',
      icon: '🔍',
      description: 'Get comprehensive research with key concepts and sources',
      color: 'blue',
    },
    {
      type: 'summarize',
      label: 'Summarize',
      icon: '📝',
      description: 'Create a concise summary of main points',
      color: 'green',
    },
    {
      type: 'expand',
      label: 'Expand',
      icon: '💡',
      description: 'Elaborate with examples and perspectives',
      color: 'purple',
    },
    {
      type: 'actionplan',
      label: 'Action Plan',
      icon: '✅',
      description: 'Turn this into practical steps',
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; bgHover: string; bgDisabled: string }> = {
    blue: {
      bg: 'bg-blue-500',
      bgHover: 'hover:bg-blue-600',
      bgDisabled: 'bg-blue-300',
    },
    green: {
      bg: 'bg-green-500',
      bgHover: 'hover:bg-green-600',
      bgDisabled: 'bg-green-300',
    },
    purple: {
      bg: 'bg-purple-500',
      bgHover: 'hover:bg-purple-600',
      bgDisabled: 'bg-purple-300',
    },
    orange: {
      bg: 'bg-orange-500',
      bgHover: 'hover:bg-orange-600',
      bgDisabled: 'bg-orange-300',
    },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        AI Actions
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {processes.map((process) => {
          const colors = colorClasses[process.color];
          const isDisabled = disabled || isProcessing;

          return (
            <button
              key={process.type}
              onClick={() => onProcess(process.type)}
              disabled={isDisabled}
              title={process.description}
              className={`
                group relative
                flex items-center gap-3
                px-4 py-3 rounded-lg
                text-white font-medium text-sm
                transition-all duration-200
                ${isDisabled ? colors.bgDisabled : `${colors.bg} ${colors.bgHover}`}
                ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer shadow-sm hover:shadow-md'}
                ${isProcessing ? 'opacity-75' : ''}
              `}
            >
              <span className="text-xl">{process.icon}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold">{process.label}</div>
                <div className="text-xs opacity-90 hidden sm:block">
                  {process.description.length > 35
                    ? `${process.description.substring(0, 35)}...`
                    : process.description}
                </div>
              </div>

              {/* Tooltip on hover (desktop only) */}
              <div className="
                hidden group-hover:block
                absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                px-3 py-2 rounded-lg
                bg-gray-900 text-white text-xs
                whitespace-normal max-w-xs
                z-10
                pointer-events-none
              ">
                {process.description}
                <div className="
                  absolute top-full left-1/2 transform -translate-x-1/2
                  border-4 border-transparent border-t-gray-900
                "></div>
              </div>
            </button>
          );
        })}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
          <svg
            className="animate-spin h-4 w-4 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Processing with AI... This may take 10-30 seconds.</span>
        </div>
      )}
    </div>
  );
}

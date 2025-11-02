import { useState, useEffect, useRef } from 'react';

interface InputModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  maxLength?: number;
}

export function InputModal({
  isOpen,
  title,
  placeholder = '',
  initialValue = '',
  onConfirm,
  onCancel,
  maxLength = 255,
}: InputModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className="
                w-full px-4 py-2
                bg-background
                border border-border
                rounded-lg
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary/50
                focus:border-primary
                transition-all
              "
            />
            {maxLength && (
              <div className="mt-2 text-xs text-muted-foreground text-right">
                {value.length} / {maxLength}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="
                px-4 py-2
                rounded-lg
                text-sm font-medium
                text-muted-foreground
                hover:bg-accent/30
                transition-colors
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="
                px-4 py-2
                rounded-lg
                text-sm font-medium
                bg-primary
                text-primary-foreground
                hover:opacity-90
                disabled:opacity-50
                disabled:cursor-not-allowed
                transition-all
                shadow-sm
              "
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

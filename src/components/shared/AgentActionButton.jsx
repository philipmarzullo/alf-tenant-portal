import { Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function AgentActionButton({ label, onClick, variant = 'default' }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick?.();
    } finally {
      setLoading(false);
    }
  };

  const base = 'inline-flex items-center gap-1.5 text-sm font-medium rounded-md transition-colors';
  const variants = {
    default: `${base} px-3 py-1.5 text-aa-blue bg-aa-blue/5 hover:bg-aa-blue/10 border border-aa-blue/20`,
    primary: `${base} px-4 py-2 text-white bg-aa-blue hover:bg-aa-blue/90`,
    ghost: `${base} px-2 py-1 text-aa-blue hover:bg-aa-blue/5`,
  };

  return (
    <button onClick={handleClick} disabled={loading} className={variants[variant]}>
      {loading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Sparkles size={14} />
          {label}
        </>
      )}
    </button>
  );
}

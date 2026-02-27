import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ label, value, trend, trendLabel, icon: Icon }) {
  const trendIcon = trend === 'up'
    ? <TrendingUp size={14} className="text-green-600" />
    : trend === 'down'
      ? <TrendingDown size={14} className="text-red-600" />
      : <Minus size={14} className="text-gray-400" />;

  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-secondary-text mb-1">{label}</div>
          <div className="text-3xl font-semibold text-dark-text">{value}</div>
        </div>
        {Icon && (
          <div className="p-2 bg-gray-50 rounded-lg">
            <Icon size={20} className="text-secondary-text" />
          </div>
        )}
      </div>
      {trendLabel && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendIcon}
          <span className={`text-xs font-medium ${trendColor}`}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

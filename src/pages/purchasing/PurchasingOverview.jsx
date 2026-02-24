import { ShoppingCart, ClipboardCheck, Truck, AlertTriangle } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import ComingSoonModule from '../../components/shared/ComingSoonModule';
import AgentActionButton from '../../components/shared/AgentActionButton';
import { reorderAlerts } from '../../data/mock/purchasingMocks';

const METRICS = [
  { label: 'Open POs', value: '18', icon: ShoppingCart },
  { label: 'Pending Approvals', value: '5', icon: ClipboardCheck },
  { label: 'Deliveries This Week', value: '7', icon: Truck },
  { label: 'Reorder Alerts', value: '3', icon: AlertTriangle, color: '#EAB308' },
];

const MODULES = [
  { title: 'Purchase Order Management', description: 'Creation, approval workflows, tracking' },
  { title: 'Vendor Management', description: 'Performance tracking, contract management, quote comparison' },
  { title: 'Inventory & Reorder Management', description: 'Stock monitoring, par levels, automated alerts' },
  { title: 'Contract & Compliance', description: 'Vendor agreements, insurance verification, MBE tracking' },
];

export default function PurchasingOverview() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-6">Purchasing Workspace</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Reorder Alerts demo */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          Reorder Alerts
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Par Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Monthly Usage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {reorderAlerts.map((item) => {
                const pct = Math.round((item.currentStock / item.parLevel) * 100);
                return (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-dark-text">{item.item}</td>
                    <td className="px-4 py-3 text-secondary-text text-xs font-mono">{item.sku}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${pct < 40 ? 'text-status-red' : 'text-status-yellow'}`}>
                        {item.currentStock}
                      </span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct < 40 ? '#DC2626' : '#EAB308',
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.parLevel}</td>
                    <td className="px-4 py-3">{item.monthlyUsage}/mo</td>
                    <td className="px-4 py-3 text-secondary-text">{item.vendor}</td>
                    <td className="px-4 py-3">
                      <AgentActionButton label="Reorder Analysis" variant="ghost" onClick={() => {}} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming soon modules */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
        Planned Modules
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {MODULES.map((m) => (
          <ComingSoonModule key={m.title} {...m} />
        ))}
      </div>
    </div>
  );
}

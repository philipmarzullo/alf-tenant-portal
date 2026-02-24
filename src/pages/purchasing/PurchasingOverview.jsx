import { ShoppingCart, ClipboardCheck, Truck, AlertTriangle } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import ComingSoonModule from '../../components/shared/ComingSoonModule';

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

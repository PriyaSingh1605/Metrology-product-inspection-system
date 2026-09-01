import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const statusColors = {
  processed: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  uploaded: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

export default function InspectionCard({ inspection }) {
  const {
    inspection_id,
    product_name,
    category,
    manufacturer,
    status,
    created_at,
  } = inspection;

  const date = new Date(created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm font-mono text-blue-700 font-medium whitespace-nowrap">
        {inspection_id}
      </td>
      <td className="px-4 py-3 text-sm text-slate-800 font-medium">{product_name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{category || '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{manufacturer || '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{date}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
            statusColors[status] || 'bg-slate-100 text-slate-600'
          }`}
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/dashboard/inspections/${inspection_id}`}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View <ExternalLink size={13} />
        </Link>
      </td>
    </tr>
  );
}

import { Package } from 'lucide-react';

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 font-medium leading-snug flex-1">{value}</span>
    </div>
  );
}

function NullField({ label }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-300 italic">Not detected</span>
    </div>
  );
}

export default function ProductDetailsCard({ product }) {
  if (!product) return null;

  const mfgDate = [product.manufacture_month, product.manufacture_year].filter(Boolean).join('/');
  const qty = product.net_quantity
    ? `${product.net_quantity}${product.net_quantity_unit ? ' ' + product.net_quantity_unit : ''}`
    : null;
  const mrp = product.mrp
    ? `${product.mrp_currency || '₹'} ${product.mrp}`
    : null;

  const fields = [
    { label: 'Product / Brand Name', value: product.product_name },
    { label: 'Net Quantity', value: qty },
    { label: 'MRP (incl. all taxes)', value: mrp },
    { label: 'Unit Sale Price', value: product.unit_sale_price },
    { label: 'Mfg / Pack Date', value: mfgDate || null },
    { label: 'Best Before', value: product.best_before },
    { label: 'Use By / Expiry', value: product.use_by_date },
    { label: 'Manufacturer', value: product.manufacturer_name },
    { label: 'Mfg Address', value: product.manufacturer_address },
    { label: 'Packer Name', value: product.packer_name },
    { label: 'Packer Address', value: product.packer_address },
    { label: 'Importer Name', value: product.importer_name },
    { label: 'Importer Address', value: product.importer_address },
    { label: 'Country of Origin', value: product.country_of_origin },
    { label: 'Consumer Care Phone', value: product.consumer_care_phone },
    { label: 'Consumer Care Email', value: product.consumer_care_email },
    { label: 'Consumer Care Address', value: product.consumer_care_address },
  ];

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Package size={16} className="text-blue-500" />
        <h3 className="text-sm font-bold text-slate-800">Extracted Package Declarations</h3>
        <span className="ml-auto text-xs text-slate-400">Rule 6</span>
      </div>
      <div>
        {fields.map(({ label, value }) =>
          value
            ? <Field key={label} label={label} value={value} />
            : <NullField key={label} label={label} />
        )}
      </div>
    </div>
  );
}

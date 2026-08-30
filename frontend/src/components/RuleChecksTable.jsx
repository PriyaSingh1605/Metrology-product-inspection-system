import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

const RULE_DEFINITIONS = [
  { key: 'has_product_name',           label: 'Product Identity / Generic Name',               ref: 'Rule 6(1)(a)', mandatory: true },
  { key: 'has_manufacturer',           label: 'Manufacturer / Packer Name & Complete Address', ref: 'Rule 6(1)(b)', mandatory: true },
  { key: 'has_net_quantity',           label: 'Net Quantity with Standard Metric Unit',         ref: 'Rule 6(1)(c)', mandatory: true },
  { key: 'has_mrp',                    label: 'Maximum Retail Price (MRP incl. all taxes)',      ref: 'Rule 6(1)(d)', mandatory: true },
  { key: 'has_manufacture_date',       label: 'Month & Year of Manufacture / Packing',          ref: 'Rule 6(1)(e)', mandatory: true },
  { key: 'has_consumer_care',          label: 'Consumer Care Contact (Phone / Email / Address)', ref: 'Rule 6(1)(f)', mandatory: true },
  { key: 'mrp_format_valid',           label: 'MRP Format & Currency Validity',                  ref: 'Rule 6(1)(d)', mandatory: true },
  { key: 'quantity_format_valid',      label: 'Net Quantity Metric Unit Validity',               ref: 'Rule 13 / Schedule', mandatory: true },
  { key: 'date_format_valid',          label: 'Manufacturing Date Format (MM/YYYY)',              ref: 'Rule 6(1)(e)', mandatory: true },
  { key: 'consumer_care_format_valid', label: 'Consumer Care Contact Verification',              ref: 'Rule 6(1)(f)', mandatory: false },
  { key: 'font_size_valid',            label: 'Net Qty Numeral Height (Rule 7 Schedule)',        ref: 'Rule 7 & Sched.', mandatory: true },
  { key: 'has_country_of_origin',      label: 'Country of Origin Declaration',                   ref: 'Rule 6(10)', mandatory: false },
  { key: 'has_unit_sale_price',        label: 'Unit Sale Price (USP) Declaration',               ref: 'Rule 6(11)', mandatory: false },
  { key: 'has_packer',                 label: 'Packer Name & Address (if distinct)',              ref: 'Rule 6(1)(b)', mandatory: false },
  { key: 'has_importer',              label: 'Importer Details (for imported goods)',            ref: 'Rule 6(1)(b)', mandatory: false },
  { key: 'has_best_before',           label: 'Best Before / Shelf Life Declaration',             ref: 'Rule 6(1)(g)', mandatory: false },
];

export default function RuleChecksTable({ rules }) {
  if (!rules) return null;

  const mandatory = RULE_DEFINITIONS.filter(r => r.mandatory);
  const optional  = RULE_DEFINITIONS.filter(r => !r.mandatory);

  const passedMandatory = mandatory.filter(r => rules[r.key]).length;
  const totalMandatory  = mandatory.length;

  const renderRow = (rule) => {
    const passed  = rules[rule.key] === true;
    const present = rules[rule.key] !== undefined;

    return (
      <tr
        key={rule.key}
        className={`border-b border-slate-100 text-sm transition-colors ${
          passed ? 'rule-row-pass' : rule.mandatory ? 'rule-row-fail' : 'rule-row-warn'
        }`}
      >
        <td className="px-4 py-2.5 text-slate-700">{rule.label}</td>
        <td className="px-3 py-2.5 text-xs text-slate-400 font-mono whitespace-nowrap">{rule.ref}</td>
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            rule.mandatory ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {rule.mandatory ? 'Mandatory' : 'Optional'}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {passed
              ? <CheckCircle2 size={14} className="text-emerald-500" />
              : rule.mandatory
              ? <XCircle size={14} className="text-rose-500" />
              : <AlertTriangle size={14} className="text-amber-500" />}
            <span className={`text-xs font-bold ${
              passed ? 'text-emerald-600' : rule.mandatory ? 'text-rose-600' : 'text-amber-600'
            }`}>
              {passed ? 'PASS' : rule.mandatory ? 'VIOLATION' : 'NOT FOUND'}
            </span>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <ShieldCheck size={16} className="text-blue-500" />
        <h3 className="text-sm font-bold text-slate-800">Compliance Rule Checks</h3>
        <span className="ml-auto text-xs font-semibold text-slate-500">
          {passedMandatory}/{totalMandatory} mandatory passed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requirement</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rule Ref.</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {mandatory.map(renderRow)}
            {optional.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

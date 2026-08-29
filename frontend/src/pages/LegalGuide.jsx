import { BookOpen, Scale, FileText, AlertTriangle, CheckSquare, Phone } from 'lucide-react';

const RULES = [
  {
    rule: 'Rule 6(1)(a)',
    title: 'Product Identity',
    icon: FileText,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    description: 'Every packaged commodity shall bear the generic or common name of the commodity or the name under which it is being sold.',
    requirements: [
      'Brand name or generic/common name of the product',
      'Name must be legible and prominent',
      'Must not be misleading or deceptive',
    ],
  },
  {
    rule: 'Rule 6(1)(b)',
    title: 'Manufacturer / Packer / Importer',
    icon: Scale,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    description: 'Name and complete address of the manufacturer, packer, or importer (for imported goods) must be declared.',
    requirements: [
      'Full name of manufacturer, packer, or importer',
      'Complete physical address including pin code',
      'For imported goods: name of importer and country of origin',
    ],
  },
  {
    rule: 'Rule 6(1)(c)',
    title: 'Net Quantity',
    icon: CheckSquare,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    description: 'Net quantity of commodity in terms of standard units of weights and measures.',
    requirements: [
      'Numeric quantity with standard metric unit (g, kg, ml, L)',
      'No plural or abbreviation of units allowed (e.g., "gms" not permitted)',
      'Must be in terms of weight or measure, not just count (unless applicable)',
    ],
  },
  {
    rule: 'Rule 6(1)(d)',
    title: 'Maximum Retail Price (MRP)',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    description: 'MRP inclusive of all taxes must be declared. The words "Maximum Retail Price" or "M.R.P." must appear.',
    requirements: [
      '"MRP inclusive of all taxes" must be stated explicitly',
      'Price in Indian Rupees (₹ or Rs.)',
      'Local taxes and additional charges may be shown separately for specific states',
    ],
  },
  {
    rule: 'Rule 6(1)(e)',
    title: 'Month & Year of Manufacture',
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    description: 'Month and year of manufacture, packing, or import must be declared on the package.',
    requirements: [
      'Month (name or number) and 4-digit year are mandatory',
      '"Mfg. Date", "Packed on", or "Imported on" prefix must be used',
      'Expiry / best before date required for perishable goods',
    ],
  },
  {
    rule: 'Rule 6(1)(f)',
    title: 'Consumer Care Details',
    icon: Phone,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    description: 'Consumer care details including name, address, telephone number and/or email address for grievance redressal.',
    requirements: [
      'Consumer care contact phone number (preferably toll-free)',
      'Email address for complaints',
      'Physical address of consumer grievance cell',
    ],
  },
  {
    rule: 'Rule 7 & Schedule',
    title: 'Font Size Requirements',
    icon: BookOpen,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    description: 'Minimum numeral height for Net Quantity declaration as per the Schedule to the Rules.',
    requirements: [
      '≤ 50g/ml → minimum 1.0 mm numeral height',
      '51g – 200g/ml → minimum 2.0 mm numeral height',
      '201g – 1000g/ml → minimum 4.0 mm numeral height',
      '> 1000g/ml → minimum 6.0 mm numeral height',
    ],
  },
];

const VIOLATIONS_TABLE = [
  { rule: 'Rule 6(1)(a)', violation: 'Missing product name / identity', severity: 'Critical' },
  { rule: 'Rule 6(1)(b)', violation: 'Missing or incomplete manufacturer address', severity: 'Critical' },
  { rule: 'Rule 6(1)(c)', violation: 'Missing or non-standard net quantity unit', severity: 'Critical' },
  { rule: 'Rule 6(1)(d)', violation: 'MRP not declared or wrong format', severity: 'Critical' },
  { rule: 'Rule 6(1)(e)', violation: 'Manufacturing date missing or ambiguous', severity: 'Critical' },
  { rule: 'Rule 6(1)(f)', violation: 'Consumer care contact missing', severity: 'Critical' },
  { rule: 'Rule 7', violation: 'Numeral height below prescribed minimum', severity: 'Critical' },
  { rule: 'Rule 6(10)', violation: 'Country of origin not declared (imported goods)', severity: 'Advisory' },
  { rule: 'Rule 6(11)', violation: 'Unit sale price not declared (applicable products)', severity: 'Advisory' },
];

export default function LegalGuide() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-xl">
            <BookOpen size={22} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Legal Metrology Guide</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Reference guide for Legal Metrology (Packaged Commodities) Rules, 2011 — mandatory declaration requirements for enforcement officers.
        </p>
      </div>

      {/* Rule Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {RULES.map(({ rule, title, icon: Icon, color, bg, description, requirements }) => (
          <div key={rule} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg shrink-0 ${bg}`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xs font-mono text-slate-400">{rule}</p>
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{description}</p>
            <ul className="space-y-1.5">
              {requirements.map((req, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600">
                  <span className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full ${bg} ${color} flex items-center justify-center text-[8px] font-bold`}>✓</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Common Violations Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Common Violations & Penalties Reference</h2>
          <p className="text-xs text-slate-400 mt-1">Violations under the Legal Metrology Act, 2009 may attract penalties up to ₹1 lakh and imprisonment.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Rule Reference</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Violation</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {VIOLATIONS_TABLE.map(({ rule, violation, severity }) => (
                <tr key={rule + violation} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-blue-600">{rule}</td>
                  <td className="px-5 py-3 text-sm text-slate-700">{violation}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      severity === 'Critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs text-blue-700 font-medium">
          📋 Reference: Legal Metrology (Packaged Commodities) Rules, 2011 — Ministry of Consumer Affairs, Food and Public Distribution, Government of India.
          For the complete text, visit the Department for Promotion of Industry and Internal Trade (DPIIT) portal.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { Building2, Clock, Calendar, Shield, Mail, Plug } from 'lucide-react';

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'office', label: 'Office Hours', icon: Clock },
  { id: 'leave-policy', label: 'Leave Policy', icon: Calendar },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'email', label: 'Email (SMTP)', icon: Mail },
  { id: 'integrations', label: 'Integrations', icon: Plug },
];

const inputCls = "modal-input";

const CompanySettings = () => (
  <div className="space-y-4 max-w-xl">
    {[
      { label: 'Company Name', placeholder: 'Parnets Technologies' },
      { label: 'Website', placeholder: 'https://parnets.com' },
      { label: 'Phone', placeholder: '+91 9876543210' },
      { label: 'Address', placeholder: 'Full address' },
      { label: 'GST Number', placeholder: 'GSTIN' },
    ].map(f => (
      <div key={f.label}>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
        <input className="modal-input" placeholder={f.placeholder} />
      </div>
    ))}
    <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
      Save Changes
    </button>
  </div>
);

const OfficeSettings = () => (
  <div className="space-y-4 max-w-xl">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Start Time</label>
        <input type="time" defaultValue="09:00" className="modal-input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Work End Time</label>
        <input type="time" defaultValue="18:00" className="modal-input" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Working Days</label>
      <div className="flex gap-2 flex-wrap">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" defaultChecked={!['Sat','Sun'].includes(d)} className="rounded" />
            {d}
          </label>
        ))}
      </div>
    </div>
    <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
      Save Changes
    </button>
  </div>
);

const LeavePolicySettings = () => (
  <div className="space-y-4 max-w-xl">
    {[
      { label: 'Casual Leave (days/year)', defaultValue: 12 },
      { label: 'Sick Leave (days/year)', defaultValue: 10 },
      { label: 'Earned Leave (days/year)', defaultValue: 15 },
    ].map(f => (
      <div key={f.label}>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
        <input type="number" defaultValue={f.defaultValue} className="modal-input" />
      </div>
    ))}
    <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
      Save Policy
    </button>
  </div>
);

const EmailSettings = () => (
  <div className="space-y-4 max-w-xl">
    {[
      { label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { label: 'SMTP Port', placeholder: '587', type: 'number' },
      { label: 'Username', placeholder: 'noreply@company.com' },
      { label: 'Password', placeholder: '••••••••', type: 'password' },
      { label: 'From Name', placeholder: 'Parnets CRM' },
    ].map(f => (
      <div key={f.label}>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
        <input type={f.type || 'text'} className="modal-input" placeholder={f.placeholder} />
      </div>
    ))}
    <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
      Save & Test
    </button>
  </div>
);

const RolesSettings = () => {
  const roles = ['super_admin','admin','manager','developer','sales','support_executive','accounts_manager','employee','client'];
  const modules = ['Dashboard','Employees','Attendance','Leaves','Projects','Tasks','Leads','Clients','Invoices','Reports','Settings'];
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Module</th>
            {roles.map(r => <th key={r} className="px-3 py-2 text-center font-semibold text-slate-600 capitalize">{r.replace(/_/g, ' ')}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {modules.map(m => (
            <tr key={m} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-700">{m}</td>
              {roles.map(r => (
                <td key={r} className="px-3 py-2 text-center">
                  <input type="checkbox" defaultChecked={!['Settings'].includes(m) || ['super_admin','admin'].includes(r)} className="rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const IntegrationsSettings = () => (
  <div className="space-y-4 max-w-xl">
    <div className="p-4 border border-slate-200 rounded-xl">
      <h4 className="text-sm font-semibold text-slate-800 mb-3">Razorpay</h4>
      <div className="space-y-3">
        <div>
          <label className="modal-form-label">API Key</label>
          <input className="modal-input" placeholder="rzp_live_xxxxx" />
        </div>
        <div>
          <label className="modal-form-label">Secret Key</label>
          <input type="password" className="modal-input" placeholder="••••••••" />
        </div>
      </div>
    </div>
    <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
      Save Integrations
    </button>
  </div>
);

const tabContent = {
  company: <CompanySettings />,
  office: <OfficeSettings />,
  'leave-policy': <LeavePolicySettings />,
  roles: <RolesSettings />,
  email: <EmailSettings />,
  integrations: <IntegrationsSettings />,
};

const Settings = () => {
  const [tab, setTab] = useState('company');

  return (
    <div>
      <PageHeader title="Settings" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex">
          <div className="w-52 border-r border-slate-100 p-3 space-y-0.5 flex-shrink-0">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${tab === t.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 p-6">
            {tabContent[tab]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

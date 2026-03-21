import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

const Forbidden = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShieldOff className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-2">403</h1>
      <p className="text-slate-500 mb-6">You don't have permission to access this page.</p>
      <Link to="/dashboard" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
        Back to Dashboard
      </Link>
    </div>
  </div>
);

export default Forbidden;

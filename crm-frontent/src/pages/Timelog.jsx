import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { timelogService } from '../services/timelogService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import toast from 'react-hot-toast';
import { Play, Square, Plus } from 'lucide-react';
import { format } from 'date-fns';

const inputCls = "modal-input";

const Timelog = () => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const { data, isLoading } = useQuery({
    queryKey: ['timelogs'],
    queryFn: () => timelogService.getAll().then(r => r.data?.data?.timelogs || []),
  });

  const logMut = useMutation({
    mutationFn: (d) => timelogService.log(d),
    onSuccess: () => { qc.invalidateQueries(['timelogs']); toast.success('Time logged'); reset(); },
    onError: () => toast.error('Failed to log time'),
  });

  const startTimer = () => { setStartTime(new Date()); setRunning(true); setElapsed(0); };
  const stopTimer = () => {
    setRunning(false);
    const hours = (elapsed / 3600).toFixed(2);
    logMut.mutate({ hours, startTime, endTime: new Date(), description: 'Timer session' });
  };

  const fmt = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const columns = [
    { key: 'date', label: 'Date', render: (v, row) => row.startTime ? format(new Date(row.startTime), 'dd MMM yyyy') : '—' },
    { key: 'description', label: 'Description' },
    { key: 'project', label: 'Project', render: (v, row) => row.project?.name || '—' },
    { key: 'hours', label: 'Hours', render: v => v ? `${v}h` : '—' },
  ];

  return (
    <div>
      <PageHeader title="Time Log" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Time Log' }]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Timer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Timer</h3>
          <div className="text-5xl font-mono font-bold text-slate-900 mb-6">{fmt(elapsed)}</div>
          {!running ? (
            <button onClick={startTimer} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors mx-auto">
              <Play className="w-4 h-4" /> Start Timer
            </button>
          ) : (
            <button onClick={stopTimer} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors mx-auto">
              <Square className="w-4 h-4" /> Stop & Log
            </button>
          )}
        </div>

        {/* Manual log */}
        <div className="crm-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Log Manually</h3>
          <form onSubmit={handleSubmit(d => logMut.mutate(d))} className="space-y-3">
            <div>
              <label className="modal-form-label">Description</label>
              <input {...register('description')} className="modal-input" placeholder="What did you work on?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="modal-form-label">Hours</label>
                <input {...register('hours')} type="number" step="0.25" min="0.25" className="modal-input" placeholder="2.5" />
              </div>
              <div>
                <label className="modal-form-label">Date</label>
                <input {...register('date')} type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="modal-input" />
              </div>
            </div>
            <button type="submit" disabled={logMut.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" /> {logMut.isPending ? 'Logging...' : 'Log Time'}
            </button>
          </form>
        </div>
      </div>

      <div className="crm-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Logs</h3>
        <DataTable columns={columns} data={data || []} loading={isLoading} />
      </div>
    </div>
  );
};

export default Timelog;

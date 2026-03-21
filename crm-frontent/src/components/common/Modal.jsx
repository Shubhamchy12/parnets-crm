import { X } from 'lucide-react';
import { useEffect } from 'react';

const sizes = { sm: '440px', md: '560px', lg: '720px', xl: '960px', full: '1200px' };

const Modal = ({ open, onClose, title, subtitle, icon: Icon, children, size = 'md', accentColor }) => {
  const accent = accentColor || 'var(--brand)';

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: 'modalFadeIn 0.15s ease' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative flex flex-col w-full max-h-[90vh] rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: sizes[size],
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'modalSlideIn 0.2s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {/* Top accent line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, var(--brand), var(--accent))` }} />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}
              >
                <Icon style={{ width: 18, height: 18 }} />
              </div>
            )}
            <div>
              {title && (
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h2>
              )}
              {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{subtitle}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: 'var(--text-4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

import { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';

const FileUpload = ({ onFiles, accept, multiple = false, maxSizeMB = 10 }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const handle = (incoming) => {
    const valid = Array.from(incoming).filter(f => f.size <= maxSizeMB * 1024 * 1024);
    const next = multiple ? [...files, ...valid] : valid.slice(0, 1);
    setFiles(next);
    onFiles?.(next);
  };

  const remove = (i) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFiles?.(next);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600">Drag & drop or <span className="text-indigo-600 font-medium">browse</span></p>
        <p className="text-xs text-slate-400 mt-1">Max {maxSizeMB}MB{accept ? ` · ${accept}` : ''}</p>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={e => handle(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)}KB</span>
              <button onClick={e => { e.stopPropagation(); remove(i); }} className="text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

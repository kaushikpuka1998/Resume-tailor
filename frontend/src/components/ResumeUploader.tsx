import { useRef, useState } from 'react';
import type { ParsedResume } from '../types';
import { parseResume } from '../services/api';

interface Props {
  onParsed: (resume: ParsedResume, file: File) => void;
  parsedResume: ParsedResume | null;
  fileName: string | null;
}

export function ResumeUploader({ onParsed, parsedResume, fileName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const resume = await parseResume(file);
      onParsed(resume, file);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>1. Upload your resume</h2>
      <div
        className={`uploader ${drag ? 'drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {loading ? (
          <div><span className="spinner" />  Parsing…</div>
        ) : parsedResume ? (
          <div>
            <strong>{fileName}</strong>
            <div className="hint">Parsed — {parsedResume.skills.length} skills • {parsedResume.experience.length} roles. Click to replace.</div>
          </div>
        ) : (
          <div>
            <strong>Drop your PDF or DOCX here</strong>
            <div className="hint">or click to choose a file</div>
          </div>
        )}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

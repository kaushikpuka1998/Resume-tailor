import { useEffect, useState } from 'react';
import { ResumeUploader } from './components/ResumeUploader';
import { JDInput } from './components/JDInput';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ResumePreview } from './components/ResumePreview';
import { analyze, downloadPdf, health } from './services/api';
import type { JDAnalysis, ParsedResume, TailoredResume } from './types';

export default function App() {
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jdText, setJdText] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const [jd, setJd] = useState<JDAnalysis | null>(null);
  const [tailored, setTailored] = useState<TailoredResume | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    health()
      .then(h => { setBackendOk(h.ok); setAiAvailable(h.aiEnabled); })
      .catch(() => setBackendOk(false));
  }, []);

  const handleAnalyze = async () => {
    if (!resume || jdText.trim().length < 40) return;
    setError(null);
    setAnalyzing(true);
    try {
      const { jd, tailored } = await analyze(resume, jdText, useAI && aiAvailable);
      setJd(jd);
      setTailored(tailored);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!tailored) return;
    setDownloading(true);
    try {
      const blob = await downloadPdf(tailored);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(tailored.name || 'resume').replace(/\s+/g, '_')}_tailored.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const canAnalyze = !!resume && jdText.trim().length >= 40;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">Resume Tailor</div>
          <div className="app-subtitle">Upload your resume, paste a JD, get a tailored version.</div>
        </div>
        <div className="row">
          <span className={`badge ${backendOk === true ? 'ok' : backendOk === false ? 'bad' : ''}`}>
            <span className="dot" />
            {backendOk === null ? 'Connecting…' : backendOk ? 'Backend online' : 'Backend offline'}
          </span>
          <span className={`badge ${aiAvailable ? 'ok' : 'warn'}`}>
            <span className="dot" />
            AI {aiAvailable ? 'enabled' : 'off'}
          </span>
        </div>
      </header>

      <div className="grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ResumeUploader
            onParsed={(r, f) => { setResume(r); setFileName(f.name); setTailored(null); setJd(null); }}
            parsedResume={resume}
            fileName={fileName}
          />
          <JDInput
            value={jdText}
            onChange={setJdText}
            onAnalyze={handleAnalyze}
            useAI={useAI}
            onToggleAI={setUseAI}
            aiAvailable={aiAvailable}
            canAnalyze={canAnalyze}
            loading={analyzing}
          />
          {error && <div className="error">{error}</div>}
          {jd && tailored && <AnalysisPanel jd={jd} tailored={tailored} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>4. Tailored preview</h2>
              <button className="btn primary" onClick={handleDownload} disabled={!tailored || downloading}>
                {downloading ? <><span className="spinner" /> Building PDF…</> : 'Download PDF'}
              </button>
            </div>
            {tailored ? (
              <ResumePreview tailored={tailored} />
            ) : (
              <div className="empty">
                {resume
                  ? 'Paste a JD and click Analyze to generate a tailored preview.'
                  : 'Upload a resume to get started.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="footer">
        Hybrid analysis: rule-based keyword extraction always on • AI rewrite layer activates when an OpenAI key is set on the backend.
      </div>
    </div>
  );
}

import type { TailoredResume } from '../types';

interface Props { tailored: TailoredResume; }

export function ResumePreview({ tailored }: Props) {
  const contact = [tailored.email, tailored.phone, tailored.location].filter(Boolean).join(' • ');
  return (
    <div className="preview" aria-label="Tailored resume preview">
      {tailored.name && <h1>{tailored.name}</h1>}
      {contact && <div className="contact">{contact}</div>}

      {tailored.tailoredSummary && (
        <>
          <div className="section-title">Summary</div>
          <div>{tailored.tailoredSummary}</div>
        </>
      )}

      {tailored.reorderedSkills.length > 0 && (
        <>
          <div className="section-title">Skills</div>
          <div>{tailored.reorderedSkills.join(' • ')}</div>
        </>
      )}

      {tailored.experience.length > 0 && (
        <>
          <div className="section-title">Experience</div>
          {tailored.experience.map((exp, ei) => (
            <div className="exp" key={ei}>
              <div className="head">
                <div>
                  <span className="title">{exp.title}</span>
                  {exp.company && <span> — {exp.company}</span>}
                </div>
                {exp.dates && <div className="meta">{exp.dates}</div>}
              </div>
              {exp.bullets.length > 0 && (
                <ul>
                  {exp.bullets.map((b, bi) => {
                    const highlighted = tailored.highlightedBullets.some(h =>
                      h.experienceIndex === ei && h.bulletIndex === bi
                    );
                    return <li key={bi} className={highlighted ? 'highlight' : ''}>{b}</li>;
                  })}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {tailored.education.length > 0 && (
        <>
          <div className="section-title">Education</div>
          {tailored.education.map((ed, i) => (
            <div className="exp" key={i}>
              <div className="head">
                <div><span className="title">{ed.degree}</span>{ed.institution && <span> — {ed.institution}</span>}</div>
                {ed.dates && <div className="meta">{ed.dates}</div>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

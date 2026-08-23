import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CaseOverviewPage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const location = useLocation();
  const { authFetch } = useAuth();
  
  const [caseData, setCaseData] = useState(location.state?.caseData || null);
  const [loading, setLoading] = useState(!caseData);
  const [error, setError] = useState(null);
  const [expandedSource, setExpandedSource] = useState(false);

  useEffect(() => {
    if (caseData) return;
    
    const fetchCaseDetails = async () => {
      try {
        const res = await authFetch(`/cases/${caseId}`);
        if (!res.ok) throw new Error('Failed to fetch case details');
        const data = await res.json();
        setCaseData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCaseDetails();
  }, [caseId, caseData, authFetch]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-on-surface">Loading Case Details...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-error">{error}</div>;

  const analysis = caseData?.analysis || {};

  // If this is a Scheme Application case (from Scheme Navigator), don't show the Legal RAG UI
  if (caseData?.title?.startsWith('Application:')) {
    const draftMessage = caseData.messages?.find(m => m.content?.response_type === 'document_draft');
    const pdfUrl = draftMessage?.content?.pdf_url;
    const pdfBase64 = draftMessage?.content?.pdf_base64;

    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="glass-card max-w-lg w-full p-10 rounded-3xl text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-4xl">description</span>
          </div>
          <h1 className="font-display text-2xl text-on-surface mb-3">{caseData.title}</h1>
          <p className="text-on-surface-variant font-body mb-8">
            This is your drafted government scheme application. 
            {pdfUrl ? ' You can download the generated PDF document below.' : ' The PDF conversion is currently unavailable, but your application data is saved.'}
          </p>
          
          {pdfUrl ? (
            <a 
              href={pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : pdfUrl}
              download={pdfBase64 ? `${caseData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf` : undefined}
              target={pdfBase64 ? undefined : "_blank"}
              rel="noreferrer"
              className="w-full py-4 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition flex justify-center items-center gap-2 mb-4"
            >
              <span className="material-symbols-outlined">download</span>
              Download PDF Application
            </a>
          ) : (
            <div className="w-full py-4 bg-surface-container text-on-surface-variant rounded-xl font-medium mb-4 flex justify-center items-center gap-2 opacity-70">
              <span className="material-symbols-outlined">error</span>
              PDF Unavailable
            </div>
          )}

          <button 
            onClick={() => navigate('/dashboard/cases')}
            className="w-full py-3 border border-white/10 text-on-surface rounded-xl font-medium hover:bg-white/5 transition"
          >
            Back to My Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-margin-mobile md:px-margin-desktop pb-32 pt-4 md:pt-8">
      {/* Background Effects */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-low"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 blur-[150px] rounded-full mix-blend-screen translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-secondary/5 blur-[120px] rounded-full mix-blend-screen -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="max-w-container-max mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm border border-tertiary/20">
                  <span className="w-2 h-2 rounded-full bg-tertiary mr-2"></span>
                  Analysis Complete
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Case ID: #{caseData?.request_id || analysis?.request_id || 'CP-8492'}
                </span>
              </div>
              <h1 className="font-display-md text-display-md text-on-surface mb-2 capitalize">
                {analysis?.domain ? `${analysis.domain} ${analysis.subdomain ? `/ ${analysis.subdomain}` : ''}` : 'Legal Analysis Complete'}
              </h1>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors duration-300 font-label-sm text-label-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                Export
              </button>
              <button
                onClick={() => navigate(`/dashboard/case/${caseId || 'demo'}/plan`)}
                className="px-6 py-3 rounded-lg bg-primary text-on-primary-fixed font-bold font-label-sm text-label-sm uppercase tracking-wide hover:bg-primary-fixed transition-colors duration-300 flex items-center gap-2 shadow-[0_8px_16px_rgba(255,180,161,0.2)]"
              >
                View Action Plan
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Left Column */}
          <div className="md:col-span-8 flex flex-col gap-gutter">
            {/* Your Situation */}
            <section className="glass-card rounded-xl p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="w-full">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Your Situation</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {analysis?.summary || caseData?.summary || "Summary not available."}
                  </p>
                  
                  {/* Facts Established */}
                  {analysis?.facts?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-3 uppercase tracking-wider">Facts Established</h4>
                      <div className="flex flex-col gap-2">
                        {analysis.facts.map((f, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-surface-container-low p-3 rounded-lg border border-white/5">
                            <span className={`material-symbols-outlined shrink-0 text-sm mt-0.5 ${f.provided_by_user ? 'text-primary' : 'text-tertiary'}`}>
                              {f.provided_by_user ? 'check_circle' : 'psychology'}
                            </span>
                            <div>
                              <p className="font-body-sm text-on-surface">{f.fact}</p>
                              <span className="font-label-sm text-[10px] text-on-surface-variant">
                                {f.provided_by_user ? 'Provided by you' : 'Inferred by AI'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {caseData?.evidence_provided && (
                    <div className="mt-6">
                      <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-3 uppercase tracking-wider">Uploaded Evidence</h4>
                      <div className="flex flex-wrap gap-3">
                        {Array.isArray(caseData.evidence_provided) ? (
                          caseData.evidence_provided.map((url, idx) => (
                            <div key={idx} className="p-3 bg-surface/30 rounded-lg border border-white/5 inline-flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-sm">attachment</span>
                              <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-label-sm max-w-[200px] truncate">
                                Document {idx + 1}
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-surface/30 rounded-lg border border-white/5 inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm">attachment</span>
                            <a href={caseData.evidence_provided} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-label-sm max-w-[200px] truncate">
                              View Attached Evidence
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Legal Position */}
            <section className="glass-card rounded-xl p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">gavel</span>
                </div>
                <div className="w-full">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Legal Position</h2>
                  
                  {/* Legal Issues */}
                  {analysis?.legal_issues?.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      {analysis.legal_issues.map((issue, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-error/10 text-error border border-error/20 rounded-lg font-label-sm text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {analysis?.legal_position?.map((position, idx) => (
                      <div key={idx} className="bg-surface/50 border border-white/5 rounded-lg p-5 hover:border-primary/30 transition-colors duration-300">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-body-lg text-body-lg text-on-surface">{position.issue}</h3>
                          {position.confidence && (
                            <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase ${
                              position.confidence === 'high' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                            }`}>
                              {position.confidence} confidence
                            </span>
                          )}
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant">{position.explanation}</p>
                      </div>
                    ))}
                  </div>

                  {/* Possible Laws */}
                  {analysis?.possible_laws?.length > 0 && (
                    <div>
                      <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-3 uppercase tracking-wider">Applicable Laws</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {analysis.possible_laws.map((law, idx) => (
                          <div key={idx} className="p-4 bg-surface-container-low rounded-lg border border-white/5">
                            <h5 className="font-body-md text-on-surface font-semibold mb-1">{law.name}</h5>
                            <p className="font-label-sm text-on-surface-variant text-xs mb-2 italic">{law.relevance}</p>
                            <p className="font-body-sm text-on-surface-variant text-sm mb-3">{law.simple_explanation}</p>
                            <div className="flex gap-2 flex-wrap">
                              {law.sections?.map((sec, i) => (
                                <span key={i} className="px-2 py-1 bg-surface-container-highest rounded text-[10px] text-on-surface">
                                  {sec}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="md:col-span-4 flex flex-col gap-gutter">
            {/* Action Plan */}
            <section className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-high opacity-50 z-0"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full mix-blend-screen z-0 group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="relative z-10">
                <h2 className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">strategy</span>
                  Action Plan
                </h2>
                
                {/* Next Steps */}
                <div className="mb-6">
                  <span className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Immediate Steps</span>
                  <div className="flex flex-col gap-2">
                    {analysis?.next_steps?.map((step, i) => (
                      <div key={i} className="flex gap-2 text-sm text-on-surface bg-surface-container-low p-3 rounded-lg border border-white/5">
                        <span className="font-mono text-primary">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deadlines */}
                {analysis?.deadlines?.length > 0 && (
                  <div className="mb-6">
                     <span className="block font-label-sm text-label-sm text-secondary mb-2">Deadlines</span>
                     <div className="flex flex-col gap-2">
                       {analysis.deadlines.map((d, i) => (
                         <div key={i} className="flex items-center gap-2 text-xs text-on-surface bg-secondary/10 p-2 border border-secondary/20 rounded-lg">
                           <span className="material-symbols-outlined text-secondary text-[14px]">timer</span>
                           {d}
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* Required Documents */}
                {analysis?.documents_required?.length > 0 && (
                  <div className="mb-6">
                    <span className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Required Documents</span>
                    <ul className="text-on-surface-variant text-xs list-disc pl-4 space-y-1">
                      {analysis.documents_required.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                  </div>
                )}

                {/* Limitations */}
                {analysis?.limitations?.length > 0 && (
                  <div className="mb-6 bg-warning/10 border border-warning/20 p-3 rounded-lg">
                    <span className="flex items-center gap-1 font-label-sm text-[10px] text-warning uppercase mb-1">
                      <span className="material-symbols-outlined text-[12px]">info</span>
                      Limitations
                    </span>
                    <ul className="text-warning text-xs list-disc pl-4 space-y-1">
                      {analysis.limitations.map((lim, i) => <li key={i}>{lim}</li>)}
                    </ul>
                  </div>
                )}

                {/* Relevant Contacts */}
                {analysis?.relevant_contacts?.length > 0 && (
                  <div>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Relevant Contacts</span>
                    {analysis.relevant_contacts.map((contact, i) => (
                      <div key={i} className="bg-surface-container p-3 rounded-lg border border-white/5 mb-2">
                        <span className="font-body-sm text-sm text-on-surface font-semibold block">{contact.name}</span>
                        <span className="font-label-sm text-[10px] text-on-surface-variant block mb-2">{contact.description}</span>
                        <div className="flex items-center gap-3">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <span className="material-symbols-outlined text-[14px]">call</span> {contact.phone}
                            </a>
                          )}
                          {contact.website && (
                            <a href={contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <span className="material-symbols-outlined text-[14px]">language</span> Website
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Sources */}
            <section className="glass-card rounded-xl p-6">
              <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-4">Referenced Sources</h2>
              
              {analysis?.sources?.length > 0 ? (
                analysis.sources.map((source, idx) => (
                  <div key={idx} className="border border-white/5 rounded-lg bg-surface/30 mb-3">
                    <button
                      onClick={() => setExpandedSource(expandedSource === idx ? false : idx)}
                      className="flex items-start justify-between p-4 cursor-pointer w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-tertiary shrink-0 mt-0.5" style={{ fontSize: '20px' }}>menu_book</span>
                        <div>
                          <span className="font-body-md text-body-md text-on-surface font-medium block">{source.act_title || 'Legal Reference'}</span>
                          {source.section_number && <span className="font-label-sm text-xs text-on-surface-variant block">Sec. {source.section_number} {source.section_title ? `- ${source.section_title}` : ''}</span>}
                        </div>
                      </div>
                      <span className={`material-symbols-outlined transition duration-300 text-on-surface-variant shrink-0 mt-1 ${expandedSource === idx ? '-rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {expandedSource === idx && (
                      <div className="p-4 pt-0 border-t border-white/5 mt-2 text-on-surface-variant font-body-sm text-sm bg-surface-container-low">
                        {source.section_text && <p className="italic pt-2">"{source.section_text}"</p>}
                        {source.relevance_score && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                              <div className="h-full bg-tertiary" style={{ width: `${source.relevance_score * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] text-tertiary font-mono">{Math.round(source.relevance_score * 100)}% match</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="border border-white/5 rounded-lg bg-surface/30 p-4 text-on-surface-variant font-body-sm">
                  No sources were referenced in this analysis.
                </div>
              )}
              
              {analysis?.disclaimer && (
                <p className="mt-6 text-[10px] text-on-surface-variant/50 text-center italic">
                  {analysis.disclaimer}
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Job } from '../types';
import { 
  FileText, Sparkles, AlertCircle, CheckCircle2, 
  Upload, Clipboard, RefreshCw, ChevronRight, Copy, ArrowRight, BookOpen
} from 'lucide-react';

interface ResumeMatcherProps {
  jobs: Job[];
  preselectedJob: Job | null;
  onClearPreselected: () => void;
}

interface TailoringSuggestion {
  section: string;
  originalBullet: string;
  suggestedChange: string;
}

interface AnalysisResult {
  score: number;
  strengths: string[];
  gaps: string[];
  tailoringSuggestions: TailoringSuggestion[];
}

export default function ResumeMatcher({ jobs, preselectedJob, onClearPreselected }: ResumeMatcherProps) {
  const [resumeText, setResumeText] = useState<string>('');
  const [isSavingResume, setIsSavingResume] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedSuggestionIndex, setCopiedSuggestionIndex] = useState<number | null>(null);

  // Job selection states
  const [selectedJobId, setSelectedJobId] = useState<string>('custom');
  const [customJobTitle, setCustomJobTitle] = useState<string>('');
  const [customCompany, setCustomCompany] = useState<string>('');
  const [customJobDescription, setCustomJobDescription] = useState<string>('');

  // Results state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // File upload state
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved resume on mount
  useEffect(() => {
    fetch('/api/resume')
      .then(res => res.json())
      .then(data => {
        if (data.resumeText) {
          setResumeText(data.resumeText);
        }
      })
      .catch(err => console.error('Failed to load master resume:', err));
  }, []);

  // Handle preselected job from detail view
  useEffect(() => {
    if (preselectedJob) {
      setSelectedJobId(preselectedJob.id);
      // Scroll to view if needed
    }
  }, [preselectedJob]);

  // Handle saving resume back to database
  const handleSaveResume = async () => {
    setIsSavingResume(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Failed to save master resume.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving resume.');
    } finally {
      setIsSavingResume(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  };

  const handleFileRead = (file: File) => {
    const validTypes = ['text/plain', 'text/markdown', 'application/json'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !['txt', 'md', 'json', 'rtf'].includes(extension || '')) {
      setError('Unsupported file format. Please drop a .txt, .md, .rtf, or raw text file, or copy-paste directly.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setResumeText(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  // Trigger analysis via full-stack express/gemini proxy
  const handleAnalyzeMatch = async () => {
    if (!resumeText.trim()) {
      setError('Please provide your resume content first.');
      return;
    }

    if (selectedJobId === 'custom' && !customJobDescription.trim()) {
      setError('Please provide a job description for the custom role.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const payload = {
        resumeText,
        jobId: selectedJobId !== 'custom' ? selectedJobId : null,
        customJobTitle: selectedJobId === 'custom' ? customJobTitle : null,
        customCompany: selectedJobId === 'custom' ? customCompany : null,
        customJobDescription: selectedJobId === 'custom' ? customJobDescription : null
      };

      const res = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
      } else {
        setError(data.error || 'Failed to complete resume alignment analysis.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while querying Gemini analysis nodes.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy individual suggestion rewrite
  const handleCopySuggestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSuggestionIndex(index);
    setTimeout(() => setCopiedSuggestionIndex(null), 3000);
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50' };
    if (score >= 60) return { text: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50' };
    if (score >= 40) return { text: 'text-amber-600', border: 'border-amber-200', bg: 'bg-[#FFFDF5]' };
    return { text: 'text-rose-600', border: 'border-rose-200', bg: 'bg-rose-50' };
  };

  const getScoreRating = (score: number) => {
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Strong Alignment';
    if (score >= 55) return 'Moderate Fit';
    return 'Requires Tailoring';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="resume-matcher-grid">
      {/* Left Column: Inputs & Target Setup (7 Cols) */}
      <div className="lg:col-span-7 space-y-6" id="resume-inputs-container">
        {/* Resume Input Area */}
        <div className="bg-white p-6 rounded-sm border border-[#E0DED7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif italic font-bold text-[#1A1A1A]">Master Resume Context</h3>
              <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Provide your latest professional experience details</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveResume}
                disabled={isSavingResume || !resumeText.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E0DED7] hover:border-black text-[#1A1A1A] font-bold text-[9px] uppercase tracking-wider rounded-sm transition disabled:opacity-50"
                id="save-resume-context-btn"
              >
                {isSavingResume ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                Save Context
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Resume context saved successfully inside local database
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 border border-dashed rounded-sm text-center cursor-pointer transition ${
              isDragOver 
                ? 'border-black bg-[#F9F8F6]' 
                : 'border-[#E0DED7] hover:border-black bg-[#FAF9F6]/50'
            }`}
            id="drag-drop-area"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".txt,.md,.rtf,.json"
              className="hidden"
            />
            <Upload className="w-5 h-5 text-[#999] mx-auto mb-1.5" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">Drag & drop resume file here, or click to browse</p>
            <p className="text-[9px] text-[#666] mt-0.5">Supports .txt, .md, .rtf or raw text</p>
          </div>

          <textarea
            placeholder="Paste your resume, professional background, or LinkedIn profile summary here to analyze..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full h-80 p-4 bg-[#F9F8F6] border border-[#E0DED7] focus:border-black rounded-sm text-xs text-[#1A1A1A] font-sans leading-relaxed outline-none resize-y transition"
            id="resume-text-input"
          />
        </div>

        {/* Target Job Selector Area */}
        <div className="bg-white p-6 rounded-sm border border-[#E0DED7] shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-serif italic font-bold text-[#1A1A1A]">Target Role Selection</h3>
            <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Select a curated active post or input custom telemetry</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Choose Target Job</label>
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                if (e.target.value === 'custom') {
                  onClearPreselected();
                }
              }}
              className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs transition outline-none text-[#1A1A1A]"
              id="matcher-job-select"
            >
              <option value="custom">-- Paste Custom Job Description --</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  [{job.platform}] {job.company} — {job.title}
                </option>
              ))}
            </select>
          </div>

          {selectedJobId === 'custom' ? (
            <div className="space-y-4 pt-2" id="custom-job-inputs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={customJobTitle}
                    onChange={(e) => setCustomJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#E0DED7] focus:border-black rounded-sm text-xs text-gray-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#E0DED7] focus:border-black rounded-sm text-xs text-gray-800 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Job Description / Requirements</label>
                <textarea
                  placeholder="Paste the target job details, requirements section, or entire post text here to allow Gemini to precisely align your experience..."
                  value={customJobDescription}
                  onChange={(e) => setCustomJobDescription(e.target.value)}
                  className="w-full h-36 p-3 bg-[#F9F8F6] border border-[#E0DED7] focus:border-black rounded-sm text-xs text-[#1A1A1A] outline-none resize-none transition"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#F9F8F6] border border-[#E0DED7] rounded-sm text-xs text-[#444] leading-relaxed space-y-2">
              {(() => {
                const job = jobs.find(j => j.id === selectedJobId);
                if (!job) return null;
                return (
                  <>
                    <p className="font-serif italic font-bold text-[#1A1A1A] text-sm">{job.title}</p>
                    <p className="text-[9px] font-bold text-[#999] uppercase tracking-wider">{job.company} | {job.location}</p>
                    <p className="line-clamp-3 text-xs mt-1 text-[#555]">{job.summary}</p>
                    {job.requiredStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {job.requiredStack.map(tech => (
                          <span key={tech} className="inline-flex items-center px-1.5 py-0.5 bg-white border border-[#E0DED7] font-mono text-[9px] rounded-sm uppercase tracking-wider text-[#666]">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <button
            onClick={handleAnalyzeMatch}
            disabled={isAnalyzing || !resumeText.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-none transition shadow-sm"
            id="analyze-resume-btn"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400" />
            )}
            {isAnalyzing ? 'Analyzing Alignment...' : 'Analyze Match Compatibility'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Execution Error</p>
              <p className="mt-0.5 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Results & Telemetry Output (5 Cols) */}
      <div className="lg:col-span-5" id="resume-results-container">
        {isAnalyzing ? (
          <div className="bg-white border border-[#E0DED7] rounded-sm p-12 text-center shadow-sm h-full flex flex-col items-center justify-center min-h-[500px]" id="analyzing-state">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <h3 className="font-serif italic font-bold text-[#1A1A1A] text-xl">Ingesting Telemetry</h3>
            <p className="text-xs text-[#666] mt-1 max-w-xs mx-auto font-medium leading-relaxed">
              Gemini AI is parsing your professional details, overlaying target keywords, and calculating compatibility matrices...
            </p>
            <div className="mt-6 w-full max-w-xs bg-[#F9F8F6] border border-[#E0DED7] rounded-sm p-3.5 text-left space-y-2">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
                Vectorizing resume nodes
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#999]">
                <span>•</span>
                Extracting technical skills
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#999]">
                <span>•</span>
                Formulating tailoring blueprints
              </div>
            </div>
          </div>
        ) : analysisResult ? (
          <div className="space-y-6 sticky top-4" id="analysis-results">
            {/* Compatibility Header Summary Card */}
            {(() => {
              const theme = getScoreColor(analysisResult.score);
              return (
                <div className={`bg-white border border-[#E0DED7] p-6 rounded-sm shadow-sm space-y-5 text-center`}>
                  <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#999]">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    COMPATIBILITY TELEMETRY
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className={`w-28 h-28 rounded-full border-4 ${theme.border} ${theme.bg} flex flex-col items-center justify-center shadow-inner relative overflow-hidden`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#999] leading-none mb-1">SCORE</span>
                      <span className={`text-4xl font-serif font-black ${theme.text} leading-none`}>{analysisResult.score}%</span>
                    </div>
                    <div className="space-y-1 mt-2">
                      <h4 className="text-lg font-serif italic font-bold text-[#1A1A1A]">{getScoreRating(analysisResult.score)}</h4>
                      <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Matched against target profile requirements</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Strengths & Gaps Tabs */}
            <div className="bg-white border border-[#E0DED7] p-6 rounded-sm shadow-sm space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#999] block">Overlapping Strengths</h4>
                <div className="space-y-2 pt-1">
                  {analysisResult.strengths.map((str, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs text-[#333] font-sans leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </div>
                  ))}
                  {analysisResult.strengths.length === 0 && (
                    <p className="text-xs text-[#999] italic">No strong matches identified.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#E0DED7] pt-4 space-y-1">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#999] block">Identified Skill Gaps</h4>
                <div className="space-y-2 pt-1">
                  {analysisResult.gaps.map((gap, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs text-[#444] font-sans leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{gap}</span>
                    </div>
                  ))}
                  {analysisResult.gaps.length === 0 && (
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Perfect matches across all requirement dimensions!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actionable Tailoring Instructions */}
            <div className="bg-white border border-[#E0DED7] p-6 rounded-sm shadow-sm space-y-4">
              <div>
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] block">Copy-Paste Tailoring Suggestions</h4>
                <p className="text-[9px] text-[#666] uppercase tracking-wider font-semibold">Integrate these edits directly into your resume structure</p>
              </div>

              <div className="space-y-4 pt-1">
                {analysisResult.tailoringSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="border-l-2 border-black pl-3.5 py-1.5 space-y-2.5 bg-[#FAF9F6] p-3 rounded-sm border border-transparent hover:border-[#E0DED7] transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#1A1A1A] bg-white border border-[#E0DED7] px-2 py-0.5 rounded-sm">
                        {suggestion.section}
                      </span>
                      <button
                        onClick={() => handleCopySuggestion(suggestion.suggestedChange, idx)}
                        className="text-[9px] uppercase tracking-wider text-black hover:underline font-bold inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#E0DED7] rounded-sm transition"
                      >
                        {copiedSuggestionIndex === idx ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy Rewrite
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-[#999] uppercase tracking-wider block">Context / Original Target Area:</span>
                        <p className="text-[#666] line-clamp-2 italic font-serif text-[11px] mt-0.5">{suggestion.originalBullet}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#2563EB] uppercase tracking-wider block">Suggested Rewrite:</span>
                        <p className="text-[#1A1A1A] font-sans font-medium mt-0.5 leading-relaxed bg-white border border-dashed border-[#E0DED7] p-2 rounded-sm select-all">
                          {suggestion.suggestedChange}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {analysisResult.tailoringSuggestions.length === 0 && (
                  <p className="text-xs text-[#999] italic">No tailoring recommendations required.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#F9F8F6] rounded-sm border border-dashed border-[#E0DED7] p-12 text-center sticky top-4 h-full flex flex-col items-center justify-center min-h-[500px]" id="empty-state">
            <BookOpen className="w-8 h-8 text-[#999] mx-auto mb-3" />
            <h4 className="font-serif italic font-bold text-[#1A1A1A] text-lg">Await Vector Analysis</h4>
            <p className="text-xs text-[#666] mt-1.5 max-w-xs mx-auto font-medium leading-relaxed">
              Upload or paste your Master Resume on the left, select a target role, and trigger the AI alignment nodes to calculate your compatibility telemetry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Job, SavedSearch } from '../types';
import { 
  Search, MapPin, DollarSign, ExternalLink, FileText, 
  Sparkles, Check, Bookmark, Trash2, Calendar, Filter, 
  ChevronRight, X, Loader2, Save, Send, Code, Clock
} from 'lucide-react';

interface JobFeedProps {
  jobs: Job[];
  searches: SavedSearch[];
  onTrackJob: (id: string, isTracked: boolean) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onGenerateCoverLetter: (jobId: string, resumeText: string, instructions: string) => Promise<string>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onAnalyzeResumeMatch?: (job: Job) => void;
}

export default function JobFeed({
  jobs,
  searches,
  onTrackJob,
  onDeleteJob,
  onGenerateCoverLetter,
  onUpdateNotes,
  onAnalyzeResumeMatch
}: JobFeedProps) {
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'All' | 'LinkedIn' | 'Indeed'>('All');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [onlyTracked, setOnlyTracked] = useState<'All' | 'Scraped' | 'Tracked'>('All');

  // Selected job detail drawer/modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [resumeText, setResumeText] = useState(() => localStorage.getItem('user_resume_context') || '');
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requiredStack.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlatform = selectedPlatform === 'All' || job.platform === selectedPlatform;

    // Resolve search category mapping
    let matchesRole = true;
    if (selectedRole !== 'All') {
      const search = searches.find(s => s.id === job.searchId);
      matchesRole = search ? search.roleType === selectedRole : false;
    }

    const matchesTrackState = 
      onlyTracked === 'All' ? true :
      onlyTracked === 'Scraped' ? !job.isTracked :
      job.isTracked;

    return matchesSearch && matchesPlatform && matchesRole && matchesTrackState;
  });

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setGeneratedLetter(job.coverLetter);
    setNotesText(job.notes || '');
  };

  const handleGenerateLetter = async () => {
    if (!selectedJob) return;
    setIsGenerating(true);
    try {
      localStorage.setItem('user_resume_context', resumeText);
      const letter = await onGenerateCoverLetter(selectedJob.id, resumeText, instructions);
      setGeneratedLetter(letter);
      // Update selectedJob state locally to show it generated
      setSelectedJob(prev => prev ? { ...prev, coverLetter: letter } : null);
    } catch (err) {
      alert("Failed to generate custom cover letter. Please ensure GEMINI_API_KEY is configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedJob) return;
    setIsSavingNotes(true);
    try {
      await onUpdateNotes(selectedJob.id, notesText);
      setSelectedJob(prev => prev ? { ...prev, notes: notesText } : null);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCopyLetter = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrackStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'Bookmarked': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Applied': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'Interviewing': return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'Offered': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border border-rose-100';
    }
  };

  return (
    <div className="space-y-6" id="job-feed-container">
      {/* Search and Filters Card - Editorial Style */}
      <div className="bg-white p-6 rounded-sm border border-[#E0DED7] shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center justify-between" id="feed-filter-card">
        {/* Search input */}
        <div className="relative flex-1" id="feed-search-wrapper">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999]" />
          <input
            type="text"
            placeholder="Search job title, company, or stack preference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs tracking-wide transition outline-none text-[#1A1A1A]"
            id="feed-search-input"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-3" id="feed-filters-group">
          {/* Platform selector */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-sm border border-[#E0DED7]">
            <span className="text-[10px] uppercase tracking-wider text-[#999] font-bold font-sans">Board:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="bg-transparent border-0 text-[10px] uppercase font-bold tracking-wider text-black focus:ring-0 cursor-pointer outline-none"
              id="feed-platform-select"
            >
              <option value="All">All Boards</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Indeed">Indeed</option>
            </select>
          </div>

          {/* Role mapping selector */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-sm border border-[#E0DED7]">
            <span className="text-[10px] uppercase tracking-wider text-[#999] font-bold">Query:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-transparent border-0 text-[10px] uppercase font-bold tracking-wider text-black focus:ring-0 cursor-pointer outline-none"
              id="feed-role-select"
            >
              <option value="All">All Categories</option>
              <option value="front-end">Front-End</option>
              <option value="back-end">Back-End</option>
              <option value="full-stack">Full-Stack</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Tracker filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-sm border border-[#E0DED7]">
            <span className="text-[10px] uppercase tracking-wider text-[#999] font-bold">Status:</span>
            <select
              value={onlyTracked}
              onChange={(e) => setOnlyTracked(e.target.value as any)}
              className="bg-transparent border-0 text-[10px] uppercase font-bold tracking-wider text-black focus:ring-0 cursor-pointer outline-none"
              id="feed-tracked-select"
            >
              <option value="All">All Positions</option>
              <option value="Scraped">Newly Scraped</option>
              <option value="Tracked">Tracked / Applied</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Jobs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="job-feed-grid">
        {/* Left list of jobs - 2 columns */}
        <div className="lg:col-span-2 space-y-4" id="job-listings-list">
          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-sm border border-[#E0DED7] p-12 text-center shadow-sm" id="empty-feed">
              <Filter className="w-8 h-8 text-[#999] mx-auto mb-3" />
              <h3 className="font-serif italic font-bold text-[#1A1A1A] text-lg">No Matching Jobs</h3>
              <p className="text-xs text-[#666] mt-1 max-w-sm mx-auto font-medium">No jobs found matching your current filter criteria. Try triggering a manual scrape or relaxing filters.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div 
                key={job.id}
                onClick={() => handleSelectJob(job)}
                className={`p-6 rounded-sm border bg-white transition duration-200 cursor-pointer relative group flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  selectedJob?.id === job.id ? 'border-black ring-1 ring-black shadow-md' : 'border-[#E0DED7] hover:border-black shadow-sm'
                }`}
                id={`job-feed-item-${job.id}`}
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 bg-[#F5F5F5] text-[9px] font-bold uppercase tracking-widest text-[#1A1A1A] border border-[#E0DED7] rounded-sm">
                      {job.platform}
                    </span>
                    {job.isTracked ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold uppercase tracking-wider border border-blue-200 rounded-sm">
                        {job.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#F9F8F6] text-[#666] text-[9px] font-bold uppercase tracking-wider border border-[#E0DED7] rounded-sm">
                        Scraped
                      </span>
                    )}
                    {job.salaryRange && (
                      <span className="text-blue-600 font-serif italic text-sm">
                        {job.salaryRange}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-serif font-bold group-hover:underline text-[#1A1A1A]">{job.title}</h3>
                    <p className="text-xs text-[#666] leading-relaxed uppercase tracking-wide font-semibold mt-0.5">{job.company}</p>
                  </div>

                  <p className="text-xs text-[#444] line-clamp-2 leading-relaxed font-sans">{job.summary}</p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[10px] uppercase font-bold tracking-wider text-[#999]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#999]" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#999]" />
                      {job.postDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#999]" />
                      Added {new Date(job.dateAdded).toLocaleDateString()}
                    </span>
                  </div>

                  {job.requiredStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.requiredStack.map(stack => (
                        <span key={stack} className="inline-flex items-center px-2 py-0.5 bg-white border border-[#E0DED7] font-mono text-[9px] rounded-sm text-[#555] uppercase tracking-wider">
                          {stack}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-row md:flex-col items-center gap-1.5 self-end md:self-center bg-[#F9F8F6] p-2 rounded-sm border border-[#E0DED7] md:bg-transparent md:p-0 md:border-0" onClick={e => e.stopPropagation()}>
                  {/* Tracking Button */}
                  <button
                    onClick={() => onTrackJob(job.id, !job.isTracked)}
                    className={`p-2 rounded-sm transition duration-150 flex items-center justify-center border ${
                      job.isTracked 
                        ? 'bg-[#1A1A1A] text-white border-black hover:bg-black' 
                        : 'bg-white hover:bg-[#F9F8F6] text-[#666] border-[#E0DED7] hover:text-black shadow-sm'
                    }`}
                    title={job.isTracked ? "Untrack this job" : "Track this application"}
                    id={`track-btn-${job.id}`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleSelectJob(job)}
                    className="p-2 bg-white border border-[#E0DED7] text-[#666] hover:text-black hover:border-black rounded-sm hover:bg-[#F9F8F6] transition duration-150 shadow-sm"
                    title="Generate Custom Cover Letter"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={job.originalUrl}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="p-2 bg-white border border-[#E0DED7] text-[#666] hover:text-black hover:border-black rounded-sm hover:bg-[#F9F8F6] transition duration-150 shadow-sm"
                    title="Visit Original Post"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => onDeleteJob(job.id)}
                    className="p-2 text-[#999] hover:text-red-600 hover:bg-red-50 rounded-sm transition duration-150"
                    title="Remove Job"
                    id={`delete-job-${job.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Job Details and Cover Letter customizer Column - 1 column */}
        <div className="lg:col-span-1 space-y-6" id="job-detail-panel-wrapper">
          {selectedJob ? (
            <div className="bg-white rounded-sm border border-[#E0DED7] p-6 shadow-sm sticky top-4 space-y-6" id="job-detail-drawer">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#E0DED7]">
                <div className="space-y-1">
                  <span className="inline-flex items-center px-2 py-0.5 bg-[#F5F5F5] text-[9px] font-bold uppercase tracking-widest text-black border border-[#E0DED7] rounded-sm">
                    {selectedJob.platform}
                  </span>
                  <h3 className="text-2xl font-serif italic font-bold tracking-tight text-[#1A1A1A]">{selectedJob.title}</h3>
                  <p className="text-xs text-[#666] leading-relaxed uppercase tracking-wide font-semibold mt-0.5">{selectedJob.company}</p>
                </div>
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="p-1 text-[#666] hover:text-black rounded-sm hover:bg-[#F9F8F6] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Basic Info */}
              <div className="space-y-2 text-xs uppercase tracking-wide font-semibold text-[#666]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#999]" />
                  <span>{selectedJob.location}</span>
                </div>
                {selectedJob.salaryRange && (
                  <div className="flex items-center gap-2 text-[#2563EB] font-serif italic text-sm normal-case tracking-normal">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span>{selectedJob.salaryRange}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#999]" />
                  <a 
                    href={selectedJob.originalUrl} 
                    target="_blank" 
                    referrerPolicy="no-referrer"
                    className="text-black hover:underline inline-flex items-center gap-1"
                  >
                    View active job post <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Requirement Summary */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#999] block">Job Overview</h4>
                <div className="bg-[#F9F8F6] border border-[#E0DED7] p-4 rounded-sm text-xs text-[#444] leading-relaxed">
                  {selectedJob.summary}
                </div>
              </div>

              {/* Action Buttons for tracking */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onTrackJob(selectedJob.id, !selectedJob.isTracked)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest rounded-sm transition ${
                    selectedJob.isTracked
                      ? 'bg-[#1A1A1A] hover:bg-black text-white'
                      : 'bg-[#F9F8F6] border border-[#E0DED7] hover:border-black text-black'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {selectedJob.isTracked ? 'Tracked Application' : 'Track This Job'}
                </button>
                <button
                  onClick={() => onAnalyzeResumeMatch && onAnalyzeResumeMatch(selectedJob)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest rounded-sm transition bg-white border border-[#E0DED7] hover:border-black text-black"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  Analyze Match
                </button>
              </div>

              {/* Notes block */}
              <div className="space-y-2 pt-2 border-t border-[#E0DED7]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#999] block">Application Notes</h4>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="text-[10px] uppercase tracking-wider text-black hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
                <textarea
                  placeholder="e.g. Spoke with recruiter Sarah on July 7th. Follow up next Thursday."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full h-20 p-3 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs text-[#1A1A1A] outline-none resize-none transition"
                />
              </div>

              {/* Cover Letter Section */}
              <div className="space-y-4 pt-4 border-t border-[#E0DED7]">
                <div className="flex items-center gap-1.5 text-black">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black block">Gemini AI Cover Letter</h4>
                </div>

                {/* Input block for customized CV parameters */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Resume/Background Context</label>
                    <textarea
                      placeholder="Paste your key skills, past roles, or complete resume text to allow Gemini to precisely align your experience..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="w-full h-24 p-3 bg-[#F9F8F6] border border-[#E0DED7] focus:border-black rounded-sm text-xs text-gray-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Custom Instructions (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Keep it under 250 words, emphasize Node.js, friendly tone."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#E0DED7] focus:border-black rounded-sm text-xs text-gray-800"
                    />
                  </div>

                  <button
                    onClick={handleGenerateLetter}
                    disabled={isGenerating}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-none transition"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate AI Draft
                  </button>
                </div>

                {/* Render Cover Letter Result */}
                {generatedLetter && (
                  <div className="space-y-2 pt-2 border-t border-[#E0DED7]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Generated Letter</span>
                      <button
                        onClick={handleCopyLetter}
                        className="text-[10px] uppercase tracking-wider text-black hover:underline font-bold inline-flex items-center gap-1 px-2.5 py-1 bg-[#F9F8F6] border border-[#E0DED7] rounded-sm hover:bg-[#F2F1EC] transition"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy Draft'}
                      </button>
                    </div>
                    <div className="p-4 bg-[#F9F8F6] border border-[#E0DED7] rounded-sm max-h-60 overflow-y-auto text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedLetter}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#F9F8F6] rounded-sm border border-dashed border-[#E0DED7] p-8 text-center sticky top-4" id="empty-details">
              <FileText className="w-8 h-8 text-[#999] mx-auto mb-3" />
              <h4 className="font-serif italic font-bold text-[#1A1A1A] text-lg">Select a Curated Post</h4>
              <p className="text-xs text-[#666] mt-1 font-medium leading-relaxed">Click any job on the left feed to open live tracking, custom application notes, and the Gemini AI workspace.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

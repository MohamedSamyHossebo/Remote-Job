import { useState, useEffect } from 'react';
import { SavedSearch, Job, TelegramConfig } from './types';
import SearchSettings from './components/SearchSettings';
import JobFeed from './components/JobFeed';
import TrackedBoard from './components/TrackedBoard';
import ResumeMatcher from './components/ResumeMatcher';
import { 
  Briefcase, Bell, Settings, Layers, Search, 
  Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  TrendingUp, Compass, ArrowUpRight, FileText
} from 'lucide-react';

export default function App() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    isEnabled: false
  });
  const [geminiKeyInfo, setGeminiKeyInfo] = useState<{ hasKey: boolean; maskedKey: string }>({
    hasKey: false,
    maskedKey: ''
  });

  const [activeTab, setActiveTab] = useState<'feed' | 'board' | 'monitors' | 'resume'>('feed');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);
  const [selectedJobForResumeMatch, setSelectedJobForResumeMatch] = useState<Job | null>(null);

  // Load everything from APIs on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [searchesRes, jobsRes, tgRes, keyRes] = await Promise.all([
        fetch('/api/searches').then(r => r.json()),
        fetch('/api/jobs').then(r => r.json()),
        fetch('/api/telegram-config').then(r => r.json()),
        fetch('/api/gemini-key').then(r => r.json())
      ]);

      if (Array.isArray(searchesRes)) setSearches(searchesRes);
      if (Array.isArray(jobsRes)) setJobs(jobsRes);
      if (tgRes) setTelegramConfig(tgRes);
      if (keyRes) setGeminiKeyInfo(keyRes);
    } catch (err) {
      console.error("Failed to load initial full-stack database state:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Saved Searches Actions
  const handleAddSearch = async (newSearch: Omit<SavedSearch, 'id' | 'lastRun' | 'error'>) => {
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSearch)
      });
      const created = await res.json();
      setSearches(prev => [...prev, created]);
    } catch (err) {
      console.error("Failed to append search:", err);
    }
  };

  const handleDeleteSearch = async (id: string) => {
    try {
      await fetch(`/api/searches/${id}`, { method: 'DELETE' });
      setSearches(prev => prev.filter(s => s.id !== id));
      // Refresh jobs since the backend cleans up untracked jobs from deleted searches
      const jobsRes = await fetch('/api/jobs').then(r => r.json());
      if (Array.isArray(jobsRes)) setJobs(jobsRes);
    } catch (err) {
      console.error("Failed to delete search:", err);
    }
  };

  const handleRunSearch = async (id: string) => {
    try {
      const res = await fetch(`/api/searches/${id}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // Refresh full dataset
        const jobsRes = await fetch('/api/jobs').then(r => r.json());
        if (Array.isArray(jobsRes)) setJobs(jobsRes);
        
        // Refresh searches lastRun field
        const searchesRes = await fetch('/api/searches').then(r => r.json());
        if (Array.isArray(searchesRes)) setSearches(searchesRes);
      } else if (data.error) {
        alert(`Failed manually scraping: ${data.error}`);
      }
    } catch (err) {
      console.error("Manual scrape execution error:", err);
    }
  };

  const handleRunAllSearches = async () => {
    try {
      const res = await fetch('/api/searches/run-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const [searchesRes, jobsRes] = await Promise.all([
          fetch('/api/searches').then(r => r.json()),
          fetch('/api/jobs').then(r => r.json())
        ]);
        if (Array.isArray(searchesRes)) setSearches(searchesRes);
        if (Array.isArray(jobsRes)) setJobs(jobsRes);
      }
    } catch (err) {
      console.error("Bulk manual run execution error:", err);
    }
  };

  // Job Actions
  const handleTrackJob = async (id: string, isTracked: boolean) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTracked, status: isTracked ? 'Bookmarked' : undefined })
      });
      const updated = await res.json();
      setJobs(prev => prev.map(j => j.id === id ? updated : j));
    } catch (err) {
      console.error("Failed tracking status update:", err);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      const updated = await res.json();
      setJobs(prev => prev.map(j => j.id === id ? updated : j));
    } catch (err) {
      console.error("Failed updating job notes:", err);
    }
  };

  const handleUpdateJobStatus = async (id: string, status: Job['status']) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const updated = await res.json();
      setJobs(prev => prev.map(j => j.id === id ? updated : j));
    } catch (err) {
      console.error("Failed tracking status update:", err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(j => j.id !== id));
      if (selectedJobForDetail?.id === id) {
        setSelectedJobForDetail(null);
      }
    } catch (err) {
      console.error("Failed deleting job posting:", err);
    }
  };

  // Telegram Alerts Config Actions
  const handleUpdateTelegram = async (config: TelegramConfig) => {
    try {
      const res = await fetch('/api/telegram-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const saved = await res.json();
      setTelegramConfig(saved);
    } catch (err) {
      console.error("Failed saving telegram settings:", err);
    }
  };

  const handleTestTelegram = async (token: string, chatId: string) => {
    try {
      const res = await fetch('/api/telegram-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token, chatId })
      });
      return await res.json();
    } catch (err) {
      console.error("Failed sending telegram test:", err);
      return { error: 'Failed sending network test' };
    }
  };

  const handleUpdateGeminiKey = async (key: string) => {
    try {
      const res = await fetch('/api/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: key })
      });
      const data = await res.json();
      if (data.success) {
        const updated = await fetch('/api/gemini-key').then(r => r.json());
        setGeminiKeyInfo(updated);
      }
    } catch (err) {
      console.error("Failed saving custom Gemini key:", err);
    }
  };

  // Cover Letter generation with Express-Gemini proxy
  const handleGenerateCoverLetter = async (jobId: string, resumeText: string, instructions: string): Promise<string> => {
    const res = await fetch('/api/generate-cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, userResumeText: resumeText, additionalInstructions: instructions })
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    // Update local jobs dataset with newly generated letter
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, coverLetter: data.coverLetter } : j));
    return data.coverLetter;
  };

  // Helper to trigger job detail drawer from Kanban board
  const handleOpenJobDetail = (job: Job) => {
    setSelectedJobForDetail(job);
    setActiveTab('feed'); // Slide to Feed view where detail drawer lives
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans selection:bg-[#E0DED7] selection:text-black" id="app-root-layout">
      {/* Editorial Navigation Hub */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E0DED7] shadow-sm" id="nav-hub">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo/Name */}
            <div className="flex items-center gap-4" id="brand-logo">
              <span className="font-serif italic text-2xl font-black tracking-tighter">Echo.Logic</span>
              <div className="hidden sm:block h-4 w-[1px] bg-[#E0DED7]"></div>
              <p className="hidden sm:block text-[9px] font-bold text-[#666] uppercase tracking-[0.2em] font-sans">Remote Job Monitor</p>
            </div>

            {/* Live Navigation Tabs */}
            <div className="flex items-center gap-1.5" id="nav-tabs-group">
              <button
                onClick={() => { setActiveTab('feed'); setSelectedJobForDetail(null); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-150 border-b-2 ${
                  activeTab === 'feed'
                    ? 'border-[#1A1A1A] text-black'
                    : 'border-transparent text-[#666] hover:text-black'
                }`}
                id="tab-feed-btn"
              >
                <Compass className="w-3.5 h-3.5" />
                Live Feed
              </button>
              <button
                onClick={() => setActiveTab('board')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-150 border-b-2 ${
                  activeTab === 'board'
                    ? 'border-[#1A1A1A] text-black'
                    : 'border-transparent text-[#666] hover:text-black'
                }`}
                id="tab-board-btn"
              >
                <Layers className="w-3.5 h-3.5" />
                Hiring Pipeline
              </button>
              <button
                onClick={() => setActiveTab('monitors')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-150 border-b-2 ${
                  activeTab === 'monitors'
                    ? 'border-[#1A1A1A] text-black'
                    : 'border-transparent text-[#666] hover:text-black'
                }`}
                id="tab-monitors-btn"
              >
                <Settings className="w-3.5 h-3.5" />
                Alerts Node
              </button>
              <button
                onClick={() => setActiveTab('resume')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-150 border-b-2 ${
                  activeTab === 'resume'
                    ? 'border-[#1A1A1A] text-black'
                    : 'border-transparent text-[#666] hover:text-black'
                }`}
                id="tab-resume-btn"
              >
                <FileText className="w-3.5 h-3.5" />
                Resume Matcher
              </button>
            </div>

            {/* Quick Actions / Indicators */}
            <div className="flex items-center gap-3" id="quick-indicators">
              <button
                onClick={handleRefreshFeed}
                disabled={isRefreshing}
                className="p-2 text-[#666] hover:text-black hover:bg-[#F9F8F6] rounded-sm border border-transparent hover:border-[#E0DED7] transition duration-150"
                title="Refresh datasets"
                id="refresh-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              {telegramConfig.isEnabled && telegramConfig.botToken && telegramConfig.chatId ? (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 text-[10px] font-bold uppercase tracking-wider rounded-sm leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Telegram Active
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="main-content-layout">
        {/* Banner Alert if API key is not supplied (informational guidance) */}
        {!process.env.GEMINI_API_KEY && (
          <div className="bg-[#FFFDF5] border border-amber-200 p-4 rounded-sm flex items-start gap-3 text-[#5A4515]" id="apikey-warning-banner">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Gemini API Key missing or unavailable</p>
              <p>The system needs a valid Gemini key to activate Google Search grounding scraping and cover letter generation. Go to <b>Settings &gt; Secrets</b> to inject your <code>GEMINI_API_KEY</code>.</p>
            </div>
          </div>
        )}

        {/* Editorial Style Header */}
        <div className="border-b border-[#E0DED7] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6" id="greeting-banner">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-[#666]">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Scraper Engine v2.4
            </div>
            <h2 className="text-4xl sm:text-5xl font-serif italic font-medium leading-none tracking-tight text-brand-dark">Curated Opportunities.</h2>
            <p className="text-xs text-[#666] leading-relaxed max-w-xl font-medium tracking-wide">
              Monitoring Indeed & LinkedIn for remote software engineering roles, managing active applications, and crafting bespoke cover letters.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex gap-4" id="metrics-grid">
            <div className="bg-white border border-[#E0DED7] px-4 py-2.5 rounded-sm text-center min-w-[90px] shadow-sm">
              <p className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Found</p>
              <p className="text-xl font-serif italic mt-0.5 font-bold">{jobs.length}</p>
            </div>
            <div className="bg-white border border-[#E0DED7] px-4 py-2.5 rounded-sm text-center min-w-[90px] shadow-sm">
              <p className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Tracked</p>
              <p className="text-xl font-serif italic mt-0.5 font-bold">{jobs.filter(j => j.isTracked).length}</p>
            </div>
            <div className="bg-white border border-[#E0DED7] px-4 py-2.5 rounded-sm text-center min-w-[90px] shadow-sm">
              <p className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Queries</p>
              <p className="text-xl font-serif italic mt-0.5 font-bold">{searches.length}</p>
            </div>
          </div>
        </div>


        {/* Central Router State View */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3" id="loading-fallback">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Retrieving remote jobs database...</p>
          </div>
        ) : (
          <div id="active-tab-render-wrapper">
            {activeTab === 'feed' && (
              <JobFeed
                jobs={jobs}
                searches={searches}
                onTrackJob={handleTrackJob}
                onDeleteJob={handleDeleteJob}
                onGenerateCoverLetter={handleGenerateCoverLetter}
                onUpdateNotes={handleUpdateNotes}
                onAnalyzeResumeMatch={(job) => {
                  setSelectedJobForResumeMatch(job);
                  setActiveTab('resume');
                }}
              />
            )}

            {activeTab === 'board' && (
              <TrackedBoard
                jobs={jobs}
                onUpdateStatus={handleUpdateJobStatus}
                onDeleteJob={handleDeleteJob}
                onTrackJob={handleTrackJob}
                onOpenJobDetail={handleOpenJobDetail}
              />
            )}

            {activeTab === 'monitors' && (
              <SearchSettings
                searches={searches}
                telegramConfig={telegramConfig}
                geminiKeyInfo={geminiKeyInfo}
                onAddSearch={handleAddSearch}
                onDeleteSearch={handleDeleteSearch}
                onRunSearch={handleRunSearch}
                onRunAllSearches={handleRunAllSearches}
                onUpdateTelegram={handleUpdateTelegram}
                onTestTelegram={handleTestTelegram}
                onUpdateGeminiKey={handleUpdateGeminiKey}
              />
            )}

            {activeTab === 'resume' && (
              <ResumeMatcher
                jobs={jobs}
                preselectedJob={selectedJobForResumeMatch}
                onClearPreselected={() => setSelectedJobForResumeMatch(null)}
              />
            )}
          </div>
        )}
      </main>

      {/* Aesthetic Footer */}
      <footer className="bg-white border-t border-[#E0DED7] py-10 mt-16" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#666] uppercase tracking-wider font-semibold">
          <p>© 2026 Remote Scraper Echo.Logic. Grounded with Google Search.</p>
          <div className="flex gap-4">
            <a href="https://telegram.org" target="_blank" className="hover:text-black transition-colors">Telegram Bot API</a>
            <span className="text-[#E0DED7]">•</span>
            <a href="https://ai.google.dev" target="_blank" className="hover:text-black transition-colors inline-flex items-center gap-0.5 text-blue-600 font-bold">Powered by Google Gemini <ArrowUpRight className="w-3 h-3" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

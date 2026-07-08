import React, { useState } from 'react';
import { SavedSearch, TelegramConfig } from '../types';
import { 
  Plus, Play, Trash2, Bell, Send, Check, AlertTriangle, 
  Sparkles, Loader2, DollarSign, Tag, CheckCircle2, Key 
} from 'lucide-react';

interface SearchSettingsProps {
  searches: SavedSearch[];
  telegramConfig: TelegramConfig;
  geminiKeyInfo: { hasKey: boolean; maskedKey: string };
  onAddSearch: (search: Omit<SavedSearch, 'id' | 'lastRun' | 'error'>) => Promise<void>;
  onDeleteSearch: (id: string) => Promise<void>;
  onRunSearch: (id: string) => Promise<void>;
  onRunAllSearches: () => Promise<void>;
  onUpdateTelegram: (config: TelegramConfig) => Promise<void>;
  onTestTelegram: (token: string, chatId: string) => Promise<unknown>;
  onUpdateGeminiKey: (key: string) => Promise<void>;
}

export default function SearchSettings({
  searches,
  telegramConfig,
  geminiKeyInfo,
  onAddSearch,
  onDeleteSearch,
  onRunSearch,
  onRunAllSearches,
  onUpdateTelegram,
  onTestTelegram,
  onUpdateGeminiKey
}: SearchSettingsProps) {
  // New Search State
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<SavedSearch['roleType']>('front-end');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [tagInput, setTagInput] = useState('');
  const [stackPreference, setStackPreference] = useState<string[]>(['React', 'TypeScript']);
  const [isAdding, setIsAdding] = useState(false);

  // Telegram Settings State
  const [botToken, setBotToken] = useState(telegramConfig.botToken || '');
  const [chatId, setChatId] = useState(telegramConfig.chatId || '');
  const [tgEnabled, setTgEnabled] = useState(telegramConfig.isEnabled || false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestMessage, setTgTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Loading States for individual searches
  const [runningSearches, setRunningSearches] = useState<Record<string, boolean>>({});
  const [runningAll, setRunningAll] = useState(false);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagInput.trim();
    if (clean && !stackPreference.includes(clean)) {
      setStackPreference([...stackPreference, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setStackPreference(stackPreference.filter(t => t !== tag));
  };

  const handleSubmitSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsAdding(true);
    try {
      await onAddSearch({
        name: name.trim(),
        roleType,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        stackPreference,
        isActive: true
      });
      setName('');
      setSalaryMin('');
      setStackPreference(['React', 'TypeScript']);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRunSearch = async (id: string) => {
    setRunningSearches(prev => ({ ...prev, [id]: true }));
    try {
      await onRunSearch(id);
    } finally {
      setRunningSearches(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await onRunAllSearches();
    } finally {
      setRunningAll(false);
    }
  };

  const handleSaveTelegram = async () => {
    setTgSaving(true);
    try {
      await onUpdateTelegram({
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        isEnabled: tgEnabled
      });
    } finally {
      setTgSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!botToken || !chatId) {
      setTgTestMessage({ type: 'error', text: 'Token and Chat ID must be provided to test.' });
      return;
    }
    setTgTesting(true);
    setTgTestMessage(null);
    try {
      const res = await onTestTelegram(botToken.trim(), chatId.trim()) as any;
      if (res && res.error) {
        setTgTestMessage({ type: 'error', text: res.error });
      } else {
        setTgTestMessage({ type: 'success', text: 'Test message sent successfully!' });
      }
    } catch (err: any) {
      setTgTestMessage({ type: 'error', text: err.message || 'Transmission failed.' });
    } finally {
      setTgTesting(false);
    }
  };

  // Gemini API Key State & Handlers
  const [customKey, setCustomKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState(false);

  const handleSaveKey = async () => {
    if (!customKey.trim()) return;
    setIsSavingKey(true);
    setKeySuccess(false);
    try {
      await onUpdateGeminiKey(customKey.trim());
      setCustomKey('');
      setKeySuccess(true);
      setTimeout(() => setKeySuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleClearKey = async () => {
    setIsSavingKey(true);
    setKeySuccess(false);
    try {
      await onUpdateGeminiKey('');
      setCustomKey('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="search-settings-container">
      {/* Left 2 Columns: Saved Searches */}
      <div className="lg:col-span-2 space-y-8" id="saved-searches-column">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-sm border border-[#E0DED7] shadow-sm" id="searches-header">
          <div>
            <h2 className="text-xl font-serif italic font-bold text-[#1A1A1A] tracking-tight">Saved Job Monitors</h2>
            <p className="text-xs text-[#666] mt-1 font-medium">Configure queries to scrape LinkedIn and Indeed remotely.</p>
          </div>
          <button
            onClick={handleRunAll}
            disabled={runningAll || searches.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-[10px] uppercase tracking-widest rounded-none transition duration-150 shadow-sm"
            id="run-all-scrapers-button"
          >
            {runningAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Run All Monitors Now
          </button>
        </div>

        {/* Existing Monitors List */}
        <div className="space-y-4" id="saved-searches-list">
          {searches.length === 0 ? (
            <div className="bg-[#F9F8F6] rounded-sm border border-dashed border-[#E0DED7] p-12 text-center" id="empty-searches">
              <Bell className="w-8 h-8 text-[#999] mx-auto mb-3" />
              <h3 className="font-serif italic font-bold text-[#1A1A1A] text-lg">No Job Monitors Set Up</h3>
              <p className="text-xs text-[#666] mt-1 max-w-sm mx-auto font-medium">Create a monitor below to start retrieving remote frontend & backend roles hourly.</p>
            </div>
          ) : (
            searches.map((search) => (
              <div 
                key={search.id} 
                className="bg-white p-6 rounded-sm border border-[#E0DED7] shadow-sm hover:border-black transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-6"
                id={`search-card-${search.id}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">{search.name}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 bg-[#F5F5F5] text-[9px] font-bold uppercase tracking-widest text-[#1A1A1A] border border-[#E0DED7] rounded-sm">
                      {search.roleType}
                    </span>
                    {search.isActive ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#F9F8F6] text-[#666] text-[9px] font-bold uppercase tracking-wider border border-[#E0DED7] rounded-sm">Disabled</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#666] font-medium">
                    {search.salaryMin && (
                      <span className="flex items-center gap-1 font-serif italic text-sm text-blue-600 normal-case">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        Min: ${search.salaryMin.toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-[#999] font-bold">
                      <span>Stack Preference:</span>
                      {search.stackPreference.length === 0 ? 'Any' : (
                        <span className="flex gap-1.5 lowercase">
                          {search.stackPreference.map(tag => (
                            <code key={tag} className="px-1.5 py-0.5 bg-[#F9F8F6] text-[#555] font-mono text-[9px] rounded-sm border border-[#E0DED7] uppercase tracking-wider">{tag}</code>
                          ))}
                        </span>
                      )}
                    </span>
                  </div>

                  {search.lastRun && (
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[#999] flex items-center gap-1">
                      <span>Last run: {new Date(search.lastRun).toLocaleString()}</span>
                      {search.error && (
                        <span className="text-red-500 flex items-center gap-0.5 ml-2">
                          <AlertTriangle className="w-3 h-3" /> Error: {search.error}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => handleRunSearch(search.id)}
                    disabled={runningSearches[search.id] || runningAll}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F9F8F6] border border-[#E0DED7] hover:border-black text-black font-bold text-[10px] uppercase tracking-widest rounded-sm transition duration-150"
                    title="Scrape manually now"
                    id={`run-search-btn-${search.id}`}
                  >
                    {runningSearches[search.id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Scrape Now
                  </button>
                  <button
                    onClick={() => onDeleteSearch(search.id)}
                    className="p-2 text-[#999] hover:text-red-600 hover:bg-red-50 rounded-sm transition duration-150"
                    title="Delete Monitor"
                    id={`delete-search-btn-${search.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create New Monitor Form */}
        <div className="bg-white p-8 rounded-sm border border-[#E0DED7] shadow-sm space-y-6" id="add-search-form-card">
          <div>
            <h3 className="text-lg font-serif italic font-bold text-[#1A1A1A]">Create Custom Scrape Monitor</h3>
            <p className="text-xs text-[#666] mt-1 font-medium">Specify parameters to find highly targetable remote positions.</p>
          </div>

          <form onSubmit={handleSubmitSearch} className="space-y-5" id="new-monitor-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">Monitor Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote NextJS Backend Engineer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs transition duration-150 text-gray-900 outline-none"
                  id="search-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">Role Category</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as SavedSearch['roleType'])}
                  className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs transition duration-150 text-[#1A1A1A] outline-none"
                  id="search-role-type-select"
                >
                  <option value="front-end">Front-End Developer</option>
                  <option value="back-end">Back-End Developer</option>
                  <option value="full-stack">Full-Stack Developer</option>
                  <option value="general">Software Engineer (General)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">Min Salary Requirement ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 110000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs transition duration-150 text-gray-900 outline-none"
                  id="search-salary-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">Stack Preferences</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Docker, GraphQL"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(e))}
                    className="flex-1 px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs transition duration-150 text-gray-900 outline-none"
                    id="search-tag-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-[#F9F8F6] border border-[#E0DED7] hover:border-black text-[#1A1A1A] font-bold text-[10px] uppercase tracking-widest rounded-sm transition duration-150"
                    id="add-tag-btn"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Current Stack Preference Tags */}
            {stackPreference.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2" id="new-search-tags-container">
                {stackPreference.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#E0DED7] text-[#555] text-xs font-semibold rounded-sm font-mono uppercase tracking-wider"
                    id={`tag-preference-${tag}`}
                  >
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[#999] hover:text-black transition text-sm leading-none ml-1 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isAdding || !name.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-[10px] uppercase tracking-widest rounded-none transition duration-150 shadow-sm"
              id="submit-new-monitor-btn"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Scrape Monitor Node
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: API & Alerts Configuration */}
      <div className="space-y-8 lg:col-span-1" id="config-sidebar-column">
        {/* Gemini API Key Block */}
        <div className="bg-white p-8 rounded-sm border border-[#E0DED7] shadow-sm space-y-6" id="gemini-key-card">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E0DED7]">
            <div className="p-2.5 bg-[#F9F8F6] text-black border border-[#E0DED7] rounded-sm">
              <Key className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-serif italic font-bold text-[#1A1A1A]">Gemini API Key</h3>
              <p className="text-xs text-[#666] mt-0.5">Custom key to bypass global quota limits.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">API Key Input</label>
              <input
                type="password"
                placeholder={geminiKeyInfo.hasKey ? `Active Masked Key: ${geminiKeyInfo.maskedKey}` : "AIzaSy..."}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs font-mono transition duration-150 text-gray-900 outline-none"
                id="gemini-key-input"
              />
              {geminiKeyInfo.hasKey && (
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Custom API Key loaded and active.
                </p>
              )}
            </div>

            {keySuccess && (
              <div className="p-3.5 rounded-sm text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" id="key-success-feedback">
                Gemini API Key updated successfully! Your active scrape engines are now running under your custom quota.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={isSavingKey || !customKey.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-black hover:bg-neutral-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-none transition shadow-sm disabled:opacity-50"
                id="save-key-btn"
              >
                {isSavingKey ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save API Key
              </button>
              {geminiKeyInfo.hasKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  disabled={isSavingKey}
                  className="inline-flex items-center justify-center px-4 py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-600 font-bold text-[10px] uppercase tracking-widest rounded-sm transition"
                  id="clear-key-btn"
                  title="Remove key & fall back to default"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-[#F9F8F6] border border-[#E0DED7] p-4 rounded-sm text-xs text-[#444] leading-relaxed space-y-1.5" id="gemini-key-instructions">
            <p className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[10px]">🔑 Need a free API key?</p>
            <p className="font-medium text-[#555]">
              Get your own developer API key for free from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Google AI Studio</a>. This will unlock unlimited crawls and high-craft resume alignment scores.
            </p>
          </div>
        </div>

        {/* Telegram Notification Setup */}
        <div className="bg-white p-8 rounded-sm border border-[#E0DED7] shadow-sm h-fit space-y-6" id="telegram-configuration-column">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E0DED7]">
            <div className="p-2.5 bg-[#F9F8F6] text-black border border-[#E0DED7] rounded-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif italic font-bold text-[#1A1A1A]">Hourly Alerts</h3>
              <p className="text-xs text-[#666] mt-0.5">Dispatches discoveries instantly.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#666]">Enable updates</span>
              <button
                onClick={() => setTgEnabled(!tgEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[#E0DED7] transition-colors duration-200 ease-in-out focus:outline-none ${
                  tgEnabled ? 'bg-black' : 'bg-neutral-200'
                }`}
                type="button"
                id="tg-enabled-toggle"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    tgEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">Bot Token</label>
              <input
                type="password"
                placeholder="e.g. 123456789:ABCdefGhI..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs font-mono transition duration-150 text-gray-900 outline-none"
                id="tg-bot-token-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block">Chat ID</label>
              <input
                type="text"
                placeholder="e.g. -100123456789 or 98765432"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2F1EC] focus:bg-white border border-[#E0DED7] focus:border-black rounded-sm text-xs font-mono transition duration-150 text-gray-900 outline-none"
                id="tg-chat-id-input"
              />
            </div>

            {tgTestMessage && (
              <div className="p-3.5 rounded-sm text-xs font-semibold bg-[#F9F8F6] text-[#1A1A1A] border border-[#E0DED7]" id="tg-test-feedback">
                {tgTestMessage.text}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestTelegram}
                disabled={tgTesting || !botToken || !chatId}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-[#F9F8F6] hover:bg-[#F2F1EC] text-black font-bold text-[10px] uppercase tracking-widest rounded-sm transition border border-[#E0DED7] disabled:opacity-50"
                id="tg-test-button"
              >
                {tgTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#999]" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-black" />
                )}
                Test Bot
              </button>
              <button
                onClick={handleSaveTelegram}
                disabled={tgSaving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-black hover:bg-neutral-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-none transition shadow-sm"
                id="tg-save-button"
              >
                {tgSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save Alert Config
              </button>
            </div>
          </div>

          {/* Informative Instructions */}
          <div className="bg-[#F9F8F6] border border-[#E0DED7] p-4 rounded-sm text-xs text-[#444] leading-relaxed space-y-2" id="telegram-instructions">
            <p className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[10px]">💡 How to configure Telegram:</p>
            <ol className="list-decimal pl-4 space-y-1 font-medium text-[#555]">
              <li>Search Telegram for <b>@BotFather</b> and hit start.</li>
              <li>Send <code>/newbot</code> to BotFather and complete instructions to get your <b>Bot Token</b>.</li>
              <li>Search Telegram for <b>@userinfobot</b>, launch it, and retrieve your numerical <b>Chat ID</b>.</li>
              <li>Send any initial message to your new bot to initialize the chat, then click <b>Test Bot</b> above!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

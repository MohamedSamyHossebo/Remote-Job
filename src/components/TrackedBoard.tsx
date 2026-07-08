import React, { useState } from 'react';
import { Job } from '../types';
import { 
  MapPin, DollarSign, ExternalLink, FileText, 
  Trash2, ChevronRight, Bookmark, ArrowRightLeft, 
  Award, MessageSquare, Info, Star, Archive, AlertCircle
} from 'lucide-react';

interface TrackedBoardProps {
  jobs: Job[];
  onUpdateStatus: (id: string, status: Job['status']) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onTrackJob: (id: string, isTracked: boolean) => Promise<void>;
  onOpenJobDetail: (job: Job) => void;
}

const STAGES: { id: Job['status']; name: string; color: string; bg: string; text: string }[] = [
  { id: 'Bookmarked', name: 'Saved / Bookmark', color: 'border-amber-200', bg: 'bg-amber-50/50', text: 'text-amber-800' },
  { id: 'Applied', name: 'Applied', color: 'border-blue-200', bg: 'bg-blue-50/50', text: 'text-blue-800' },
  { id: 'Interviewing', name: 'Interviewing', color: 'border-purple-200', bg: 'bg-purple-50/50', text: 'text-purple-800' },
  { id: 'Offered', name: 'Offered 🎉', color: 'border-emerald-200', bg: 'bg-emerald-50/50', text: 'text-emerald-800' },
  { id: 'Rejected', name: 'Archived / Rejected', color: 'border-rose-200', bg: 'bg-rose-50/50', text: 'text-rose-800' }
];

export default function TrackedBoard({
  jobs,
  onUpdateStatus,
  onDeleteJob,
  onTrackJob,
  onOpenJobDetail
}: TrackedBoardProps) {
  const trackedJobs = jobs.filter(j => j.isTracked);

  const handleMoveJob = async (jobId: string, currentStatus: Job['status'], direction: 'next' | 'prev') => {
    const currentIndex = STAGES.findIndex(s => s.id === currentStatus);
    let nextIndex = currentIndex + (direction === 'next' ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < STAGES.length) {
      await onUpdateStatus(jobId, STAGES[nextIndex].id);
    }
  };

  return (
    <div className="space-y-6" id="tracked-board-container">
      {/* Intro info box */}
      <div className="bg-white p-6 rounded-sm border border-[#E0DED7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="board-intro-card">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-[#1A1A1A] tracking-tight">Active Pipeline Node</h2>
          <p className="text-xs text-[#666] mt-1 font-medium">Manage statuses, log progress, and prepare custom notes as you move through recruiting funnels.</p>
        </div>
        <div className="flex gap-4" id="board-metrics">
          <div className="px-4 py-2 bg-white border border-[#E0DED7] rounded-sm text-center shadow-sm min-w-[90px]">
            <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Tracking</span>
            <p className="text-lg font-serif italic mt-0.5 font-bold text-black">{trackedJobs.length}</p>
          </div>
          <div className="px-4 py-2 bg-white border border-[#E0DED7] rounded-sm text-center shadow-sm min-w-[90px]">
            <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Interviews</span>
            <p className="text-lg font-serif italic mt-0.5 font-bold text-black">{trackedJobs.filter(j => j.status === 'Interviewing').length}</p>
          </div>
          <div className="px-4 py-2 bg-white border border-[#E0DED7] rounded-sm text-center shadow-sm min-w-[90px]">
            <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest">Offered</span>
            <p className="text-lg font-serif italic mt-0.5 font-bold text-black">{trackedJobs.filter(j => j.status === 'Offered').length}</p>
          </div>
        </div>
      </div>

      {/* Board Layout (horizontal columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start overflow-x-auto pb-4" id="kanban-columns-grid">
        {STAGES.map((stage) => {
          const stageJobs = trackedJobs.filter(j => j.status === stage.id);
          
          return (
            <div 
              key={stage.id} 
              className="rounded-sm border border-[#E0DED7] p-4 flex flex-col space-y-4 min-h-[500px] w-full xl:min-w-[220px] bg-white shadow-sm"
              id={`board-stage-col-${stage.id}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-[#E0DED7] pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1A1A1A]">
                  {stage.name}
                </span>
                <span className="px-2 py-0.5 bg-[#F9F8F6] border border-[#E0DED7] rounded-sm text-[10px] font-bold text-[#1A1A1A]">
                  {stageJobs.length}
                </span>
              </div>

              {/* Column Items */}
              <div className="space-y-3 flex-1 overflow-y-auto" id={`stage-jobs-list-${stage.id}`}>
                {stageJobs.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-center p-4 border border-dashed border-[#E0DED7] rounded-sm bg-[#F9F8F6]">
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-[#999]">Empty stage</p>
                  </div>
                ) : (
                  stageJobs.map((job) => (
                    <div 
                      key={job.id}
                      onClick={() => onOpenJobDetail(job)}
                      className="bg-[#F9F8F6] p-4 rounded-sm border border-[#E0DED7] hover:border-black transition cursor-pointer shadow-sm space-y-3 group relative"
                      id={`kanban-card-${job.id}`}
                    >
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-[#E0DED7] text-[9px] font-bold uppercase tracking-wider rounded-sm text-[#1A1A1A]">
                          {job.platform}
                        </span>
                        <h4 className="text-sm font-serif font-bold text-[#1A1A1A] group-hover:underline leading-snug">{job.title}</h4>
                        <p className="text-[10px] text-[#666] uppercase tracking-wide font-semibold">{job.company}</p>
                      </div>

                      <div className="space-y-1 text-[10px] uppercase tracking-wider font-semibold text-[#999]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#999]" />
                          {job.location}
                        </span>
                        {job.salaryRange && (
                          <span className="flex items-center gap-1 text-blue-600 font-serif italic text-xs normal-case tracking-normal">
                            <DollarSign className="w-3 h-3 text-blue-600" />
                            {job.salaryRange}
                          </span>
                        )}
                      </div>

                      {/* Display a small indicator if cover letter is generated or notes are present */}
                      {(job.coverLetter || job.notes) && (
                        <div className="flex gap-2 pt-1">
                          {job.coverLetter && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#E0DED7] text-[#555] text-[9px] font-semibold rounded-sm uppercase tracking-wider" title="Cover letter generated!">
                              <FileText className="w-2.5 h-2.5 text-blue-600" /> Letter
                            </span>
                          )}
                          {job.notes && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#E0DED7] text-[#555] text-[9px] font-semibold rounded-sm uppercase tracking-wider" title="Has notes">
                              <MessageSquare className="w-2.5 h-2.5 text-[#999]" /> Notes
                            </span>
                          )}
                        </div>
                      )}

                      {/* Column Navigation Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E0DED7]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveJob(job.id, job.status, 'prev')}
                            disabled={job.status === 'Bookmarked'}
                            className="p-1 hover:bg-white border border-transparent hover:border-[#E0DED7] disabled:opacity-30 rounded-sm text-[#999] hover:text-black transition text-xs"
                            title="Move to previous stage"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => handleMoveJob(job.id, job.status, 'next')}
                            disabled={job.status === 'Rejected'}
                            className="p-1 hover:bg-white border border-transparent hover:border-[#E0DED7] disabled:opacity-30 rounded-sm text-[#999] hover:text-black transition text-xs"
                            title="Move to next stage"
                          >
                            ▶
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onTrackJob(job.id, false)}
                            className="p-1 hover:bg-white border border-transparent hover:border-[#E0DED7] text-[#999] hover:text-black rounded-sm transition"
                            title="Remove from tracked board"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteJob(job.id)}
                            className="p-1 hover:bg-red-50 border border-transparent text-[#999] hover:text-red-600 rounded-sm transition"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

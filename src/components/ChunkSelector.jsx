import React from 'react';
import { Filter, Layers } from 'lucide-react';

export default function ChunkSelector({
  chunks,
  selectedChunk,
  setSelectedChunk,
  studyModeFilter,
  setStudyModeFilter,
  totalWords,
  currentChunkCount
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/20 border border-slate-800/80 space-y-3">
      {/* Chunk Select */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-grow">
          <label htmlFor="chunk-select" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Study Chunk Filter
          </label>
          <select
            id="chunk-select"
            value={selectedChunk}
            onChange={(e) => setSelectedChunk(e.target.value)}
            className="w-full bg-slate-900 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Active ({totalWords} words)</option>
            {chunks.map((chunkNum) => (
              <option key={chunkNum} value={chunkNum}>
                Chunk {chunkNum}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Status Filter */}
      <div className="space-y-1">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Card Status Filter
        </span>
        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          {[
            { value: 'ALL', label: 'All' },
            { value: 'NEW', label: 'New' },
            { value: 'STUDIED', label: 'Studied' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStudyModeFilter(option.value)}
              className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                studyModeFilter === option.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-205'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active set status info */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
        <Filter className="w-3.5 h-3.5 text-indigo-400" />
        <span>Active Set: <strong className="text-white">{currentChunkCount}</strong> cards</span>
      </div>
    </div>
  );
}

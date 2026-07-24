import React from 'react';
import { Filter, Layers, CheckCircle } from 'lucide-react';

export default function ChunkSelector({ chunks, selectedChunk, setSelectedChunk, totalWords, currentChunkCount }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <label htmlFor="chunk-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Study Chunk Filter
          </label>
          <div className="flex items-center gap-2">
            <select
              id="chunk-select"
              value={selectedChunk}
              onChange={(e) => setSelectedChunk(e.target.value)}
              className="bg-slate-900 text-white font-medium text-sm rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              <option value="ALL">All Chunks ({totalWords} words)</option>
              {chunks.map((chunkNum) => (
                <option key={chunkNum} value={chunkNum}>
                  Chunk {chunkNum}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-800">
        <Filter className="w-4 h-4 text-indigo-400" />
        <span>Active Set: <strong className="text-white">{currentChunkCount}</strong> cards</span>
      </div>
    </div>
  );
}

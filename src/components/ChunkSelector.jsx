import React, { useState, useRef, useEffect } from 'react';
import { Filter, Layers, ChevronDown } from 'lucide-react';

export default function ChunkSelector({
  chunks,
  selectedChunk,
  setSelectedChunk,
  studyModeFilter,
  setStudyModeFilter,
  totalWords,
  currentChunkCount
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close the custom dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (val) => {
    setSelectedChunk(val);
    setIsOpen(false);
  };

  const selectedLabel = selectedChunk === 'ALL'
    ? `All Active (${totalWords} words)`
    : `Chunk ${selectedChunk}`;

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/20 border border-slate-800/80 space-y-3 shrink-0">
      {/* Custom Chunk Dropdown Select */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        
        <div className="flex-grow relative" ref={dropdownRef}>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 select-none">
            Study Chunk Filter
          </label>
          
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between bg-slate-900 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-150 cursor-pointer"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto animate-fade-in scrollbar-thin">
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition duration-150 flex items-center justify-between ${
                  selectedChunk === 'ALL' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300'
                }`}
              >
                <span>All Active ({totalWords} words)</span>
              </button>
              {chunks.map((chunkNum) => (
                <button
                  key={chunkNum}
                  type="button"
                  onClick={() => handleSelect(chunkNum)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition duration-150 ${
                    selectedChunk === chunkNum ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300'
                  }`}
                >
                  Chunk {chunkNum}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Status Filter */}
      <div className="space-y-1">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
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

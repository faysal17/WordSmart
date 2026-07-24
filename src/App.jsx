import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Trophy, RotateCcw, AlertTriangle, CloudOff, Clock, CheckCircle, Flame, Brain } from 'lucide-react';
import { loadVocabularyCSV } from './utils/csvParser';
import { calculateSM2, sortCardsForStudySession, DEFAULT_SM2_CARD } from './utils/sm2';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Flashcard from './components/Flashcard';
import ChunkSelector from './components/ChunkSelector';
import StatsHeader from './components/StatsHeader';
import AuthModal from './components/AuthModal';
import SupabaseGuideModal from './components/SupabaseGuideModal';

export default function App() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // User Authentication & Cloud Progress
  const [user, setUser] = useState(null);
  const [userProgressMap, setUserProgressMap] = useState({});
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Card Status Filter & Session states
  const [studyModeFilter, setStudyModeFilter] = useState('ALL');
  const [sessionDeck, setSessionDeck] = useState([]);
  const [syncVersion, setSyncVersion] = useState(0);
  const [reviewedCardIds, setReviewedCardIds] = useState(new Set());

  // Unlocked chunks (active learning progression)
  const [unlockedChunks, setUnlockedChunks] = useState(() => {
    const saved = localStorage.getItem('wordsmart_unlocked_chunks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => a - b);
        }
      } catch (e) {
        console.error('Failed to parse local unlocked chunks:', e);
      }
    }
    return [1]; // Start with only Chunk 1 unlocked
  });

  // Sync unlocked chunks to cloud (Supabase)
  const syncUnlockedChunksToCloud = async (chunks) => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: '__unlocked_chunks__',
            status: chunks.join(','),
            repetitions: 0,
            interval: 0,
            ease_factor: 2.5,
            next_review_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,word_id' });
      } catch (err) {
        console.error('Failed to sync active chunks to cloud:', err);
      }
    }
  };

  const updateUnlockedChunks = (newChunks) => {
    const sorted = Array.from(new Set(newChunks)).sort((a, b) => a - b);
    setUnlockedChunks(sorted);
    localStorage.setItem('wordsmart_unlocked_chunks', JSON.stringify(sorted));
    syncUnlockedChunksToCloud(sorted);
  };

  const toggleChunkManual = (chunkNum) => {
    let next;
    if (unlockedChunks.includes(chunkNum)) {
      if (unlockedChunks.length === 1) return; // Prevent removing the last active chunk
      next = unlockedChunks.filter(c => c !== chunkNum);
    } else {
      next = [...unlockedChunks, chunkNum];
    }
    updateUnlockedChunks(next);
  };

  // Load CSV vocabulary on mount
  useEffect(() => {
    async function initData() {
      try {
        const loadedWords = await loadVocabularyCSV();
        setWords(loadedWords);
      } catch (err) {
        console.error('Failed to load CSV:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Listen to Supabase Auth state & load progress
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserProgressFromCloud(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserProgressFromCloud(session.user.id);
      } else {
        setUserProgressMap({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch progress from Supabase database
  const fetchUserProgressFromCloud = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user progress:', error);
        return;
      }

      if (data) {
        const progressMap = {};
        let cloudUnlocked = null;
        data.forEach(item => {
          if (item.word_id === '__unlocked_chunks__') {
            try {
              cloudUnlocked = item.status.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            } catch (e) {
              console.error('Failed to parse cloud unlocked chunks:', e);
            }
          } else {
            progressMap[item.word_id] = {
              repetitions: item.repetitions,
              interval: item.interval,
              easeFactor: item.ease_factor,
              lastReviewedDate: item.last_reviewed_date,
              nextReviewDate: item.next_review_date,
              status: item.status
            };
          }
        });
        setUserProgressMap(progressMap);
        if (cloudUnlocked && cloudUnlocked.length > 0) {
          const sorted = cloudUnlocked.sort((a, b) => a - b);
          setUnlockedChunks(sorted);
          localStorage.setItem('wordsmart_unlocked_chunks', JSON.stringify(sorted));
        } else {
          // Cloud has no unlocked chunks data yet, push local state to cloud
          syncUnlockedChunksToCloud(unlockedChunks);
        }
        setSyncVersion(v => v + 1);
      }
    } catch (err) {
      console.error('Cloud sync fetch error:', err);
    }
  };

  // Available unique chunks
  const availableChunks = useMemo(() => {
    const chunkSet = new Set(words.map(w => w.chunk));
    return Array.from(chunkSet).sort((a, b) => a - b);
  }, [words]);

  // Only consider words that belong to the active/unlocked chunks
  const activeUnloadedWords = useMemo(() => {
    return words.filter(w => unlockedChunks.includes(w.chunk));
  }, [words, unlockedChunks]);

  // Rebuild the session deck based on chosen chunk and status filter
  const rebuildSessionDeck = () => {
    // Only study active chunk words
    const chunkFiltered = selectedChunk === 'ALL'
      ? activeUnloadedWords
      : activeUnloadedWords.filter(w => w.chunk === parseInt(selectedChunk, 10));

    const statusFiltered = chunkFiltered.filter(w => {
      const prog = userProgressMap[w.id];
      const isNew = !prog || prog.repetitions === 0;
      if (studyModeFilter === 'NEW') return isNew;
      if (studyModeFilter === 'STUDIED') return !isNew;
      if (studyModeFilter === 'DUE') {
        const isDue = prog && new Date(prog.nextReviewDate).getTime() <= new Date().getTime();
        return !isNew && isDue;
      }
      return true;
    });

    const sorted = sortCardsForStudySession(statusFiltered, userProgressMap);
    setSessionDeck(sorted);
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewedCardIds(new Set());
  };

  // Rebuild session deck on filter, chunk, loading, identity, or unlocked chunks changes
  useEffect(() => {
    if (words.length > 0) {
      rebuildSessionDeck();
    }
  }, [words, selectedChunk, studyModeFilter, user, syncVersion, unlockedChunks]);

  // Reset selectedChunk dropdown if the selected chunk is no longer in unlockedChunks list
  useEffect(() => {
    if (selectedChunk !== 'ALL' && !unlockedChunks.includes(parseInt(selectedChunk, 10))) {
      setSelectedChunk('ALL');
    }
  }, [unlockedChunks, selectedChunk]);

  // Check if all active words have been studied at least once
  const hasLearnedActiveWords = useMemo(() => {
    if (activeUnloadedWords.length === 0) return false;
    return activeUnloadedWords.every(w => {
      const prog = userProgressMap[w.id];
      return prog && prog.repetitions > 0;
    });
  }, [activeUnloadedWords, userProgressMap]);

  // Find the next available locked chunk
  const nextAvailableChunk = useMemo(() => {
    return availableChunks.find(c => !unlockedChunks.includes(c)) || null;
  }, [availableChunks, unlockedChunks]);

  const handleUnlockNextChunk = () => {
    if (nextAvailableChunk) {
      updateUnlockedChunks([...unlockedChunks, nextAvailableChunk]);
    }
  };

  // Calculate average forgetting curve projection over a 7-day period
  const retentionCurveData = useMemo(() => {
    const points = [];
    const now = new Date();
    const totalCards = activeUnloadedWords.length || 1;

    // Project average retention from Today (Day 0) to Day 6
    for (let d = 0; d < 7; d++) {
      let sumRetention = 0;
      activeUnloadedWords.forEach(w => {
        const prog = userProgressMap[w.id];
        if (!prog || prog.repetitions === 0) {
          sumRetention += 0; // Unstudied cards have 0% retention
        } else {
          const lastDate = prog.lastReviewedDate ? new Date(prog.lastReviewedDate) : new Date();
          const elapsedMs = now.getTime() + d * 24 * 60 * 60 * 1000 - lastDate.getTime();
          const elapsedDays = Math.max(0, elapsedMs / (24 * 60 * 60 * 1000));
          const interval = prog.interval || 1;
          const strength = interval * 1.6;
          const ret = Math.exp(-elapsedDays / strength);
          sumRetention += ret;
        }
      });
      const avgRetention = Math.round((sumRetention / totalCards) * 100);
      points.push(avgRetention);
    }
    return points;
  }, [activeUnloadedWords, userProgressMap]);

  // Construct SVG paths for the retention line and gradient area
  const svgPaths = useMemo(() => {
    const W = 280;
    const H = 85;
    if (retentionCurveData.length === 0) return { line: '', fill: '' };

    let linePath = '';
    retentionCurveData.forEach((val, idx) => {
      const x = idx * (W / 6);
      const y = H - (val * (H / 100));
      if (idx === 0) {
        linePath += `M ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
      }
    });

    const fillPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;
    return { line: linePath, fill: fillPath };
  }, [retentionCurveData]);

  // Compute summary stats for the active vocabulary
  const activeStatsSummary = useMemo(() => {
    const total = activeUnloadedWords.length;
    const mastered = activeUnloadedWords.filter(w => {
      const p = userProgressMap[w.id];
      return p && p.status === 'mastered';
    }).length;
    const learning = activeUnloadedWords.filter(w => {
      const p = userProgressMap[w.id];
      return p && (p.status === 'learning' || p.status === 'review');
    }).length;
    const unseen = total - mastered - learning;
    const currentRetention = retentionCurveData[0] || 0;

    return {
      total,
      mastered,
      learning,
      unseen,
      currentRetention
    };
  }, [activeUnloadedWords, userProgressMap, retentionCurveData]);

  // Current Card
  const currentCard = sessionDeck[currentIndex] || null;
  const currentProgress = currentCard ? (userProgressMap[currentCard.id] || DEFAULT_SM2_CARD) : DEFAULT_SM2_CARD;

  // Grade card with SM-2 algorithm
  const handleGradeCard = async (grade) => {
    if (!currentCard) return;

    const updatedProg = calculateSM2(currentProgress, grade);

    // Update local state map immediately for instant UX feedback
    const updatedMap = {
      ...userProgressMap,
      [currentCard.id]: updatedProg
    };
    setUserProgressMap(updatedMap);

    // If user is authenticated & Supabase configured, save to cloud DB
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: currentCard.id,
            repetitions: updatedProg.repetitions,
            interval: updatedProg.interval,
            ease_factor: updatedProg.easeFactor,
            last_reviewed_date: updatedProg.lastReviewedDate,
            next_review_date: updatedProg.nextReviewDate,
            status: updatedProg.status,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,word_id' });
      } catch (err) {
        console.error('Failed to sync card progress to Supabase:', err);
      }
    }

    // Mark card as reviewed in this session
    setReviewedCardIds((prev) => {
      const next = new Set(prev);
      next.add(currentCard.id);
      return next;
    });

    // Advance or wrap around queue
    setIsFlipped(false);
    if (sessionDeck.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % sessionDeck.length);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setUserProgressMap({});
    }
  };

  // Dashboard Stats Computation
  const stats = useMemo(() => {
    const now = new Date().getTime();
    let dueToday = 0;
    let mastered = 0;
    let learning = 0;

    activeUnloadedWords.forEach(w => {
      const prog = userProgressMap[w.id];
      if (prog) {
        if (prog.status === 'mastered') mastered++;
        else if (prog.status === 'learning' || prog.status === 'review') learning++;

        if (new Date(prog.nextReviewDate).getTime() <= now) {
          dueToday++;
        }
      } else {
        // Unseen card counts as due for review if today's study queue
        dueToday++;
      }
    });

    const activeProgressCount = Object.keys(userProgressMap).filter(
      id => id !== '__unlocked_chunks__'
    ).length;

    return {
      dueToday,
      mastered,
      learning,
      streak: activeProgressCount > 0 ? 1 : 0
    };
  }, [activeUnloadedWords, userProgressMap]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider text-slate-400">Loading Vocabulary Deck...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 md:p-4 max-w-7xl mx-auto font-['Plus_Jakarta_Sans',sans-serif] lg:overflow-hidden">
      {/* HEADER & USER BAR */}
      <div className="shrink-0">
        <StatsHeader
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          onLogout={handleLogout}
        />

        {!user && !isSupabaseConfigured && (
          <div className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Demo Mode: Cloud sync is inactive. Configure Supabase environment variables to persist across devices.</span>
            </div>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition text-[10px]"
            >
              Guide
            </button>
          </div>
        )}
      </div>

      {/* THREE-COLUMN GRID LAYOUT */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch my-2 overflow-y-auto lg:overflow-hidden w-full">
        {/* Left Column: Stats & Filters (col-span-3) */}
        <div className="lg:col-span-3 lg:h-full flex flex-col justify-between p-4 rounded-2xl glass-panel overflow-hidden shrink-0 gap-4">
          <div className="space-y-4 flex flex-col overflow-hidden">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-base font-extrabold text-white leading-tight">{stats.dueToday}</div>
                  <div className="text-[9px] font-bold text-slate-400">Due Today</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-base font-extrabold text-white leading-tight">{stats.mastered}</div>
                  <div className="text-[9px] font-bold text-slate-400">Mastered</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-base font-extrabold text-white leading-tight">{stats.learning}</div>
                  <div className="text-[9px] font-bold text-slate-400">In Progress</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="text-base font-extrabold text-white leading-tight">{stats.streak} Days</div>
                  <div className="text-[9px] font-bold text-slate-400">Streak</div>
                </div>
              </div>
            </div>

            {/* Chunk Selector */}
            <ChunkSelector
              chunks={unlockedChunks}
              selectedChunk={selectedChunk}
              setSelectedChunk={setSelectedChunk}
              studyModeFilter={studyModeFilter}
              setStudyModeFilter={setStudyModeFilter}
              totalWords={activeUnloadedWords.length}
              currentChunkCount={sessionDeck.length}
            />
          </div>

          {/* Learning Progress / Retention Dashboard Card */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-col justify-between gap-2 overflow-hidden flex-grow">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Retention Rate</span>
              </h3>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                Avg: {activeStatsSummary.currentRetention}%
              </span>
            </div>

            {/* SVG Graph Area */}
            <div className="relative bg-slate-950/60 rounded-lg p-2 border border-slate-950 flex-grow flex items-center justify-center min-h-[90px] overflow-hidden">
              {activeUnloadedWords.length === 0 || activeStatsSummary.currentRetention === 0 ? (
                <div className="text-center text-[10px] text-slate-500 font-semibold py-6">
                  No vocabulary words learned yet.
                </div>
              ) : (
                <svg viewBox="0 0 280 85" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="retention-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="0" x2="280" y2="0" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                  <line x1="0" y1="42.5" x2="280" y2="42.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                  <line x1="0" y1="85" x2="280" y2="85" stroke="rgba(255,255,255,0.05)" />

                  {/* Shaded Area */}
                  {svgPaths.fill && (
                    <path d={svgPaths.fill} fill="url(#retention-grad)" />
                  )}

                  {/* Glowing Line Path */}
                  {svgPaths.line && (
                    <path
                      d={svgPaths.line}
                      fill="none"
                      stroke="rgb(99, 102, 241)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-[0_0_4px_rgba(99,102,241,0.4)]"
                    />
                  )}

                  {/* SVG Dots on points */}
                  {retentionCurveData.map((val, idx) => {
                    const x = idx * (280 / 6);
                    const y = 85 - (val * (85 / 100));
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="rgb(99, 102, 241)"
                        stroke="#030712"
                        strokeWidth="1"
                        title={`Day ${idx}: ${val}%`}
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold px-1 shrink-0">
              <span>Today</span>
              <span>Day 3</span>
              <span>Day 6</span>
            </div>

            {/* Legend details */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-400 font-semibold pt-1.5 border-t border-slate-900 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Mastered: <strong>{activeStatsSummary.mastered}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Review: <strong>{activeStatsSummary.learning}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                <span>Unseen: <strong>{activeStatsSummary.unseen}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>Retention: <strong>{activeStatsSummary.currentRetention}%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Card View (col-span-6) */}
        <div className="lg:col-span-6 lg:h-full flex flex-col justify-start items-center p-4 rounded-2xl glass-panel overflow-hidden shrink-0 gap-3 lg:pt-3">
          {currentCard ? (
            <div className="w-full flex flex-col justify-start items-center gap-3 animate-fade-in flex-grow">
              <div className="flex items-center justify-between w-full max-w-xl text-xs text-slate-400 px-2 shrink-0">
                <span className="font-semibold">Card {currentIndex + 1} of {sessionDeck.length}</span>
                <button
                  onClick={rebuildSessionDeck}
                  className="flex items-center gap-1 hover:text-indigo-400 transition text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart Queue
                </button>
              </div>

              {/* Numbered card navigation buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 py-1 w-full max-w-xl max-h-16 overflow-y-auto pr-1 shrink-0">
                {sessionDeck.map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isReviewed = reviewedCardIds.has(sessionDeck[idx].id);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsFlipped(false);
                      }}
                      className={`relative w-7 h-7 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-105 ring-1 ring-indigo-450/40'
                          : isReviewed
                          ? 'bg-slate-900/60 hover:bg-slate-800 text-emerald-400 border-emerald-500/40 hover:border-emerald-500/60'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {idx + 1}
                      {isReviewed && !isCurrent && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-950 transform translate-x-1/4 -translate-y-1/4" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="w-full shrink-0 flex-grow flex items-center justify-center">
                <Flashcard
                  card={currentCard}
                  progress={currentProgress}
                  onGradeCard={handleGradeCard}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                />
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-900/10 border border-slate-800/40 text-center space-y-4 max-w-md mx-auto my-auto shadow-xl shrink-0">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">All Cards Completed!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You have reviewed all cards in this chunk for today. Great job maintaining your recall!
              </p>
              
              {nextAvailableChunk ? (
                <div className="pt-3 border-t border-slate-800/80 mt-1 space-y-2.5">
                  <p className="text-[11px] text-indigo-300 font-semibold leading-relaxed">
                    You have finished studying all active cards. Ready to expand your learning?
                  </p>
                  <button
                    onClick={handleUnlockNextChunk}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                  >
                    Unlock & Add Chunk {nextAvailableChunk}
                  </button>
                </div>
              ) : (
                <button
                  onClick={rebuildSessionDeck}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
                >
                  Review Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Chunk Manager (col-span-3) */}
        <div className="lg:col-span-3 lg:h-full flex flex-col justify-between p-4 rounded-2xl glass-panel overflow-hidden shrink-0 gap-3">
          <div className="flex flex-col overflow-hidden flex-grow">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between shrink-0 mb-1">
              <span>Learning Chunk Manager</span>
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                {unlockedChunks.length} Active
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed shrink-0 mb-2">
              Select chunks to include in your active study sessions.
            </p>
            
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 overflow-y-auto pr-1 flex-grow scrollbar-thin">
              {availableChunks.map((chunkNum) => {
                const isUnlocked = unlockedChunks.includes(chunkNum);
                return (
                  <label
                    key={chunkNum}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all duration-200 select-none ${
                      isUnlocked
                        ? 'bg-indigo-600/15 border-indigo-500/20 text-white'
                        : 'bg-slate-900/40 border-slate-800/40 text-slate-500 hover:text-slate-355 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isUnlocked}
                      onChange={() => toggleChunkManual(chunkNum)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3 h-3 cursor-pointer shrink-0"
                    />
                    <span>Chunk {chunkNum}</span>
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className="flex gap-2 pt-1 border-t border-slate-800 shrink-0">
            <button
              onClick={() => updateUnlockedChunks(availableChunks)}
              className="flex-1 py-1.5 text-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 transition"
            >
              Select All
            </button>
            <button
              onClick={() => updateUnlockedChunks([1])}
              className="flex-1 py-1.5 text-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 transition"
            >
              Reset to 1
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center text-[11px] text-slate-500 py-2.5 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <p>WordSmart Vocabulary Trainer • Powered by SM-2 Algorithm</p>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsGuideModalOpen(true)} className="hover:text-slate-300 transition">
            Supabase Setup Guide
          </button>
          <span>•</span>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-slate-300 transition">
            Account Sync
          </button>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          if (authUser) fetchUserProgressFromCloud(authUser.id);
        }}
      />

      <SupabaseGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}

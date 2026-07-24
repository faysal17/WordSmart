import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, RotateCcw, AlertTriangle, CloudOff } from 'lucide-react';
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
        data.forEach(item => {
          progressMap[item.word_id] = {
            repetitions: item.repetitions,
            interval: item.interval,
            easeFactor: item.ease_factor,
            lastReviewedDate: item.last_reviewed_date,
            nextReviewDate: item.next_review_date,
            status: item.status
          };
        });
        setUserProgressMap(progressMap);
      }
    } catch (err) {
      console.error('Cloud sync fetch error:', err);
    }
  };

  // Filter words by selected chunk
  const filteredWords = useMemo(() => {
    if (selectedChunk === 'ALL') return words;
    return words.filter(w => w.chunk === parseInt(selectedChunk, 10));
  }, [words, selectedChunk]);

  // Sort queue by SM-2 priority (Due > Unseen > Learning/Review)
  const activeDeck = useMemo(() => {
    return sortCardsForStudySession(filteredWords, userProgressMap);
  }, [filteredWords, userProgressMap]);

  // Reset index on deck / chunk change
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedChunk]);

  // Available unique chunks
  const availableChunks = useMemo(() => {
    const chunkSet = new Set(words.map(w => w.chunk));
    return Array.from(chunkSet).sort((a, b) => a - b);
  }, [words]);

  // Current Card
  const currentCard = activeDeck[currentIndex] || null;
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

    // Trigger celebration on Easy or Mastered status
    if (grade === 5 || updatedProg.status === 'mastered') {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    // Advance to next card in deck
    setIsFlipped(false);
    if (currentIndex < activeDeck.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop or finished session
      setCurrentIndex(0);
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

    words.forEach(w => {
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

    return {
      dueToday,
      mastered,
      learning,
      streak: Object.keys(userProgressMap).length > 0 ? 1 : 0
    };
  }, [words, userProgressMap]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 max-w-4xl mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* HEADER & USER BAR */}
      <div>
        <StatsHeader
          stats={stats}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          onLogout={handleLogout}
        />

        {!user && !isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Demo Mode: Cloud sync is inactive. Configure Supabase environment variables to persist across devices.</span>
            </div>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition"
            >
              Guide
            </button>
          </div>
        )}

        {/* CHUNK FILTERING */}
        <ChunkSelector
          chunks={availableChunks}
          selectedChunk={selectedChunk}
          setSelectedChunk={setSelectedChunk}
          totalWords={words.length}
          currentChunkCount={filteredWords.length}
        />
      </div>

      {/* CORE ACTIVE RECALL FLASHCARD */}
      <main className="my-8">
        {currentCard ? (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 max-w-xl mx-auto px-2 mb-2">
              <span>Card {currentIndex + 1} of {activeDeck.length}</span>
              <button
                onClick={() => { setCurrentIndex(0); setIsFlipped(false); }}
                className="flex items-center gap-1 hover:text-indigo-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart Queue
              </button>
            </div>

            <Flashcard
              card={currentCard}
              progress={currentProgress}
              onGradeCard={handleGradeCard}
              isFlipped={isFlipped}
              setIsFlipped={setIsFlipped}
            />
          </div>
        ) : (
          <div className="p-8 rounded-3xl glass-card text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">All Cards Completed!</h3>
            <p className="text-xs text-slate-400">
              You have reviewed all cards in this chunk for today. Great job maintaining your recall!
            </p>
            <button
              onClick={() => { setCurrentIndex(0); setIsFlipped(false); }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
            >
              Review Again
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
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

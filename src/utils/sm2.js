/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm Implementation
 * 
 * Performance Grades:
 * 2 - Hard: Incorrect or required extreme effort.
 * 4 - Good: Correct response after hesitation.
 * 5 - Easy: Perfect response with zero hesitation.
 * 
 * Default Parameters:
 * - Repetitions (n): 0
 * - Interval (I): 0 days
 * - Ease Factor (EF): 2.5
 */

export const DEFAULT_SM2_CARD = {
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
  nextReviewDate: new Date().toISOString(),
  lastReviewedDate: null,
  status: 'new' // 'new' | 'learning' | 'review' | 'mastered'
};

/**
 * Calculates next SM-2 state based on user performance rating
 * @param {Object} currentCard - Current SM-2 card state
 * @param {number} grade - Grade (2: Hard, 4: Good, 5: Easy)
 * @returns {Object} Updated SM-2 card state
 */
export function calculateSM2(currentCard = DEFAULT_SM2_CARD, grade) {
  let { repetitions = 0, interval = 0, easeFactor = 2.5 } = currentCard;

  // Grade must be 0..5. Map rating: Hard=2, Good=4, Easy=5
  const q = Math.max(0, Math.min(5, grade));

  // 1. Calculate new Ease Factor (EF)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEF = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) {
    newEF = 1.3; // Minimum ease factor limit per SM-2 standard
  }

  let newRepetitions = repetitions;
  let newInterval = interval;
  let newStatus = 'learning';

  if (q < 3) {
    // Hard / Failed: reset repetitions, review again tomorrow or same day
    newRepetitions = 0;
    newInterval = 1;
    newStatus = 'learning';
  } else {
    // Good (4) or Easy (5)
    newRepetitions += 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }

    if (q === 5 && newRepetitions > 1) {
      // Easy bonus: slight interval boost
      newInterval = Math.round(newInterval * 1.2);
    }

    if (newInterval >= 21) {
      newStatus = 'mastered';
    } else {
      newStatus = 'review';
    }
  }

  // Calculate next review timestamp (in ISO format)
  const now = new Date();
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Number(newEF.toFixed(2)),
    lastReviewedDate: now.toISOString(),
    nextReviewDate: nextDate.toISOString(),
    status: newStatus
  };
}

/**
 * Prioritizes cards for today's review session:
 * 1. Due review cards (nextReviewDate <= now)
 * 2. New / unseen cards
 * 3. Learning cards
 */
export function sortCardsForStudySession(cards, userProgressMap = {}) {
  const now = new Date().getTime();

  return [...cards].sort((a, b) => {
    const progA = userProgressMap[a.id] || DEFAULT_SM2_CARD;
    const progB = userProgressMap[b.id] || DEFAULT_SM2_CARD;

    const dueA = new Date(progA.nextReviewDate).getTime() <= now;
    const dueB = new Date(progB.nextReviewDate).getTime() <= now;

    // Prioritize due cards first
    if (dueA && !dueB) return -1;
    if (!dueA && dueB) return 1;

    // Prioritize unseen cards next
    const isNewA = progA.repetitions === 0;
    const isNewB = progB.repetitions === 0;
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    // Otherwise sort by next review date ascending
    return new Date(progA.nextReviewDate).getTime() - new Date(progB.nextReviewDate).getTime();
  });
}

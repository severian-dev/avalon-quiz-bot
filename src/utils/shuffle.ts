/**
 * Seeded random number generator using a simple LCG algorithm.
 * This ensures the same seed always produces the same sequence.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Shuffle an array using a seeded random number generator.
 * The same seed will always produce the same shuffle order.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);

  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Generate a seed from attempt ID and question ID.
 * This ensures each question in each attempt has a unique shuffle order.
 */
export function generateShuffleSeed(attemptId: number, questionId: number): number {
  return attemptId * 10000 + questionId;
}

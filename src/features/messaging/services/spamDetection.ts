export const spamDetectionService = {
  // Simple in-memory rate limiting map: userId -> timestamps of last messages
  messageTimestamps: new Map<string, number[]>(),
  
  // Rules
  RATE_LIMIT_WINDOW_MS: 10000, // 10 seconds
  MAX_MESSAGES_PER_WINDOW: 5,
  BANNED_WORDS: ['scam', 'send money outside', 'fake', 'bitcoin', 'crypto', 'investment'],

  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const timestamps = this.messageTimestamps.get(userId) || [];
    
    // Filter out timestamps older than the window
    const recentTimestamps = timestamps.filter(t => now - t < this.RATE_LIMIT_WINDOW_MS);
    
    if (recentTimestamps.length >= this.MAX_MESSAGES_PER_WINDOW) {
      return false; // Rate limited
    }
    
    recentTimestamps.push(now);
    this.messageTimestamps.set(userId, recentTimestamps);
    return true; // Allowed
  },

  detectSpam(text: string): boolean {
    const lowerText = text.toLowerCase();
    for (const word of this.BANNED_WORDS) {
      if (lowerText.includes(word)) {
        return true; // Spam detected
      }
    }
    return false; // Not spam
  }
};

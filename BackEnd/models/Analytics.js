// models/Analytics.js
const analyticsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  metric: {
    type: String,
    enum: [
      'total_sessions',
      'total_messages', 
      'avg_session_duration',
      'intent_distribution',
      'escalation_rate',
      'response_accuracy',
      'user_satisfaction',
      'common_questions'
    ]
  },
  value: mongoose.Schema.Types.Mixed,
  metadata: {
    intent: String,
    programAsked: String,
    resolved: Boolean
  }
});

// Track these KPIs daily:
// 1. How many conversations?
// 2. What do people ask most?
// 3. How many escalations?
// 4. Average confidence score
// 5. Common drop-off points
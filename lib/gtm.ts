/**
 * Google Tag Manager (GTM) tracking utilities
 * Sends events to GTM dataLayer for analytics
 */

declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
  }
}

/**
 * Send an event to Google Tag Manager
 * Non-blocking: Uses queueMicrotask to ensure tracking never blocks UI updates
 */
export function trackGTMEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    queueMicrotask(() => {
      try {
        window.dataLayer.push({
          event,
          ...data,
        });
      } catch (error) {
        // Silently fail - don't let analytics errors break the app
        console.warn('GTM tracking error:', error);
      }
    });
  }
}

// Home Page Events
export const GTMEvents = {
  // Home Page
  HOME_START_QUIZ: 'home_start_quiz',
  HOME_VIEW_CANDIDATES: 'home_view_candidates',
  HOME_GITHUB_CLICK: 'home_github_click',
  HOME_QUESTION_COUNT_SELECTED: 'home_question_count_selected',
  HOME_POLICY_AREAS_OPENED: 'home_policy_areas_opened',
  HOME_POLICY_AREAS_CLOSED: 'home_policy_areas_closed',

  // Quiz Events
  QUIZ_STARTED: 'quiz_started',
  QUIZ_QUESTION_ANSWERED: 'quiz_question_answered',
  QUIZ_QUESTION_SKIPPED: 'quiz_question_skipped',
  QUIZ_COMPLETED: 'quiz_completed',
  QUIZ_POSITIONS_OPENED: 'quiz_positions_opened',
  QUIZ_POSITIONS_CLOSED: 'quiz_positions_closed',
  QUIZ_POSITION_VIEWED: 'quiz_position_viewed',

  // Results Events
  RESULTS_VIEWED: 'results_viewed',
  RESULTS_AI_EXPLANATION_SHOWN: 'results_ai_explanation_shown',
  RESULTS_TOP_MATCH_VIEWED: 'results_top_match_viewed',
  RESULTS_RESTART_CLICKED: 'results_restart_clicked',
  RESULTS_VIEW_ALL_CANDIDATES: 'results_view_all_candidates',
  RESULTS_CANDIDATE_CARD_CLICKED: 'results_candidate_card_clicked',

  // Candidates Page Events
  CANDIDATES_PAGE_VIEWED: 'candidates_page_viewed',
  CANDIDATES_TILE_CLICKED: 'candidates_tile_clicked',
  CANDIDATES_BACK_HOME: 'candidates_back_home',

  // Notes Page Events
  NOTES_PAGE_VIEWED: 'notes_page_viewed',
  NOTES_BACK_HOME: 'notes_back_home',
  NOTES_GITHUB_CLICKED: 'notes_github_clicked',
  NOTES_LINKEDIN_CLICKED: 'notes_linkedin_clicked',

  // Widget Events
  STATS_WIDGET_CLICKED: 'stats_widget_clicked',
  SECURITY_MESSAGE_SHOWN: 'security_message_shown',
  SECURITY_MESSAGE_CLOSED: 'security_message_closed',

  // Navigation Events
  FLAG_CLICKED: 'flag_clicked',
} as const;

// Type for GTM events
export type GTMEventType = (typeof GTMEvents)[keyof typeof GTMEvents];

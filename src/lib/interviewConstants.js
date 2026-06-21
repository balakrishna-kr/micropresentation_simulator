// ─── INTERVIEW STEPS ──────────────────────────────
export const INTERVIEW_STEPS = {
  IDLE: "IDLE",
  INTRODUCTION: "INTRODUCTION",
  DATA_REVIEW: "DATA_REVIEW",
  INSTRUCTIONS: "INSTRUCTIONS",
  FAVORITE_SUBJECT: "FAVORITE_SUBJECT",
  SYLLABUS_QA: "SYLLABUS_QA",
  ECA_QA: "ECA_QA",
  GEOPOLITICS: "GEOPOLITICS",
  EVALUATION: "EVALUATION",
};

export const INTERVIEW_STEP_LABELS = {
  [INTERVIEW_STEPS.IDLE]: "Ready",
  [INTERVIEW_STEPS.INTRODUCTION]: "Introduction",
  [INTERVIEW_STEPS.DATA_REVIEW]: "Data Review",
  [INTERVIEW_STEPS.INSTRUCTIONS]: "Instructions",
  [INTERVIEW_STEPS.FAVORITE_SUBJECT]: "Favorite Subject",
  [INTERVIEW_STEPS.SYLLABUS_QA]: "Subject Q&A",
  [INTERVIEW_STEPS.ECA_QA]: "ECA Q&A",
  [INTERVIEW_STEPS.GEOPOLITICS]: "Current Affairs",
  [INTERVIEW_STEPS.EVALUATION]: "Evaluation",
};

export const INTERVIEW_STEP_ORDER = [
  INTERVIEW_STEPS.INTRODUCTION,
  INTERVIEW_STEPS.DATA_REVIEW,
  INTERVIEW_STEPS.INSTRUCTIONS,
  INTERVIEW_STEPS.FAVORITE_SUBJECT,
  INTERVIEW_STEPS.SYLLABUS_QA,
  INTERVIEW_STEPS.ECA_QA,
  INTERVIEW_STEPS.GEOPOLITICS,
  INTERVIEW_STEPS.EVALUATION,
];

// ─── REPEAT INTENT DETECTION ──────────────────────
export const REPEAT_INTENT_PATTERNS = [
  /\brepeat\b/i,
  /\bsay\s+that\s+again\b/i,
  /\bcan\s+you\s+repeat\b/i,
  /\bplease\s+repeat\b/i,
  /\bdidn'?t\s+understand\b/i,
  /\bdid\s+not\s+understand\b/i,
  /\bcome\s+again\b/i,
  /\bonce\s+more\b/i,
  /\bpardon\b/i,
  /\bsorry\s*,?\s*what\b/i,
  /\bwhat\s+did\s+you\s+say\b/i,
];

// ─── Q&A COUNTS ───────────────────────────────────
export const SYLLABUS_QA_COUNT = 3;
export const ECA_QA_COUNT = 2;

// ─── BOARD OPTIONS ────────────────────────────────
export const BOARD_OPTIONS_10TH = [
  { value: "state_board_karnataka", label: "State Board (Karnataka)" },
  { value: "icse", label: "ICSE" },
  { value: "cbse", label: "CBSE" },
];

export const BOARD_OPTIONS_12TH = [
  { value: "state_board_karnataka", label: "State Board (Karnataka)" },
  { value: "isc", label: "ISC" },
  { value: "cbse", label: "CBSE" },
];

export const ECA_RESULT_OPTIONS = [
  { value: "1st", label: "1st Place" },
  { value: "2nd", label: "2nd Place" },
  { value: "3rd", label: "3rd Place" },
  { value: "4th", label: "4th Place" },
  { value: "participation", label: "Participation" },
];

// ─── STREAM SUBJECTS (fallback when no marks card uploaded) ──
export const STREAM_SUBJECTS = {
  commerce: ["Accountancy", "Business Studies", "Economics"],
  science: ["Physics", "Chemistry", "Biology", "Mathematics"],
  arts: ["History", "Political Science", "Sociology", "Geography"],
};

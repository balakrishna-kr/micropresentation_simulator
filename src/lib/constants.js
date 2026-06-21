export const PHASES = {
  IDLE: "IDLE",
  GREETING: "GREETING",
  PREPARATION: "PREPARATION",
  PRESENTATION: "PRESENTATION",
  QA: "QA",
  EVALUATION: "EVALUATION",
};

export const PHASE_LABELS = {
  [PHASES.IDLE]: "Ready",
  [PHASES.GREETING]: "Introduction",
  [PHASES.PREPARATION]: "Preparing",
  [PHASES.PRESENTATION]: "Presenting",
  [PHASES.QA]: "Q&A Round",
  [PHASES.EVALUATION]: "Evaluation",
};

export const PHASE_ORDER = [
  PHASES.GREETING,
  PHASES.PREPARATION,
  PHASES.PRESENTATION,
  PHASES.QA,
  PHASES.EVALUATION,
];

export const TIMER_DEFAULTS = {
  prepTime: 60,
  presentTime: 60,
};

export const TIMER_BOUNDS = {
  min: 60,
  max: 120,
};

export const QA_QUESTION_COUNT = 4;

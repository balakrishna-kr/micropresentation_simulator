/**
 * Summarize raw vision analytics log into a dense text description
 * suitable for LLM prompts. Much more token-efficient than raw JSON.
 *
 * @param {Array} analyticsLog - Array of { timestamp, expression, handsMoving, lookingAway }
 * @returns {string} Human-readable behavioral summary
 */
export function summarizeVisionLog(analyticsLog) {
  if (!analyticsLog || analyticsLog.length === 0) {
    return "Physical Metrics Log: No visual tracking data was captured during this session.";
  }

  const total = analyticsLog.length;

  // ─── Expression distribution ───────────────────
  const expressionCounts = {};
  analyticsLog.forEach((entry) => {
    const expr = entry.expression || "Neutral";
    expressionCounts[expr] = (expressionCounts[expr] || 0) + 1;
  });

  const expressionSummary = Object.entries(expressionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([expr, count]) => `${expr} (${Math.round((count / total) * 100)}%)`)
    .join(", ");

  // ─── Eye contact ────────────────────────────────
  const lookingAwayCount = analyticsLog.filter((e) => e.lookingAway).length;
  const eyeContactPercent = Math.round(
    ((total - lookingAwayCount) / total) * 100
  );

  // ─── Hand/body movement ─────────────────────────
  const movingCount = analyticsLog.filter((e) => e.handsMoving).length;
  const movementPercent = Math.round((movingCount / total) * 100);

  let movementDesc;
  if (movementPercent > 70) {
    movementDesc =
      "frequent body and hand movement was detected, indicating active gesturing or possible restlessness";
  } else if (movementPercent > 40) {
    movementDesc =
      "moderate body movement was detected, suggesting natural gesturing during responses";
  } else if (movementPercent > 15) {
    movementDesc =
      "occasional body movement was detected, indicating a mostly still posture with some gesturing";
  } else {
    movementDesc =
      "very little body movement was detected, suggesting a still and composed posture throughout";
  }

  // ─── Duration estimate (samples every 2s) ──────
  const durationSeconds = total * 2;
  const durationMinutes = Math.round(durationSeconds / 60);
  const durationStr =
    durationMinutes > 0
      ? `${durationMinutes}-minute`
      : `${durationSeconds}-second`;

  // ─── Compose summary ──────────────────────────
  return `Physical Metrics Log: During this ${durationStr} session, the student maintained ${eyeContactPercent}% steady eye contact. Facial expressions were distributed as follows: ${expressionSummary}. For body language, ${movementDesc} (movement detected in ${movementPercent}% of tracking samples).`;
}

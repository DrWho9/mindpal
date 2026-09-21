export const REFLECT_LANE = "reflect";

export const CLINICAL_DISCLAIMER =
  "MindPal is software — psych-informed and expert-inspired, not a psychologist, therapist, or emergency service. It does not diagnose, prescribe, or monitor you. AU urgent help: 000 / Lifeline 13 11 14.";

export const REFLECT_SYSTEM_PROMPT = `You are MindPal on the Reflect / Talk about my day path — a warm Australian wellbeing companion.

You are psych-informed and expert-inspired (CBT and ACT: reflective listening, noticing thoughts as thoughts, values-sized next steps). You are software, not a psychologist, therapist, counsellor, or clinician. Never claim those titles. Never diagnose, prescribe medication, or treat.

Voice: calm, plain, adult Australian English. Warm, not chirpy. Short paragraphs. No jargon dump.

Each reply:
1. Reflective listening — name the feeling or situation you heard, without adding drama.
2. A gentle reframe or noticing only if it fits. Do not argue feelings away. Do not force positivity.
3. At most one small next step, or permission to stop. Rest and asking a human are valid.

If the person expresses intent to harm themselves or someone else, stop reflective chat. Do not explore method or plan. Tell them to use emergency 000 in Australia if they are in danger, Lifeline 13 11 14 for crisis support, and MindPal’s Help me now. Then stop.

If they describe harm, abuse, or being unsafe, do not reframe it as a thought distortion. Point to human support.

Do not invent facts about their life. Do not access a diary automatically.`;

export const CRISIS_COPY = {
  title: "Please use human help now.",
  body:
    "MindPal will stop this reflective chat here. If you are in immediate danger in Australia, call 000. For crisis support, call Lifeline on 13 11 14. Help me now lists further options. MindPal cannot watch over you or send help.",
  emergencyLabel: "Emergency 000",
  emergencyHref: "tel:000",
  lifelineLabel: "Lifeline 13 11 14",
  lifelineHref: "tel:131114",
};

const SELF_HARM =
  /\b(kill myself|killing myself|suicide|suicidal|end my life|ending my life|take my (own )?life|want to die|wanna die|better off dead|self[-\s]?harm|cut myself|hurt myself|harm myself)\b/i;
const HARM_OTHERS =
  /\b(i('m| am) (going to|gonna) (kill|hurt|stab|shoot) (him|her|them|someone|people|my \w+)|i (want to|wanna) (kill|hurt) (him|her|them|someone|people)|going to (kill|hurt) (him|her|them|someone))\b/i;

export function detectCrisisIntent(text) {
  const value = typeof text === "string" ? text.trim() : "";
  if (!value) return { crisis: false, kind: null };
  if (SELF_HARM.test(value)) return { crisis: true, kind: "self" };
  if (HARM_OTHERS.test(value)) return { crisis: true, kind: "others" };
  return { crisis: false, kind: null };
}

export function safetyStateForText(text, crisis = detectCrisisIntent(text)) {
  if (crisis.crisis) return "urgent";
  const value = typeof text === "string" ? text.toLowerCase() : "";
  if (/\b(not safe|unsafe|in danger|afraid for my life)\b/.test(value)) {
    return "concern_uncertain";
  }
  if (/\b(distressed|overwhelmed|can't cope|cannot cope|panic)\b/.test(value)) {
    return "distress";
  }
  return "ordinary";
}

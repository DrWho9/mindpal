import { validateBank } from "./core.js";

export const BRAIN_DIFFICULTIES = Object.freeze([
  Object.freeze({ value: "foundation", title: "Foundation", description: "The original 320 questions. Build confidence with shorter reasoning exercises." }),
  Object.freeze({ value: "umat", title: "UMAT-level", description: "Original multi-step logic, evidence and problem-solving practice." }),
  Object.freeze({ value: "challenge", title: "Challenge", description: "More demanding deductions, constraints and competing explanations." }),
]);

/** Preserve Foundation question identities and saved answers byte-for-byte. */
export function createBrainBank(foundation, reasoning, { provisional = false } = {}) {
  const original = validateBank(foundation, { provisional });
  if (reasoning === undefined) return original;
  if (!reasoning || reasoning.schemaVersion !== "1.0" || reasoning.title !== "Brain" ||
      !Array.isArray(reasoning.questions) || reasoning.questions.length !== 18 ||
      reasoning.questions.some(question => !question || !["umat", "challenge"].includes(question.difficulty))) {
    throw new Error("Brain content: expected 18 original reasoning questions across UMAT-level and Challenge.");
  }
  const additions = ["umat", "challenge"].flatMap(difficulty => validateBank({
    ...reasoning, questions: reasoning.questions.filter(question => question.difficulty === difficulty),
  }, { difficulty }).questions);
  return Object.freeze({ ...original, questions: Object.freeze([...original.questions, ...additions]) });
}

export function difficultyBank(bank, difficulty) {
  if (!BRAIN_DIFFICULTIES.some(choice => choice.value === difficulty)) throw new Error("Choose a difficulty.");
  const questions = bank.questions.filter(question => (question.difficulty || "foundation") === difficulty);
  if (!questions.length) throw new Error("This difficulty has no available questions.");
  return { ...bank, questions };
}

export function sessionDifficulty(session, bank) {
  if (!session) return null;
  const question = bank.questions.find(item => item.id === session.questionIds[0]);
  return question?.difficulty || "foundation";
}

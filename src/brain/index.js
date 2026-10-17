import {
  validateBank, createProgressStore, PROVISIONAL_STORAGE_KEY, STORAGE_KEY,
  getProgress, createQuizStore, QUIZ_STORAGE_KEY, PROVISIONAL_QUIZ_STORAGE_KEY,
  startQuizSession, getQuizView, chooseQuizAnswer, submitQuizAnswer,
  nextQuizQuestion, previousQuizQuestion, submitQuizBatch, recordQuizProgress,
} from "./core.js";

let instanceId = 0;

/**
 * A local-only quiz. Lifetime practice and the active round have separate stores.
 * Questions are rendered only through the core's reveal-safe presentation view.
 * @param {HTMLElement} container
 * @param {{bank:any,provisional?:boolean,storage?:any,onExit?:()=>void}} options
 */
export function mountBrain(container, { bank: input, provisional = false, storage, onExit }) {
  const bank = validateBank(input, { provisional });
  const doc = container.ownerDocument;
  const prefix = `mp-brain-${++instanceId}`;
  const historyStore = createProgressStore({ bank, storage, key: provisional ? PROVISIONAL_STORAGE_KEY : STORAGE_KEY });
  const quizStore = createQuizStore({ bank, storage, key: provisional ? PROVISIONAL_QUIZ_STORAGE_KEY : QUIZ_STORAGE_KEY });
  let history = historyStore.read();
  let session = quizStore.read();
  // Recover a submission whose round was saved before its lifetime write.
  // Pending batches contribute nothing; existing first answers remain intact.
  const restoredProgress = recordQuizProgress(history, session, bank);
  if (restoredProgress !== history) history = historyStore.save(restoredProgress);
  let settings = {
    mode: session?.mode || "immediate",
    count: String(session?.questionIds.length || Math.min(10, bank.questions.length)),
  };
  let destroyed = false;
  let generation = 0;
  let confirmingDiscard = false;
  let saveNote;
  const shell = element("section", "", "mp-brain");
  shell.setAttribute("aria-label", "Brain practice");
  const live = element("p", "", "mp-brain-sr-only");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  const screen = element("div");
  shell.append(live, screen);
  container.replaceChildren(shell);

  function element(tag, text = "", className = "") {
    const node = doc.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  // Detached controls, double clicks, and a destroyed mount cannot write state.
  // Choice changes do not rerender, preserving native radio-arrow navigation.
  function listen(node, eventName, handler) {
    const renderedGeneration = generation;
    node.addEventListener(eventName, event => {
      if (destroyed || renderedGeneration !== generation) {
        if (eventName === "submit") event.preventDefault();
        return;
      }
      handler(event);
    });
  }

  function button(label, handler, primary = false, extraClass = "") {
    const node = element("button", label, `mp-brain-button${primary ? " mp-brain-primary" : ""}${extraClass ? ` ${extraClass}` : ""}`);
    node.type = "button";
    listen(node, "click", handler);
    return node;
  }

  function focus(node) {
    if (!node || destroyed) return;
    node.tabIndex = -1;
    node.focus();
  }

  function announce(message) { if (!destroyed) live.textContent = message; }

  function progressBar(label, value, max) {
    const wrap = element("div", "", "mp-brain-progress");
    const copy = element("span", label);
    const bar = element("progress");
    bar.max = max;
    bar.value = value;
    bar.setAttribute("aria-label", label);
    wrap.append(copy, bar);
    return {
      node: wrap,
      update(nextLabel, nextValue) {
        copy.textContent = nextLabel;
        bar.value = nextValue;
        bar.setAttribute("aria-label", nextLabel);
      },
    };
  }

  function updateSavingNote() {
    if (!saveNote) return;
    const quizStatus = quizStore.status();
    const historyStatus = historyStore.status();
    let copy = "Your round and practice progress stay in this browser on this device. Clearing browser data removes them.";
    let warning = false;
    if (quizStatus === "unavailable" || historyStatus === "unavailable") {
      copy = "This browser can’t save some of your practice. You can keep going here, but reloading may lose this round or recent progress.";
      warning = true;
    } else if (quizStatus === "conflict") {
      copy = session
        ? "Another open Brain page changed the saved round. Its latest version is shown here."
        : "Another open Brain page cleared the saved round. You can set up a new one here.";
      warning = true;
    } else if (quizStatus === "recovered") {
      copy = session
        ? "Some saved round data couldn’t be restored. Check your choices before continuing."
        : "The saved round couldn’t be restored. Start a fresh round; readable lifetime progress is kept separately.";
      warning = true;
    } else if (historyStatus === "recovered") {
      copy = "Saved lifetime progress couldn’t be read. You can still use this round and build new progress.";
      warning = true;
    }
    saveNote.className = warning ? "mp-brain-warning" : "mp-brain-note";
    saveNote.textContent = copy;
  }

  function saveSession(next, { target = "prompt", credit = false, rerender = true } = {}) {
    if (destroyed || next === session) return false;
    session = quizStore.save(next);
    // Lifetime answers are credited only from a saved, revealed submission.
    // Active draft choices never enter the older lifetime store.
    if (credit && session && quizStore.status() !== "conflict") {
      history = historyStore.save(recordQuizProgress(history, session, bank));
    }
    if (rerender || quizStore.status() === "conflict") render(target);
    else updateSavingNote();
    return true;
  }

  function newRound() {
    if (session) settings = { mode: session.mode, count: String(session.questionIds.length) };
    if (session?.status === "active") {
      confirmingDiscard = true;
      render("confirm");
    } else {
      session = quizStore.clear();
      confirmingDiscard = false;
      render("setup");
    }
  }

  function render(target = "") {
    if (destroyed) return;
    generation += 1;
    // Do not retain an earlier round's feedback in an offscreen live region.
    live.textContent = "";
    screen.replaceChildren();
    const view = getQuizView(session, bank);
    const header = element("header", "", "mp-brain-header");
    const top = element("div", "", "mp-brain-top");
    const brand = element("div", "", "mp-brain-brand");
    const mark = element("span", "✦", "mp-brain-mark");
    mark.setAttribute("aria-hidden", "true");
    const brandCopy = element("div");
    brandCopy.append(element("p", "A little room to reason", "mp-brain-kicker"), element("h1", "Brain"));
    brand.append(mark, brandCopy);
    top.append(brand);
    if (onExit) top.append(button("Back to MindPal", () => onExit()));
    header.append(top, element("p", "A fresh puzzle, a new perspective. Take your time; there’s no timer.", "mp-brain-lede"));
    if (provisional) {
      header.append(element("p", `Development preview · ${bank.questions.length} provisional questions. This is not the final question bank.`, "mp-brain-preview"));
    }
    // No historical answer, review control, score, or completion tally is
    // rendered during a pending batch, including the discard screen.
    if (!view || view.mode !== "batch" || view.status === "complete") {
      const progress = getProgress(history, bank);
      header.append(element("p", `Lifetime practice: ${progress.completed} of ${progress.total} distinct questions completed. Replaying a question doesn’t add another completion.`, "mp-brain-lifetime"));
    }
    saveNote = element("p");
    updateSavingNote();
    header.append(saveNote);
    screen.append(header);

    if (confirmingDiscard && session) renderDiscard(target);
    else if (!view) renderSetup(target);
    else if (view.status === "complete") renderResults(view, target);
    else renderQuestion(view, target);

    const footer = element("footer", "", "mp-brain-footer");
    footer.append(element("p", "Educational practice. Stages follow an editorial difficulty order; this is not a calibrated assessment."));
    screen.append(footer);
  }

  function renderSetup(target) {
    const card = element("section", "", "mp-brain-card mp-brain-setup");
    const title = element("h2", "Make this round yours");
    title.id = `${prefix}-setup-title`;
    card.setAttribute("aria-labelledby", title.id);
    card.append(title, element("p", "Choose when you’d like the explanations, then pick a comfortable number of questions.", "mp-brain-card-intro"));
    const form = element("form");
    form.noValidate = true;
    const modes = element("fieldset");
    modes.append(element("legend", "When would you like the answers?"));
    const modeGrid = element("div", "", "mp-brain-modes");
    for (const choice of [
      { value: "immediate", title: "After each question", description: "Submit an answer, explore its explanation, then move on." },
      { value: "batch", title: "After my chosen batch", description: "Save your choices and change them freely. See all explanations after Submit batch." },
    ]) {
      const label = element("label", "", "mp-brain-mode");
      const radio = element("input");
      radio.type = "radio";
      radio.name = `${prefix}-feedback-mode`;
      radio.value = choice.value;
      radio.id = `${prefix}-mode-${choice.value}`;
      radio.checked = settings.mode === choice.value;
      label.htmlFor = radio.id;
      const copy = element("span", "", "mp-brain-mode-copy");
      copy.append(element("span", choice.title, "mp-brain-mode-title"), element("span", choice.description, "mp-brain-mode-description"));
      label.append(radio, copy);
      listen(radio, "change", () => { if (radio.checked) settings.mode = choice.value; });
      modeGrid.append(label);
    }
    modes.append(modeGrid);
    form.append(modes);

    const counts = element("fieldset");
    counts.append(element("legend", "How many questions?"));
    const presets = element("div", "", "mp-brain-presets");
    const presetInputs = [];
    const isPreset = [5, 10, 20].some(value => String(value) === settings.count && value <= bank.questions.length);
    const countInput = element("input", "", "mp-brain-count-input");
    countInput.type = "number";
    countInput.inputMode = "numeric";
    countInput.min = "1";
    countInput.max = String(bank.questions.length);
    countInput.step = "1";
    countInput.required = true;
    countInput.value = settings.count;
    countInput.id = `${prefix}-count`;
    countInput.setAttribute("aria-describedby", `${prefix}-count-help ${prefix}-setup-error`);
    for (const value of [5, 10, 20, "custom"]) {
      const label = element("label", "", "mp-brain-preset");
      const radio = element("input");
      radio.type = "radio";
      radio.name = `${prefix}-count-preset`;
      radio.value = String(value);
      radio.id = `${prefix}-preset-${value}`;
      radio.disabled = typeof value === "number" && value > bank.questions.length;
      radio.checked = value === "custom" ? !isPreset : String(value) === settings.count && !radio.disabled;
      label.htmlFor = radio.id;
      label.append(radio, element("span", value === "custom" ? "Custom" : String(value)));
      listen(radio, "change", () => {
        if (!radio.checked) return;
        clearSetupError();
        if (value === "custom") return;
        settings.count = String(value);
        countInput.value = settings.count;
      });
      presetInputs.push(radio);
      presets.append(label);
    }
    const countRow = element("div", "", "mp-brain-count-row");
    const countLabel = element("label", "Questions in this round", "mp-brain-count-label");
    countLabel.htmlFor = countInput.id;
    countRow.append(countLabel, countInput);
    const help = element("p", `Choose a whole number from 1 to ${bank.questions.length}. Every round follows the bank’s ordered stages.`, "mp-brain-count-help");
    help.id = `${prefix}-count-help`;
    counts.append(presets, countRow, help);
    form.append(counts);
    const error = element("p", "", "mp-brain-error");
    error.id = `${prefix}-setup-error`;
    error.hidden = true;
    function clearSetupError() {
      error.textContent = "";
      error.hidden = true;
      countInput.setAttribute("aria-invalid", "false");
    }
    listen(countInput, "input", () => {
      settings.count = countInput.value;
      for (const radio of presetInputs) radio.checked = radio.value === "custom";
      clearSetupError();
    });
    const start = element("button", "Start quiz", "mp-brain-button mp-brain-primary");
    start.type = "submit";
    const actions = element("div", "", "mp-brain-actions");
    actions.append(start);
    form.append(error, actions);
    listen(form, "submit", event => {
      event.preventDefault();
      const value = countInput.value.trim();
      const count = Number(value);
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(count) || count < 1 || count > bank.questions.length) {
        const message = `Enter a whole number from 1 to ${bank.questions.length} before starting.`;
        error.textContent = message;
        error.hidden = false;
        countInput.setAttribute("aria-invalid", "true");
        announce(message);
        countInput.focus();
        return;
      }
      settings.count = value;
      session = quizStore.start(startQuizSession(bank, {
        mode: settings.mode,
        count,
        startId: getProgress(history, bank).nextId || bank.questions[0].id,
      }));
      render("prompt");
    });
    card.append(form);
    screen.append(card);
    if (target) focus(title);
  }

  function renderDiscard(target) {
    const card = element("section", "", "mp-brain-card mp-brain-confirm");
    const title = element("h2", "Start a new round?");
    title.id = `${prefix}-discard-title`;
    card.setAttribute("aria-labelledby", title.id);
    card.append(title,
      element("p", "Your current round and any unsubmitted choices will be cleared. Answers already recorded in lifetime practice will stay saved."),
      element("p", "You can choose a different feedback mode and question count for the new round.", "mp-brain-note"));
    const actions = element("div", "", "mp-brain-actions");
    actions.append(button("Keep this round", () => {
      confirmingDiscard = false;
      render("prompt");
    }, true), button("Discard round", () => {
      session = quizStore.clear();
      confirmingDiscard = false;
      render("setup");
    }, false, "mp-brain-danger"));
    card.append(actions);
    screen.append(card);
    if (target) focus(title);
  }

  function renderQuestion(view, target) {
    const question = view.current;
    const batch = view.mode === "batch";
    const last = view.cursor === view.count - 1;
    const card = element("article", "", "mp-brain-card");
    const meta = element("div", "", "mp-brain-session-meta");
    meta.append(element("span", batch ? "Answers after batch" : "Answers after each question", "mp-brain-chip"),
      element("span", `Question ${view.cursor + 1} of ${view.count}`, "mp-brain-chip mp-brain-chip-neutral"));
    const roundProgress = progressBar(
      batch ? `${view.answeredCount} of ${view.count} choices saved` : `${view.revealedCount} of ${view.count} answers submitted`,
      batch ? view.answeredCount : view.revealedCount, view.count);
    card.append(meta, roundProgress.node);
    card.append(element("p", `Stage ${question.level} · ${question.skill.replaceAll("-", " ")}`, "mp-brain-eyebrow"));
    const prompt = element("h2", question.prompt, "mp-brain-prompt");
    prompt.id = `${prefix}-prompt`;
    card.append(prompt);
    if (batch) card.append(element("p", "Your choices are saved as you go. Use Back and Next to review them. Answers and explanations appear only after Submit batch.", "mp-brain-batch-note"));
    const form = element("form");
    form.setAttribute("aria-labelledby", prompt.id);
    const fieldset = element("fieldset", "", "mp-brain-options");
    fieldset.append(element("legend", question.locked ? "Your recorded answer" : "Choose one answer"));
    const radios = [];
    for (const option of question.options) {
      const selected = question.selectedOptionId === option.id;
      const isCorrect = Boolean(question.feedback && question.feedback.correctOptionId === option.id);
      const chosenWrong = Boolean(question.feedback && selected && !isCorrect);
      const label = element("label", "", `mp-brain-option${isCorrect ? " mp-brain-option-correct" : chosenWrong ? " mp-brain-option-chosen" : ""}`);
      const radio = element("input");
      radio.type = "radio";
      radio.name = `${prefix}-answer`;
      radio.id = `${prefix}-${question.id}-${option.id}`;
      radio.value = option.id;
      radio.checked = selected;
      radio.disabled = question.locked;
      label.htmlFor = radio.id;
      const copy = element("span", "", "mp-brain-option-copy");
      const letter = element("span", `${option.id}.`, "mp-brain-option-letter");
      const words = element("span", option.text, "mp-brain-option-text");
      if (isCorrect || chosenWrong) words.append(element("span", isCorrect ? selected ? "Your answer · Correct answer" : "Correct answer" : "Your answer", "mp-brain-option-label"));
      copy.append(letter, words);
      label.append(radio, copy);
      listen(radio, "change", () => {
        if (!radio.checked) return;
        const saved = saveSession(chooseQuizAnswer(session, bank, question.id, option.id), { rerender: false });
        if (saved && quizStore.status() !== "conflict") {
          error.hidden = true;
          error.textContent = "";
          if (batch) {
            const current = getQuizView(session, bank);
            roundProgress.update(`${current.answeredCount} of ${current.count} choices saved`, current.answeredCount);
          }
          if (quizStore.status() === "unavailable") announce("Your choice is kept for this visit. Browser saving is unavailable.");
        }
      });
      radios.push(radio);
      fieldset.append(label);
    }
    form.append(fieldset);
    const error = element("p", "", "mp-brain-error");
    error.id = `${prefix}-answer-error`;
    error.hidden = true;
    form.append(error);
    function continueBatch() {
      const current = getQuizView(session, bank);
      if (!current || current.status !== "active" || current.current.id !== question.id) return;
      if (!current.current.selectedOptionId) {
        const message = "Choose an answer to continue.";
        error.textContent = message;
        error.hidden = false;
        announce(message);
        radios[0]?.focus();
        return;
      }
      saveSession(nextQuizQuestion(session, bank, question.id));
    }
    const actions = element("nav", "", "mp-brain-actions");
    actions.setAttribute("aria-label", "Question navigation");
    if (view.cursor > 0) actions.append(button("Back", () => saveSession(previousQuizQuestion(session, question.id))));
    if (batch && !last) {
      actions.append(button("Next", continueBatch, true));
    } else if (!batch && question.locked) {
      actions.append(button(last ? "See round results" : "Next question", () => saveSession(nextQuizQuestion(session, bank, question.id)), true));
    } else {
      const submit = element("button", batch ? "Submit batch" : "Submit answer", "mp-brain-button mp-brain-primary");
      submit.type = "submit";
      actions.append(submit);
    }
    if (!question.feedback) form.append(actions);
    listen(form, "submit", event => {
      event.preventDefault();
      const current = getQuizView(session, bank);
      if (!current || current.status !== "active" || current.current.id !== question.id) return;
      if (batch) {
        if (!last) { continueBatch(); return; }
        if (!current.canSubmitBatch) {
          const missing = session.questionIds.reduce((numbers, id, index) => {
            if (!session.choices[id]) numbers.push(index + 1);
            return numbers;
          }, []);
          const listed = missing.slice(0, 8).join(", ");
          const message = `Choose an answer for ${missing.length === 1 ? "question" : "questions"} ${listed}${missing.length > 8 ? ` and ${missing.length - 8} more` : ""} before submitting your batch. No answers have been marked yet.`;
          error.replaceChildren(element("span", message));
          if (missing[0] < current.cursor + 1) {
            error.append(button(`Go to question ${missing[0]}`, () => {
              let next = session;
              while (next.cursor > missing[0] - 1) {
                const previous = previousQuizQuestion(next, next.questionIds[next.cursor]);
                if (previous === next) break;
                next = previous;
              }
              saveSession(next);
            }));
          }
          error.hidden = false;
          announce(message);
          if (missing[0] === current.cursor + 1) radios[0]?.focus();
          else focus(error);
          return;
        }
        saveSession(submitQuizBatch(session, bank), { target: "results", credit: true });
      } else {
        if (current.current.locked) return;
        if (!current.current.selectedOptionId) {
          const message = "Choose one answer before submitting.";
          error.textContent = message;
          error.hidden = false;
          announce(message);
          radios[0]?.focus();
          return;
        }
        saveSession(submitQuizAnswer(session, bank, question.id), { target: "feedback", credit: true });
      }
    });
    card.append(form);

    let feedback;
    if (question.feedback) {
      feedback = element("section", "", "mp-brain-feedback");
      const heading = element("h3", question.feedback.isCorrect ? "That’s it!" : "A new way to see it");
      heading.id = `${prefix}-feedback-title`;
      feedback.setAttribute("aria-labelledby", heading.id);
      feedback.append(heading, answerPair(question), element("p", question.feedback.explanation));
      card.append(feedback, actions);
    }
    const roundActions = element("div", "", "mp-brain-actions");
    roundActions.append(button("New round", newRound, false, "mp-brain-quiet"));
    card.append(roundActions);
    screen.append(card);
    if (target === "feedback" && feedback) {
      announce("Answer submitted. Your answer and explanation are ready.");
      focus(feedback);
    } else if (target) {
      announce(`Question ${view.cursor + 1} of ${view.count}.`);
      focus(prompt);
    }
  }

  function answerPair(question) {
    const pair = element("div", "", "mp-brain-answer-pair");
    const chosen = question.options.find(option => option.id === question.selectedOptionId);
    pair.append(element("p", `Your answer: ${chosen.id}. ${chosen.text}`),
      element("p", `Correct answer: ${question.feedback.correctOptionId}. ${question.feedback.correctText}`, "mp-brain-correct"));
    return pair;
  }

  function renderResults(view, target) {
    const card = element("section", "", "mp-brain-card");
    const titleRow = element("div", "", "mp-brain-review-title");
    const mark = element("span", "✦", "mp-brain-completion-mark");
    mark.setAttribute("aria-hidden", "true");
    const title = element("h2", "Round complete. Nicely explored!");
    title.id = `${prefix}-results-title`;
    card.setAttribute("aria-labelledby", title.id);
    titleRow.append(mark, title);
    card.append(titleRow, element("p", `You’ve worked through ${view.count} ${view.count === 1 ? "question" : "questions"}. Here’s every answer and explanation, in the same order.`, "mp-brain-card-intro"));
    const correct = view.results.filter(question => question.feedback.isCorrect).length;
    const summary = element("div", "", "mp-brain-result-summary");
    summary.append(element("span", `${correct} / ${view.count}`, "mp-brain-result-total"), element("span", "correct in this round"));
    card.append(summary, element("p", "Review at your own pace. Each distinct question counts once toward lifetime practice, even when you replay it.", "mp-brain-note"));
    const actions = element("div", "", "mp-brain-actions");
    actions.append(button("New round", newRound, true));
    card.append(actions);
    const list = element("ol", "", "mp-brain-review-list");
    for (const [index, question] of view.results.entries()) {
      const item = element("li", "", "mp-brain-review-item");
      item.append(element("p", `Question ${index + 1} · Stage ${question.level}`, "mp-brain-eyebrow"), element("h3", question.prompt),
        element("p", question.feedback.isCorrect ? "Correct" : "Worth another look", `mp-brain-result-status${question.feedback.isCorrect ? "" : " mp-brain-result-status-review"}`),
        answerPair(question), element("p", question.feedback.explanation, "mp-brain-review-explanation"));
      list.append(item);
    }
    card.append(list);
    if (view.count > 5) {
      const bottomActions = element("div", "", "mp-brain-actions");
      bottomActions.append(button("New round", newRound, true));
      card.append(bottomActions);
    }
    screen.append(card);
    if (target) {
      announce(`Round complete. ${correct} of ${view.count} answers correct. All explanations are ready.`);
      focus(title);
    }
  }

  render(session ? "prompt" : "setup");
  return {
    getState: () => ({ progress: structuredClone(history), session: structuredClone(session) }),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      shell.remove();
    },
  };
}

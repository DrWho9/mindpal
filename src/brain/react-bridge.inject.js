/* Proposed bridge for the pinned vendor shell's existing _ hooks and A JSX runtime. */
function mpBrainPage({onExit}) {
  const ref = (0, _.useRef)(null);
  (0, _.useEffect)(() => {
    if (!ref.current) return;
    try {
      const mounted = mpBrain.mountBrain(ref.current, { bank: mpBrainBank, reasoningBank: mpBrainReasoningBank, onExit });
      return () => mounted.destroy();
    } catch {
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.textContent = "Brain could not open its questions. Your saved progress has not been changed. Please return to MindPal and try again later.";
      const back = document.createElement("button");
      back.type = "button";
      back.className = "secondary";
      back.textContent = "Back to MindPal";
      back.addEventListener("click", onExit);
      ref.current.replaceChildren(message, back);
    }
  }, []);
  return (0, A.jsx)("div", { ref });
}

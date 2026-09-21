import { MESSAGE_TEXT_MAX } from "./thread.js";

export function canSendText(text) {
  return typeof text === "string" && text.trim().length > 0 && text.trim().length <= MESSAGE_TEXT_MAX;
}

export function shouldSendOnKey(event) {
  if (!event || event.key !== "Enter") return false;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
  if (event.isComposing || event.keyCode === 229) return false;
  return true;
}

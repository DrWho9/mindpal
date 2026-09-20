/**
 * Explore “Speakers you enjoy” — verified catalog only.
 * Display order is most→least popular for THIS set. Do not add/remove
 * speakers here; bios, roles, ids, verified, roleEvidence and checkedAt
 * stay on the catalog rows.
 */
export const REQUIRED_SPEAKER_IDS = [
  "tony-robbins",
  "steven-bartlett",
  "mel-robbins",
  "jay-shetty",
  "david-goggins",
  "jordan-peterson",
  "andrew-huberman",
  "brene-brown",
  "james-clear",
  "julie-smith",
  "kristin-neff",
  "susan-david",
  "russ-harris",
];

export function speakerIdFromObject(source) {
  const match = /id:`([^`]+)`/.exec(source);
  return match ? match[1] : "";
}

export function splitSpeakerObjects(inner) {
  const objects = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(inner.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objects;
}

export function extractSpeakerCatalog(source) {
  const start = source.indexOf("x=[{id:`");
  const end = source.indexOf("}],S={revision:", start);
  if (start < 0 || end < 0) {
    throw new Error("speaker catalog anchors missing");
  }
  const inner = source.slice(start + 3, end + 1);
  return {
    start,
    end,
    objects: splitSpeakerObjects(inner),
  };
}

export function reorderSpeakerObjects(objects, order = REQUIRED_SPEAKER_IDS) {
  const ids = objects.map(speakerIdFromObject);
  if (ids.length !== order.length) {
    throw new Error(`speaker catalog size changed: ${ids.length} vs ${order.length}`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("speaker catalog has duplicate ids");
  }
  const missing = order.filter((id) => !ids.includes(id));
  const extra = ids.filter((id) => !order.includes(id));
  if (missing.length || extra.length) {
    throw new Error(
      `speaker catalog set changed; missing ${missing.join(", ") || "none"}; extra ${extra.join(", ") || "none"}`,
    );
  }
  const byId = Object.fromEntries(objects.map((item) => [speakerIdFromObject(item), item]));
  return order.map((id) => byId[id]);
}

export function applySpeakerDisplayOrder(source, order = REQUIRED_SPEAKER_IDS) {
  const { start, end, objects } = extractSpeakerCatalog(source);
  const next = reorderSpeakerObjects(objects, order).join(",");
  return `${source.slice(0, start)}x=[${next}]${source.slice(end + 2)}`;
}

export function speakerIdsInCatalog(source) {
  return extractSpeakerCatalog(source).objects.map(speakerIdFromObject);
}

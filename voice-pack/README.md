# Voice-pack hook

This directory is the seam between Book and an offline TTS engine.

Book must depend on a `VoicePack` adapter, not directly on `speechSynthesis`, Piper, Kokoro, or a vendor API. The adapter is responsible for:

- installing a versioned voice pack once (manifest, progress, SHA-256, licence/attribution);
- listing the installed voices and locale honestly;
- synthesizing bounded text chunks in a Worker/native worker;
- caching generated audio by a stable key containing book/chapter/text/voice/pack version/settings;
- reporting offline readiness, storage/quota errors, cancellation, and repair.

The current Book hook `tryPlayStoredChapterAudio()` should call this seam first. Keep system `speechSynthesis` as an explicitly labelled fallback only; it is not the portable downloaded pack. The PWA implementation can use Piper ONNX + ONNX Runtime Web/WASM, while the later DayStart/Capacitor/Electron implementation can swap in native Piper or Sherpa-ONNX without changing Book UI.

See [`../../mindpal-pdf-reader/OFFLINE-VOICE-PACK-PLAN.md`](../../mindpal-pdf-reader/OFFLINE-VOICE-PACK-PLAN.md) for the contract, pack recommendation, rights notes, and implementation phases.

"use client";

// Listening audio via the browser SpeechSynthesis API — free, no Blob storage.
// Reads the transcript in the voice of the language the item is SET IN (see
// ttsLang). Where speech synthesis is unavailable,
// it gracefully falls back to showing the transcript.

import { useEffect, useRef, useState } from "react";
import { ttsLang } from "./shared";
import type { SwissLanguage } from "@/lib/ch/types";

export function TtsAudio({
  transcript,
  language,
  audioUrl,
}: {
  transcript: string;
  /** Required, with no default. A default here would be the is-IS bug again: the  hygiene-allow
   *  component would silently speak SOME language, and the wrong one is unnoticeable
   *  in code review. Callers must know what they are playing. */
  language: SwissLanguage;
  /** A rendered clip. When present it REPLACES speech synthesis — every candidate hears
   *  the same two-voice recording, checked against its own transcript, instead of
   *  whatever voice their machine happens to have installed (or none, in which case the
   *  item quietly became a reading task). Optional only because items without a rendered
   *  clip must still play something. */
  audioUrl?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function play() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(transcript);
    u.lang = ttsLang(language);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // A rendered clip wins outright. Native <audio> gives play/pause/seek/replay for free,
  // works with no voice pack installed, and is the SAME audio for every candidate — which
  // speech synthesis can never be.
  if (audioUrl) {
    return (
      <div className="rounded-xl border border-almi-bg-peach bg-almi-bg-peach/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden className="text-lg">🎧</span>
          {/* No <track>: the transcript below IS the caption, and it stays hidden until
              asked for. Showing it by default would turn every listening item into a
              reading item — the same failure this audio layer exists to end. */}
          <audio controls preload="none" src={audioUrl} className="min-h-[40px] flex-1">
            Your browser cannot play audio — read the transcript below.
          </audio>
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="text-sm font-semibold text-almi-coral hover:underline"
          >
            {showText ? "Hide transcript" : "Show transcript"}
          </button>
        </div>
        {showText && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-almi-text">{transcript}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-almi-bg-peach bg-almi-bg-peach/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="text-lg">🎧</span>
        {supported ? (
          <>
            <button
              type="button"
              onClick={speaking ? stop : play}
              className="inline-flex min-h-[40px] items-center rounded-full bg-almi-teal px-4 py-2 text-sm font-semibold text-almi-paper hover:opacity-90"
            >
              {speaking ? "Stop" : "Play audio"}
            </button>
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              className="text-sm font-semibold text-almi-coral hover:underline"
            >
              {showText ? "Hide transcript" : "Show transcript"}
            </button>
          </>
        ) : (
          <span className="text-sm text-almi-text-muted">
            Audio playback isn&apos;t available here — read the transcript below.
          </span>
        )}
      </div>
      {(showText || !supported) && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-almi-text">{transcript}</p>
      )}
    </div>
  );
}

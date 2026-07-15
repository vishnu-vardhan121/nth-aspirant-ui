import { useCallback, useEffect, useRef, useState } from 'react';
import micWorkletUrl from './mic-processor.worklet.js?url';
import { decodeBase64PcmToFloat32, formatTime, uint8ToBase64 } from './audio-utils';
import { fetchPracticeToken } from '../../lib/api';
import SessionTimer from './SessionTimer';

const OUTPUT_SAMPLE_RATE = 24000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SILENCE_END_MS = 700;
const SPEECH_RMS_THRESHOLD = 0.012;
const INTERRUPT_GUARD_MS = 700;
const ENABLE_BARGE_IN = false;

/**
 * Voice-only Gemini Live session for AI Practice.
 * Mechanism aligned with HirecruitAI GeminiLiveStage — token fetched at connect,
 * same mic/VAD/audioStreamEnd behaviour, session resumption on GoAway.
 */
export default function GeminiLiveSession({
  sessionId,
  minMs = 0,
  maxMs = 0,
  title = 'AI Practice',
  onSessionEnd,
  onError,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showStartPrompt, setShowStartPrompt] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const wsRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const isRecordingRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const sentAudioStreamEndRef = useRef(false);

  const outputAudioContextRef = useRef(null);
  const outputGainRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set());

  const hasConnectedRef = useRef(false);
  const hasSetupCompletedRef = useRef(false);
  const interviewEndingRef = useRef(false);
  const isShuttingDownRef = useRef(false);
  const sessionHandleRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const receivedGoAwayRef = useRef(false);
  const autoEndedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const ephemeralTokenRef = useRef(null);
  const wsEndpointRef = useRef('');
  const modelRef = useRef('');

  const connectionGenRef = useRef(0);
  const teardownTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const connectToGeminiRef = useRef(null);
  const attemptReconnectionRef = useRef(null);

  const isAISpeakingRef = useRef(false);
  const transcriptPartsRef = useRef([]);
  const sessionTimeRef = useRef(0);
  const onSessionEndRef = useRef(onSessionEnd);
  const onErrorRef = useRef(onError);
  const finishSessionRef = useRef(null);

  useEffect(() => {
    sessionTimeRef.current = sessionTime;
  }, [sessionTime]);
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking;
  }, [isAISpeaking]);
  useEffect(() => {
    if (isAISpeaking) setShowStartPrompt(false);
  }, [isAISpeaking]);

  const elapsedMs = sessionTime * 1000;
  const canEnd = elapsedMs >= minMs;

  const appendTranscript = useCallback((role, text) => {
    const cleaned = String(text || '').trim();
    if (!cleaned) return;
    transcriptPartsRef.current.push({ role, text: cleaned, at: Date.now() });
  }, []);

  const buildTranscriptText = useCallback(() => {
    return transcriptPartsRef.current
      .map((p) => `${p.role === 'user' ? 'Candidate' : 'Interviewer'}: ${p.text}`)
      .join('\n\n');
  }, []);

  useEffect(() => {
    if (isConnected && !sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => setSessionTime((p) => p + 1), 1000);
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [isConnected]);

  const initOutputAudio = () => {
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx({ sampleRate: OUTPUT_SAMPLE_RATE });
    const gain = ctx.createGain();
    gain.gain.value = isMuted ? 0 : 1;
    gain.connect(ctx.destination);
    outputAudioContextRef.current = ctx;
    outputGainRef.current = gain;
    nextStartTimeRef.current = ctx.currentTime;
  };

  const stopOutputAudio = () => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    if (outputAudioContextRef.current) {
      try {
        outputAudioContextRef.current.close();
      } catch {
        /* ignore */
      }
    }
    outputAudioContextRef.current = null;
    outputGainRef.current = null;
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
  };

  const getPcmRms = (buffer) => {
    const samples = new Int16Array(buffer);
    if (!samples.length) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / samples.length);
  };

  const playChunk = (base64Data) => {
    const ctx = outputAudioContextRef.current;
    const gain = outputGainRef.current;
    if (!ctx || !gain) return;

    try {
      if (ctx.state === 'suspended') ctx.resume();

      const float32 = decodeBase64PcmToFloat32(base64Data);
      const audioBuffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32);

      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gain);
      source.addEventListener('ended', () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) {
          setIsAISpeaking(false);
          isAISpeakingRef.current = false;
        }
      });
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      sourcesRef.current.add(source);

      setIsAISpeaking(true);
      isAISpeakingRef.current = true;
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const stopRecording = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !sentAudioStreamEndRef.current) {
      try {
        wsRef.current.send(
          JSON.stringify({
            realtimeInput: { audioStreamEnd: true },
          }),
        );
        sentAudioStreamEndRef.current = true;
      } catch {
        /* ignore */
      }
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      const { stream, processor, source } = mediaRecorderRef.current;
      try {
        source?.disconnect();
        processor?.disconnect();
        stream?.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      mediaRecorderRef.current = null;
    }
    if (inputAudioContextRef.current?.state !== 'closed') {
      try {
        inputAudioContextRef.current?.close();
      } catch {
        /* ignore */
      }
      inputAudioContextRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      inputAudioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      await inputAudioContextRef.current.audioWorklet.addModule(micWorkletUrl);

      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'mic-processor');
      lastSpeechAtRef.current = Date.now();
      sentAudioStreamEndRef.current = false;

      workletNode.port.onmessage = (event) => {
        if (!isRecordingRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          if (isAISpeakingRef.current && !ENABLE_BARGE_IN) return;

          const now = Date.now();
          const rms = getPcmRms(event.data);
          const speaking = rms >= SPEECH_RMS_THRESHOLD;

          if (speaking) {
            lastSpeechAtRef.current = now;
            sentAudioStreamEndRef.current = false;
          } else if (
            !sentAudioStreamEndRef.current &&
            now - lastSpeechAtRef.current >= SILENCE_END_MS
          ) {
            wsRef.current.send(
              JSON.stringify({
                realtimeInput: { audioStreamEnd: true },
              }),
            );
            sentAudioStreamEndRef.current = true;
          }

          const base64Data = uint8ToBase64(new Uint8Array(event.data));
          wsRef.current.send(
            JSON.stringify({
              realtimeInput: {
                audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
              },
            }),
          );
        } catch (err) {
          console.error('Audio send error:', err);
        }
      };

      source.connect(workletNode);
      mediaRecorderRef.current = { stream, processor: workletNode, source };
      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (error) {
      console.error('Microphone error:', error);
      setErrorMessage('Could not access microphone. Please check permissions.');
      onErrorRef.current?.('Could not access microphone. Please check permissions.');
    }
  };

  const finishSession = useCallback(
    (reason = 'user_end') => {
      if (interviewEndingRef.current && reason !== 'force') return;
      interviewEndingRef.current = true;
      isShuttingDownRef.current = true;

      const durationSeconds = sessionTimeRef.current;
      const transcript = buildTranscriptText();

      stopRecording();
      stopOutputAudio();
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      try {
        if (wsRef.current) {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          wsRef.current.close();
        }
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;

      onSessionEndRef.current?.({
        transcript,
        durationSeconds,
        reason,
      });
    },
    [buildTranscriptText, stopRecording],
  );

  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  useEffect(() => {
    if (!isConnected || !maxMs || autoEndedRef.current) return;
    if (elapsedMs >= maxMs) {
      autoEndedRef.current = true;
      setErrorMessage('Maximum session time reached. Ending interview…');
      finishSession('max_time');
    }
  }, [elapsedMs, maxMs, isConnected, finishSession]);

  const handleServerResponse = (message) => {
    if (interviewEndingRef.current) return;

    if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate?.newHandle) {
      sessionHandleRef.current = message.sessionResumptionUpdate.newHandle;
    }
    if (message.goAway) {
      receivedGoAwayRef.current = true;
      setErrorMessage('Connection resetting — reconnecting…');
    }

    const sc = message.serverContent;
    if (!sc) return;

    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part?.inlineData?.data) playChunk(part.inlineData.data);
        if (typeof part?.text === 'string' && part.text.trim()) {
          appendTranscript('ai', part.text);
        }
      }
    }

    if (sc.inputTranscription?.text) {
      appendTranscript('user', sc.inputTranscription.text);
    }
    if (sc.outputTranscription?.text) {
      appendTranscript('ai', sc.outputTranscription.text);
    }

    if (sc.interrupted && ENABLE_BARGE_IN) {
      const likelyRealBargeIn = Date.now() - lastSpeechAtRef.current <= INTERRUPT_GUARD_MS;
      if (!likelyRealBargeIn) return;
      sourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* ignore */
        }
      });
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
    }
  };

  const connectToGemini = useCallback(
    async (isReconnect = false) => {
      try {
        if (isShuttingDownRef.current) return;
        if (!sessionId) {
          setErrorMessage('Missing session.');
          onErrorRef.current?.('Missing session.');
          return;
        }

        if (!isReconnect) {
          const existing = wsRef.current;
          if (
            existing &&
            (existing.readyState === WebSocket.OPEN ||
              existing.readyState === WebSocket.CONNECTING)
          ) {
            if (existing.readyState === WebSocket.OPEN) {
              setIsConnected(true);
              setConnectionStatus('connected');
              setErrorMessage(null);
            } else {
              setConnectionStatus('connecting');
            }
            return;
          }
        }

        setConnectionStatus(isReconnect ? 'reconnecting' : 'connecting');
        setErrorMessage(null);

        if (!ephemeralTokenRef.current || isReconnect) {
          const tokenRes = await fetchPracticeToken(sessionId);
          if (!tokenRes.ok) {
            const msg = tokenRes.error || 'Failed to get live token';
            setErrorMessage(msg);
            onErrorRef.current?.(msg);
            setConnectionStatus('disconnected');
            return;
          }
          ephemeralTokenRef.current = tokenRes.token;
          wsEndpointRef.current = tokenRes.wsEndpoint;
          modelRef.current = tokenRes.model;
        }

        if (isReconnect && wsRef.current) {
          try {
            wsRef.current.close();
          } catch {
            /* ignore */
          }
          wsRef.current = null;
        }

        const myGen = ++connectionGenRef.current;
        const isCurrent = () =>
          connectionGenRef.current === myGen && !isShuttingDownRef.current;

        initOutputAudio();

        const authParam = `access_token=${encodeURIComponent(ephemeralTokenRef.current || '')}`;
        const wsUrl = `${wsEndpointRef.current}?${authParam}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isCurrent() || wsRef.current !== ws) {
            try {
              ws.close();
            } catch {
              /* ignore */
            }
            return;
          }

          setIsConnected(true);
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          hasSetupCompletedRef.current = false;
          receivedGoAwayRef.current = false;

          if (isReconnect) {
            setErrorMessage('Reconnected. You can continue.');
            setTimeout(() => setErrorMessage(null), 4000);
          } else {
            setErrorMessage(null);
          }

          const setupConfig = {
            model: `models/${modelRef.current || 'gemini-2.5-flash-native-audio-preview-12-2025'}`,
          };
          if (sessionHandleRef.current) {
            setupConfig.sessionResumption = { handle: sessionHandleRef.current };
          }

          try {
            ws.send(JSON.stringify({ setup: setupConfig }));
          } catch (e) {
            console.error('Setup send failed:', e);
            if (isCurrent()) setErrorMessage('Failed to start interview setup.');
          }
        };

        ws.onmessage = async (event) => {
          if (!isCurrent() || wsRef.current !== ws) return;

          let raw = event.data;
          if (raw instanceof Blob) {
            try {
              raw = await raw.text();
            } catch {
              return;
            }
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              const msg =
                parsed.error?.message ||
                parsed.error?.status ||
                JSON.stringify(parsed.error);
              console.error('Gemini Live error:', parsed.error);
              setErrorMessage(`Live API error: ${msg}`);
              onErrorRef.current?.(msg);
              return;
            }
            if (parsed.setupComplete && !hasSetupCompletedRef.current) {
              hasSetupCompletedRef.current = true;
              startRecording();
              return;
            }
            handleServerResponse(parsed);
          } catch {
            /* ignore non-JSON */
          }
        };

        ws.onerror = () => {
          if (!isCurrent() || wsRef.current !== ws) return;
          console.error('WebSocket error');
        };

        ws.onclose = (event) => {
          if (connectionGenRef.current !== myGen) return;

          if (wsRef.current === ws) {
            wsRef.current = null;
          }

          if (isShuttingDownRef.current || interviewEndingRef.current) {
            setIsConnected(false);
            setIsRecording(false);
            isRecordingRef.current = false;
            setConnectionStatus('disconnected');
            return;
          }

          setIsConnected(false);
          setIsRecording(false);
          isRecordingRef.current = false;
          stopRecording();
          stopOutputAudio();

          const shouldResume =
            receivedGoAwayRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS;

          if (shouldResume) {
            receivedGoAwayRef.current = false;
            attemptReconnectionRef.current?.();
            return;
          }

          setConnectionStatus('disconnected');
          const detail = event?.code
            ? `Connection closed (code ${event.code}${event.reason ? `: ${event.reason}` : ''}).`
            : 'Connection closed.';
          setErrorMessage(`${detail} Start the level again for a fresh session.`);
          onErrorRef.current?.(detail);
        };
      } catch (error) {
        console.error('Connection error:', error);
        setErrorMessage('Failed to connect. Check your network and try again.');
        setConnectionStatus('disconnected');
        onErrorRef.current?.('Failed to connect.');
      }
    },
    [sessionId],
  );

  const attemptReconnection = useCallback(async () => {
    if (isShuttingDownRef.current || interviewEndingRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setErrorMessage('Failed to reconnect. Please go back and try again.');
      setConnectionStatus('disconnected');
      return;
    }
    reconnectAttemptsRef.current += 1;
    setConnectionStatus('reconnecting');
    setErrorMessage(`Reconnecting… (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    try {
      ephemeralTokenRef.current = null;
      await connectToGemini(true);
    } catch (err) {
      console.error('Reconnection failed:', err);
      setTimeout(
        () => attemptReconnectionRef.current?.(),
        Math.min(2000 * reconnectAttemptsRef.current, 10000),
      );
    }
  }, [connectToGemini]);

  useEffect(() => {
    connectToGeminiRef.current = connectToGemini;
    attemptReconnectionRef.current = attemptReconnection;
  }, [connectToGemini, attemptReconnection]);

  useEffect(() => {
    if (!sessionId) return undefined;

    mountedRef.current = true;
    isShuttingDownRef.current = false;
    interviewEndingRef.current = false;

    if (teardownTimerRef.current) {
      clearTimeout(teardownTimerRef.current);
      teardownTimerRef.current = null;
    }

    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connectToGemini();
    }

    return () => {
      mountedRef.current = false;

      teardownTimerRef.current = setTimeout(() => {
        if (mountedRef.current) return;

        isShuttingDownRef.current = true;
        connectionGenRef.current += 1;
        hasConnectedRef.current = false;
        stopRecording();
        stopOutputAudio();
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
        }
        try {
          if (wsRef.current) {
            const prev = wsRef.current;
            prev.onopen = null;
            prev.onmessage = null;
            prev.onerror = null;
            prev.onclose = null;
            prev.close();
          }
        } catch {
          /* ignore */
        }
        wsRef.current = null;
        ephemeralTokenRef.current = null;
        teardownTimerRef.current = null;
      }, 400);
    };
  }, [sessionId, connectToGemini, stopRecording]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (outputGainRef.current) outputGainRef.current.gain.value = next ? 0 : 1;
  };

  const requestEnd = () => {
    if (!canEnd) {
      setErrorMessage(`Please continue for at least ${formatTime(Math.ceil(minMs / 1000))} before ending.`);
      return;
    }
    setConfirmEnd(true);
  };

  const confirmEndInterview = () => {
    setConfirmEnd(false);
    finishSession('user_end');
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">Voice interview — speak clearly after the AI finishes.</p>
        </div>
        <SessionTimer
          elapsedMs={elapsedMs}
          minMs={minMs}
          maxMs={maxMs}
          canEnd={canEnd}
          connectionStatus={connectionStatus}
        />
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      {isConnected && showStartPrompt ? (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 sm:flex-row">
          <p className="text-sm font-medium text-indigo-950">
            Say <span className="font-semibold">hi</span> to begin when you are ready.
          </p>
          <button
            type="button"
            onClick={() => setShowStartPrompt(false)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 text-center">
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full transition ${
              isAISpeaking
                ? 'bg-indigo-100 ring-4 ring-indigo-300/60'
                : isRecording
                  ? 'bg-emerald-50 ring-4 ring-emerald-200/50'
                  : 'bg-slate-100'
            }`}
          >
            <span className="text-sm font-semibold text-slate-700">
              {isAISpeaking ? 'AI speaking' : isRecording ? 'Listening' : 'Idle'}
            </span>
          </div>
          <p className="max-w-md text-sm text-slate-600">
            {connectionStatus === 'connecting'
              ? 'Connecting to interviewer…'
              : connectionStatus === 'reconnecting'
                ? 'Reconnecting — please wait…'
                : connectionStatus === 'connected'
                  ? isAISpeaking
                    ? 'Listen carefully, then answer when the AI stops.'
                    : 'Your turn — answer out loud.'
                  : 'Waiting for connection…'}
          </p>
          {isRecording ? (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Mic on
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={requestEnd}
            disabled={!canEnd && connectionStatus === 'connected'}
            className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            End interview
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className={`rounded-full px-5 py-2.5 text-sm font-medium ${
              isMuted
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            {isMuted ? 'Unmute AI' : 'Mute AI'}
          </button>
        </div>
      </div>

      {confirmEnd ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setConfirmEnd(false)}
        >
          <div
            role="dialog"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">End interview?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your answers will be evaluated. You need 70% to clear this level.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEndInterview}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                End & evaluate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Save,
  Globe,
  Activity,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileText,
  Volume2,
} from 'lucide-react';
import { useTranscriptionWebSocket } from '../hooks/useTranscriptionWebSocket';
import { transcriptionApi } from '../services/api';
import { SUPPORTED_LANGUAGES } from '../types';

export const LiveTranscription: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const {
    status,
    transcript,
    interimTranscript,
    chunksSent,
    errorMessage,
    startRecording,
    stopRecording,
    pauseRecording,
    clearTranscript,
  } = useTranscriptionWebSocket({ languageCode: selectedLanguage });

  const isRecording = status === 'RECORDING';
  const isPaused = status === 'PAUSED';
  const isConnecting = status === 'CONNECTING';

  const fullDisplayTranscript = `${transcript} ${interimTranscript}`.trim();
  const wordCount = fullDisplayTranscript ? fullDisplayTranscript.split(/\s+/).length : 0;
  const charCount = fullDisplayTranscript.length;

  const handleSaveToDashboard = async () => {
    if (!fullDisplayTranscript) {
      setFeedback({ type: 'danger', text: 'Cannot save an empty transcription.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await transcriptionApi.create({
        originalText: fullDisplayTranscript,
        languageCode: selectedLanguage,
      });
      setFeedback({
        type: 'success',
        text: 'Transcription successfully saved to the MySQL database!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to save transcription to the database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'RECORDING':
        return (
          <span className="badge bg-danger d-inline-flex align-items-center gap-1">
            <span className="recording-pulse-dot me-1"></span> Live Listening & Streaming
          </span>
        );
      case 'PAUSED':
        return (
          <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
            <Pause size={13} /> Paused
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="badge bg-info text-dark d-inline-flex align-items-center gap-1">
            <Activity size={13} className="spinner-grow spinner-grow-sm" /> Connecting...
          </span>
        );
      case 'ERROR':
        return (
          <span className="badge bg-danger d-inline-flex align-items-center gap-1">
            <AlertCircle size={13} /> Error
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary d-inline-flex align-items-center gap-1">
            <Radio size={13} /> Ready
          </span>
        );
    }
  };

  return (
    <div className="container py-4">
      {/* Header section */}
      <div className="row mb-4">
        <div className="col-12 text-center text-md-start d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h1 className="h2 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <Mic className="text-primary" /> Live Speech to Text Studio
            </h1>
            <p className="text-muted mb-0">
              Speak into your microphone in real-time — live multilingual transcription & WebSocket streaming
            </p>
          </div>
          <div>{getStatusBadge()}</div>
        </div>
      </div>

      {/* Alert banner */}
      {feedback && (
        <div
          className={`alert alert-${feedback.type} alert-dismissible fade show d-flex align-items-center gap-2`}
          role="alert"
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div>{feedback.text}</div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setFeedback(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <AlertCircle size={18} />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Controls & Configuration */}
        <div className="col-lg-4">
          <div className="card card-custom h-100 bg-white">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3 d-flex align-items-center gap-2">
                <Globe size={20} className="text-primary" /> Speech Settings
              </h5>

              {/* Language Selector */}
              <div className="mb-4">
                <label htmlFor="languageSelect" className="form-label fw-semibold text-secondary small">
                  TARGET SPOKEN LANGUAGE
                </label>
                <select
                  id="languageSelect"
                  className="form-select form-select-lg border-primary-subtle"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isRecording || isConnecting}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
                <div className="form-text text-muted">
                  Choose the language you will speak in.
                </div>
              </div>

              {/* Recording Controls */}
              <div className="d-grid gap-2 mb-4">
                {!isRecording && !isPaused ? (
                  <button
                    className="btn btn-primary btn-lg fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={startRecording}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Starting Microphone...
                      </>
                    ) : (
                      <>
                        <Mic size={20} /> Start Listening & Streaming
                      </>
                    )}
                  </button>
                ) : (
                  <div className="row g-2">
                    <div className="col-6">
                      {isRecording ? (
                        <button
                          className="btn btn-warning w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                          onClick={pauseRecording}
                        >
                          <Pause size={18} /> Pause
                        </button>
                      ) : (
                        <button
                          className="btn btn-success w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                          onClick={startRecording}
                        >
                          <Play size={18} /> Resume
                        </button>
                      )}
                    </div>
                    <div className="col-6">
                      <button
                        className="btn btn-danger w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                        onClick={stopRecording}
                      >
                        <MicOff size={18} /> Stop
                      </button>
                    </div>
                  </div>
                )}

                <div className="row g-2 mt-1">
                  <div className="col-6">
                    <button
                      className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                      onClick={clearTranscript}
                      disabled={isRecording || !fullDisplayTranscript}
                    >
                      <RotateCcw size={16} /> Clear Text
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-1"
                      onClick={handleSaveToDashboard}
                      disabled={!fullDisplayTranscript || isSaving}
                    >
                      {isSaving ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                      ) : (
                        <>
                          <Save size={16} /> Save to DB
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stream telemetry card */}
              <div className="bg-light rounded p-3 border">
                <h6 className="fw-bold text-secondary small mb-2 text-uppercase d-flex align-items-center gap-1">
                  <Volume2 size={14} /> Live Stream Telemetry
                </h6>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Chunk Interval:</span>
                  <span className="fw-semibold">250 ms (Binary Audio)</span>
                </div>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Audio Chunks Sent:</span>
                  <span className="badge bg-dark font-monospace">{chunksSent}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Recognition Engine:</span>
                  <span className="text-success fw-bold">Active Microphone</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Transcription Output */}
        <div className="col-lg-8">
          <div className="card card-custom h-100 bg-white">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FileText size={18} className="text-primary" />
                <span className="fw-bold text-dark">Live Voice Transcript</span>
              </div>
              {isRecording && (
                <div className="audio-wave-container">
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                  <div className="audio-bar"></div>
                </div>
              )}
            </div>

            <div className="card-body p-4 d-flex flex-column">
              <div className="live-stream-box p-3 flex-grow-1 mb-3">
                {fullDisplayTranscript ? (
                  <div>
                    {transcript && <span className="text-dark">{transcript} </span>}
                    {interimTranscript && (
                      <span className="text-primary opacity-75 fst-italic">{interimTranscript}</span>
                    )}
                  </div>
                ) : (
                  <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted py-5">
                    <Mic size={48} className="text-secondary opacity-50 mb-2" />
                    <p className="mb-0 text-center">
                      Click <strong>"Start Listening & Streaming"</strong> and speak into your microphone.
                      <br />
                      Your spoken words will appear here in real-time.
                    </p>
                  </div>
                )}
              </div>

              {/* Word & Char counter footer */}
              <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
                <div>
                  <span className="me-3">
                    Words: <strong className="text-dark">{wordCount}</strong>
                  </span>
                  <span>
                    Characters: <strong className="text-dark">{charCount}</strong>
                  </span>
                </div>
                <div>
                  <span className="badge bg-light text-secondary border">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

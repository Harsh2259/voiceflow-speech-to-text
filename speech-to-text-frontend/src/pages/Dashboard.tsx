import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { transcriptionApi } from '../services/api';
import { Transcription, SUPPORTED_LANGUAGES } from '../types';

export const Dashboard: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');

  // Selected item for modal/drawer preview
  const [selectedItem, setSelectedItem] = useState<Transcription | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Mounted tracker to avoid React 18 strict mode memory leaks and race conditions
  const isMountedRef = useRef<boolean>(true);

  const fetchTranscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transcriptionApi.getAll(languageFilter || undefined);
      if (isMountedRef.current) {
        setTranscriptions(data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error('Failed to load transcriptions:', err);
        setError(
          err.response?.data?.message ||
            'Unable to connect to the backend server. Ensure Spring Boot is running.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [languageFilter]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTranscriptions();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTranscriptions]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete transcription record #${id}?`)) {
      return;
    }

    setDeletingId(id);
    setSuccessMsg(null);
    setError(null);
    try {
      await transcriptionApi.delete(id);
      if (isMountedRef.current) {
        setTranscriptions((prev) => prev.filter((item) => item.id !== id));
        setSuccessMsg(`Transcription #${id} deleted successfully.`);
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to delete transcription.');
      }
    } finally {
      if (isMountedRef.current) {
        setDeletingId(null);
      }
    }
  };

  const filteredTranscriptions = transcriptions.filter((item) => {
    const matchesSearch = item.originalText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = !languageFilter || item.languageCode === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  const getLanguageDetails = (code: string) => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return found ? `${found.flag} ${found.name}` : code;
  };

  return (
    <div className="container py-4">
      {/* Page Header */}
      <div className="row mb-4">
        <div className="col-12 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h1 className="h2 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FileText /> Transcription Records Dashboard
            </h1>
            <p className="text-muted mb-0">
              Manage, search, and audit all saved speech-to-text transcripts persisted in MySQL
            </p>
          </div>
          <div>
            <button
              className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
              onClick={() => fetchTranscriptions()}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spinner-border spinner-border-sm' : ''} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2" role="alert">
          <CheckCircle2 size={18} />
          <div>{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)} aria-label="Close"></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card card-custom bg-white mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            {/* Search Input */}
            <div className="col-md-6 col-lg-7">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search transcript text by keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Language Filter */}
            <div className="col-md-6 col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Filter size={18} className="text-muted" />
                </span>
                <select
                  className="form-select border-start-0"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <option value="">All Languages</option>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card card-custom bg-white">
        <div className="card-body p-0">
          {loading && transcriptions.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-2" role="status"></div>
              <p className="text-muted">Fetching historical transcriptions from MySQL...</p>
            </div>
          ) : filteredTranscriptions.length === 0 ? (
            <div className="text-center py-5">
              <FileText size={48} className="text-secondary opacity-50 mb-2" />
              <h5 className="fw-semibold text-dark">No Transcriptions Found</h5>
              <p className="text-muted mb-0">
                {searchQuery || languageFilter
                  ? 'No records match your search filter criteria.'
                  : 'Start a live session to record and save transcriptions.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-4" style={{ width: '80px' }}>ID</th>
                    <th scope="col">Transcribed Text</th>
                    <th scope="col" style={{ width: '220px' }}>Language</th>
                    <th scope="col" style={{ width: '200px' }}>Created Date</th>
                    <th scope="col" className="text-end pe-4" style={{ width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTranscriptions.map((item) => (
                    <tr key={item.id}>
                      <td className="ps-4 fw-semibold text-secondary font-monospace">
                        #{item.id}
                      </td>
                      <td>
                        <div
                          className="text-truncate text-dark fw-medium"
                          style={{ maxWidth: '480px' }}
                          title={item.originalText}
                        >
                          {item.originalText}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                          <Globe size={13} className="text-primary" /> {getLanguageDetails(item.languageCode)}
                        </span>
                      </td>
                      <td className="text-muted small">
                        <span className="d-inline-flex align-items-center gap-1">
                          <Calendar size={14} /> {item.createdAt}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => setSelectedItem(item)}
                            title="View Full Transcription"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            title="Delete Record"
                          >
                            {deletingId === item.id ? (
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Statistics */}
        <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center small text-muted">
          <span>
            Showing <strong className="text-dark">{filteredTranscriptions.length}</strong> of{' '}
            <strong className="text-dark">{transcriptions.length}</strong> total records
          </span>
          <span className="badge bg-secondary-subtle text-secondary font-monospace">
            MySQL 8+ Persistent Storage
          </span>
        </div>
      </div>

      {/* Full Text View Modal */}
      {selectedItem && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content card-custom border-0">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <FileText className="text-primary" /> Transcription Record #{selectedItem.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedItem(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3 d-flex gap-3 text-muted small">
                  <div>
                    <strong>Language:</strong> {getLanguageDetails(selectedItem.languageCode)}
                  </div>
                  <div>
                    <strong>Recorded:</strong> {selectedItem.createdAt}
                  </div>
                </div>
                <div className="p-3 bg-light rounded border text-dark fs-5 lh-base whitespace-pre-wrap">
                  {selectedItem.originalText}
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-inline-flex align-items-center gap-1"
                  onClick={() => handleDelete(selectedItem.id)}
                >
                  <Trash2 size={16} /> Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

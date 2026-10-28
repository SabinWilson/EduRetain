import React, { useState } from 'react';
import api from '../services/api';
import StatusPill from '../components/StatusPill';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  BrainCircuit,
  ArrowRight,
  FileText,
} from 'lucide-react';

export default function AdminImportPage() {
  const [importType, setImportType] = useState('students');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const typeConfig = {
    students: {
      endpoint: '/import/students',
      label: 'Students Roster',
      headers: 'name,email,rollNo,department,program,year,semester,gender',
      sample: "Liam O'Connor,liam.o@institution.edu,STU-2024-9001,Computer Science,UG,2,3,Male",
      desc: 'Imports core student enrollments and initializes academic profiles.',
    },
    attendance: {
      endpoint: '/import/attendance',
      label: 'Attendance Records',
      headers: 'rollNo,subject,month,percentage,totalClasses,attendedClasses',
      sample: 'STU-2024-9001,Data Structures & Algorithms,September,58,30,17',
      desc: 'Imports lecture attendance logs; triggers instant ML risk re-scoring.',
    },
    grades: {
      endpoint: '/import/grades',
      label: 'Grades & Academic Standing',
      headers: 'rollNo,subject,semester,internalMarks,examMarks,gpa,backlog',
      sample: 'STU-2024-9001,Data Structures & Algorithms,3,42,38,4.0,true',
      desc: 'Imports term grades, CGPA marks, and course backlog flags; recalculates risk.',
    },
    lms: {
      endpoint: '/import/lms',
      label: 'LMS Engagement Activity',
      headers: 'rollNo,week,logins,assignmentsSubmitted,assignmentsMissed,timeSpentMinutes',
      sample: 'STU-2024-9001,1,3,1,2,65',
      desc: 'Imports weekly course portal logins and assignments activity logs.',
    },
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a CSV file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const config = typeConfig[importType];
      const res = await api.post(config.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setResult(res.data);
        setFile(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  };

  const currentCfg = typeConfig[importType];

  return (
    <div>
      {/* Page Header */}
      <div className="rm-page-header">
        <div>
          <h1 className="rm-page-title">
            <FileSpreadsheet size={24} color="var(--color-primary)" />
            <span>Bulk CSV Data Ingestion</span>
          </h1>
          <p className="rm-page-subtitle">
            Upload institutional spreadsheets to update student cohorts and trigger automated ML risk recalculation
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* RentMate Style Clean Form */}
        <div className="rm-form" style={{ marginTop: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 16px' }}>
            1. Select Dataset Category
          </h3>

          {/* Dataset Type Selector Chips */}
          <div className="rm-filters" style={{ marginBottom: 20 }}>
            {Object.entries(typeConfig).map(([key, cfg]) => (
              <button
                type="button"
                key={key}
                className={`rm-chip ${importType === key ? 'active' : ''}`}
                onClick={() => {
                  setImportType(key);
                  setResult(null);
                  setError('');
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            {currentCfg.desc}
          </p>

          {error && (
            <div className="rm-alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="rm-alert-success">
              <CheckCircle size={16} color="var(--color-teal)" />
              <div>
                <strong>Import Succeeded!</strong> {result.message || 'Records processed.'}
                {result.recomputedCount !== undefined && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {result.recomputedCount} student risk scores recalculated via ML pipeline.
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleUpload}>
            <label className="rm-label">2. Upload CSV File</label>
            <div
              className="rm-upload-box"
              onClick={() => document.getElementById('csvFileInput')?.click()}
            >
              <UploadCloud size={32} color="var(--color-primary)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {file ? file.name : 'Click to select CSV spreadsheet'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB ready for import` : 'Accepts comma-delimited .csv files'}
                </div>
              </div>
              <input
                id="csvFileInput"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setError('');
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="rm-btn-primary"
              style={{ width: '100%', padding: '12px 20px', marginTop: 16, opacity: (!file || uploading) ? 0.6 : 1 }}
            >
              <span>{uploading ? 'Processing Ingestion...' : 'Import Dataset & Recompute Risk'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Expected CSV Schema & Instructions Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 28, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="var(--color-primary)" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                Schema & Header Requirements
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Required column formatting for {currentCfg.label}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span className="rm-label">Required CSV Header Columns</span>
            <div style={{ background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-primary-dark)', wordBreak: 'break-all' }}>
              {currentCfg.headers}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <span className="rm-label">Sample Data Record</span>
            <div style={{ background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
              {currentCfg.sample}
            </div>
          </div>

          <div style={{ background: 'var(--color-primary-light)', border: '1px solid rgba(0, 168, 150, 0.25)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: 4 }}>
              <BrainCircuit size={15} />
              Automated Re-Scoring Trigger
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text)', margin: 0, lineHeight: 1.4 }}>
              When attendance, grade, or LMS files are ingested, the system automatically runs each affected student through the machine learning model pipeline to update their dropout risk category and alert status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

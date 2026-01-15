import { CheckCircle, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Feedback {
  diagnosis: string;
  correctedDiagnosis?: string;
  confidence: number;
  notes: string;
  timestamp: number;
}

interface ClinicianFeedbackProps {
  analysisId: string;
  currentDiagnosis: string;
  onSubmit: (_feedback: Feedback) => void;
  onDismiss: () => void;
}

export function ClinicianFeedback({
  currentDiagnosis,
  onSubmit,
  onDismiss,
}: ClinicianFeedbackProps) {
  const [correctedDiagnosis, setCorrectedDiagnosis] = useState('');
  const [confidence, setConfidence] = useState(0.8);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      diagnosis: currentDiagnosis,
      correctedDiagnosis: correctedDiagnosis || undefined,
      confidence,
      notes,
      timestamp: Date.now(),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-bold text-green-800">Feedback Submitted</span>
        </div>
        <p className="text-xs text-green-700 mb-3">
          Thank you for helping improve our AI diagnostics.
        </p>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-stone-800">Clinician Feedback</h3>
        <button onClick={onDismiss} className="text-stone-400 hover:text-stone-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-stone-500 mb-4">
        Help us improve by reviewing this diagnosis.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
            AI Diagnosis
          </label>
          <input
            value={currentDiagnosis}
            disabled
            className="w-full px-2 py-1.5 text-xs bg-stone-100 border border-stone-200 rounded-lg text-stone-600 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
            Corrected Diagnosis (optional)
          </label>
          <input
            value={correctedDiagnosis}
            onChange={(e) => {
              setCorrectedDiagnosis(e.target.value);
            }}
            placeholder="Enter corrected diagnosis..."
            className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-terracotta-300"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
            Confidence Score
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidence}
              onChange={(e) => {
                setConfidence(parseFloat(e.target.value));
              }}
              className="flex-1 accent-terracotta-500"
            />
            <span className="text-xs font-mono font-bold text-stone-700 w-10 text-right">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            placeholder="Add clinical notes..."
            rows={2}
            className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:border-terracotta-300"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 py-1.5 text-xs font-bold text-white bg-terracotta-500 hover:bg-terracotta-600 rounded-lg transition-colors"
          >
            Submit Feedback
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}

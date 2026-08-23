import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, CheckCircle, MessageSquare, Download, Loader2 } from 'lucide-react';

const FormFillerPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case_id');

  const [step, setStep] = useState('UPLOAD'); // UPLOAD, CONFIRM, CHAT, REVIEW
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formId, setFormId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [detectedFields, setDetectedFields] = useState([]);
  const [confirmedFields, setConfirmedFields] = useState([]);

  // Chat State
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState('');
  
  // Review State
  const [completedDoc, setCompletedDoc] = useState(null);

  const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'}${url.replace('/api', '')}`, { ...options, headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'API Request Failed');
    }
    return res.json();
  };

  // --- Step 1: Upload ---
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caseId) formData.append('case_id', caseId);

      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'}/forms/upload`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFormId(data.id);
      setDetectedFields(data.detected_fields || []);
      setConfirmedFields(data.detected_fields || []);
      setStep('CONFIRM');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Confirm Fields ---
  const toggleField = (fieldId) => {
    setConfirmedFields(prev => {
      const exists = prev.find(f => f.id === fieldId);
      if (exists) return prev.filter(f => f.id !== fieldId);
      const original = detectedFields.find(f => f.id === fieldId);
      return [...prev, original];
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const data = await authFetch(`/api/forms/${formId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_fields: confirmedFields })
      });
      
      setSessionId(data.session_id);
      setStep('CHAT');
      fetchNextQuestion(data.session_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Conversational Chat ---
  const fetchNextQuestion = async (sid = sessionId) => {
    setLoading(true);
    try {
      const data = await authFetch(`/api/forms/sessions/${sid}/next-question`);
      if (data.status === 'COMPLETE') {
        generateForm(sid);
      } else {
        setCurrentQuestion(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await authFetch(`/api/forms/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: currentQuestion.field_id, user_response: userInput })
      });

      if (data.status === 'INVALID') {
        setError(`${data.error}. ${data.suggestion}`);
        setLoading(false);
        return;
      }

      setUserInput('');
      fetchNextQuestion();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // --- Step 4: Generate & Review ---
  const generateForm = async (sid = sessionId) => {
    setStep('REVIEW');
    setLoading(true);
    try {
      const data = await authFetch(`/api/forms/sessions/${sid}/generate`, { method: 'POST' });
      setCompletedDoc(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Conversational Form Filler</h1>
      <p className="text-gray-400 mb-8">Upload official government PDFs and let AI guide you through them.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center bg-gray-900/50">
          <UploadCloud className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h3 className="text-xl font-medium mb-2">Upload a Government Form (PDF)</h3>
          <p className="text-gray-400 mb-6">Interactive PDF forms are fully supported.</p>
          
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleUpload}
            className="hidden" 
            id="form-upload"
            disabled={loading}
          />
          <label 
            htmlFor="form-upload" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Select PDF Form'}
          </label>
        </div>
      )}

      {/* STEP 2: CONFIRM */}
      {step === 'CONFIRM' && (
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-500" /> Confirm Detected Fields
          </h2>
          <p className="text-gray-400 mb-6">We detected {detectedFields.length} interactive fields in the PDF. Uncheck any you do not want to fill.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 max-h-96 overflow-y-auto pr-2">
            {detectedFields.map(field => {
              const isConfirmed = confirmedFields.some(f => f.id === field.id);
              return (
                <label key={field.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isConfirmed ? 'bg-blue-900/20 border-blue-800' : 'bg-gray-800 border-gray-700 opacity-50'}`}>
                  <input 
                    type="checkbox" 
                    checked={isConfirmed} 
                    onChange={() => toggleField(field.id)}
                    className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500 bg-gray-700 border-gray-600"
                  />
                  <div className="flex-1 truncate">
                    <div className="font-medium truncate">{field.name}</div>
                    <div className="text-xs text-gray-400 uppercase">{field.type}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <button 
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Start Interview'}
          </button>
        </div>
      )}

      {/* STEP 3: CHAT */}
      {step === 'CHAT' && currentQuestion && (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col h-[600px]">
          <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-blue-400 w-5 h-5" />
              <span className="font-medium">Form Interview</span>
            </div>
            <div className="text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
              Field: {currentQuestion.field_name}
            </div>
          </div>
          
          <div className="flex-1 p-6 flex flex-col justify-end">
            <div className="flex items-end gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                AI
              </div>
              <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-sm max-w-[80%] border border-gray-700 shadow-lg text-lg">
                {currentQuestion.question}
              </div>
            </div>
          </div>

          <form onSubmit={submitAnswer} className="p-4 bg-gray-800/50 border-t border-gray-700">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                disabled={loading}
                placeholder="Type your answer conversationally..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={loading || !userInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 px-8 rounded-xl font-medium disabled:opacity-50 transition-colors flex items-center justify-center w-32"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4: REVIEW */}
      {step === 'REVIEW' && (
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
              <h2 className="text-2xl font-bold">Generating Final Document...</h2>
              <p className="text-gray-400">Merging your answers into the original PDF.</p>
            </div>
          ) : completedDoc ? (
            <div className="py-8">
              <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Form Completed!</h2>
              <p className="text-gray-400 mb-8">Your form has been fully populated and flattened.</p>
              
              <a 
                href={completedDoc.pdf_base64 ? `data:application/pdf;base64,${completedDoc.pdf_base64}` : completedDoc.document_url} 
                download={completedDoc.file_name || "Completed_Form.pdf"}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-colors inline-flex items-center gap-3 text-lg"
              >
                <Download className="w-6 h-6" /> Download Final PDF
              </a>

              {caseId && (
                <div className="mt-6 text-gray-500">
                  This document has been automatically attached to Case ID: {caseId}
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-500">Failed to load completed document.</div>
          )}
        </div>
      )}

    </div>
  );
};

export default FormFillerPage;

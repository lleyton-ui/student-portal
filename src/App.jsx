import React, { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { ShieldCheck, QrCode, User, Calendar, FileText, Send, Sparkles, RefreshCcw } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBI29DCdZ1NasWe2xUmp4reOeZC90D-soE",
  authDomain: "studentanddean-93a6a.firebaseapp.com",
  projectId: "studentanddean-93a6a",
  storageBucket: "studentanddean-93a6a.firebasestorage.app",
  messagingSenderId: "954846539416",
  appId: "1:954846539416:web:d13aa228a12a4b7bb4aaed"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Added missing auth init

/** CRYPTO **/
async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appointment-salt-v4"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encryptData(text, password) {
  const key = await deriveKey(password);
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode.apply(null, combined)); // Fixed conversion for large arrays
}

export default function App() {
  const [form, setForm] = useState({ name: '', date: '', reason: '' });
  const [generatedKey, setGeneratedKey] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInAnonymously(auth);
      const transferKey = Math.random().toString(36).substring(2, 8).toUpperCase();
      const encDate = await encryptData(form.date, transferKey);
      const encReason = await encryptData(form.reason, transferKey);

      await addDoc(collection(db, "appointments"), {
        name: form.name,
        dateEnc: encDate,
        reasonEnc: encReason,
        status: "pending",
        submittedAt: new Date().toISOString()
      });
      setGeneratedKey(transferKey);
    } catch (err) {
      console.error(err);
      alert("Submission failed. Ensure Firestore rules allow writes.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-200 flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full z-10">
        {!generatedKey ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl mb-4 border border-indigo-500/20">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Secure Portal</h1>
              <p className="text-slate-400 text-sm mt-1">End-to-end encrypted appointment request</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Student Identity</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    required
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Preferred Schedule</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    required
                    type="datetime-local"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all appearance-none"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Purpose of Visit</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-slate-500" size={18} />
                  <textarea
                    required
                    placeholder="Brief description..."
                    rows="3"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-600"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCcw className="animate-spin" size={20} />
                ) : (
                  <>
                    <Send size={18} />
                    <span>ENCRYPT & SUBMIT</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-10 rounded-3xl text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="relative inline-block mb-6">
               <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
               <QrCode size={80} className="relative text-indigo-400 mx-auto" />
            </div>

            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              Success! <Sparkles className="text-yellow-400" size={20} />
            </h2>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              Your data has been encrypted locally. <br /> Share this key with the Dean to unlock it.
            </p>

            <div className="mt-8 p-6 bg-slate-950/80 border border-indigo-500/30 rounded-2xl">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Access Key</span>
              <div className="text-5xl font-mono mt-2 text-white font-bold tracking-widest select-all">
                {generatedKey}
              </div>
            </div>

            <button
              onClick={() => { setGeneratedKey(null); setForm({ name: '', date: '', reason: '' }); }}
              className="mt-8 text-slate-400 hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors group"
            >
              <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              <span>Create New Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

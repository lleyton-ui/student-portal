import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Lock, ShieldCheck, QrCode, Copy, User, Calendar, FileText } from 'lucide-react';


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJlP3n63NuYGIL4TFR7jokCNe9LW-ylaE",
  authDomain: "dean-appointment-system-e8b97.firebaseapp.com",
  projectId: "dean-appointment-system-e8b97",
  storageBucket: "dean-appointment-system-e8b97.firebasestorage.app",
  messagingSenderId: "738705674424",
  appId: "1:738705674424:web:5a4437ffc801ae8c7b244d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/** CRYPTO UTILITIES **/
async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const salt = enc.encode("appointment-salt-v4");
  return window.crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
}

async function encryptData(text, password) {
  const key = await deriveKey(password);
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv); combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
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
        status: 'pending',
        submittedAt: new Date().toISOString()
      });

      setGeneratedKey(transferKey);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {!generatedKey ? (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 text-center">
              <ShieldCheck size={40} className="mx-auto mb-2 text-white" />
              <h2 className="text-2xl font-black uppercase italic">Student Portal</h2>
              <p className="text-indigo-100 text-xs opacity-80 uppercase tracking-widest">Secure AES-256 Submission</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input required className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Juan Dela Cruz" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Preferred Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input required type="datetime-local" className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Confidential Reason</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-500" size={16} />
                  <textarea required rows="3" className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
              </div>
              <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20">
                {loading ? "PROCESSING..." : "ENCRYPT & SEND"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900 p-10 rounded-3xl border-2 border-indigo-500 text-center space-y-8 animate-in zoom-in duration-300">
            <QrCode size={80} className="mx-auto text-indigo-400" />
            <div className="space-y-2">
              <h2 className="text-3xl font-black italic uppercase">Encrypted!</h2>
              <p className="text-slate-400 text-sm">Please report to the Dean and provide this Transfer Key to unlock your details.</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Your Transfer Key</span>
              <div className="text-5xl font-mono font-black tracking-tighter text-white">{generatedKey}</div>
            </div>
            <button onClick={() => setGeneratedKey(null)} className="text-indigo-400 font-bold hover:underline uppercase text-xs tracking-widest">New Submission</button>
          </div>
        )}
      </div>
    </div>
  );
}
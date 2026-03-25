import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { ShieldCheck, User, Calendar, FileText, Loader2, CheckCircle2, XCircle, Clock, ShieldAlert, Zap } from 'lucide-react';

// === CONFIGURATION ===
// USE THE EXACT SAME CONFIG AS YOUR DEAN DASHBOARD
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
  const [submittedId, setSubmittedId] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [transferKey, setTransferKey] = useState('');
  const [loading, setLoading] = useState(false);

  // LISTEN FOR STATUS CHANGES IN REAL-TIME
  useEffect(() => {
    if (!submittedId) return;

    const unsub = onSnapshot(doc(db, "appointments", submittedId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentStatus(data.status);
      }
    });

    return () => unsub();
  }, [submittedId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInAnonymously(auth);
      const generatedKey = Math.random().toString(36).substring(2, 8).toUpperCase();
      const encDate = await encryptData(form.date, generatedKey);
      const encReason = await encryptData(form.reason, generatedKey);

      const docRef = await addDoc(collection(db, "appointments"), {
        name: form.name,
        dateEnc: encDate,
        reasonEnc: encReason,
        status: 'pending',
        submittedAt: new Date().toISOString()
      });

      setTransferKey(generatedKey);
      setSubmittedId(docRef.id);
    } catch (err) {
      console.error(err);
      alert("Submission failed. Check internet/Firebase config.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md w-full relative">
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-600/10 rounded-full blur-[100px]" />

        {!submittedId ? (
          /* --- INPUT FORM --- */
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-800 shadow-2xl relative z-10">
            <div className="p-8 text-center border-b border-slate-800/50">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-600/20">
                <ShieldCheck size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Student Portal</h2>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Secure AES-256-GCM Channel</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <input required className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-indigo-500/50 transition-all text-sm" placeholder="Juan Dela Cruz" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Appointment Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <input required type="datetime-local" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-indigo-500/50 transition-all text-sm text-slate-300" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Reason (Encrypted)</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <textarea required rows="3" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-indigo-500/50 resize-none transition-all text-sm" placeholder="This reason will be encrypted before sending..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 mt-2">
                {loading ? <Loader2 className="animate-spin" /> : <><Zap size={18}/> ENCRYPT & SEND</>}
              </button>
            </form>
          </div>
        ) : (
          /* --- REAL-TIME STATUS SCREEN --- */
          <div className="animate-in fade-in zoom-in duration-700 relative z-10">
            <div className={`p-8 md:p-10 rounded-[3rem] border-2 transition-all duration-1000 text-center ${
              currentStatus === 'Approved' ? 'bg-emerald-500/5 border-emerald-500/50 shadow-2xl shadow-emerald-500/10' :
              currentStatus === 'Rejected' ? 'bg-rose-500/5 border-rose-500/50 shadow-2xl shadow-rose-500/10' :
              'bg-slate-900 border-indigo-500/50 shadow-2xl shadow-indigo-500/10'
            }`}>
              
              {/* Status Header */}
              <div className="mb-8">
                {currentStatus === 'pending' ? (
                  <div className="relative flex justify-center py-4">
                    <div className="absolute inset-0 flex items-center justify-center animate-ping opacity-20">
                      <div className="w-24 h-24 bg-indigo-500 rounded-full" />
                    </div>
                    <div className="relative w-20 h-20 bg-indigo-600/10 border-2 border-indigo-500 rounded-3xl flex items-center justify-center shadow-inner">
                      <Clock size={40} className="text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                ) : currentStatus === 'Approved' ? (
                  <div className="w-20 h-20 bg-emerald-600/10 border-2 border-emerald-500 rounded-3xl flex items-center justify-center mx-auto animate-in bounce-in duration-500">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-rose-600/10 border-2 border-rose-500 rounded-3xl flex items-center justify-center mx-auto animate-in bounce-in duration-500">
                    <XCircle size={40} className="text-rose-500" />
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-8">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">
                  {currentStatus === 'Approved' ? 'Request Approved' : 
                   currentStatus === 'Rejected' ? 'Request Declined' : 
                   'Awaiting Review'}
                </h2>
                <div className="flex items-center justify-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${currentStatus === 'pending' ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                     {currentStatus === 'pending' ? 'Live Connection Established' : 'Decision Received'}
                   </p>
                </div>
              </div>

              {/* Central Box */}
              <div className="bg-black/40 rounded-3xl border border-slate-800 p-8 space-y-4 mb-8">
                {currentStatus === 'pending' ? (
                  <div className="space-y-4">
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                      Your request is currently <span className="text-indigo-400 font-bold italic">encrypted</span> on the server. The Dean cannot read it until you provide this key:
                    </p>
                    <div className="text-5xl font-mono font-black tracking-widest text-white py-2 select-all drop-shadow-lg">
                      {transferKey}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest border-t border-slate-800/50 pt-4">
                       <ShieldAlert size={12}/> Locked with AES-256
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className={`text-sm font-bold ${currentStatus === 'Approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentStatus === 'Approved' ? 
                        'Success! Please proceed to the Dean\'s office at your scheduled time.' : 
                        'Your request has been rejected. You may submit a new one with different details.'
                      }
                    </p>
                    <button onClick={() => { setSubmittedId(null); setForm({name:'', date:'', reason:''}); }} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                      Return to Portal
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em] leading-loose px-4">
                Encryption keys are generated on-device and are never stored in plain text.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { GoogleButton } from './GoogleButton';
import { LogIn, AlertCircle, KeyRound, ArrowLeft, MailCheck } from 'lucide-react';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';

interface LoginProps {
  onGoogleLogin: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
  onVerificationNeeded: (email: string) => void;
}

type LoginView = 'LOGIN' | 'RESET_REQUEST' | 'RESET_SUCCESS';

export const Login: React.FC<LoginProps> = ({ onGoogleLogin, onSwitchToRegister, onBack, onVerificationNeeded }) => {
  const [view, setView] = useState<LoginView>('LOGIN');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        onVerificationNeeded(email);
        return;
      }
      
      // If verified, App.tsx onAuthStateChanged will handle redirection
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
         setError('Błędny adres email lub hasło');
      } else if (err.code === 'auth/too-many-requests') {
         setError('Zbyt wiele nieudanych prób. Spróbuj ponownie później.');
      } else {
         setError('Wystąpił błąd logowania');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
       setError('Wpisz adres email.');
       setLoading(false);
       return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setView('RESET_SUCCESS');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        // For security reasons, we might usually pretend it worked, but for this UX request we'll show error or success.
        // Let's show a generic error or specific one depending on requirements.
        setError('Nie znaleziono użytkownika o takim adresie email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Nieprawidłowy format adresu email.');
      } else {
        setError('Wystąpił błąd podczas wysyłania linku.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- VIEW: SUCCESS MESSAGE AFTER RESET ---
  if (view === 'RESET_SUCCESS') {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg border border-slate-100 text-center">
         <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
           <MailCheck className="w-8 h-8 text-green-600" />
         </div>
         <h2 className="text-2xl font-bold text-slate-900 mb-4">Link wysłany</h2>
         <p className="text-slate-600 mb-2">
           Wysłaliśmy Ci link do zmiany hasła na adres:
         </p>
         <p className="text-blue-600 font-bold mb-6">{email}</p>
         <p className="text-sm text-slate-500 mb-8">
           Sprawdź skrzynkę odbiorczą (oraz folder Spam). Po zmianie hasła możesz się zalogować.
         </p>
         <Button size="lg" className="w-full" onClick={() => setView('LOGIN')}>
           Wróć do logowania
         </Button>
      </div>
    );
  }

  // --- VIEW: PASSWORD RESET REQUEST ---
  if (view === 'RESET_REQUEST') {
     return (
       <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg border border-slate-100">
          <div className="text-center mb-8">
            <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Zresetuj hasło</h2>
            <p className="text-slate-500 text-sm mt-2">Podaj adres email powiązany z Twoim kontem.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="twoj@email.com"
              />
            </div>
            <Button className="w-full mt-2" size="lg" disabled={loading}>
              {loading ? 'Wysyłanie...' : 'Wyślij link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setError(null); setView('LOGIN'); }} 
              className="text-slate-500 text-sm hover:text-slate-800 flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" /> Anuluj
            </button>
          </div>
       </div>
     );
  }

  // --- VIEW: LOGIN FORM ---
  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg border border-slate-100">
      <div className="text-center mb-8">
        <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Zaloguj się</h2>
        <p className="text-slate-500 text-sm mt-2">Aby zapisać historię swoich wycen</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <GoogleButton onClick={onGoogleLogin} />
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">lub email</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
             <label className="block text-sm font-medium text-slate-700">Hasło</label>
             <button 
               type="button"
               onClick={() => { setError(null); setView('RESET_REQUEST'); }}
               className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
             >
               Nie pamiętam hasła
             </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <Button className="w-full mt-2" size="lg" disabled={loading}>
          {loading ? 'Logowanie...' : 'Zaloguj się'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-slate-500">Nie masz konta? </span>
        <button onClick={onSwitchToRegister} className="text-blue-600 font-medium hover:underline">
          Zarejestruj się
        </button>
      </div>

       <div className="mt-4 text-center">
        <button onClick={onBack} className="text-slate-400 text-xs hover:text-slate-600">
          Wróć do strony głównej
        </button>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { GoogleButton } from './GoogleButton';
import { UserPlus, AlertCircle } from 'lucide-react';
import { auth, db } from '../../firebase';

interface RegisterProps {
  onGoogleLogin: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
  onVerificationNeeded: (email: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ onGoogleLogin, onSwitchToLogin, onBack, onVerificationNeeded }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Podaj imię i nazwisko.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      const displayName = `${firstName.trim()} ${lastName.trim()}`;

      if (userCredential.user) {
        // 1. Update Auth Profile
        await userCredential.user.updateProfile({
          displayName: displayName
        });

        // 2. Create User Document in Firestore explicitly with split names
        await db.collection('users').doc(userCredential.user.uid).set({
           uid: userCredential.user.uid,
           email: email,
           displayName: displayName,
           firstName: firstName.trim(),
           lastName: lastName.trim(),
           photoURL: '',
           createdAt: new Date().toISOString()
        });
        
        // 3. Send verification email
        await userCredential.user.sendEmailVerification();
      }
      
      // Sign out immediately so they can't access app
      await auth.signOut();
      
      // Redirect to verification screen
      onVerificationNeeded(email);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Użytkownik o podanym adresie e-mail już istnieje. Chcesz się zalogować?');
      } else if (err.code === 'auth/weak-password') {
        setError('Hasło jest za słabe.');
      } else {
        setError('Wystąpił błąd podczas rejestracji. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg border border-slate-100">
      <div className="text-center mb-8">
         <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Utwórz konto</h2>
        <p className="text-slate-500 text-sm mt-2">Dołącz do Feemo i zarządzaj wycenami</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          {error.includes('Chcesz się zalogować?') && (
            <button onClick={onSwitchToLogin} className="underline font-bold ml-1 hover:text-red-900">
              Tak
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <GoogleButton onClick={onGoogleLogin} label="Zarejestruj się przez Google" />
        
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
         <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
         </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hasło</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Powtórz hasło</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        
        <Button className="w-full mt-2 bg-green-600 hover:bg-green-700" size="lg" disabled={loading}>
          {loading ? 'Rejestracja...' : 'Zarejestruj się'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-slate-500">Masz już konto? </span>
        <button onClick={onSwitchToLogin} className="text-green-600 font-medium hover:underline">
          Zaloguj się
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

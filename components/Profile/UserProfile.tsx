
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { ArrowLeft, User as UserIcon, Save, Trash2, AlertTriangle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { Modal, ModalVariant } from '../ui/Modal';

interface UserProfileProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onBack, onLogout }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize names if user has only 'name' but no split fields (Legacy data)
  useEffect(() => {
    if ((!user.firstName || !user.lastName) && user.name) {
       const parts = user.name.split(' ');
       if (parts.length > 0) {
           if (!firstName) setFirstName(parts[0]);
           if (!lastName && parts.length > 1) setLastName(parts.slice(1).join(' '));
       }
    }
  }, [user.name, user.firstName, user.lastName]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: ModalVariant;
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'info'
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      // 1. Update Firebase Auth
      await auth.currentUser.updateProfile({
        displayName: displayName,
        photoURL: photoURL
      });

      // 2. Update Firestore
      await db.collection('users').doc(user.id).update({
        displayName: displayName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        photoURL: photoURL
      });

      setSuccess('Profil zaktualizowany pomyślnie.');
      // Reload to reflect changes globally
      setTimeout(() => {
         window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError('Wystąpił błąd podczas aktualizacji profilu.');
    } finally {
      setLoading(false);
    }
  };

  const performDeleteAccount = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      // 1. Delete Firestore User Data
      await db.collection('users').doc(user.id).delete();
      await db.collection('configurations').doc(user.id).delete();
      
      // 2. Delete Auth User
      await auth.currentUser.delete();
      onLogout();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Ta operacja wymaga ponownego zalogowania. Wyloguj się i zaloguj ponownie.');
      } else {
        setError('Błąd usuwania konta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
     setModalConfig({
        isOpen: true,
        title: 'Usunąć konto?',
        description: 'Czy na pewno chcesz usunąć swoje konto? Wszystkie Twoje dane, w tym zapisane projekty i szablony, zostaną trwale usunięte. Tej operacji nie da się cofnąć.',
        variant: 'danger',
        confirmLabel: 'Usuń trwale',
        onConfirm: performDeleteAccount
     });
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Modal 
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          description={modalConfig.description}
          variant={modalConfig.variant}
          onConfirm={modalConfig.onConfirm}
          confirmLabel={modalConfig.confirmLabel}
       />

      <Button variant="ghost" onClick={onBack} className="mb-6 pl-0 gap-2 text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Wróć
      </Button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600" /> Profil Użytkownika
          </h2>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
               <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm">
               {success}
            </div>
          )}

          {/* Photo */}
          <div className="flex flex-col items-center justify-center mb-6">
             <div className="relative group">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-slate-200">
                     <UserIcon className="w-10 h-10" />
                  </div>
                )}
             </div>
             <div className="mt-4 w-full max-w-sm">
                <label className="block text-xs font-bold text-slate-500 mb-1">URL Zdjęcia Profilowego</label>
                <div className="flex gap-2">
                   <input 
                     className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                     value={photoURL}
                     onChange={(e) => setPhotoURL(e.target.value)}
                     placeholder="https://example.com/photo.jpg"
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                <input 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                <input 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
             </div>
             
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Adres Email</label>
                <input 
                  className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-4 py-2 cursor-not-allowed"
                  value={user.email}
                  disabled
                />
             </div>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-slate-100 mt-2">
             <Button variant="ghost" onClick={confirmDeleteAccount} className="text-red-500 hover:bg-red-50 hover:text-red-600 gap-2">
                <Trash2 className="w-4 h-4" /> Usuń konto
             </Button>
             
             <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2">
                <Save className="w-4 h-4" /> {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

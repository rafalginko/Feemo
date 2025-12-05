
import React from 'react';
import { Button } from '../ui/Button';
import { MailCheck } from 'lucide-react';

interface EmailVerificationProps {
  email: string;
  onGoToLogin: () => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ email, onGoToLogin }) => {
  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg border border-slate-100 text-center">
      <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
        <MailCheck className="w-8 h-8 text-blue-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Zweryfikuj adres email</h2>
      
      <p className="text-slate-600 mb-2">
        Wysłaliśmy Ci wiadomość e-mail z linkiem weryfikacyjnym na adres:
      </p>
      <p className="text-blue-600 font-bold mb-8">{email}</p>
      
      <p className="text-sm text-slate-500 mb-8">
        Zweryfikuj ją i zaloguj się, aby uzyskać dostęp do aplikacji.
      </p>

      <Button size="lg" className="w-full" onClick={onGoToLogin}>
        Przejdź do logowania
      </Button>
    </div>
  );
};

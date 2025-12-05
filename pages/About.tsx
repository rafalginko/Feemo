
import React from 'react';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Building2, ListChecks, Sliders, Briefcase, FileText, Users, Calculator } from 'lucide-react';

export const About: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 pb-20">
      <Button variant="ghost" onClick={onBack} className="mb-6 gap-2 pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Powrót do kalkulatora
      </Button>

      <div className="text-center mb-12">
        <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
          <Calculator className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Filozofia Wyceny Feemo</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Odeszliśmy od prostego mnożenia metrów kwadratowych. Nasze narzędzie opiera się na <strong>Analizie Funkcjonalnej</strong> i metodzie kosztowej (Cost-Plus), co pozwala na precyzyjne oszacowanie pracochłonności projektu.
        </p>
      </div>
      
      <div className="space-y-12">
        
        {/* Step 1 */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
              <Building2 className="w-8 h-8 text-blue-600" />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">1. Kontekst i Szablon</h3>
              <p className="text-slate-600 leading-relaxed">
                Każda wycena zaczyna się od wybrania <strong>Rodzaju Obiektu</strong> (np. Dom jednorodzinny, Hala) oraz <strong>Typu Projektu</strong> (np. Budowa, Przebudowa). 
                Na tej podstawie system dobiera odpowiedni <em>Szablon Obliczeniowy</em>. Metraż budynku pełni tu rolę drugoplanową – służy głównie do obliczenia "Efektu Skali" (większe obiekty projektuje się szybciej w przeliczeniu na m²).
              </p>
           </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
              <ListChecks className="w-8 h-8 text-indigo-600" />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">2. Zakres Funkcjonalny (RBH)</h3>
              <p className="text-slate-600 leading-relaxed mb-3">
                To serce kalkulatora. Zamiast zgadywać, budujesz projekt z klocków. Zaznaczasz konkretne elementy wpływające na czas pracy:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                 <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>Liczba łazienek / kuchni</li>
                 <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>Skomplikowanie dachu</li>
                 <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>Instalacje (Smart Home, Rekuperacja)</li>
                 <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>Detale elewacyjne i tarasy</li>
              </ul>
           </div>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
              <Sliders className="w-8 h-8 text-amber-500" />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">3. Modyfikatory Globalne</h3>
              <p className="text-slate-600 leading-relaxed">
                Wyliczoną bazę godzinową korygujemy o specyfikę zlecenia:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li><strong>Złożoność:</strong> Subiektywna ocena trudności bryły i uwarunkowań.</li>
                <li><strong>LOD (Level of Detail):</strong> Standard dokumentacji vs BIM / High-End.</li>
                <li><strong>Tryb Express:</strong> Dodatek za pracę pod presją czasu.</li>
                <li><strong>Efekt Skali:</strong> Automatyczna korekta dla bardzo małych (trudniejszych) lub bardzo dużych obiektów.</li>
              </ul>
           </div>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
              <Briefcase className="w-8 h-8 text-emerald-600" />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">4. Etapy i Koszty Zewnętrzne</h3>
              <p className="text-slate-600 leading-relaxed mb-3">
                Całkowity czas pracy jest dzielony na etapy (Koncepcja, PB, PW) zgodnie z wagami zapisanymi w szablonie.
              </p>
              <p className="text-slate-600 leading-relaxed">
                W tym kroku możesz również zarządzać <strong>Kosztami Zewnętrznymi</strong>. Dodajesz oferty od podwykonawców (geodeta, konstruktor, branżyści) i tworzysz warianty cenowe, które wliczasz do sumy końcowej.
              </p>
           </div>
        </div>

        {/* Step 5 */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
              <FileText className="w-8 h-8 text-slate-600" />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">5. Wynik i Rentowność</h3>
              <p className="text-slate-600 leading-relaxed">
                Ostateczna kwota to suma: <br/>
                <code>(Godziny Twojego Zespołu × Ich Stawki) + Koszty Zewnętrzne</code>.
              </p>
              <p className="mt-2 text-slate-600">
                Dzięki temu wiesz, gdzie leży próg rentowności (Break-even point). System pozwala pobrać szczegółowe zestawienie w formacie CSV.
              </p>
           </div>
        </div>

      </div>

      <div className="mt-16 p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <Users className="w-10 h-10 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Dostosuj Feemo do siebie</h3>
        <p className="text-slate-600 max-w-lg mx-auto mb-6">
          Wszystkie parametry: stawki zespołu, szablony obiektów, wagi etapów i elementy funkcjonalne są w pełni konfigurowalne w panelu Ustawień.
        </p>
        <Button onClick={onBack}>Wróć do pracy</Button>
      </div>
    </div>
  );
};

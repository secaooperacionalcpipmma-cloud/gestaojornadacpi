import React, { useState } from 'react';
import {
  Settings,
  FileText,
  DollarSign,
  Clock,
  Shield,
  Save,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { OrdinancePeriod, User } from '../../types';

interface OrdinanceSettingsProps {
  ordinances: OrdinancePeriod[];
  activeOrdinance: OrdinancePeriod;
  currentUser: User;
  onUpdateOrdinance: (ord: OrdinancePeriod) => void;
}

export const OrdinanceSettings: React.FC<OrdinanceSettingsProps> = ({
  ordinances,
  activeOrdinance,
  currentUser,
  onUpdateOrdinance,
}) => {
  const [number, setNumber] = useState(activeOrdinance.number);
  const [description, setDescription] = useState(activeOrdinance.description);
  const [startDate, setStartDate] = useState(activeOrdinance.startDate);
  const [endDate, setEndDate] = useState(activeOrdinance.endDate);
  const [unitValueJoe, setUnitValueJoe] = useState(activeOrdinance.unitValueJoe);
  const [maxDurationHours, setMaxDurationHours] = useState(activeOrdinance.maxDurationHours);
  const [monthlyIndividualLimit, setMonthlyIndividualLimit] = useState(
    activeOrdinance.monthlyIndividualLimit
  );
  const [seiProcess, setSeiProcess] = useState(activeOrdinance.seiProcess);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOrdinance({
      ...activeOrdinance,
      number,
      description,
      startDate,
      endDate,
      unitValueJoe: Number(unitValueJoe),
      maxDurationHours: Number(maxDurationHours),
      monthlyIndividualLimit: Number(monthlyIndividualLimit),
      seiProcess,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#00204A] tracking-tight">
              Configurações da Portaria & Parâmetros da JOE
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Portaria nº 122/2026-GCG
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Parametrização dos valores unitários, limites de duração e processos do Comando Geral.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">Parâmetros da Portaria atualizados com sucesso!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Número da Portaria *</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-hidden focus:border-[#00204A]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Processo SEI Matriz *</label>
            <input
              type="text"
              value={seiProcess}
              onChange={(e) => setSeiProcess(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-hidden focus:border-[#00204A]"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Ementa / Descrição Oficial</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Início de Vigência *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Término de Vigência *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Valor Unitário da JOE (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                value={unitValueJoe}
                onChange={(e) => setUnitValueJoe(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-hidden focus:border-[#00204A]"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Teto unitário da Portaria</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Duração Máxima Contínua (Horas) *
            </label>
            <input
              type="number"
              value={maxDurationHours}
              onChange={(e) => setMaxDurationHours(parseInt(e.target.value) || 6)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-hidden focus:border-[#00204A]"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Art. 2º: até 6 horas</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Teto Individual Mensal (JOEs/PM) *
            </label>
            <input
              type="number"
              value={monthlyIndividualLimit}
              onChange={(e) => setMonthlyIndividualLimit(parseInt(e.target.value) || 12)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-hidden focus:border-[#00204A]"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Art. 8º: máx 12 JOEs</span>
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 bg-[#00204A] hover:bg-[#002e6b] text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all text-xs"
          >
            <Save className="w-4 h-4 text-[#FFD700]" />
            <span>Salvar Parâmetros da Portaria</span>
          </button>
        </div>
      </form>
    </div>
  );
};

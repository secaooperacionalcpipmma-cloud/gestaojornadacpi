import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { PoliceOfficer, CommandUnit, OrdinancePeriod, User } from '../../types';

interface OfficersManagementProps {
  officers: PoliceOfficer[];
  commands: CommandUnit[];
  ordinance: OrdinancePeriod;
  currentUser: User;
  onAddOfficer: (officer: PoliceOfficer) => void;
  onUpdateOfficer: (officer: PoliceOfficer) => void;
}

export const OfficersManagement: React.FC<OfficersManagementProps> = ({
  officers,
  commands,
  ordinance,
  currentUser,
  onAddOfficer,
  onUpdateOfficer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCpa, setSelectedCpa] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [rank, setRank] = useState('SGT PM');
  const [registration, setRegistration] = useState('');
  const [cpf, setCpf] = useState('');
  const [commandId, setCommandId] = useState('CPA/I-1');
  const [subUnit, setSubUnit] = useState('23º BPM');
  const [officerStatus, setOfficerStatus] = useState<'APTO' | 'LTS' | 'FERIAS' | 'LICENCA_ESPECIAL' | 'SUSPENSO'>('APTO');
  const [statusReason, setStatusReason] = useState('');

  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      if (selectedCpa !== 'ALL' && off.commandId !== selectedCpa) return false;
      if (selectedStatus !== 'ALL' && off.status !== selectedStatus) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        return (
          off.name.toLowerCase().includes(q) ||
          off.registration.includes(q) ||
          off.cpf.includes(q) ||
          off.subUnit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [officers, selectedCpa, selectedStatus, searchTerm]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !registration) {
      alert('Preencha os campos obrigatórios (Nome e Matrícula).');
      return;
    }

    const newOfficer: PoliceOfficer = {
      id: `off-${Date.now()}`,
      name,
      rank,
      registration,
      cpf,
      commandId,
      unit: subUnit || 'Unidade Operacional',
      status: officerStatus,
      statusReason: officerStatus !== 'APTO' ? statusReason : undefined,
      monthlyJoesCount: 0,
    };

    onAddOfficer(newOfficer);
    setIsModalOpen(false);
    setName('');
    setRegistration('');
    setCpf('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#00204A] tracking-tight">
              Controle Nominal do Efetivo & Tetos Individuais
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Arts. 6º, 7º e 8º
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Fiscalização de escala prévia, impedimentos de LTS/férias e teto máximo de {ordinance.monthlyIndividualLimit} JOEs por policial ao mês.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 bg-[#00204A] hover:bg-[#002e6b] text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition-all"
        >
          <Plus className="w-4 h-4 text-[#FFD700]" />
          <span>Cadastrar Policial Militar</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou UPM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedCpa}
            onChange={(e) => setSelectedCpa(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
          >
            <option value="ALL">Todos os Comandos</option>
            {commands.map((cmd) => (
              <option key={cmd.id} value={cmd.code}>
                {cmd.code}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
          >
            <option value="ALL">Todas as Situações</option>
            <option value="APTO">Apto (Escalável)</option>
            <option value="LTS">LTS (Licença Tratamento Saúde)</option>
            <option value="FERIAS">Férias</option>
            <option value="LICENCA_ESPECIAL">Licença Especial</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-3">Posto/Grad</th>
              <th className="py-3 px-3">Nome Completo</th>
              <th className="py-3 px-3">Matrícula</th>
              <th className="py-3 px-3">Comando / UPM</th>
              <th className="py-3 px-3 text-center">Status / Impedimentos</th>
              <th className="py-3 px-3 text-center">JOEs no Mês (Teto 12)</th>
              <th className="py-3 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOfficers.map((off) => {
              const isMaxed = off.monthlyJoesCount >= ordinance.monthlyIndividualLimit;
              const isRestricted = off.status !== 'APTO';

              return (
                <tr key={off.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#00204A]">{off.rank}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{off.name}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{off.registration}</td>
                  <td className="py-3 px-3 text-slate-700">
                    <span className="font-bold text-[#00204A]">{off.commandId}</span> • {off.unit}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isRestricted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        {off.status} ({off.statusReason || 'Impedido Art. 7º'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Apto
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`font-mono font-bold text-xs ${
                          isMaxed ? 'text-red-700 font-black' : 'text-slate-700'
                        }`}
                      >
                        {off.monthlyJoesCount} / {ordinance.monthlyIndividualLimit}
                      </span>
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            isMaxed ? 'bg-red-500' : off.monthlyJoesCount > 8 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min((off.monthlyJoesCount / ordinance.monthlyIndividualLimit) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        const newStatus = off.status === 'APTO' ? 'LTS' : 'APTO';
                        onUpdateOfficer({
                          ...off,
                          status: newStatus,
                          statusReason: newStatus === 'LTS' ? 'Atestado Médico JME' : undefined,
                        });
                      }}
                      className="text-[11px] font-bold text-[#00204A] hover:underline"
                    >
                      {off.status === 'APTO' ? 'Lançar LTS' : 'Tornar Apto'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal to register new officer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-[#00204A]">Cadastrar Policial Militar</h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Posto/Grad:</label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  >
                    <option value="CEL PM">CEL PM</option>
                    <option value="TEN CEL PM">TEN CEL PM</option>
                    <option value="MAJ PM">MAJ PM</option>
                    <option value="CAP PM">CAP PM</option>
                    <option value="1º TEN PM">1º TEN PM</option>
                    <option value="2º TEN PM">2º TEN PM</option>
                    <option value="SUB TEN PM">SUB TEN PM</option>
                    <option value="1º SGT PM">1º SGT PM</option>
                    <option value="2º SGT PM">2º SGT PM</option>
                    <option value="3º SGT PM">3º SGT PM</option>
                    <option value="CB PM">CB PM</option>
                    <option value="SD PM">SD PM</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Nome Completo *:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Matrícula *:</label>
                  <input
                    type="text"
                    required
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">CPF:</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Comando (CPA/I):</label>
                  <select
                    value={commandId}
                    onChange={(e) => setCommandId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  >
                    {commands.map((cmd) => (
                      <option key={cmd.id} value={cmd.code}>
                        {cmd.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unidade / Batalhão:</label>
                  <input
                    type="text"
                    value={subUnit}
                    onChange={(e) => setSubUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-hidden focus:border-[#00204A]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#00204A] hover:bg-[#002e6b] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileCheck,
  User,
} from 'lucide-react';
import { AuditLog, Irregularity } from '../../types';

interface AuditLogsViewProps {
  logs: AuditLog[];
  irregularities: Irregularity[];
  onResolveIrregularity: (id: string) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  irregularities,
  onResolveIrregularity,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      return (
        l.userName.toLowerCase().includes(q) ||
        l.recordId.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unresolvedAlerts = irregularities.filter((i) => i.status !== 'RESOLVIDA');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-black text-[#00204A] tracking-tight">
            Trilha de Auditoria, Conformidade & Fiscalização CPI
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            Art. 13, III e IV
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Registro cronológico imutável de todas as ações administrativas, autorizações, ajustes de cotas e validações de conformidade.
        </p>
      </div>

      {/* Irregularity Detection Alerts */}
      {unresolvedAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Alertas de Inconsistências e Irregularidades ({unresolvedAlerts.length})</span>
            </div>
            <span className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-bold uppercase">
              Ação Imediata
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unresolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white border border-red-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-red-800">
                      {alert.commandId} • {alert.title}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(alert.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">{alert.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => onResolveIrregularity(alert.id)}
                    className="text-[11px] bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-bold transition-colors shadow-xs"
                  >
                    Marcar como Regularizado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar histórico por usuário, ID ou detalhe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#00204A]"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="CRIACAO">Criação</option>
              <option value="APROVACAO">Aprovação</option>
              <option value="DEVOLUCAO">Devolução</option>
              <option value="AJUSTE_COTA">Ajuste de Cota</option>
              <option value="ENCAMINHAMENTO_PAGADORIA">Encaminhamento à Pagadoria</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Data/Hora</th>
                <th className="py-2.5 px-3">Usuário Responsável</th>
                <th className="py-2.5 px-3">Ação Realizada</th>
                <th className="py-2.5 px-3">Referência / ID</th>
                <th className="py-2.5 px-3">Detalhamento da Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-3 text-slate-900 font-semibold whitespace-nowrap">
                    {log.userName}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00204A]/10 text-[#00204A]">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    {log.recordId}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 text-xs">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Lock,
  CheckCircle2,
  UserCheck,
  UserX,
  Building2,
} from 'lucide-react';
import { User, CommandUnit } from '../../types';

interface UsersViewProps {
  users: User[];
  commands: CommandUnit[];
  currentUser: User;
  onSaveUser: (newUser: User) => void;
  onToggleStatus: (userId: string) => void;
  onResetPassword: (userId: string, newPass: string) => void;
}

export function UsersView({
  users,
  commands,
  currentUser,
  onSaveUser,
  onToggleStatus,
  onResetPassword,
}: UsersViewProps) {
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<'CPA/I' | 'Administrador (CPI)'>('CPA/I');
  const [comando, setComando] = useState('');
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !login.trim() || !senha.trim()) {
      alert('Por favor, preencha nome, login e senha.');
      return;
    }
    if (senha.length < 4) {
      alert('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: nome,
      login: login.toLowerCase().trim(),
      password: senha,
      profileLabel: perfil,
      role: perfil === 'Administrador (CPI)' ? 'ADMIN' : 'CPA_GESTOR',
      commandId: perfil === 'CPA/I' ? comando : undefined,
      active: true,
      lastAccess: 'Nunca acessou',
    };

    onSaveUser(newUser);
    setNome('');
    setLogin('');
    setSenha('');
    setComando('');
    setSuccessMsg('Usuário cadastrado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePasswordChange = (userId: string, value: string) => {
    setPasswordInputs((prev) => ({ ...prev, [userId]: value }));
  };

  const handleResetPass = (userId: string) => {
    const val = passwordInputs[userId];
    if (!val || val.trim().length === 0) {
      alert('Digite uma nova senha no campo.');
      return;
    }
    onResetPassword(userId, val);
    setPasswordInputs((prev) => ({ ...prev, [userId]: '' }));
    setSuccessMsg('Senha redefinida com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Card: Acessos */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#002D5A]" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Gerenciamento de Acessos e Usuários
            </h3>
          </div>
          {successMsg && (
            <span className="text-xs sm:text-sm font-bold text-[#002D5A] bg-sky-50 px-3.5 py-1.5 rounded-xl border border-[#7EC2E8] animate-in fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#002D5A]" />
              {successMsg}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nome / Identificação</th>
                <th className="py-3.5 px-4">Login de Acesso</th>
                <th className="py-3.5 px-4">Perfil Funcional</th>
                <th className="py-3.5 px-4">Último Acesso</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono font-medium">
                      {u.login}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {u.profileLabel || (u.role === 'ADMIN' ? 'Administrador (CPI)' : 'CPA/I')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {u.lastAccess || 'Nunca acessou'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          u.active
                            ? 'bg-sky-50 text-[#002D5A] border border-[#7EC2E8]'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleStatus(u.id)}
                          disabled={isCurrent}
                          className="text-xs font-bold text-[#002D5A] hover:text-[#001F3F] hover:underline disabled:text-slate-300 cursor-pointer"
                        >
                          {u.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <span className="text-slate-300">·</span>
                        <input
                          type="password"
                          placeholder="Nova senha"
                          value={passwordInputs[u.id] || ''}
                          onChange={(e) => handlePasswordChange(u.id, e.target.value)}
                          className="w-28 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
                        />
                        <button
                          onClick={() => handleResetPass(u.id)}
                          className="text-xs font-bold text-[#002D5A] hover:text-[#001F3F] hover:underline cursor-pointer"
                        >
                          Redefinir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Card: Novo acesso */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#002D5A]" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Cadastrar Novo Acesso
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cada CPA/I recebe um usuário com permissão de visualização e lançamento exclusivo de seu respectivo comando. O Administrador (CPI) possui visão global.
          </p>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome do Usuário / Seção *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: P/3 do CPA/I-1"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Login de Acesso *
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="cpai1.p3"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Senha Provisória *</span>
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#002D5A]" />
                <span>Perfil de Acesso *</span>
              </label>
              <select
                value={perfil}
                onChange={(e) => setPerfil(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] font-medium"
              >
                <option value="CPA/I">CPA/I (Gestão Local)</option>
                <option value="Administrador (CPI)">Administrador (CPI - Gestão Global)</option>
              </select>
            </div>

            {perfil === 'CPA/I' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#002D5A]" />
                  <span>Comando Vinculado *</span>
                </label>
                <select
                  value={comando}
                  onChange={(e) => setComando(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] font-medium"
                >
                  <option value="">Selecione o Comando...</option>
                  {commands.map((cmd) => (
                    <option key={cmd.id} value={cmd.code}>
                      {cmd.code} - {cmd.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="bg-[#002D5A] hover:bg-[#001F3F] text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#7EC2E8]" />
              <span>Criar Acesso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

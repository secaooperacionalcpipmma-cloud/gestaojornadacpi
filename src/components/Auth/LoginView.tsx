import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building2,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User } from '../../types';
import { storageService } from '../../services/storageService';
import { CommandBadge } from '../common/CommandBadge';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Por favor, informe seu usuário, e-mail ou matrícula de acesso.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await storageService.authenticateWithCredentialsAsync(identifier, password);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique seu usuário e senha.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Falha ao autenticar. Tente novamente.');
    }
  };

  // Quick fill helper
  const handleQuickFill = (userLogin: string, defaultPass: string) => {
    setIdentifier(userLogin);
    setPassword(defaultPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Decorative Pattern & Gradients */}
      <div className="absolute inset-0 bg-radial from-[#002D5A]/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-32 -mb-32" />

      {/* Header Bar */}
      <header className="relative z-10 px-4 sm:px-8 py-5 border-b border-sky-900/40 bg-[#001730]/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CommandBadge commandCode="CPI" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-white leading-tight">
                  POLÍCIA MILITAR DO MARANHÃO
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-[#7EC2E8]/20 text-[#7EC2E8] border border-[#7EC2E8]/30">
                  CPI
                </span>
              </div>
              <p className="text-xs text-[#7EC2E8] font-medium tracking-wide">
                Comando do Policiamento do Interior · Sistema de Gestão de JOE
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Acesso Restrito & Autenticado</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Title Banner */}
          <div className="bg-gradient-to-r from-[#001F3F] via-[#002D5A] to-[#003870] p-6 sm:p-7 text-white text-center relative">
            <div className="w-14 h-14 bg-white/10 rounded-2xl mx-auto flex items-center justify-center border border-white/20 shadow-inner mb-3">
              <Lock className="w-7 h-7 text-[#7EC2E8]" />
            </div>

            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 shadow-xs mb-1.5">
              Autenticação Obrigatória
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Controle de JOE — CPI
            </h2>

            <p className="text-xs text-sky-200 mt-1">
              Informe seu usuário e senha para acessar o painel
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in shake duration-150">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* CREDENTIALS LOGIN FORM */}
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              {/* Username field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#002D5A]" />
                  <span>Usuário / Login / E-mail / Matrícula</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ex.: cpi.admin ou cpai1.p3"
                    autoComplete="username"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] font-medium transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#002D5A]" />
                    <span>Senha de Acesso</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7EC2E8] focus:border-[#002D5A] font-medium pr-10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#002D5A] hover:bg-[#001F3F] active:scale-98 disabled:opacity-50 text-white font-black text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4 text-[#7EC2E8]" />
                <span>{isLoading ? 'Verificando Credenciais...' : 'Entrar no Sistema'}</span>
              </button>
            </form>

            {/* Quick Access / Default Credentials Helper Accordion */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCredentialsGuide(!showCredentialsGuide)}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#002D5A]" />
                  <span>Referência de Logins Cadastrados</span>
                </span>
                {showCredentialsGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showCredentialsGuide && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 animate-in fade-in duration-150">
                  <p className="text-slate-500 font-medium text-[11px]">
                    Selecione um usuário para preencher os campos automaticamente:
                  </p>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {/* Admin */}
                    <button
                      type="button"
                      onClick={() => handleQuickFill('cpi.admin', 'admin')}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">cpi.admin (Administrador Geral CPI)</div>
                        <div className="text-[10px] text-slate-500 font-mono">Login: cpi.admin · Senha: admin</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                        ADMIN
                      </span>
                    </button>

                    {/* CPA/I 1 */}
                    <button
                      type="button"
                      onClick={() => handleQuickFill('cpai1.p3', '123')}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">cpai1.p3 (P/3 do CPA/I-1)</div>
                        <div className="text-[10px] text-slate-500 font-mono">Login: cpai1.p3 · Senha: 123</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#002D5A] text-[10px] font-bold">
                        CPA/I-1
                      </span>
                    </button>

                    {/* CPA/I 2 */}
                    <button
                      type="button"
                      onClick={() => handleQuickFill('cpai2.p3', '123')}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">cpai2.p3 (P/3 do CPA/I-2)</div>
                        <div className="text-[10px] text-slate-500 font-mono">Login: cpai2.p3 · Senha: 123</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#002D5A] text-[10px] font-bold">
                        CPA/I-2
                      </span>
                    </button>

                    {/* CPA/I 3 to 9 note */}
                    <button
                      type="button"
                      onClick={() => handleQuickFill('cpai3.p3', '123')}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">cpai3.p3 a cpai9.p3</div>
                        <div className="text-[10px] text-slate-500 font-mono">Senha padrão: 123</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        CPA/I
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Footer Support Info */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
            Seção Operacional do CPI ·{' '}
            <span className="font-bold text-[#002D5A]">
              secaooperacional.cpi.pmma@gmail.com
            </span>
          </div>
        </div>
      </main>

      {/* Footer System Disclaimer */}
      <footer className="relative z-10 py-4 px-4 text-center text-xs text-slate-500 border-t border-slate-800/80 bg-slate-950/80">
        <p className="font-medium">
          Polícia Militar do Maranhão · Comando do Policiamento do Interior (CPI) · São Luís - MA
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Uso restrito e autorizado para controle e auditoria das Jornadas Operacionais Extraordinárias
        </p>
      </footer>
    </div>
  );
};

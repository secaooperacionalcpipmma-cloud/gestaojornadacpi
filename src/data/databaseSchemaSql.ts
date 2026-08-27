export const FULL_DATABASE_SCHEMA_SQL = `-- ====================================================================
-- POLÍCIA MILITAR DO MARANHÃO (PMMA) - COMANDO DO POLICIAMENTO DO INTERIOR (CPI)
-- SISTEMA DE GESTÃO E AUDITORIA DAS JORNADAS OPERACIONAIS EXTRAORDINÁRIAS (JOE)
-- SCRIPT COMPLETO E OFICIAL DO BANCO DE DADOS POSTGRESQL / SUPABASE
-- ====================================================================
-- Versão: 2.0 (Produção - Limpeza Total de Dados Fictícios & Estrutura Oficial)
-- Compatibilidade: Supabase Cloud / PostgreSQL 14+
-- ====================================================================

-- 1. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. CRIAÇÃO DAS 9 TABELAS PRINCIPAIS (SE NÃO EXISTIREM)
-- ====================================================================

-- --------------------------------------------------------------------
-- TABELA 1: command_units (Comandos Regionais: CPI e CPA/I-1 a CPA/I-9)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.command_units (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    headquarters VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    commander VARCHAR(150),
    commander_name VARCHAR(150),
    commander_rank VARCHAR(50),
    subcommander VARCHAR(150),
    contact_phone VARCHAR(50),
    subunits JSONB DEFAULT '[]'::jsonb,
    is_headquarters BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 2: ordinance_periods (Portarias Regulamentadoras)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ordinance_periods (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150),
    number VARCHAR(50) NOT NULL,
    year INTEGER DEFAULT 2026,
    sei_process VARCHAR(100),
    sei_document VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    unit_value NUMERIC(10,2) DEFAULT 350.00,
    unit_value_joe NUMERIC(10,2) DEFAULT 350.00,
    monthly_individual_limit INTEGER DEFAULT 12,
    max_duration_hours INTEGER DEFAULT 6,
    total_budget NUMERIC(12,2) DEFAULT 660100.00,
    total_budget_limit NUMERIC(12,2) DEFAULT 660100.00,
    total_planned_joes INTEGER DEFAULT 1886,
    total_quota_limit INTEGER DEFAULT 1886,
    status VARCHAR(30) DEFAULT 'VIGENTE',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 3: command_budgets (Tetos e Cotas Orçamentárias de JOEs)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.command_budgets (
    id VARCHAR(100) PRIMARY KEY,
    ordinance_id VARCHAR(50) NOT NULL,
    command_id VARCHAR(50) NOT NULL,
    command_name VARCHAR(100),
    planned_joes INTEGER DEFAULT 0,
    total_quota INTEGER DEFAULT 0,
    budget_amount NUMERIC(12,2) DEFAULT 0.00,
    total_limit_amount NUMERIC(12,2) DEFAULT 0.00,
    committed_amount NUMERIC(12,2) DEFAULT 0.00,
    executed_amount NUMERIC(12,2) DEFAULT 0.00,
    available_balance NUMERIC(12,2) DEFAULT 0.00,
    used_joes_count INTEGER DEFAULT 0,
    unit_value NUMERIC(10,2) DEFAULT 350.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 4: users (Contas de Acesso e Perfis Operacionais)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    login VARCHAR(100) UNIQUE,
    email VARCHAR(150),
    role VARCHAR(50) NOT NULL,
    command_id VARCHAR(50) DEFAULT 'CPI',
    rank VARCHAR(50),
    registration VARCHAR(50),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    password VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 5: police_officers (Efetivo de Policiais Militares)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.police_officers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    registration VARCHAR(50) NOT NULL,
    cpf VARCHAR(20),
    command_id VARCHAR(50) NOT NULL,
    unit VARCHAR(100),
    sub_unit VARCHAR(100),
    monthly_joes_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'APTO',
    status_reason TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 6: operation_launches (Lançamentos de Operações com JOE)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operation_launches (
    id VARCHAR(100) PRIMARY KEY,
    launch_number VARCHAR(50),
    ordinance_id VARCHAR(50),
    command_id VARCHAR(50) NOT NULL,
    sub_unit VARCHAR(100),
    order_type VARCHAR(50) DEFAULT 'ORDEM_DE_SERVICO',
    order_number VARCHAR(100),
    event_name VARCHAR(255) NOT NULL,
    event_subtext TEXT,
    service_date DATE NOT NULL,
    start_time VARCHAR(20),
    end_time VARCHAR(20),
    duration_hours NUMERIC(5,2) DEFAULT 6.00,
    service_order_link TEXT,
    authorize_excess BOOLEAN DEFAULT false,
    location TEXT,
    officers_count INTEGER DEFAULT 0,
    joes_per_officer INTEGER DEFAULT 1,
    unit_value NUMERIC(10,2) DEFAULT 350.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    total_value NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'APROVADO',
    sei_process_number VARCHAR(100),
    sei_document_number VARCHAR(100),
    justification TEXT,
    notes TEXT,
    rejection_reason TEXT,
    correction_feedback TEXT,
    officers JSONB DEFAULT '[]'::jsonb,
    checklist JSONB DEFAULT '{}'::jsonb,
    batch_consolidation_id VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 7: weekly_batch_consolidations (Consolidações Semanais / Pagadoria)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_batch_consolidations (
    id VARCHAR(100) PRIMARY KEY,
    batch_number VARCHAR(100) NOT NULL,
    week_start_date DATE,
    week_end_date DATE,
    consolidation_date DATE,
    ordinance_id VARCHAR(50),
    sei_process VARCHAR(100),
    sei_dispatch_number VARCHAR(100),
    responsible_user VARCHAR(100),
    status VARCHAR(50) DEFAULT 'EM_CONFERENCIA',
    total_operations_count INTEGER DEFAULT 0,
    total_officers_count INTEGER DEFAULT 0,
    total_joes_count INTEGER DEFAULT 0,
    total_financial_amount NUMERIC(12,2) DEFAULT 0.00,
    cpa_breakdown JSONB DEFAULT '[]'::jsonb,
    operations_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 8: irregularities (Auditoria e Apontamentos de Inconsistências)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.irregularities (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50),
    command_id VARCHAR(50),
    sub_unit VARCHAR(100),
    operation_id VARCHAR(100),
    officer_id VARCHAR(50),
    officer_name VARCHAR(150),
    identified_by VARCHAR(150),
    identification_date TIMESTAMPTZ DEFAULT now(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(30) DEFAULT 'MEDIA',
    status VARCHAR(50) DEFAULT 'ABERTA',
    action_taken TEXT,
    sei_process VARCHAR(100),
    reported_to_comando_geral_date TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABELA 9: audit_logs (Trilha de Auditoria e Conformidade)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp VARCHAR(100),
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    action VARCHAR(100),
    module VARCHAR(100),
    record_id VARCHAR(100),
    previous_value TEXT,
    new_value TEXT,
    description TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- 3. GARANTIA DE COLUNAS (ALTER TABLE SE AS TABELAS JÁ EXISTIREM)
-- ====================================================================
-- Este bloco previne qualquer erro se tabelas antigas tiverem colunas faltantes

-- command_units
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS commander VARCHAR(150);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS commander_name VARCHAR(150);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS commander_rank VARCHAR(50);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS subcommander VARCHAR(150);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS subunits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT false;
ALTER TABLE public.command_units ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- ordinance_periods
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2026;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS sei_process VARCHAR(100);
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS sei_document VARCHAR(100);
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS unit_value NUMERIC(10,2) DEFAULT 350.00;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS unit_value_joe NUMERIC(10,2) DEFAULT 350.00;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS monthly_individual_limit INTEGER DEFAULT 12;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS max_duration_hours INTEGER DEFAULT 6;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS total_budget NUMERIC(12,2) DEFAULT 660100.00;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS total_budget_limit NUMERIC(12,2) DEFAULT 660100.00;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS total_planned_joes INTEGER DEFAULT 1886;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS total_quota_limit INTEGER DEFAULT 1886;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ordinance_periods ADD COLUMN IF NOT EXISTS description TEXT;

-- command_budgets
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS command_name VARCHAR(100);
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS planned_joes INTEGER DEFAULT 0;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS total_quota INTEGER DEFAULT 0;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS total_limit_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS committed_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS executed_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS used_joes_count INTEGER DEFAULT 0;
ALTER TABLE public.command_budgets ADD COLUMN IF NOT EXISTS unit_value NUMERIC(10,2) DEFAULT 350.00;

-- users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS command_id VARCHAR(50) DEFAULT 'CPI';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rank VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS registration VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- police_officers
ALTER TABLE public.police_officers ADD COLUMN IF NOT EXISTS sub_unit VARCHAR(100);
ALTER TABLE public.police_officers ADD COLUMN IF NOT EXISTS monthly_joes_count INTEGER DEFAULT 0;
ALTER TABLE public.police_officers ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'APTO';
ALTER TABLE public.police_officers ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.police_officers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- operation_launches
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS launch_number VARCHAR(50);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS ordinance_id VARCHAR(50);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS command_id VARCHAR(50);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS sub_unit VARCHAR(100);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'ORDEM_DE_SERVICO';
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS order_number VARCHAR(100);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS event_subtext TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS start_time VARCHAR(20);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS end_time VARCHAR(20);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(5,2) DEFAULT 6.00;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS service_order_link TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS authorize_excess BOOLEAN DEFAULT false;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS officers_count INTEGER DEFAULT 0;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS joes_per_officer INTEGER DEFAULT 1;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS unit_value NUMERIC(10,2) DEFAULT 350.00;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS total_value NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APROVADO';
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS sei_process_number VARCHAR(100);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS sei_document_number VARCHAR(100);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS correction_feedback TEXT;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS officers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS batch_consolidation_id VARCHAR(100);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.operation_launches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ====================================================================
-- 4. ÍNDICES DE ALTO DESEMPENHO
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_ops_command_id ON public.operation_launches(command_id);
CREATE INDEX IF NOT EXISTS idx_ops_ordinance_id ON public.operation_launches(ordinance_id);
CREATE INDEX IF NOT EXISTS idx_ops_service_date ON public.operation_launches(service_date);
CREATE INDEX IF NOT EXISTS idx_ops_status ON public.operation_launches(status);
CREATE INDEX IF NOT EXISTS idx_budgets_ordinance ON public.command_budgets(ordinance_id);
CREATE INDEX IF NOT EXISTS idx_budgets_command ON public.command_budgets(command_id);
CREATE INDEX IF NOT EXISTS idx_officers_command ON public.police_officers(command_id);
CREATE INDEX IF NOT EXISTS idx_users_login ON public.users(login);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(created_at DESC);

-- ====================================================================
-- 5. CONFIGURAÇÃO DE SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ====================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.command_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordinance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_batch_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irregularities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Permissao Total command_units" ON public.command_units;
DROP POLICY IF EXISTS "Permissao Total ordinance_periods" ON public.ordinance_periods;
DROP POLICY IF EXISTS "Permissao Total command_budgets" ON public.command_budgets;
DROP POLICY IF EXISTS "Permissao Total users" ON public.users;
DROP POLICY IF EXISTS "Permissao Total police_officers" ON public.police_officers;
DROP POLICY IF EXISTS "Permissao Total operation_launches" ON public.operation_launches;
DROP POLICY IF EXISTS "Permissao Total weekly_batch_consolidations" ON public.weekly_batch_consolidations;
DROP POLICY IF EXISTS "Permissao Total irregularities" ON public.irregularities;
DROP POLICY IF EXISTS "Permissao Total audit_logs" ON public.audit_logs;

-- Criar políticas universais para acesso autenticado e chave anônima autorizada da PMMA
CREATE POLICY "Permissao Total command_units" ON public.command_units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total ordinance_periods" ON public.ordinance_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total command_budgets" ON public.command_budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total police_officers" ON public.police_officers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total operation_launches" ON public.operation_launches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total weekly_batch_consolidations" ON public.weekly_batch_consolidations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total irregularities" ON public.irregularities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissao Total audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões públicas de schema ao anon e authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ====================================================================
-- 6. LIMPEZA DE DADOS FICTÍCIOS DE TESTE
-- ====================================================================
DELETE FROM public.operation_launches WHERE id = 'op-cpai1-teste-10joe' OR id LIKE '%teste%' OR event_name ILIKE '%teste%';
DELETE FROM public.audit_logs WHERE id = 'aud-cpai1-solic-10joe' OR description ILIKE '%teste%';

-- ====================================================================
-- 7. SEED DOS DADOS INSTITUCIONAIS OFICIAIS (PORTARIA 122/2026, COMANDOS E TETOS)
-- ====================================================================

-- 7.1. Inserir/Atualizar Portaria 122/2026 Vigente
INSERT INTO public.ordinance_periods (
    id, name, number, year, sei_process, sei_document, start_date, end_date,
    unit_value, unit_value_joe, monthly_individual_limit, max_duration_hours,
    total_budget, total_budget_limit, total_planned_joes, total_quota_limit,
    status, is_active, notes, description
) VALUES (
    'ord-122-2026',
    'Portaria 122/2026 – ago/set 2026',
    '122/2026 – GCG',
    2026,
    '2026.190110.35458',
    '016909457',
    '2026-08-20',
    '2026-09-21',
    350.00,
    350.00,
    12,
    6,
    660100.00,
    660100.00,
    1886,
    1886,
    'VIGENTE',
    true,
    'Portaria oficial de concessão e distribuição de cotas de JOE para o Comando do Policiamento do Interior (CPI) e seus 9 Comandos de Policiamento de Área (CPA/I-1 a CPA/I-9).',
    'Portaria oficial de concessão e distribuição de cotas de JOE para o CPI e CPAs'
) ON CONFLICT (id) DO UPDATE SET
    total_budget = EXCLUDED.total_budget,
    total_budget_limit = EXCLUDED.total_budget_limit,
    total_planned_joes = EXCLUDED.total_planned_joes,
    total_quota_limit = EXCLUDED.total_quota_limit,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 7.2. Inserir/Atualizar os 10 Comandos (CPI + 9 CPAs)
INSERT INTO public.command_units (id, code, name, headquarters, region, is_headquarters, active, subunits) VALUES
('cpi', 'CPI', 'Comando do Policiamento do Interior - Direção Setorial', 'São Luís', 'Direção Setorial', true, true, '["Gabinete CPI", "Seção Operacional CPI", "Diretoria de Inteligência"]'::jsonb),
('cpai-1', 'CPA/I-1', 'Comando de Policiamento de Área do Interior 1', 'Bacabal', 'Médio Mearim', false, true, '["15º BPM (Bacabal)", "23º BPM (São Mateus)", "39º BPM (Lago da Pedra)", "47º BPM (Vitorino Freire)"]'::jsonb),
('cpai-2', 'CPA/I-2', 'Comando de Policiamento de Área do Interior 2', 'Caxias', 'Leste Maranhense', false, true, '["2º BPM (Caxias)", "11º BPM (Timon)", "24º BPM (Coroatá)", "44º BPM (Coelho Neto)"]'::jsonb),
('cpai-3', 'CPA/I-3', 'Comando de Policiamento de Área do Interior 3', 'Imperatriz', 'Tocantins / Sul', false, true, '["3º BPM (Imperatriz)", "12º BPM (Estreito)", "14º BPM (Imperatriz)", "32º BPM (Açailândia)"]'::jsonb),
('cpai-4', 'CPA/I-4', 'Comando de Policiamento de Área do Interior 4', 'Presidente Dutra', 'Centro Maranhense', false, true, '["18º BPM (Presidente Dutra)", "28º BPM (Colinas)", "33º BPM (Barra do Corda)", "42º BPM (Itapecuru-Mirim)"]'::jsonb),
('cpai-5', 'CPA/I-5', 'Comando de Policiamento de Área do Interior 5', 'Pinheiro', 'Baixada Maranhense', false, true, '["10º BPM (Pinheiro)", "25º BPM (Cururupu)", "30º BPM (São Bento)", "41º BPM (Viana)"]'::jsonb),
('cpai-6', 'CPA/I-6', 'Comando de Policiamento de Área do Interior 6', 'Chapadinha', 'Baixo Parnaíba', false, true, '["16º BPM (Chapadinha)", "27º BPM (Rosário)", "35º BPM (São João dos Patos)", "40º BPM (Tutóia)"]'::jsonb),
('cpai-7', 'CPA/I-7', 'Comando de Policiamento de Área do Interior 7', 'Santa Inês', 'Vale do Pindaré', false, true, '["7º BPM (Santa Inês)", "29º BPM (Z Doca)", "38º BPM (Buriticupu)", "46º BPM (Santa Luzia)"]'::jsonb),
('cpai-8', 'CPA/I-8', 'Comando de Policiamento de Área do Interior 8', 'Balsas', 'Sul Maranhense', false, true, '["4º BPM (Balsas)", "34º BPM (Grajaú)", "37º BPM (São Raimundo das Mangabeiras)"]'::jsonb),
('cpai-9', 'CPA/I-9', 'Comando de Policiamento de Área do Interior 9', 'Barreirinhas', 'Lençóis / Delta', false, true, '["8º BPM (Barreirinhas)", "26º BPM (Açailândia II)", "31º BPM (Santa Inês II)", "43º BPM (Itinga)"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    headquarters = EXCLUDED.headquarters,
    subunits = EXCLUDED.subunits,
    updated_at = now();

-- 7.3. Inserir/Atualizar os 10 Tetos Orçamentários da Portaria 122/2026
INSERT INTO public.command_budgets (
    id, ordinance_id, command_id, command_name, planned_joes, total_quota,
    budget_amount, total_limit_amount, committed_amount, executed_amount,
    available_balance, used_joes_count, unit_value
) VALUES
('bud-ord-122-2026-cpi', 'ord-122-2026', 'CPI', 'Comando do Policiamento do Interior', 100, 100, 35000.00, 35000.00, 0.00, 0.00, 35000.00, 0, 350.00),
('bud-ord-122-2026-cpai-1', 'ord-122-2026', 'CPA/I-1', 'Comando de Policiamento de Área do Interior 1', 186, 186, 65100.00, 65100.00, 0.00, 0.00, 65100.00, 0, 350.00),
('bud-ord-122-2026-cpai-2', 'ord-122-2026', 'CPA/I-2', 'Comando de Policiamento de Área do Interior 2', 200, 200, 70000.00, 70000.00, 0.00, 0.00, 70000.00, 0, 350.00),
('bud-ord-122-2026-cpai-3', 'ord-122-2026', 'CPA/I-3', 'Comando de Policiamento de Área do Interior 3', 220, 220, 77000.00, 77000.00, 0.00, 0.00, 77000.00, 0, 350.00),
('bud-ord-122-2026-cpai-4', 'ord-122-2026', 'CPA/I-4', 'Comando de Policiamento de Área do Interior 4', 200, 200, 70000.00, 70000.00, 0.00, 0.00, 70000.00, 0, 350.00),
('bud-ord-122-2026-cpai-5', 'ord-122-2026', 'CPA/I-5', 'Comando de Policiamento de Área do Interior 5', 200, 200, 70000.00, 70000.00, 0.00, 0.00, 70000.00, 0, 350.00),
('bud-ord-122-2026-cpai-6', 'ord-122-2026', 'CPA/I-6', 'Comando de Policiamento de Área do Interior 6', 200, 200, 70000.00, 70000.00, 0.00, 0.00, 70000.00, 0, 350.00),
('bud-ord-122-2026-cpai-7', 'ord-122-2026', 'CPA/I-7', 'Comando de Policiamento de Área do Interior 7', 200, 200, 70000.00, 70000.00, 0.00, 0.00, 70000.00, 0, 350.00),
('bud-ord-122-2026-cpai-8', 'ord-122-2026', 'CPA/I-8', 'Comando de Policiamento de Área do Interior 8', 190, 190, 66500.00, 66500.00, 0.00, 0.00, 66500.00, 0, 350.00),
('bud-ord-122-2026-cpai-9', 'ord-122-2026', 'CPA/I-9', 'Comando de Policiamento de Área do Interior 9', 190, 190, 66500.00, 66500.00, 0.00, 0.00, 66500.00, 0, 350.00)
ON CONFLICT (id) DO UPDATE SET
    planned_joes = EXCLUDED.planned_joes,
    total_quota = EXCLUDED.total_quota,
    budget_amount = EXCLUDED.budget_amount,
    total_limit_amount = EXCLUDED.total_limit_amount,
    unit_value = EXCLUDED.unit_value,
    updated_at = now();

-- 7.4. Inserir/Atualizar Usuários Base de Gestão
INSERT INTO public.users (id, name, email, login, role, command_id, active) VALUES
('usr-cpi-admin', 'Super Administrador CPI', 'secaooperacional.cpi.pmma@gmail.com', 'cpi.admin', 'ADMIN', 'CPI', true),
('usr-cpai-1', 'Gestor P/3 CPA/I-1', 'cpai1.p3@pmma.ma.gov.br', 'cpai1.p3', 'CPA_GESTOR', 'CPA/I-1', true),
('usr-cpai-2', 'Gestor P/3 CPA/I-2', 'cpai2.p3@pmma.ma.gov.br', 'cpai2.p3', 'CPA_GESTOR', 'CPA/I-2', true),
('usr-cpai-3', 'Gestor P/3 CPA/I-3', 'cpai3.p3@pmma.ma.gov.br', 'cpai3.p3', 'CPA_GESTOR', 'CPA/I-3', true),
('usr-cpai-4', 'Gestor P/3 CPA/I-4', 'cpai4.p3@pmma.ma.gov.br', 'cpai4.p3', 'CPA_GESTOR', 'CPA/I-4', true),
('usr-cpai-5', 'Gestor P/3 CPA/I-5', 'cpai5.p3@pmma.ma.gov.br', 'cpai5.p3', 'CPA_GESTOR', 'CPA/I-5', true),
('usr-cpai-6', 'Gestor P/3 CPA/I-6', 'cpai6.p3@pmma.ma.gov.br', 'cpai6.p3', 'CPA_GESTOR', 'CPA/I-6', true),
('usr-cpai-7', 'Gestor P/3 CPA/I-7', 'cpai7.p3@pmma.ma.gov.br', 'cpai7.p3', 'CPA_GESTOR', 'CPA/I-7', true),
('usr-cpai-8', 'Gestor P/3 CPA/I-8', 'cpai8.p3@pmma.ma.gov.br', 'cpai8.p3', 'CPA_GESTOR', 'CPA/I-8', true),
('usr-cpai-9', 'Gestor P/3 CPA/I-9', 'cpai9.p3@pmma.ma.gov.br', 'cpai9.p3', 'CPA_GESTOR', 'CPA/I-9', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    login = EXCLUDED.login,
    role = EXCLUDED.role,
    command_id = EXCLUDED.command_id,
    active = EXCLUDED.active,
    updated_at = now();

-- ====================================================================
-- FIM DO SCRIPT OFICIAL PMMA / CPI
-- ====================================================================
`;

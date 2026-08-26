export interface PortariaArticle {
  number: string;
  title?: string;
  text: string;
  paragraphs?: string[];
  items?: string[];
}

export interface PortariaChapter {
  id: string;
  number: string;
  title: string;
  articles: PortariaArticle[];
}

export interface PortariaAnnexCommand {
  commandName: string;
  rows: {
    unit: string;
    plannedJoes: number;
    amount: number;
  }[];
  totalJoes: number;
  totalAmount: number;
}

export interface LegislationDocument {
  id: string;
  ordinanceNumber: string; // 'PORTARIA Nº 122/2026 – GCG'
  seiProcess: string; // '2026.190110.35458'
  seiDocument: string; // '016909457'
  period: string; // '20 de agosto a 21 de setembro de 2026'
  startDate: string;
  endDate: string;
  unitValue: number; // 350
  maxMonthlyLimitPerOfficer: number; // 12
  maxDailyHours: number; // 6
  summaryCpiBudget: number; // 660100
  summaryCpiJoes: number; // 1886
  preamble: string;
  considerations: string[];
  chapters: PortariaChapter[];
  signatory: {
    name: string;
    role: string;
    location: string;
    date: string;
  };
  annexes: {
    id: string;
    title: string;
    subtitle: string;
    commands: PortariaAnnexCommand[];
  }[];
}

// Full Official Data of Portaria 122/2026-GCG (Primeiro Anexo)
export const OFFICIAL_PORTARIA_122: LegislationDocument = {
  id: 'portaria-122-2026',
  ordinanceNumber: 'PORTARIA Nº 122/2026 – GCG',
  seiProcess: '2026.190110.35458',
  seiDocument: '016909457',
  period: '20/08/2026 a 21/09/2026',
  startDate: '2026-08-20',
  endDate: '2026-09-21',
  unitValue: 350,
  maxMonthlyLimitPerOfficer: 12,
  maxDailyHours: 6,
  summaryCpiBudget: 660100,
  summaryCpiJoes: 1886,
  preamble:
    'Dispõe sobre a Gratificação de Complementação de Jornada Operacional – Jornada Operacional Extraordinária (JOE), estabelece valores, normas de autorização, execução, controle, fiscalização e pagamento no âmbito da Polícia Militar do Maranhão, para o período de agosto a setembro de 2026, e dá outras providências.\n\nO COMANDANTE-GERAL DA POLÍCIA MILITAR DO MARANHÃO, no uso das atribuições que lhe são conferidas pela Constituição Federal, pelo art. 4º da Lei nº 4.570, de 14 de junho de 1984, pela Lei Orgânica Básica da Polícia Militar do Maranhão, pela Lei Estadual nº 9.663, de 17 de julho de 2012, pela Lei Estadual nº 12.823, de 6 de abril de 2026, e demais normas administrativas aplicáveis;',
  considerations: [
    'CONSIDERANDO que a Constituição Federal, em seus arts. 37 e 144, estabelece os princípios que regem a Administração Pública e atribui às Polícias Militares a missão de polícia ostensiva e de preservação da ordem pública;',
    'CONSIDERANDO que a segurança pública constitui serviço público essencial, permanente e ininterrupto, exigindo da Administração Militar mecanismos destinados à adequada ampliação da capacidade operacional da Corporação diante das necessidades do serviço;',
    'CONSIDERANDO a Lei Estadual nº 9.663, de 17 de julho de 2012, que instituiu a Gratificação de Complementação de Jornada Operacional;',
    'CONSIDERANDO a Lei Estadual nº 12.823, de 6 de abril de 2026, que reajustou a Gratificação de Jornada Complementar Operacional Extraordinária – JOE e fixou o valor de até R$ 350,00 (trezentos e cinquenta reais) para a jornada extraordinária de 06 (seis) horas, cabendo ao gestor da instituição estabelecer o respectivo valor;',
    'CONSIDERANDO que a legislação vigente limita a participação do policial militar a até 12 (doze) Jornadas Operacionais Extraordinárias mensais, de 06 (seis) horas cada, realizadas durante o horário de folga;',
    'CONSIDERANDO o Decreto nº 38.365, de 31 de outubro de 2023, que alterou dispositivos do Decreto nº 38.345, de 13 de junho de 2023, dispondo sobre o uso e gestão do Sistema Eletrônico de Informações – SEI no âmbito da Administração Pública Estadual;',
    'CONSIDERANDO a necessidade de assegurar a rastreabilidade, a transparência, a regularidade da despesa pública e a comprovação da efetiva execução das Jornadas Operacionais Extraordinárias;',
    'CONSIDERANDO as disposições da Lei Federal nº 13.709, de 14 de agosto de 2018 – Lei Geral de Proteção de Dados Pessoais – LGPD, especialmente quanto ao tratamento de dados funcionais dos policiais militares;',
    'CONSIDERANDO a aprovação de suplementação orçamentária destinada ao custeio da Gratificação de Jornada Complementar Operacional Extraordinária – JOE da Polícia Militar do Maranhão para o segundo semestre do exercício de 2026;',
    'CONSIDERANDO, por fim, a necessidade de acompanhamento permanente da execução orçamentária e financeira, de modo a compatibilizar o emprego operacional com os recursos efetivamente disponibilizados;',
  ],
  chapters: [
    {
      id: 'cap-1',
      number: 'CAPÍTULO I',
      title: 'DAS DISPOSIÇÕES GERAIS',
      articles: [
        {
          number: 'Art. 1º',
          text: 'Todo procedimento administrativo referente à autorização, execução, comprovação, fiscalização e pagamento da Gratificação de Complementação de Jornada Operacional – Jornada Operacional Extraordinária (JOE) tramitará obrigatoriamente por meio do Sistema Eletrônico de Informações – SEI.',
          paragraphs: [
            '§ 1º A Jornada Operacional Extraordinária somente poderá ser empregada para atender necessidade efetiva do serviço, mediante planejamento e autorização prévia dos Comandantes: de Grandes Comandos (CPM, CPI, CPE, CME, CPTUR, CSC), da Chefia do EMG, da DIAE e da APMGD.',
            '§ 2º A execução das Jornadas Operacionais Extraordinárias deverá observar as competências dos Grandes Comandos, Unidades e demais órgãos da Corporação, bem como os limites orçamentários previamente estabelecidos, conforme Anexo I desta portaria.',
          ],
        },
        {
          number: 'Art. 2º',
          text: 'Para fins desta Portaria, considera-se Jornada Operacional Extraordinária aquela efetivamente cumprida pelo policial militar em período distinto de sua jornada ordinária de serviço e de seu expediente regular, observada a duração prevista na legislação.',
          paragraphs: [
            'Parágrafo único. É vedada a utilização da JOE para remunerar serviço ordinário, complementar escala regular, substituir folga decorrente da própria escala ou remunerar período em que o policial militar já se encontre à disposição da Administração em razão de sua jornada normal.',
          ],
        },
      ],
    },
    {
      id: 'cap-2',
      number: 'CAPÍTULO II',
      title: 'DOS VALORES',
      articles: [
        {
          number: 'Art. 3º',
          text: 'O valor da Gratificação de Complementação de Jornada Operacional – JOE observará o seguinte parâmetro:',
          items: [
            'I - R$ 350,00 (trezentos e cinquenta reais), por jornada de até 06 (seis) horas durante toda a semana.',
          ],
          paragraphs: [
            '§ 1º O valor previsto neste artigo será aplicado indistintamente às Jornadas Operacionais Extraordinárias realizadas na Região Metropolitana de São Luís e no interior do Estado.',
            '§ 2º O pagamento somente será devido mediante efetiva prestação do serviço extraordinário e comprovação de sua execução nos termos desta Portaria.',
            '§ 3º É vedada a percepção de JOE sem a correspondente execução da atividade extraordinária ou quando houver coincidência, total ou parcial, com escala ou jornada ordinária de serviço.',
          ],
        },
      ],
    },
    {
      id: 'cap-3',
      number: 'CAPÍTULO III',
      title: 'DA AUTORIZAÇÃO E DO PLANEJAMENTO',
      articles: [
        {
          number: 'Art. 4º',
          text: 'A realização de Jornada Operacional Extraordinária dependerá de prévia solicitação, por meio de processo SEI, contendo:',
          items: [
            'I – justificativa da necessidade operacional;',
            'II – Ordem de Serviço, Ordem de Operação ou documento equivalente;',
            'III – denominação da operação ou atividade;',
            'IV – data, horário e local de execução;',
            'V – quantitativo do efetivo a ser empregado;',
            'VI – valor unitário da jornada;',
            'VII – valor total estimado;',
            'VIII – Unidade ou área de atuação;',
            'IX – indicação da fonte ou cota orçamentária destinada à execução;',
            'X – declaração de compatibilidade da operação com o limite financeiro disponibilizado ao respectivo Grande Comando.',
          ],
        },
        {
          number: 'Art. 5º',
          text: 'A autorização de determinada operação não importa autorização para extrapolação da cota orçamentária atribuída ao órgão ou Grande Comando, cabendo ao respectivo comandante acompanhar continuamente o saldo disponível.',
        },
      ],
    },
    {
      id: 'cap-4',
      number: 'CAPÍTULO IV',
      title: 'DA ESCALA E DA COMPROVAÇÃO DA EFETIVA PRESTAÇÃO DO SERVIÇO',
      articles: [
        {
          number: 'Art. 6º',
          text: 'Após a autorização da operação, a UPM responsável deverá inserir no processo SEI, previamente à execução, a escala extraordinária contendo:',
          items: [
            'I – nome completo do policial militar;',
            'II – posto ou graduação;',
            'III – identificação funcional;',
            'IV – CPF, quando necessário à implantação financeira;',
            'V – Unidade de lotação;',
            'VI – data e horário da jornada;',
            'VII – local de emprego;',
            'VIII – função desempenhada.',
          ],
          paragraphs: [
            '§ 1º O Comandante da UPM deverá declarar expressamente, sob sua responsabilidade funcional, que os policiais militares relacionados na JOE: I – encontravam-se em horário de folga no período da jornada extraordinária; II – não estavam simultaneamente escalados em serviço ordinário; III – não se encontravam em situação funcional impeditiva do serviço extraordinário; IV – foram efetivamente empregados na atividade indicada.',
          ],
        },
        {
          number: 'Art. 7º',
          text: 'É vedada a inclusão em JOE de policial militar que esteja:',
          items: [
            'I – em serviço ordinário no mesmo período;',
            'II – afastado por licença para tratamento de saúde própria ou de pessoa da família;',
            'III – submetido a restrição médica incompatível com a atividade;',
            'IV – em cumprimento de sanção disciplinar que impeça o serviço;',
            'V – afastado preventivamente;',
            'VI – na reserva remunerada ou reformado;',
            'VII – em qualquer outra situação funcional incompatível com a efetiva prestação do serviço extraordinário.',
          ],
        },
        {
          number: 'Art. 8º',
          text: 'Cada policial militar poderá participar de, no máximo, 12 (doze) Jornadas Operacionais Extraordinárias por mês, observadas as demais limitações legais e administrativas.',
        },
      ],
    },
    {
      id: 'cap-5',
      number: 'CAPÍTULO V',
      title: 'DO CONTROLE DA EXECUÇÃO',
      articles: [
        {
          number: 'Art. 9º',
          text: 'O oficial ou Praça responsável pela operação deverá realizar o controle de apresentação, permanência e encerramento do serviço do efetivo empregado.',
          paragraphs: [
            '§ 1º O controle deverá permitir identificar, no mínimo: I – horário efetivo de apresentação; II – horário de encerramento; III – local ou setor de emprego; IV – eventual ausência, atraso, substituição ou dispensa; V – identificação do responsável pela conferência do efetivo.',
            '§ 2º Sempre que tecnicamente disponível, a execução poderá ser confrontada com registros dos sistemas operacionais oficiais da Corporação, inclusive CIOPS ou estrutura correspondente no interior do Estado, sem prejuízo de outras formas de comprovação admitidas pela Administração.',
          ],
        },
        {
          number: 'Art. 10',
          text: 'Ao término da operação, será obrigatória a elaboração do Relatório de Execução de Jornada Operacional Extraordinária – RENE, contendo, no mínimo:',
          items: [
            'I – efetivo efetivamente empregado;',
            'II – local e área de atuação;',
            'III – horário de início e término;',
            'IV – Nº processo SEI de autorização da JOE;',
            'V – identificações e assinaturas do responsável pela operação, do P/1 da UPM e do Comandante da UPM.',
          ],
        },
        {
          number: 'Art. 11',
          text: 'Para fins de liquidação e pagamento da despesa, deverão constar do processo SEI, cumulativamente:',
          items: [
            'I – Autorização prévia da JOE;',
            'II – ordem de Serviço ou Ordem de Operação;',
            'III – RENE;',
            'IV – relatório operacional;',
            'V – planilha consolidada dos policiais militares efetivamente empregados;',
            'VI – declaração do Comandante da UPM quanto à regularidade das informações e inexistência de sobreposição entre jornada ordinária e extraordinária;',
            'VII – documentação complementar que venha a ser exigida pelo Grande Comando, Subcomando-Geral, Pagadoria, Corregedoria-Geral ou Comando-Geral.',
          ],
          paragraphs: [
            '§ 1º A ausência de qualquer documento indispensável à comprovação da efetiva prestação do serviço impedirá a implantação do pagamento até a regularização da pendência.',
            '§ 2º É vedada a inclusão meramente retroativa de policial militar em escala extraordinária, salvo situação excepcional devidamente justificada e comprovada, submetida à apreciação do Grande Comando e à homologação da autoridade competente.',
          ],
        },
      ],
    },
    {
      id: 'cap-6',
      number: 'CAPÍTULO VI',
      title: 'DA FISCALIZAÇÃO E DA RESPONSABILIDADE',
      articles: [
        {
          number: 'Art. 12',
          text: 'Compete ao Comandante da UPM:',
          items: [
            'I – verificar a necessidade do emprego extraordinário;',
            'II – certificar a efetiva execução das jornadas;',
            'III – assegurar a inexistência de sobreposição com o serviço ordinário;',
            'IV – conferir a documentação individual e coletiva;',
            'V – manter controle atualizado dos quantitativos empregados e valores executados;',
            'VI – zelar pelo não pagamento de jornada irregular.',
          ],
        },
        {
          number: 'Art. 13',
          text: 'Compete aos Grandes Comandos (inclusive CPI):',
          items: [
            'I – analisar previamente as solicitações das UPMs subordinadas;',
            'II – controlar os limites financeiros disponibilizados;',
            'III – conferir a documentação comprobatória;',
            'IV – fiscalizar, inclusive por amostragem, a execução das Jornadas Operacionais Extraordinárias;',
            'V – encaminhar semanalmente à Pagadoria, sempre às terças-feiras, em processo único e planilha única, todas as operações realizadas por suas Unidades subordinadas contempladas com JOES;',
            'VI – comunicar imediatamente ao Comando-Geral qualquer indício de irregularidade.',
          ],
        },
        {
          number: 'Art. 14',
          text: 'Compete à Pagadoria-DGP:',
          items: [
            'I – realizar a análise técnica da documentação encaminhada;',
            'II – efetuar o controle orçamentário e financeiro geral da JOE;',
            'III – verificar os limites individuais e financeiros estabelecidos;',
            'IV – realizar, sempre que possível, cruzamento entre as informações funcionais, escalas e pagamentos;',
            'V – devolver à origem os processos que apresentem inconsistências;',
            'VI – comunicar ao Comando-Geral e aos órgãos de fiscalização eventuais irregularidades identificadas.',
          ],
        },
        {
          number: 'Art. 15',
          text: 'A Corregedoria-Geral poderá, a qualquer tempo, realizar auditoria ou fiscalização das Jornadas Operacionais Extraordinárias, requisitando escalas, relatórios, registros operacionais, informações funcionais e demais documentos necessários à verificação da regularidade da despesa.',
        },
        {
          number: 'Art. 16',
          text: 'O pagamento indevido decorrente de informação inexata, declaração falsa, inclusão irregular ou ausência da efetiva prestação do serviço sujeitará os responsáveis às medidas administrativas, disciplinares, civis e penais cabíveis, sem prejuízo da restituição dos valores ao erário.',
        },
      ],
    },
    {
      id: 'cap-7',
      number: 'CAPÍTULO VII',
      title: 'DO CONTROLE ORÇAMENTÁRIO E FINANCEIRO',
      articles: [
        {
          number: 'Art. 17',
          text: 'A execução das Jornadas Operacionais Extraordinárias no período de 20 de agosto a 21 de setembro de 2026 observará rigorosamente os limites orçamentários estabelecidos no Anexo I desta Portaria.',
          paragraphs: [
            '§ 1º Os valores consignados constituem limite máximo de execução, não gerando direito à sua utilização integral.',
            '§ 2º A realização da despesa dependerá da efetiva necessidade operacional, autorização prévia e disponibilidade orçamentária e financeira.',
            '§ 3º O saldo não utilizado por determinada Unidade ou Grande Comando poderá ser remanejado pelo Comando-Geral, de acordo com a necessidade operacional da Corporação.',
          ],
        },
        {
          number: 'Art. 18',
          text: 'A Pagadoria deverá manter demonstrativo consolidado da execução contendo, no mínimo: I – valor autorizado por órgão ou Grande Comando; II – valor executado no mês; III – valor acumulado; IV – saldo disponível; V – quantidade de jornadas realizadas; VI – quantidade de policiais militares empregados; VII – valor médio executado por jornada.',
          paragraphs: [
            'Parágrafo único. O demonstrativo consolidado deverá ser atualizado periodicamente e permanecer disponível ao Comando-Geral e ao Subcomando-Geral para acompanhamento da execução.',
          ],
        },
      ],
    },
    {
      id: 'cap-8',
      number: 'CAPÍTULO VIII',
      title: 'DAS MEDIDAS COMPLEMENTARES DE CONTROLE',
      articles: [
        {
          number: 'Art. 19',
          text: 'Sem prejuízo dos mecanismos previstos nesta Portaria, poderão ser instituídas pelo Subcomando-Geral medidas adicionais de controle, acompanhamento e fiscalização da Jornada Operacional Extraordinária.',
        },
      ],
    },
    {
      id: 'cap-9',
      number: 'CAPÍTULO IX',
      title: 'DAS DISPOSIÇÕES FINAIS',
      articles: [
        {
          number: 'Art. 20',
          text: 'Os processos que apresentarem documentação incompleta, divergência de informações, sobreposição de escalas, inconsistência cadastral ou ausência de comprovação da prestação efetiva do serviço serão devolvidos à origem e não poderão ser encaminhados para pagamento enquanto não forem devidamente regularizados.',
        },
        {
          number: 'Art. 21',
          text: 'Os casos omissos serão resolvidos pelo Comando-Geral da Polícia Militar do Maranhão.',
        },
        {
          number: 'Art. 22',
          text: 'Ficam revogadas as disposições em contrário.',
        },
        {
          number: 'Art. 23',
          text: 'Esta Portaria entra em vigor na data de sua publicação, produzindo efeitos para as Jornadas Operacionais Extraordinárias realizadas no período compreendido entre 20 de agosto e 21 de setembro de 2026.',
        },
      ],
    },
  ],
  signatory: {
    name: 'CEL QOEM WALLACE GLEYDISON AMORIM DE SOUSA',
    role: 'Comandante-Geral da PMMA',
    location: 'Quartel do Comando-Geral da PMMA, em São Luís/MA',
    date: '20/08/2026 às 17:43',
  },
  annexes: [
    {
      id: 'anexo-1',
      title: 'ANEXO I',
      subtitle: 'QUADRO DE PLANEJAMENTO E CONTROLE ORÇAMENTÁRIO DA JOE – PERÍODO: 20/08/2026 A 21/09/2026',
      commands: [
        {
          commandName: 'COMANDO DE POLICIAMENTO METROPOLITANO (CPM)',
          rows: [
            { unit: 'CPM - DIREÇÃO SETORIAL', plannedJoes: 30, amount: 10500 },
            { unit: 'CPAM NORTE', plannedJoes: 300, amount: 105000 },
            { unit: 'CPAM SUL', plannedJoes: 300, amount: 105000 },
            { unit: 'CPAM OESTE', plannedJoes: 300, amount: 105000 },
            { unit: 'CPAM LESTE', plannedJoes: 300, amount: 105000 },
          ],
          totalJoes: 1230,
          totalAmount: 430500,
        },
        {
          commandName: 'COMANDO DE POLICIAMENTO DO INTERIOR (CPI)',
          rows: [
            { unit: 'CPI - DIREÇÃO SETORIAL', plannedJoes: 30, amount: 10500 },
            { unit: 'CPA/I-1', plannedJoes: 186, amount: 65100 },
            { unit: 'CPA/I-2', plannedJoes: 186, amount: 65100 },
            { unit: 'CPA/I-3', plannedJoes: 300, amount: 105000 },
            { unit: 'CPA/I-4', plannedJoes: 186, amount: 65100 },
            { unit: 'CPA/I-5', plannedJoes: 230, amount: 80500 },
            { unit: 'CPA/I-6', plannedJoes: 170, amount: 59500 },
            { unit: 'CPA/I-7', plannedJoes: 186, amount: 65100 },
            { unit: 'CPA/I-8', plannedJoes: 186, amount: 65100 },
            { unit: 'CPA/I-9', plannedJoes: 226, amount: 79100 },
          ],
          totalJoes: 1886,
          totalAmount: 660100,
        },
        {
          commandName: 'COMANDO DE POLICIAMENTO ESPECIALIZADO (CPE)',
          rows: [{ unit: 'CPE', plannedJoes: 220, amount: 77000 }],
          totalJoes: 220,
          totalAmount: 77000,
        },
        {
          commandName: 'COMANDO DE POLICIAMENTO DE TURISMO (CPTUR)',
          rows: [{ unit: 'CPTUR', plannedJoes: 220, amount: 77000 }],
          totalJoes: 220,
          totalAmount: 77000,
        },
        {
          commandName: 'COMANDO DE MISSÕES ESPECIAIS (CME)',
          rows: [{ unit: 'CME', plannedJoes: 220, amount: 77000 }],
          totalJoes: 220,
          totalAmount: 77000,
        },
        {
          commandName: 'COMANDO SEGURANÇA COMUNITÁRIA (CSC)',
          rows: [{ unit: 'CSC', plannedJoes: 40, amount: 14000 }],
          totalJoes: 40,
          totalAmount: 14000,
        },
        {
          commandName: 'DIRETORIA DE INTELIGÊNCIA DE ASSUNTOS ESTRATÉGICOS (DIAE)',
          rows: [{ unit: 'DIAE', plannedJoes: 60, amount: 21000 }],
          totalJoes: 60,
          totalAmount: 21000,
        },
        {
          commandName: 'CHEFIA DO ESTADO-MAIOR GERAL (CHEFIA DO EMG)',
          rows: [{ unit: 'CHEFIA DO EMG', plannedJoes: 100, amount: 35000 }],
          totalJoes: 100,
          totalAmount: 35000,
        },
        {
          commandName: 'ACADEMIA DE POLÍCIA MILITAR GONÇALVES DIAS (APMGD)',
          rows: [{ unit: 'APMGD', plannedJoes: 100, amount: 35000 }],
          totalJoes: 100,
          totalAmount: 35000,
        },
      ],
    },
  ],
};

// Summary & Guide Normative Structure (Segundo Anexo)
export interface CpiExecutiveSummary {
  ordinanceNumber: string;
  period: string;
  seiProcess: string;
  seiDocNumber: string;
  parameters: {
    duration: string;
    unitValue: string;
    monthlyLimit: string;
    dutyRegime: string;
    legalConcept: string;
  };
  seiPhases: {
    phase: string;
    title: string;
    legalArticles: string;
    requirements: string[];
  }[];
  impediments: {
    title: string;
    items: string[];
  };
  cpiDuties: {
    article: string;
    intro: string;
    responsibilities: {
      title: string;
      articles: string;
      description: string;
      highlight?: boolean;
    }[];
  };
  quotaTable: {
    unit: string;
    joes: number;
    amount: number;
  }[];
  totalJoes: number;
  totalAmount: number;
}

export const OFFICIAL_CPI_SUMMARY: CpiExecutiveSummary = {
  ordinanceNumber: 'PORTARIA Nº 122/2026-GCG',
  period: '20/08/2026 a 21/09/2026',
  seiProcess: '2026.190110.35458',
  seiDocNumber: '016909457',
  parameters: {
    duration: 'Até 06 Horas (Turno contínuo extraordinário)',
    unitValue: 'R$ 350,00 (Por jornada / toda a semana)',
    monthlyLimit: 'Máx. 12 JOEs (Teto legal intransponível por policial)',
    dutyRegime: 'Horário de Folga (Vedada qualquer sobreposição ordinária)',
    legalConcept:
      'É a jornada efetivamente cumprida pelo policial militar em período distinto de sua jornada ordinária de serviço e de seu expediente regular. É expressamente vedado utilizar a JOE para remunerar serviço ordinário, complementar escala de rotina, substituir folga regulamentar ou pagar militar já à disposição da Administração (Art. 2º).',
  },
  seiPhases: [
    {
      phase: 'Fase 1',
      title: 'Solicitação Prévia e Autorização',
      legalArticles: 'Arts. 1º e 4º',
      requirements: [
        'Instauração obrigatória de processo no SEI pela UPM antes do início da operação;',
        'Justificativa fundamentada da necessidade operacional extraordinária;',
        'Ordem de Serviço (OS) ou Ordem de Operação (OO) numerada e datada;',
        'Denominação da operação, data, horário e local de execução;',
        'Quantitativo do efetivo a ser empregado e valor financeiro total estimado;',
        'Declaração expressa de compatibilidade com a cota orçamentária do CPI;',
        'Autorização prévia expressa e indelegável do Comandante do CPI.',
      ],
    },
    {
      phase: 'Fase 2',
      title: 'Escala Extraordinária Prévia',
      legalArticles: 'Art. 6º',
      requirements: [
        'Inserção no SEI previamente à execução da escala nominal completa;',
        'Nome completo, Posto/Graduação, Matrícula e CPF de cada policial militar;',
        'Unidade de lotação, data, horário, local de emprego e função desempenhada;',
        'Declaração expressa de responsabilidade funcional do Comandante da UPM atestando que os militares estão em folga, sem impedimentos funcionais e não escalados em serviço ordinário simultâneo.',
      ],
    },
    {
      phase: 'Fase 3',
      title: 'Comprovação, Fiscalização e Liquidação',
      legalArticles: 'Arts. 9º, 10 e 11',
      requirements: [
        'Controle de Presença (Art. 9º): Registro de apresentação, permanência, encerramento e confrontação com CIOPS/sistemas operacionais locais;',
        'RENE - Relatório de Execução de JOE (Art. 10): Com efetivo empregado, local, horário, nº do processo SEI e 3 assinaturas (Oficial Responsável, P/1 e Comandante da UPM);',
        'Relatório Operacional e Planilha Consolidada dos policiais militares efetivamente empregados;',
        'Declaração expressa do Comandante da UPM certificando a inexistência de sobreposição e a plena regularidade do serviço.',
      ],
    },
  ],
  impediments: {
    title: 'Vedações e Impedimentos Absolutos (Art. 7º)',
    items: [
      'Policial militar escalado em serviço ordinário no mesmo período (mesmo que parcial);',
      'Militar afastado por Licença para Tratamento de Saúde (LTS própria ou de dependente - LTSPF);',
      'Militar submetido a restrição médica funcional incompatível com a atividade/esforço operacional;',
      'Militar em cumprimento de sanção disciplinar impeditiva do serviço, afastamento preventivo, reserva remunerada ou reformado;',
      'Inclusão meramente retroativa de policial militar em escala extraordinária (salvo situação excepcional justificada apreciada pelo CPI e homologada pelo Cmt-Geral - Art. 11, § 2º).',
    ],
  },
  cpiDuties: {
    article: 'Art. 13 da Portaria nº 122/2026-GCG',
    intro:
      'O Comando de Policiamento do Interior (CPI) exerce a supervisão intermediária obrigatória sobre todas as suas Unidades subordinadas (CPA/I-1 a CPA/I-9 e Direção Setorial), competindo-lhe privativamente:',
    responsibilities: [
      {
        title: 'Análise e Autorização Prévia',
        articles: 'Art. 1º, § 1º e Art. 13, I',
        description:
          'Avaliar a pertinência técnica, legal e operacional e deferir/indeferir formalmente os pedidos de JOE das UPMs antes do início de qualquer missão.',
      },
      {
        title: 'Controle Orçamentário Estrito',
        articles: 'Art. 5º e Art. 13, II',
        description:
          'Monitorar continuamente o saldo da cota orçamentária e financeira disponibilizada (teto de R$ 660.100,00 e 1.886 JOEs), sendo terminantemente vedado autorizar despesas além do limite.',
      },
      {
        title: 'Conferência Documental e Fiscalização em Campo',
        articles: 'Art. 13, III e IV',
        description:
          'Auditar integralmente os autos dos processos no SEI e fiscalizar, inclusive por amostragem presencial, o cumprimento real das escalas de serviço extraordinário.',
      },
      {
        title: 'Encaminhamento Semanal Obrigatório à Pagadoria',
        articles: 'Art. 13, V',
        description:
          'Consolidar e enviar à Pagadoria-DGP, obrigatoriamente às terças-feiras, em processo único e planilha única, todas as operações realizadas pelas Unidades subordinadas contempladas com JOEs.',
        highlight: true,
      },
      {
        title: 'Comunicação Imediata de Irregularidades',
        articles: 'Art. 13, VI e Art. 16',
        description:
          'Notificar imediatamente o Comando-Geral e Corregedoria-Geral ao constatar qualquer indício de irregularidade, inconsistência, sobreposição ou desvio normativo.',
      },
    ],
  },
  quotaTable: [
    { unit: 'CPI — Direção Setorial', joes: 30, amount: 10500 },
    { unit: 'Comando de Policiamento de Área do Interior - 1 (CPA/I-1)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 2 (CPA/I-2)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 3 (CPA/I-3)', joes: 300, amount: 105000 },
    { unit: 'Comando de Policiamento de Área do Interior - 4 (CPA/I-4)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 5 (CPA/I-5)', joes: 230, amount: 80500 },
    { unit: 'Comando de Policiamento de Área do Interior - 6 (CPA/I-6)', joes: 170, amount: 59500 },
    { unit: 'Comando de Policiamento de Área do Interior - 7 (CPA/I-7)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 8 (CPA/I-8)', joes: 186, amount: 65100 },
    { unit: 'Comando de Policiamento de Área do Interior - 9 (CPA/I-9)', joes: 226, amount: 79100 },
  ],
  totalJoes: 1886,
  totalAmount: 660100,
};

// Automatic generator for new user-provided ordinances:
export function generateCpiSummaryFromInput(data: {
  ordinanceNumber: string;
  period: string;
  seiProcess: string;
  seiDocNumber?: string;
  unitValue?: number;
  monthlyLimit?: number;
  quotas?: { unit: string; joes: number; amount: number }[];
}): CpiExecutiveSummary {
  const val = data.unitValue || 350;
  const limit = data.monthlyLimit || 12;

  const defaultQuotas = [
    { unit: 'CPI — Direção Setorial', joes: 30, amount: 30 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 1 (CPA/I-1)', joes: 186, amount: 186 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 2 (CPA/I-2)', joes: 186, amount: 186 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 3 (CPA/I-3)', joes: 300, amount: 300 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 4 (CPA/I-4)', joes: 186, amount: 186 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 5 (CPA/I-5)', joes: 230, amount: 230 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 6 (CPA/I-6)', joes: 170, amount: 170 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 7 (CPA/I-7)', joes: 186, amount: 186 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 8 (CPA/I-8)', joes: 186, amount: 186 * val },
    { unit: 'Comando de Policiamento de Área do Interior - 9 (CPA/I-9)', joes: 226, amount: 226 * val },
  ];

  const quotaList = data.quotas && data.quotas.length > 0 ? data.quotas : defaultQuotas;
  const totalJoes = quotaList.reduce((acc, q) => acc + (Number(q.joes) || 0), 0);
  const totalAmount = quotaList.reduce((acc, q) => acc + (Number(q.amount) || 0), 0);

  return {
    ordinanceNumber: data.ordinanceNumber.toUpperCase().trim(),
    period: data.period,
    seiProcess: data.seiProcess || '2026.190110.35458',
    seiDocNumber: data.seiDocNumber || '016909457',
    parameters: {
      duration: 'Até 06 Horas (Turno contínuo extraordinário)',
      unitValue: `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Por jornada / toda a semana)`,
      monthlyLimit: `Máx. ${limit} JOEs (Teto legal intransponível por militar)`,
      dutyRegime: 'Horário de Folga (Vedada qualquer sobreposição ordinária)',
      legalConcept: `É a jornada extraordinária cumprida por militar em horário de folga, vedada para serviço ordinário ou substituição de escala de rotina.`,
    },
    seiPhases: OFFICIAL_CPI_SUMMARY.seiPhases,
    impediments: OFFICIAL_CPI_SUMMARY.impediments,
    cpiDuties: OFFICIAL_CPI_SUMMARY.cpiDuties,
    quotaTable: quotaList,
    totalJoes,
    totalAmount,
  };
}

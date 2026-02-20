// Mock tools for the mandate builder demo
// These represent the kinds of tools a skill pack would provide

export interface MockTool {
    id: string;
    name: string;
    category: 'research' | 'drafting' | 'analysis' | 'utilities' | 'financial' | 'system' | 'communication' | 'compliance';
    description: string;
    icon: string;
    riskLevel: 'low' | 'medium' | 'high';
}

export const MOCK_TOOLS: MockTool[] = [
    // Research
    {
        id: 'legislation-lookup',
        name: 'Research Legislation',
        category: 'research',
        description: 'Search legislation databases for relevant statutes and regulations',
        icon: '📚',
        riskLevel: 'low',
    },
    {
        id: 'case-law-search',
        name: 'Search Case Law',
        category: 'research',
        description: 'Find relevant court decisions and legal precedents',
        icon: '⚖️',
        riskLevel: 'low',
    },
    {
        id: 'regulatory-search',
        name: 'Search Regulations',
        category: 'research',
        description: 'Look up industry-specific regulatory guidance and codes of practice',
        icon: '📜',
        riskLevel: 'low',
    },
    {
        id: 'policy-lookup',
        name: 'Lookup Policies',
        category: 'research',
        description: 'Search internal and external policy documents',
        icon: '🗂️',
        riskLevel: 'low',
    },

    // Drafting
    {
        id: 'formal-letter',
        name: 'Draft Formal Letter',
        category: 'drafting',
        description: 'Generate formal correspondence with proper legal formatting',
        icon: '✉️',
        riskLevel: 'medium',
    },
    {
        id: 'email-draft',
        name: 'Draft Email',
        category: 'drafting',
        description: 'Compose professional emails with appropriate tone',
        icon: '📧',
        riskLevel: 'low',
    },
    {
        id: 'contract-draft',
        name: 'Draft Contract',
        category: 'drafting',
        description: 'Generate contract templates with standard clauses',
        icon: '📝',
        riskLevel: 'high',
    },
    {
        id: 'memo-draft',
        name: 'Draft Memo',
        category: 'drafting',
        description: 'Create internal memoranda and briefing notes',
        icon: '🗒️',
        riskLevel: 'low',
    },
    {
        id: 'report-generate',
        name: 'Generate Report',
        category: 'drafting',
        description: 'Produce structured reports from collected data',
        icon: '📊',
        riskLevel: 'medium',
    },

    // Analysis
    {
        id: 'document-summariser',
        name: 'Summarise Documents',
        category: 'analysis',
        description: 'Create concise summaries of uploaded documents',
        icon: '📋',
        riskLevel: 'low',
    },
    {
        id: 'risk-assessment',
        name: 'Assess Risk',
        category: 'analysis',
        description: 'Evaluate risk factors and provide a risk assessment',
        icon: '🔍',
        riskLevel: 'medium',
    },
    {
        id: 'contract-review',
        name: 'Review Contracts',
        category: 'analysis',
        description: 'Analyse contract clauses and flag potential issues',
        icon: '📑',
        riskLevel: 'medium',
    },
    {
        id: 'sentiment-analysis',
        name: 'Analyse Sentiment',
        category: 'analysis',
        description: 'Detect tone and sentiment in communications',
        icon: '💬',
        riskLevel: 'low',
    },
    {
        id: 'compliance-check',
        name: 'Check Compliance',
        category: 'analysis',
        description: 'Verify documents against regulatory requirements',
        icon: '✅',
        riskLevel: 'medium',
    },
    {
        id: 'clause-compare',
        name: 'Compare Clauses',
        category: 'analysis',
        description: 'Side-by-side comparison of contract clauses across versions',
        icon: '🔀',
        riskLevel: 'low',
    },

    // Utilities
    {
        id: 'deadline-calculator',
        name: 'Calculate Deadlines',
        category: 'utilities',
        description: 'Compute important dates and legal deadlines',
        icon: '📅',
        riskLevel: 'low',
    },
    {
        id: 'unit-converter',
        name: 'Convert Units',
        category: 'utilities',
        description: 'Convert currencies, measurements, and time zones',
        icon: '🔄',
        riskLevel: 'low',
    },
    {
        id: 'translation',
        name: 'Translate Text',
        category: 'utilities',
        description: 'Translate content between languages',
        icon: '🌍',
        riskLevel: 'low',
    },
    {
        id: 'ocr-extract',
        name: 'Extract from Image',
        category: 'utilities',
        description: 'Read and extract text from scanned documents or images',
        icon: '🖼️',
        riskLevel: 'low',
    },

    // Communication
    {
        id: 'notification-send',
        name: 'Send Notification',
        category: 'communication',
        description: 'Send alerts or notifications to users and teams',
        icon: '🔔',
        riskLevel: 'medium',
    },
    {
        id: 'calendar-schedule',
        name: 'Schedule Meeting',
        category: 'communication',
        description: 'Create and manage calendar events',
        icon: '📆',
        riskLevel: 'medium',
    },
    {
        id: 'sms-send',
        name: 'Send SMS',
        category: 'communication',
        description: 'Send text messages to mobile numbers',
        icon: '📱',
        riskLevel: 'high',
    },
    {
        id: 'ticket-create',
        name: 'Create Support Ticket',
        category: 'communication',
        description: 'Open tickets in helpdesk or issue tracking systems',
        icon: '🎫',
        riskLevel: 'medium',
    },

    // Financial
    {
        id: 'payment-send',
        name: 'Process Payment',
        category: 'financial',
        description: 'Send or process financial payments',
        icon: '💳',
        riskLevel: 'high',
    },
    {
        id: 'payment-refund',
        name: 'Issue Refund',
        category: 'financial',
        description: 'Process refund transactions',
        icon: '💰',
        riskLevel: 'high',
    },
    {
        id: 'invoice-generate',
        name: 'Generate Invoice',
        category: 'financial',
        description: 'Create and send invoices to clients',
        icon: '🧾',
        riskLevel: 'medium',
    },
    {
        id: 'expense-submit',
        name: 'Submit Expense',
        category: 'financial',
        description: 'Log and submit expense claims for approval',
        icon: '💸',
        riskLevel: 'medium',
    },

    // Compliance
    {
        id: 'gdpr-check',
        name: 'GDPR Assessment',
        category: 'compliance',
        description: 'Evaluate data handling against GDPR requirements',
        icon: '🛡️',
        riskLevel: 'medium',
    },
    {
        id: 'aml-screen',
        name: 'AML Screening',
        category: 'compliance',
        description: 'Screen individuals and entities against sanctions lists',
        icon: '🔎',
        riskLevel: 'high',
    },
    {
        id: 'conflict-check',
        name: 'Conflict Check',
        category: 'compliance',
        description: 'Check for conflicts of interest across matters and clients',
        icon: '⚠️',
        riskLevel: 'medium',
    },
    {
        id: 'audit-trail',
        name: 'Record Audit Entry',
        category: 'compliance',
        description: 'Log actions to the immutable audit trail',
        icon: '📒',
        riskLevel: 'low',
    },

    // System
    {
        id: 'shell-execute',
        name: 'Run System Command',
        category: 'system',
        description: 'Execute commands on the underlying system',
        icon: '💻',
        riskLevel: 'high',
    },
    {
        id: 'web-scrape',
        name: 'Scrape Websites',
        category: 'system',
        description: 'Extract and download data from websites',
        icon: '🌐',
        riskLevel: 'high',
    },
    {
        id: 'database-query',
        name: 'Query Database',
        category: 'system',
        description: 'Run queries against connected databases',
        icon: '🗄️',
        riskLevel: 'high',
    },
    {
        id: 'file-write',
        name: 'Write to Files',
        category: 'system',
        description: 'Create or modify files on the server filesystem',
        icon: '💾',
        riskLevel: 'high',
    },
    {
        id: 'api-call',
        name: 'Call External API',
        category: 'system',
        description: 'Make HTTP requests to third-party services',
        icon: '🔗',
        riskLevel: 'high',
    },
];

export const CATEGORIES = [
    { id: 'research', label: 'Research', icon: '🔬' },
    { id: 'drafting', label: 'Drafting', icon: '✍️' },
    { id: 'analysis', label: 'Analysis', icon: '🔍' },
    { id: 'utilities', label: 'Utilities', icon: '🔧' },
    { id: 'communication', label: 'Communication', icon: '📡' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'compliance', label: 'Compliance', icon: '🛡️' },
    { id: 'system', label: 'System', icon: '⚙️' },
] as const;

export const JURISDICTIONS = [
    { code: 'GB-EAW', label: 'England & Wales' },
    { code: 'GB-SCT', label: 'Scotland' },
    { code: 'GB-NIR', label: 'Northern Ireland' },
    { code: 'IE', label: 'Ireland' },
    { code: 'US', label: 'United States' },
    { code: 'US-CA', label: 'California' },
    { code: 'US-NY', label: 'New York' },
    { code: 'US-TX', label: 'Texas' },
    { code: 'EU', label: 'European Union' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
    { code: 'AU', label: 'Australia' },
    { code: 'CA', label: 'Canada' },
    { code: 'SG', label: 'Singapore' },
    { code: 'AE', label: 'UAE' },
];

export const PROHIBITED_ACTIONS = [
    { id: 'provide_legal_advice', label: 'Give definitive legal advice', description: 'State something IS the law — only inform' },
    { id: 'represent_as_solicitor', label: 'Claim to be a lawyer', description: 'Present itself as a qualified solicitor or barrister' },
    { id: 'guarantee_outcomes', label: 'Guarantee outcomes', description: 'Promise specific results in legal proceedings' },
    { id: 'diagnose_medical', label: 'Diagnose medical conditions', description: 'Provide medical diagnoses or treatment advice' },
    { id: 'financial_advice', label: 'Give financial advice', description: 'Recommend specific investments or financial products' },
    { id: 'discriminate', label: 'Discriminate', description: 'Treat users differently based on protected characteristics' },
    { id: 'share_pii', label: 'Share personal data', description: 'Reveal user information to other users or third parties' },
    { id: 'autonomous_decisions', label: 'Make autonomous decisions', description: 'Take binding actions without human confirmation' },
];

export const DATA_CATEGORIES = [
    { id: 'financial_accounts', label: 'Financial accounts', icon: '🏦' },
    { id: 'medical_records', label: 'Medical records', icon: '🏥' },
    { id: 'criminal_records', label: 'Criminal records', icon: '👮' },
    { id: 'biometric_data', label: 'Biometric data', icon: '🔐' },
    { id: 'minor_data', label: "Children's data", icon: '👶' },
    { id: 'political_opinions', label: 'Political opinions', icon: '🗳️' },
    { id: 'trade_secrets', label: 'Trade secrets', icon: '🤫' },
    { id: 'legal_privilege', label: 'Privileged communications', icon: '🔏' },
];

export const ESCALATION_TOPICS = [
    { id: 'criminal_defence', label: 'Criminal defence' },
    { id: 'immigration_asylum', label: 'Immigration & asylum' },
    { id: 'child_protection', label: 'Child protection' },
    { id: 'domestic_violence', label: 'Domestic violence' },
    { id: 'mental_health', label: 'Mental health crisis' },
    { id: 'suicide_self_harm', label: 'Suicide or self-harm' },
    { id: 'terrorism', label: 'Terrorism-related' },
    { id: 'money_laundering', label: 'Money laundering' },
    { id: 'fraud', label: 'Fraud allegations' },
    { id: 'data_breach', label: 'Data breach incident' },
];

export const SKILL_PACKS = [
    { id: 'uk-law', label: 'UK Law', description: 'UK legislation, case law, formal letters' },
    { id: 'us-law', label: 'US Law', description: 'US federal and state legislation' },
    { id: 'eu-law', label: 'EU Law', description: 'European Union regulations and directives' },
    { id: 'healthcare', label: 'Healthcare', description: 'Medical guidelines and clinical protocols' },
    { id: 'finance', label: 'Finance', description: 'Financial regulations and compliance' },
    { id: 'employment', label: 'Employment', description: 'Employment law, HR policies, workplace disputes' },
    { id: 'property', label: 'Property', description: 'Real estate, land registry, conveyancing' },
    { id: 'ip-law', label: 'Intellectual Property', description: 'Patents, trademarks, copyright' },
];

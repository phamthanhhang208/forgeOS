/**
 * Pre-cached demo responses for all pipeline agent nodes.
 * Used when demoMode === true to skip external API calls entirely.
 * Concept: "Client portal for a law firm"
 */

export const DEMO_CONCEPT = 'Client portal for a law firm'

export const DEMO_TIMING = {
    node1ProcessingMs: 3000,
    node2ProcessingMs: 2500,
    node3ProcessingMs: 3500,
    shipyardStepMs: 1200,
}

export const DEMO_CLARIFY_QUESTIONS = [
    {
        id: 'target_audience',
        question: 'Who is your primary target audience for this portal?',
        type: 'select' as const,
        options: [
            'Solo practitioners (1-2 attorneys)',
            'Small law firms (3-15 attorneys)',
            'Mid-size firms (15-50 attorneys)',
            'Large firms (50+ attorneys)',
            'In-house corporate legal teams',
        ],
    },
    {
        id: 'core_problem',
        question: 'What is the #1 pain point you want to solve for your clients?',
        type: 'text' as const,
        placeholder: 'e.g., Clients constantly call to ask about case status updates',
    },
    {
        id: 'existing_tools',
        question: 'What tools are you currently using for client communication?',
        type: 'multiselect' as const,
        options: [
            'Email only',
            'Phone calls',
            'Clio',
            'MyCase',
            'PracticePanther',
            'Custom spreadsheets',
            'No system in place',
        ],
    },
    {
        id: 'must_have_features',
        question: 'Which features are absolute must-haves for your MVP?',
        type: 'multiselect' as const,
        options: [
            'Secure document sharing',
            'Case status tracking',
            'Encrypted messaging',
            'Invoice/billing viewer',
            'Appointment scheduling',
            'Multi-language support',
        ],
    },
    {
        id: 'monetization',
        question: 'How do you plan to monetize this product?',
        type: 'select' as const,
        options: [
            'Per-seat SaaS subscription',
            'Freemium with premium tiers',
            'Flat monthly fee per firm',
            'Usage-based pricing',
            'Not sure yet',
        ],
    },
]

// Node 1: Strategist
export const DEMO_STRATEGIST = {
    targetAudience:
        'Small to mid-size law firms (5-50 attorneys) seeking to modernize client communication and document sharing.',
    audienceSegments: [
        'Solo practitioners and small partnerships',
        'Mid-size litigation firms',
        'Corporate law departments',
        'Immigration and family law practices',
    ],
    mvpFeatures: [
        {
            name: 'Secure Document Vault',
            priority: 'MUST' as const,
            rationale:
                'Clients need a secure, encrypted space to upload and access legal documents 24/7.',
        },
        {
            name: 'Case Status Dashboard',
            priority: 'MUST' as const,
            rationale:
                'Reduces inbound calls by 40% — clients can self-serve on case progress updates.',
        },
        {
            name: 'Encrypted Messaging',
            priority: 'MUST' as const,
            rationale:
                'Attorney-client privilege requires end-to-end encrypted communication channels.',
        },
        {
            name: 'Billing & Invoice Viewer',
            priority: 'SHOULD' as const,
            rationale:
                'Transparency in billing reduces disputes and improves collection rates.',
        },
        {
            name: 'Appointment Scheduling',
            priority: 'SHOULD' as const,
            rationale:
                'Eliminates back-and-forth emails for scheduling consultations.',
        },
        {
            name: 'Multi-language Support',
            priority: 'COULD' as const,
            rationale:
                'Expands addressable market for immigration law firms serving non-English speakers.',
        },
    ],
    monetizationStrategy:
        'Per-seat SaaS pricing at $49/attorney/month with a free tier for solo practitioners (1 attorney, 10 clients). Enterprise tier at $99/seat adds SSO, audit logs, and priority support.',
    marketDifferentiators: [
        'Built specifically for legal compliance (HIPAA-adjacent security, audit trails)',
        'White-label option so firms can brand the portal as their own',
        'AI-powered document summarization for client-friendly case updates',
    ],
    riskFactors: [
        'Legal industry is slow to adopt new technology — requires trust-building sales cycle',
        'Must achieve SOC 2 Type II compliance before enterprise deals close',
        'Competing with established players like Clio and MyCase who may add portal features',
        'Attorney-client privilege regulations vary by jurisdiction',
    ],
}

// Node 2: Business Analyst
export const DEMO_ANALYST = {
    userPersonas: [
        {
            name: 'Sarah, Managing Partner',
            description:
                'Oversees a 15-attorney firm. Needs to reduce admin overhead and improve client satisfaction scores. Evaluates tools based on security certifications and ROI.',
        },
        {
            name: 'Marcus, Associate Attorney',
            description:
                'Handles 30+ active cases. Spends 2 hours daily answering client status emails. Needs a self-service portal to reclaim billable hours.',
        },
        {
            name: 'Elena, Legal Client',
            description:
                'Going through a complex immigration case. Frustrated by lack of visibility into case progress. Wants real-time updates without calling the office.',
        },
    ],
    coreUserStories: [
        'As a client, I want to view my case status and recent activity so I can stay informed without calling my attorney.',
        'As an attorney, I want to upload documents to a secure vault so my clients can access them anytime.',
        'As a client, I want to message my attorney through encrypted chat so our communication stays privileged.',
        'As a managing partner, I want to see a dashboard of all active cases and client engagement metrics.',
        'As a client, I want to view and pay invoices online so I can manage my legal expenses easily.',
        'As an attorney, I want clients to self-schedule consultations so I can reduce scheduling overhead.',
    ],
    dataEntities: [
        {
            name: 'Firm',
            fields: ['id', 'name', 'plan', 'settings', 'createdAt'],
        },
        {
            name: 'Attorney',
            fields: [
                'id',
                'firmId',
                'email',
                'name',
                'role',
                'barNumber',
            ],
        },
        {
            name: 'Client',
            fields: ['id', 'firmId', 'email', 'name', 'phone', 'preferredLanguage'],
        },
        {
            name: 'Case',
            fields: [
                'id',
                'firmId',
                'clientId',
                'attorneyId',
                'title',
                'status',
                'type',
                'filedDate',
            ],
        },
        {
            name: 'Document',
            fields: [
                'id',
                'caseId',
                'uploadedBy',
                'fileName',
                'mimeType',
                'encryptedUrl',
                'createdAt',
            ],
        },
        {
            name: 'Message',
            fields: [
                'id',
                'caseId',
                'senderId',
                'body',
                'encrypted',
                'readAt',
                'createdAt',
            ],
        },
        {
            name: 'Invoice',
            fields: [
                'id',
                'caseId',
                'amount',
                'status',
                'dueDate',
                'paidAt',
            ],
        },
    ],
    integrations: [
        {
            name: 'Stripe',
            purpose: 'Payment processing for invoice payments and subscription billing',
        },
        {
            name: 'SendGrid',
            purpose: 'Transactional emails for case updates and document notifications',
        },
        {
            name: 'Calendly',
            purpose: 'Embedded scheduling widget for client appointment booking',
        },
        {
            name: 'AWS S3',
            purpose: 'Encrypted document storage with server-side encryption (SSE-S3)',
        },
    ],
}

// Node 3: Tech Lead
export const DEMO_TECHLEAD = {
    techStack: {
        frontend: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'],
        backend: ['Node.js', 'Express', 'Prisma ORM', 'PostgreSQL'],
        infra: ['DigitalOcean App Platform', 'DO Managed Database', 'DO Spaces'],
    },
    prismaSchemaDelta: `model Firm {
  id        String   @id @default(cuid())
  name      String
  plan      String   @default("free")
  createdAt DateTime @default(now())
  attorneys Attorney[]
  clients   Client[]
  cases     Case[]
}

model Attorney {
  id        String   @id @default(cuid())
  firmId    String
  firm      Firm     @relation(fields: [firmId], references: [id])
  email     String   @unique
  name      String
  role      String   @default("associate")
  cases     Case[]
  createdAt DateTime @default(now())
}

model Client {
  id                String   @id @default(cuid())
  firmId            String
  firm              Firm     @relation(fields: [firmId], references: [id])
  email             String
  name              String
  phone             String?
  preferredLanguage String   @default("en")
  cases             Case[]
  createdAt         DateTime @default(now())
}

model Case {
  id         String     @id @default(cuid())
  firmId     String
  firm       Firm       @relation(fields: [firmId], references: [id])
  clientId   String
  client     Client     @relation(fields: [clientId], references: [id])
  attorneyId String
  attorney   Attorney   @relation(fields: [attorneyId], references: [id])
  title      String
  status     String     @default("active")
  type       String
  documents  Document[]
  messages   Message[]
  invoices   Invoice[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

model Document {
  id           String   @id @default(cuid())
  caseId       String
  case         Case     @relation(fields: [caseId], references: [id])
  uploadedBy   String
  fileName     String
  mimeType     String
  encryptedUrl String
  createdAt    DateTime @default(now())
}

model Message {
  id        String    @id @default(cuid())
  caseId    String
  case      Case      @relation(fields: [caseId], references: [id])
  senderId  String
  body      String
  encrypted Boolean   @default(true)
  readAt    DateTime?
  createdAt DateTime  @default(now())
}

model Invoice {
  id        String    @id @default(cuid())
  caseId    String
  case      Case      @relation(fields: [caseId], references: [id])
  amount    Float
  status    String    @default("pending")
  dueDate   DateTime
  paidAt    DateTime?
  createdAt DateTime  @default(now())
}`,
    phase1Features: [
        {
            feature: 'Secure Document Vault',
            description:
                'Encrypted file upload/download with role-based access control per case.',
        },
        {
            feature: 'Case Status Dashboard',
            description:
                'Real-time case status view for clients with activity timeline.',
        },
        {
            feature: 'Encrypted Messaging',
            description:
                'Attorney-client messaging with E2EE and read receipts.',
        },
    ],
    phase2Features: [
        {
            feature: 'Billing & Invoice Portal',
            description: 'Stripe-integrated invoice viewing and online payment.',
        },
        {
            feature: 'Appointment Scheduling',
            description: 'Calendly-embedded scheduling with case linking.',
        },
        {
            feature: 'White-label Branding',
            description:
                'Custom domain, logo, and color scheme per firm.',
        },
    ],
    apiEndpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET /api/cases',
        'GET /api/cases/:id',
        'POST /api/cases/:id/documents',
        'GET /api/cases/:id/documents',
        'POST /api/cases/:id/messages',
        'GET /api/cases/:id/messages',
        'GET /api/invoices',
        'POST /api/invoices/:id/pay',
    ],
    envVarsRequired: [
        'DATABASE_URL',
        'STRIPE_SECRET_KEY',
        'SENDGRID_API_KEY',
        'S3_BUCKET',
        'S3_REGION',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
    ],
}

// Node 4: Shipyard (deployment result)
export const DEMO_SHIPYARD = {
    githubRepoUrl: 'https://github.com/demo-org/client-portal-law-firm',
    doAppUrl: 'https://client-portal-law-firm-demo.ondigitalocean.app',
    buildStatus: 'ACTIVE' as const,
}

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

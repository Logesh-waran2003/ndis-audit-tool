export interface ChecklistItem {
  id: string
  category: string
  name: string
  description: string
  type: 'upload' | 'in_tool' | 'export_external'
  canGenerate: boolean
  perWorker?: boolean
  perParticipant?: boolean
}

export const AUDIT_CHECKLIST: ChecklistItem[] = [
  // Governance & Business
  { id: 'GOV-POLICY', category: 'Governance & Business', name: 'Policies and procedures manual', description: 'Complete policy manual covering operations', type: 'upload', canGenerate: false },
  { id: 'GOV-BIZPLAN', category: 'Governance & Business', name: 'Business plan', description: 'Current business plan reflecting organisational structure and goals', type: 'upload', canGenerate: true },
  { id: 'GOV-ORGCHART', category: 'Governance & Business', name: 'Organisation chart', description: 'Current organisational structure showing roles and reporting lines', type: 'upload', canGenerate: true },
  { id: 'GOV-DELEGATION', category: 'Governance & Business', name: 'Delegation of authority register', description: 'Who can approve invoices, payments, communications', type: 'upload', canGenerate: true },
  { id: 'GOV-COI', category: 'Governance & Business', name: 'Conflict of interest register and forms', description: 'COI declarations from all staff', type: 'upload', canGenerate: true },
  { id: 'GOV-LEGISLATIVE', category: 'Governance & Business', name: 'Legislative compliance register', description: 'List of all legislation the organisation complies with', type: 'upload', canGenerate: true },
  { id: 'GOV-MINUTES', category: 'Governance & Business', name: 'Recent meeting minutes', description: 'Evidence of governance meetings', type: 'upload', canGenerate: false },

  // Registers
  { id: 'REG-CI', category: 'Registers', name: 'Continuous improvement register', description: 'Record of improvements identified and actioned', type: 'in_tool', canGenerate: false },
  { id: 'REG-RISK', category: 'Registers', name: 'Risk register', description: 'Identified risks with treatments, reviewed within 12 months', type: 'upload', canGenerate: true },
  { id: 'REG-INCIDENT', category: 'Registers', name: 'Incident register + sample incident forms', description: 'Record of incidents with investigation trail', type: 'in_tool', canGenerate: false },
  { id: 'REG-COMPLAINT', category: 'Registers', name: 'Complaints register and feedback records', description: 'Record of complaints with resolution', type: 'in_tool', canGenerate: false },

  // Insurance & Compliance
  { id: 'INS-PL', category: 'Insurance & Compliance', name: 'Public liability insurance certificate', description: 'Current certificate of currency', type: 'upload', canGenerate: false },
  { id: 'INS-PI', category: 'Insurance & Compliance', name: 'Professional indemnity insurance certificate', description: 'Current certificate of currency', type: 'upload', canGenerate: false },
  { id: 'INS-WC', category: 'Insurance & Compliance', name: 'Workers compensation insurance', description: 'Current certificate of currency', type: 'upload', canGenerate: false },
  { id: 'INS-REGO', category: 'Insurance & Compliance', name: 'NDIS certificate of registration', description: 'Current registration certificate from Commission', type: 'upload', canGenerate: false },

  // Staff Files (per worker)
  { id: 'STAFF-ID', category: 'Staff Files', name: '100 Points of ID', description: 'Passport, birth certificate, drivers licence', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-SCREENING', category: 'Staff Files', name: 'NDIS Worker Screening Clearance', description: 'Current clearance certificate', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-POLICE', category: 'Staff Files', name: 'National Police Check', description: 'Current within 3 years', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-CONTRACT', category: 'Staff Files', name: 'Signed employment contract', description: 'Current signed contract', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-PD', category: 'Staff Files', name: 'Position description', description: 'Current role description with responsibilities', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-RESUME', category: 'Staff Files', name: 'Resume / CV', description: 'On file for each worker', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-INDUCTION', category: 'Staff Files', name: 'Induction checklist (completed)', description: 'Signed induction covering policies, WHS, Code of Conduct', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-ORIENTATION', category: 'Staff Files', name: 'NDIS Worker Orientation Module (4 modules)', description: 'Quality Safety and You, New Worker, Communication, Safe Meals', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-COC', category: 'Staff Files', name: 'Code of Conduct signed', description: 'Signed acknowledgement per worker', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-COI', category: 'Staff Files', name: 'Conflict of Interest declaration', description: 'Signed declaration per worker', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-FIRSTAID', category: 'Staff Files', name: 'First Aid & CPR certificate', description: 'First Aid 3yr expiry, CPR 1yr expiry', type: 'upload', canGenerate: false, perWorker: true },

  // Participant Files (5 samples)
  { id: 'PART-SA', category: 'Participant Files (5 samples)', name: 'Service agreements', description: 'Signed or accepted service agreements', type: 'export_external', canGenerate: false, perParticipant: true },
  { id: 'PART-STATEMENTS', category: 'Participant Files (5 samples)', name: 'Monthly financial statements', description: 'Evidence of monthly statements sent', type: 'export_external', canGenerate: false, perParticipant: true },
]

// ponytail: categories derived from data, not a separate list
export const CHECKLIST_CATEGORIES = [...new Set(AUDIT_CHECKLIST.map(i => i.category))]

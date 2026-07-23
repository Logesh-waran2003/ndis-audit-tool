import type { ComplianceStatus } from "@/components/ui/status-badge"

export interface QualityIndicator {
  id: string
  description: string
  evidenced: boolean
  linkedEvidenceIds: string[]
}

export interface StandardDetail {
  code: string
  name: string
  division: string
  divisionNumber: number
  status: ComplianceStatus
  description: string
  evidenceGuidance: string[]
  planManagementSpecific: string[]
  commonGaps: string[]
  goldStandard: string
  qualityIndicators: QualityIndicator[]
}

export const standardsData: StandardDetail[] = [
  {
    code: "VM-1.1",
    name: "Governance and Operational Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "PARTIAL",
    description: "The provider has systems of governance that establish clear accountabilities, and actively monitors the quality and safety of supports delivered.",
    evidenceGuidance: [
      "Organisational chart with clear accountability lines",
      "Board/owner meeting minutes showing oversight of quality",
      "Business plan with NDIS compliance objectives",
      "Delegations and authority matrix",
      "Evidence of regular leadership review of KPIs",
    ],
    planManagementSpecific: [
      "Document who is accountable for plan management decisions",
      "Show how financial delegations work for paying invoices",
      "Demonstrate oversight of claim accuracy and timeliness",
    ],
    commonGaps: [
      "No documented governance structure for a sole trader / small business",
      "Meeting minutes don't reference quality or safety",
      "No evidence of leadership actively monitoring compliance",
    ],
    goldStandard: "A governance framework document that names roles, accountabilities, meeting cadence, KPIs tracked, and escalation pathways — reviewed annually with evidence of changes made.",
    qualityIndicators: [
      { id: "VM-1.1-QI1", description: "Governance structure is clearly documented", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.1-QI2", description: "Roles, responsibilities, and accountabilities are defined", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.1-QI3", description: "Governance actively monitors quality and safety", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.1-QI4", description: "Strategic and business planning includes quality objectives", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.1-QI5", description: "Financial management supports service delivery", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-1.2",
    name: "Risk Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "GAP",
    description: "Risks to participants and the organisation are identified, assessed, and managed with appropriate controls and review.",
    evidenceGuidance: [
      "Risk management framework / policy",
      "Risk register with ratings and controls",
      "Evidence of regular risk register review",
      "Business continuity plan",
      "Evidence that risks are escalated and addressed",
    ],
    planManagementSpecific: [
      "Financial risks specific to plan management (e.g., overspending budgets, incorrect claims)",
      "Risk of conflicts of interest when managing participant funds",
      "Data security risks for financial information",
    ],
    commonGaps: [
      "Risk register exists but hasn't been reviewed in 12+ months",
      "Framework doesn't address plan-management-specific financial risks",
      "No evidence of risk being escalated or actioned",
    ],
    goldStandard: "A live risk register reviewed quarterly, with each risk rated, owned, controlled, and linked to incidents. Framework reviewed annually with participant input.",
    qualityIndicators: [
      { id: "VM-1.2-QI1", description: "Risk management framework is documented and current", evidenced: false, linkedEvidenceIds: ["1"] },
      { id: "VM-1.2-QI2", description: "Risk register is maintained and regularly reviewed", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.2-QI3", description: "Risks are identified, assessed, and mitigated", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.2-QI4", description: "Business continuity plan is in place", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-1.3",
    name: "Quality Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "GAP",
    description: "The provider has a quality management system that drives continuous improvement in service delivery.",
    evidenceGuidance: [
      "Quality management policy or system description",
      "Continuous improvement register with actions and outcomes",
      "Internal audit schedule and findings",
      "Participant satisfaction surveys and responses",
      "Evidence of changes made from feedback",
    ],
    planManagementSpecific: [
      "Tracking claim accuracy rates as a quality metric",
      "Participant satisfaction with financial reporting",
      "Response time KPIs for invoice processing",
    ],
    commonGaps: [
      "No continuous improvement register at all",
      "Register exists but no entries for 6+ months",
      "No evidence that feedback leads to actual changes",
    ],
    goldStandard: "Active CI register updated monthly, internal audits twice yearly, participant feedback collected and actioned quarterly, with clear evidence trail from issue → action → outcome.",
    qualityIndicators: [
      { id: "VM-1.3-QI1", description: "Quality management system is documented", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.3-QI2", description: "Continuous improvement is embedded in operations", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.3-QI3", description: "Internal audits are conducted regularly", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.3-QI4", description: "Feedback mechanisms drive service improvement", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-1.4",
    name: "Information Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "PARTIAL",
    description: "Information is managed so it is accurate, accessible, confidential, and supports service delivery.",
    evidenceGuidance: [
      "Privacy and information management policy",
      "Data breach response plan",
      "Records management procedures",
      "Consent forms for information sharing",
      "IT security measures documentation",
    ],
    planManagementSpecific: [
      "How participant financial data is stored and protected",
      "Access controls for plan management systems",
      "Data retention policies for financial records (7 years)",
    ],
    commonGaps: [
      "Privacy policy doesn't address digital/cloud storage",
      "No data breach response plan",
      "Consent forms are generic and don't cover specific sharing scenarios",
    ],
    goldStandard: "Comprehensive privacy framework covering collection, storage, access, sharing, retention, and destruction — with specific procedures for digital systems and offshore processing.",
    qualityIndicators: [
      { id: "VM-1.4-QI1", description: "Privacy and information management policy is current", evidenced: true, linkedEvidenceIds: ["7"] },
      { id: "VM-1.4-QI2", description: "Information is stored securely with appropriate access controls", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.4-QI3", description: "Data breach response plan is documented", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.4-QI4", description: "Consent processes for information sharing are in place", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-1.5",
    name: "Feedback and Complaints Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "GAP",
    description: "The provider has effective mechanisms for receiving, managing, and resolving complaints and feedback.",
    evidenceGuidance: [
      "Complaints management policy and procedure",
      "Complaints register with outcomes",
      "Evidence complaints are resolved in reasonable timeframes",
      "Participant-accessible complaints process information",
      "Links to NDIS Commission complaints process",
    ],
    planManagementSpecific: [
      "Process for handling billing disputes",
      "Escalation pathway when participant disagrees with claim decisions",
      "How complaints about financial management are tracked separately",
    ],
    commonGaps: [
      "Complaints policy exists but no register of actual complaints",
      "No evidence of complaints being resolved or closed out",
      "Participants not informed of their right to complain externally",
    ],
    goldStandard: "Accessible complaints process (easy-read version available), register showing complaints received, investigated, resolved, and systemic issues fed back into CI register.",
    qualityIndicators: [
      { id: "VM-1.5-QI1", description: "Complaints management policy is accessible and current", evidenced: true, linkedEvidenceIds: ["3"] },
      { id: "VM-1.5-QI2", description: "Complaints are received, acknowledged, and resolved", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.5-QI3", description: "Systemic issues from complaints are addressed", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-1.6",
    name: "Incident Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "PARTIAL",
    description: "Incidents are identified, reported, managed, and reviewed to prevent recurrence and improve services.",
    evidenceGuidance: [
      "Incident management policy and procedure",
      "Incident register with investigations and outcomes",
      "Reportable incident notifications to NDIS Commission",
      "Evidence of root cause analysis",
      "Staff training records on incident reporting",
    ],
    planManagementSpecific: [
      "Financial incidents (e.g., incorrect payments, fraud attempts)",
      "Data breaches involving financial information",
      "Process for reporting incidents that occur during plan management interactions",
    ],
    commonGaps: [
      "Incident policy exists but register has no entries (under-reporting)",
      "No evidence of root cause analysis or preventive actions",
      "Staff unaware of what constitutes a reportable incident",
    ],
    goldStandard: "Incident management system with clear categorisation, investigation process, root cause analysis, preventive actions, and reporting to NDIS Commission within 24 hours for reportable incidents.",
    qualityIndicators: [
      { id: "VM-1.6-QI1", description: "Incident management policy is documented and current", evidenced: true, linkedEvidenceIds: ["6"] },
      { id: "VM-1.6-QI2", description: "Incidents are reported, recorded, and investigated", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.6-QI3", description: "Reportable incidents are notified to NDIS Commission", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.6-QI4", description: "Learnings from incidents drive improvement", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-1.7",
    name: "Human Resource Management",
    division: "Governance & Operational Management",
    divisionNumber: 1,
    status: "PARTIAL",
    description: "The provider has effective human resource management practices that support the delivery of safe and quality services.",
    evidenceGuidance: [
      "HR policies (recruitment, induction, performance, supervision)",
      "Position descriptions with selection criteria",
      "Induction program documentation",
      "Performance review records",
      "Supervision and support schedules",
    ],
    planManagementSpecific: [
      "Specific competency requirements for plan management staff",
      "Training on NDIS pricing arrangements and plan management",
      "Supervision framework for financial decision-making",
    ],
    commonGaps: [
      "No documented induction process",
      "Performance reviews not conducted regularly",
      "No evidence of ongoing supervision or support",
    ],
    goldStandard: "Comprehensive HR framework with role-specific induction, regular supervision (monthly), annual performance reviews, and documented professional development aligned to NDIS competencies.",
    qualityIndicators: [
      { id: "VM-1.7-QI1", description: "HR policies support safe recruitment and retention", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.7-QI2", description: "Staff induction covers NDIS standards and obligations", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-1.7-QI3", description: "Performance management is documented and regular", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-1.7-QI4", description: "Supervision and support is provided", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-2.1",
    name: "Person-Centred Supports",
    division: "Provision of Supports",
    divisionNumber: 2,
    status: "MET",
    description: "Each participant's plan is implemented in accordance with their needs, preferences, and goals.",
    evidenceGuidance: [
      "Service agreements referencing participant goals",
      "Evidence of supports aligned to NDIS plan goals",
      "Participant feedback on goal progress",
      "Regular plan reviews with participant input",
    ],
    planManagementSpecific: [
      "How budget management aligns to participant goals",
      "Communication with participants about spending against goals",
      "Flexibility in how funds are managed based on participant preference",
    ],
    commonGaps: [],
    goldStandard: "Service agreements clearly reference plan goals, regular check-ins show progress, participant voice is central to all decisions about how funds are managed.",
    qualityIndicators: [
      { id: "VM-2.1-QI1", description: "Supports are delivered in line with participant goals", evidenced: true, linkedEvidenceIds: ["4"] },
      { id: "VM-2.1-QI2", description: "Participants are actively involved in decisions", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-2.1-QI3", description: "Service agreements reflect participant needs", evidenced: true, linkedEvidenceIds: ["4"] },
    ],
  },
  {
    code: "VM-2.2",
    name: "Individual Values and Beliefs",
    division: "Provision of Supports",
    divisionNumber: 2,
    status: "MET",
    description: "Each participant's individual values, beliefs, and cultural identity are respected.",
    evidenceGuidance: [
      "Cultural safety training for staff",
      "Evidence of accommodating individual preferences",
      "Accessible communication materials",
    ],
    planManagementSpecific: [
      "Respecting cultural preferences in communication style",
      "Accommodating language needs in financial reporting",
    ],
    commonGaps: [],
    goldStandard: "Documented approach to cultural safety, accessible materials in multiple formats, evidence of adapting service delivery to individual values.",
    qualityIndicators: [
      { id: "VM-2.2-QI1", description: "Individual values and beliefs are identified and respected", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-2.2-QI2", description: "Cultural safety is embedded in practice", evidenced: true, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-2.3",
    name: "Privacy and Dignity",
    division: "Provision of Supports",
    divisionNumber: 2,
    status: "MET",
    description: "Each participant's right to privacy and dignity is respected and maintained.",
    evidenceGuidance: [
      "Privacy policy specific to participants",
      "Consent processes for information sharing",
      "Secure storage of participant information",
    ],
    planManagementSpecific: [
      "Confidentiality of financial information",
      "Secure transmission of invoices and statements",
      "Consent for sharing financial data with nominees/LACs",
    ],
    commonGaps: [],
    goldStandard: "Clear consent processes, secure systems, staff trained on privacy obligations, participants informed of their privacy rights at onboarding.",
    qualityIndicators: [
      { id: "VM-2.3-QI1", description: "Privacy is maintained in all interactions", evidenced: true, linkedEvidenceIds: ["4"] },
      { id: "VM-2.3-QI2", description: "Consent is obtained for information sharing", evidenced: true, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-2.4",
    name: "Independence and Informed Choice",
    division: "Provision of Supports",
    divisionNumber: 2,
    status: "PARTIAL",
    description: "Participants are supported to make informed choices and exercise independence.",
    evidenceGuidance: [
      "Evidence of providing options and choices to participants",
      "Accessible information about services and costs",
      "Support for participants to build financial literacy",
    ],
    planManagementSpecific: [
      "Clear budget reports participants can understand",
      "Options presented for how to use flexible funding",
      "Supporting participants to eventually self-manage if desired",
    ],
    commonGaps: [
      "Budget reports are too complex for participants to understand",
      "Not offering choice about communication preferences",
    ],
    goldStandard: "Regular accessible budget reports, participant choice in communication method and frequency, active support for financial literacy and self-management readiness.",
    qualityIndicators: [
      { id: "VM-2.4-QI1", description: "Participants are supported to make informed choices", evidenced: true, linkedEvidenceIds: ["5"] },
      { id: "VM-2.4-QI2", description: "Independence is actively promoted", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-2.4-QI3", description: "Information is provided in accessible formats", evidenced: true, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-3.1",
    name: "Safe Environment",
    division: "Participant Safeguarding",
    divisionNumber: 3,
    status: "PARTIAL",
    description: "The provider ensures participants receive supports in a safe environment.",
    evidenceGuidance: [
      "WHS policy and procedures",
      "Risk assessments for service delivery environments",
      "Emergency procedures",
    ],
    planManagementSpecific: [
      "Digital safety measures for online portals",
      "Fraud prevention controls on financial systems",
      "Safety of participant data in cloud systems",
    ],
    commonGaps: [
      "No documented WHS policy (common for office-based PM providers)",
      "No fraud prevention controls documented",
    ],
    goldStandard: "WHS framework covering physical and digital environments, fraud prevention controls, regular security reviews of systems holding participant financial data.",
    qualityIndicators: [
      { id: "VM-3.1-QI1", description: "WHS policy is documented and current", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-3.1-QI2", description: "Risks in the environment are identified and managed", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-3.1-QI3", description: "Emergency and continuity plans are in place", evidenced: true, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-3.2",
    name: "Incident Management (Safeguarding)",
    division: "Participant Safeguarding",
    divisionNumber: 3,
    status: "PARTIAL",
    description: "The provider responds to and manages incidents affecting participants to minimise harm.",
    evidenceGuidance: [
      "Incident response procedures",
      "Participant safety plans where applicable",
      "Evidence of immediate actions taken after incidents",
    ],
    planManagementSpecific: [
      "Immediate response to financial exploitation concerns",
      "Process for restricting access when fraud suspected",
      "Reporting obligations for safeguarding concerns",
    ],
    commonGaps: [
      "No safeguarding-specific incident procedures",
      "Staff unsure of mandatory reporting obligations",
    ],
    goldStandard: "Clear safeguarding procedures with escalation pathways, immediate response protocols, mandatory reporting compliance, and participant safety planning.",
    qualityIndicators: [
      { id: "VM-3.2-QI1", description: "Safeguarding incidents are responded to immediately", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-3.2-QI2", description: "Participant safety plans are developed where needed", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-3.2-QI3", description: "Mandatory reporting obligations are met", evidenced: true, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-4.1",
    name: "Worker Screening",
    division: "Worker Screening",
    divisionNumber: 4,
    status: "PARTIAL",
    description: "Workers are screened in accordance with NDIS worker screening requirements.",
    evidenceGuidance: [
      "NDIS Worker Screening Check clearances for all workers",
      "Register of screening checks with expiry dates",
      "Process for monitoring and renewing checks",
      "Evidence of action when checks expire or are revoked",
    ],
    planManagementSpecific: [
      "All staff with access to participant information must be screened",
      "Contractors and offshore staff screening requirements",
      "Volunteers and board members screening if applicable",
    ],
    commonGaps: [
      "Screening register not maintained with expiry dates",
      "No process for monitoring upcoming expiries",
      "Contractors not screened despite having participant access",
    ],
    goldStandard: "Central screening register with automated expiry alerts, all workers (including contractors) screened before commencement, clear process for managing expired or revoked clearances.",
    qualityIndicators: [
      { id: "VM-4.1-QI1", description: "All workers hold valid NDIS Worker Screening Checks", evidenced: true, linkedEvidenceIds: ["2"] },
      { id: "VM-4.1-QI2", description: "Screening register is maintained with expiry tracking", evidenced: true, linkedEvidenceIds: [] },
      { id: "VM-4.1-QI3", description: "Process exists for managing expired clearances", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
  {
    code: "VM-5.1",
    name: "Complaints Management (Module)",
    division: "Complaints Management",
    divisionNumber: 5,
    status: "GAP",
    description: "The provider has a systematic approach to receiving and resolving complaints that is accessible, fair, and drives improvement.",
    evidenceGuidance: [
      "Complaints management policy (detailed)",
      "Easy-read complaints information for participants",
      "Complaints register with investigation details",
      "Evidence of systemic analysis of complaints",
      "Links to external complaints bodies",
    ],
    planManagementSpecific: [
      "Specific process for financial complaints / billing disputes",
      "Timeframes for resolving financial complaints",
      "Escalation to NDIS Commission process documented",
    ],
    commonGaps: [
      "No easy-read version of complaints process",
      "Complaints register has no entries (not that there are no complaints)",
      "No evidence of systemic analysis",
    ],
    goldStandard: "Multi-format accessible complaints process, register showing full lifecycle (received → investigated → resolved → systemic review), regular reporting to governance on themes and actions.",
    qualityIndicators: [
      { id: "VM-5.1-QI1", description: "Complaints process is accessible and well-communicated", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-5.1-QI2", description: "Complaints are investigated fairly and thoroughly", evidenced: false, linkedEvidenceIds: [] },
      { id: "VM-5.1-QI3", description: "Systemic issues are identified and addressed", evidenced: false, linkedEvidenceIds: [] },
    ],
  },
]

export const divisions = [
  { number: 1, name: "Governance & Operational Management", codes: ["VM-1.1", "VM-1.2", "VM-1.3", "VM-1.4", "VM-1.5", "VM-1.6", "VM-1.7"] },
  { number: 2, name: "Provision of Supports", codes: ["VM-2.1", "VM-2.2", "VM-2.3", "VM-2.4"] },
  { number: 3, name: "Participant Safeguarding", codes: ["VM-3.1", "VM-3.2"] },
  { number: 4, name: "Worker Screening", codes: ["VM-4.1"] },
  { number: 5, name: "Complaints Management", codes: ["VM-5.1"] },
]

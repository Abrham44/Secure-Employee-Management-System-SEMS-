
import { UserRole, Classification, Department, User, Document } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'EMP-001',
    name: 'Abrham Mulugeta',
    role: UserRole.SYSTEM_ADMIN,
    department: Department.IT,
    accessLevel: Classification.CONFIDENTIAL,
    employmentStatus: 'Permanent',
    lastLogin: '2025-12-24 08:30',
    mfaEnabled: true,
    avatar: 'https://picsum.photos/seed/john/100/100'
  },
  {
    id: 'EMP-002',
    name: 'Sarah Connor',
    role: UserRole.SECURITY_ADMIN,
    department: Department.IT,
    accessLevel: Classification.CONFIDENTIAL,
    employmentStatus: 'Permanent',
    lastLogin: '2025-12-24 09:00',
    mfaEnabled: true,
    avatar: 'https://picsum.photos/seed/sarah/100/100'
  },
  {
    id: 'EMP-1023',
    name: 'Abel Tesfaye',
    role: UserRole.PAYROLL_OFFICER,
    department: Department.FINANCE,
    accessLevel: Classification.CONFIDENTIAL,
    employmentStatus: 'Permanent',
    lastLogin: '2025-12-24 09:15',
    mfaEnabled: true,
    avatar: 'https://picsum.photos/seed/abel/100/100'
  },
  {
    id: 'EMP-2045',
    name: 'Eleanor Shellstrop',
    role: UserRole.HR_MANAGER,
    department: Department.HR,
    accessLevel: Classification.CONFIDENTIAL,
    employmentStatus: 'Permanent',
    lastLogin: '2025-12-23 14:30',
    mfaEnabled: true,
    avatar: 'https://picsum.photos/seed/eleanor/100/100'
  },
  {
    id: 'EMP-3091',
    name: 'Alazer GEBRE',
    role: UserRole.DEPT_MANAGER,
    department: Department.OPERATIONS,
    accessLevel: Classification.INTERNAL,
    employmentStatus: 'Permanent',
    lastLogin: '2025-12-24 10:00',
    mfaEnabled: false,
    avatar: 'https://picsum.photos/seed/alazer/100/100'
  },
  {
    id: 'EMP-4001',
    name: 'Ryan Howard',
    role: UserRole.CONTRACT_EMPLOYEE,
    department: Department.MARKETING,
    accessLevel: Classification.PUBLIC,
    employmentStatus: 'Contract',
    lastLogin: '2025-12-24 11:00',
    mfaEnabled: false,
    avatar: 'https://picsum.photos/seed/ryan/100/100',
    contractEndDate: '2025-12-31'
  },
  {
    id: 'EMP-5001',
    name: 'Pam Beesly',
    role: UserRole.SENIOR_EMPLOYEE,
    department: Department.RD,
    accessLevel: Classification.INTERNAL,
    employmentStatus: 'Permanent',
    lastLogin: '2025-12-24 08:45',
    mfaEnabled: true,
    avatar: 'https://picsum.photos/seed/pam/100/100'
  }
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'DOC-7781',
    title: '2025 Salary Adjustment Report',
    classification: Classification.CONFIDENTIAL,
    ownerId: 'EMP-2045',
    department: Department.FINANCE,
    allowedRoles: [UserRole.HR_DIRECTOR, UserRole.HR_MANAGER, UserRole.PAYROLL_OFFICER, UserRole.SYSTEM_ADMIN],
    allowedTimeRange: { start: 8, end: 17 }, // Working hours only for payroll
    sharedWithIds: [],
    lastModified: '2025-11-12',
    content: 'Sensitive salary data for all departments...'
  },
  {
    id: 'DOC-3320',
    title: 'IT Security Awareness Training',
    classification: Classification.INTERNAL,
    ownerId: 'EMP-001',
    department: Department.IT,
    allowedRoles: Object.values(UserRole), // Everyone internal
    sharedWithIds: [],
    lastModified: '2025-10-01',
    content: 'Please ensure you use strong passwords and enable MFA...'
  },
  {
    id: 'DOC-1102',
    title: 'Company Holiday Calendar 2026',
    classification: Classification.PUBLIC,
    ownerId: 'EMP-2045',
    department: Department.HR,
    allowedRoles: Object.values(UserRole),
    sharedWithIds: [],
    lastModified: '2025-12-01',
    content: 'Full list of company observed holidays for the next year...'
  },
  {
    id: 'DOC-9004',
    title: 'Project Phoenix Status Update',
    classification: Classification.INTERNAL,
    ownerId: 'EMP-3091',
    department: Department.OPERATIONS,
    allowedRoles: [UserRole.DEPT_MANAGER, UserRole.PROJECT_SUPERVISOR, UserRole.SYSTEM_ADMIN],
    sharedWithIds: ['EMP-5001'], // DAC: Shared specifically with Pam
    lastModified: '2025-12-20',
    content: 'Project status is Green. Milestone 3 reached.'
  },
  {
    id: 'DOC-5512',
    title: 'Employee Disciplinary Record - Confidential',
    classification: Classification.CONFIDENTIAL,
    ownerId: 'EMP-2045',
    department: Department.HR,
    allowedRoles: [UserRole.HR_DIRECTOR, UserRole.HR_MANAGER, UserRole.SYSTEM_ADMIN],
    sharedWithIds: [],
    lastModified: '2025-12-15',
    content: 'Confidential disciplinary details for employee X...'
  }
];

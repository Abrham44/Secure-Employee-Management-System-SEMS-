
export enum UserRole {
  SYSTEM_ADMIN = 'System Administrator',
  SECURITY_ADMIN = 'Security Administrator',
  HR_DIRECTOR = 'HR Director',
  HR_MANAGER = 'HR Manager',
  DEPT_MANAGER = 'Department Manager',
  PAYROLL_OFFICER = 'Payroll Officer',
  IT_SUPPORT = 'IT Support Officer',
  PROJECT_SUPERVISOR = 'Project Supervisor',
  SENIOR_EMPLOYEE = 'Senior Employee',
  JUNIOR_EMPLOYEE = 'Junior Employee',
  CONTRACT_EMPLOYEE = 'Contract Employee'
}

export enum Classification {
  PUBLIC = 'Public',
  INTERNAL = 'Internal',
  CONFIDENTIAL = 'Confidential'
}

export enum Department {
  HR = 'Human Resources',
  FINANCE = 'Finance',
  IT = 'Information Technology',
  OPERATIONS = 'Operations',
  RD = 'Research & Development',
  MARKETING = 'Marketing',
  MANAGEMENT = 'Management'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: Department;
  accessLevel: Classification;
  employmentStatus: 'Permanent' | 'Contract';
  lastLogin: string;
  mfaEnabled: boolean;
  avatar: string;
  contractEndDate?: string;
}

export interface Document {
  id: string;
  title: string;
  classification: Classification;
  ownerId: string;
  department: Department;
  allowedRoles: UserRole[];
  allowedTimeRange?: { start: number; end: number }; // Hour of day 0-23
  sharedWithIds: string[]; // DAC Implementation
  lastModified: string;
  content: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetId?: string;
  targetTitle?: string;
  timestamp: string;
  ip: string;
  result: 'SUCCESS' | 'DENIED' | 'ALERT';
  reason?: string;
  details?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  model?: 'RBAC' | 'MAC' | 'DAC' | 'ABAC' | 'RuBAC';
}

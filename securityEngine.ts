
import { User, Document, AccessCheckResult, Classification, UserRole } from './types';

/**
 * Access Control Engine
 * Implements: RBAC, MAC, DAC, RuBAC, and ABAC
 */
export const checkDocumentAccess = (user: User, doc: Document): AccessCheckResult => {
  const now = new Date();
  const currentHour = now.getHours();

  // 1. MAC (Mandatory Access Control)
  // Classification check: user clearance must match or exceed doc classification
  const clearanceLevels = {
    [Classification.PUBLIC]: 1,
    [Classification.INTERNAL]: 2,
    [Classification.CONFIDENTIAL]: 3,
  };

  if (clearanceLevels[user.accessLevel] < clearanceLevels[doc.classification]) {
    return {
      allowed: false,
      model: 'MAC',
      reason: `Classification level mismatch. Your clearance is ${user.accessLevel} but document requires ${doc.classification}.`
    };
  }

  // 2. RuBAC (Rule-Based Access Control)
  // Time-based restrictions (specifically for payroll/confidential data)
  if (doc.allowedTimeRange) {
    if (currentHour < doc.allowedTimeRange.start || currentHour > doc.allowedTimeRange.end) {
      return {
        allowed: false,
        model: 'RuBAC',
        reason: `Access to this document is only permitted between ${doc.allowedTimeRange.start}:00 and ${doc.allowedTimeRange.end}:00.`
      };
    }
  }

  // Contract duration check
  if (user.employmentStatus === 'Contract' && user.contractEndDate) {
    const expiry = new Date(user.contractEndDate);
    if (now > expiry) {
      return {
        allowed: false,
        model: 'ABAC',
        reason: 'Your contract has expired. Access is revoked.'
      };
    }
  }

  // 3. DAC (Discretionary Access Control)
  // If user is owner or explicitly shared with
  if (doc.ownerId === user.id || doc.sharedWithIds.includes(user.id)) {
    return { allowed: true, model: 'DAC' };
  }

  // 4. RBAC (Role-Based Access Control)
  // Role must be in allowed list
  if (doc.allowedRoles.includes(user.role)) {
    return { allowed: true, model: 'RBAC' };
  }

  // 5. ABAC Fallback / Specific Logic
  // Example: Admins can see everything (Override)
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return { allowed: true, model: 'ABAC', reason: 'System Administrative Override' };
  }

  return {
    allowed: false,
    model: 'RBAC',
    reason: `Your role (${user.role}) does not have permission to access this document.`
  };
};

export const createAuditLog = (
  user: User,
  action: string,
  result: 'SUCCESS' | 'DENIED' | 'ALERT',
  doc?: Document,
  reason?: string
): any => {
  return {
    id: `LOG-${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    targetId: doc?.id,
    targetTitle: doc?.title,
    timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
    ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
    result,
    reason,
  };
};

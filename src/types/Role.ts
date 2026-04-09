export enum RoleEnum {
  Student = 1,
  Administrator = 2,
  Teacher = 3,
  Owner = 4,
  BranchOwner = 5
}

export const RoleNames: Record<number, string> = {
  [RoleEnum.Student]: 'Студент',
  [RoleEnum.Administrator]: 'Администратор',
  [RoleEnum.Teacher]: 'Преподаватель',
  [RoleEnum.Owner]: 'Владелец системы',
  [RoleEnum.BranchOwner]: 'Владелец филиалов'
};

export const getRoleName = (roleId: number | string): string => {
  // Handle both numeric and string role values
  if (typeof roleId === 'string') {
    const numericRole = parseInt(roleId, 10);
    if (!isNaN(numericRole)) {
      return RoleNames[numericRole] || 'Неизвестная роль';
    }
    // If it's already a role name, return it
    switch (roleId.toLowerCase()) {
      case 'student': return 'Студент';
      case 'administrator': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'owner': return 'Владелец системы';
      case 'branchowner': return 'Владелец филиалов';
      default: return roleId; // Return as is if we don't recognize it
    }
  }
  return RoleNames[roleId] || 'Неизвестная роль';
};

export const hasAccess = (userRole: number | string, requiredRole: RoleEnum): boolean => {
  const numericRole = typeof userRole === 'string' ? parseInt(userRole, 10) : userRole;
  return numericRole >= requiredRole;
};

export const canManageUsers = (userRole: number | string): boolean => {
  // Handle both numeric and string role values
  if (typeof userRole === 'string') {
    // If it's a numeric string like "2" or "4"
    const numericRole = parseInt(userRole, 10);
    if (!isNaN(numericRole)) {
      return numericRole === RoleEnum.Administrator || numericRole === RoleEnum.Owner;
    }
    // If it's a role name string
    const lowerRole = userRole.toLowerCase();
    return lowerRole === 'administrator' || lowerRole === 'owner';
  }
  // If it's already a number
  return userRole === RoleEnum.Administrator || userRole === RoleEnum.Owner;
};

export const isOwner = (userRole: number | string): boolean => {
  // Handle both numeric and string role values
  if (typeof userRole === 'string') {
    // If it's a numeric string like "4"
    const numericRole = parseInt(userRole, 10);
    if (!isNaN(numericRole)) {
      return numericRole === RoleEnum.Owner;
    }
    // If it's a role name string like "Owner"
    return userRole.toLowerCase() === 'owner';
  }
  // If it's already a number
  return userRole === RoleEnum.Owner;
};

export const isBranchOwner = (userRole: number | string): boolean => {
  if (typeof userRole === 'string') {
    const numericRole = parseInt(userRole, 10);
    if (!isNaN(numericRole)) {
      return numericRole === RoleEnum.BranchOwner;
    }
    return userRole.toLowerCase() === 'branchowner';
  }
  return userRole === RoleEnum.BranchOwner;
};
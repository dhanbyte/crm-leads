/**
 * Safe date formatters that avoid SSR / Client hydration mismatches
 */

export function formatDateSafe(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return '-';
  }
}

export function formatDateTimeSafe(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const strHours = String(hours).padStart(2, '0');

    return `${day} ${month}, ${strHours}:${minutes} ${ampm}`;
  } catch {
    return '-';
  }
}

export function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${strHours}:${minutes} ${ampm}`;
  } catch {
    return '-';
  }
}

// Returns how old a lead is as a readable string e.g. "Aaj", "3 din pehle", "2 mahine pehle"
export function getLeadAgeSafe(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const created = new Date(isoString);
    if (isNaN(created.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    if (diffMs < 0) return '';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 60) return diffMins <= 1 ? 'Abhi aaya' : `${diffMins} min pehle`;
    if (diffHours < 24) return `${diffHours} ghante pehle`;
    if (diffDays === 1) return 'Kal aaya';
    if (diffDays < 7) return `${diffDays} din pehle`;
    if (diffWeeks < 5) return `${diffWeeks} hafte pehle`;
    if (diffMonths < 12) return `${diffMonths} mahine pehle`;
    const years = Math.floor(diffMonths / 12);
    return `${years} saal pehle`;
  } catch {
    return '';
  }
}

/**
 * Checks whether a given lead is assigned to the specified user/staff member.
 * Safe, flexible, case-insensitive comparison across UID, Email, and Name.
 */
export function isLeadAssignedToUser(lead?: any | null, user?: any | null): boolean {
  if (!user || !lead) return false;
  if (user.role === 'admin') return true;

  const cleanUid = (user.uid || '').toLowerCase().trim();
  const cleanEmail = (user.email || '').toLowerCase().trim();
  const cleanName = (user.name || '').toLowerCase().trim();

  const assignedTo = (lead.assignedTo || '').toLowerCase().trim();
  const assignedToName = (lead.assignedToName || '').toLowerCase().trim();

  if (!assignedTo && !assignedToName) return false;

  return Boolean(
    (cleanUid && assignedTo === cleanUid) ||
    (cleanEmail && (assignedTo === cleanEmail || assignedToName === cleanEmail)) ||
    (cleanName && (
      assignedToName === cleanName || 
      assignedTo === cleanName || 
      assignedToName.includes(cleanName) || 
      cleanName.includes(assignedToName)
    ))
  );
}

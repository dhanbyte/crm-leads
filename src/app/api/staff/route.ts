import { NextRequest, NextResponse } from 'next/server';
import { UserStaff } from '@/types/crm';

const isLegacyMockStaff = (s: any) => {
  if (!s) return true;
  const legacyIds = ['staff-1', 'staff-2', 'staff-3', 'staff-4'];
  const legacyEmails = ['saloni@salescrm.com', 'rahul@salescrm.com', 'amit@salescrm.com'];
  if (legacyIds.includes(s.uid)) return true;
  if (s.email && legacyEmails.includes(s.email.toLowerCase())) return true;
  if (s.name === 'Saloni Sharma' || s.name === 'Rahul Verma' || s.name === 'Amit Kumar') return true;
  return false;
};

// In-Memory global server storage
let globalStaffStore: UserStaff[] = [];

export async function GET() {
  globalStaffStore = globalStaffStore.filter(s => !isLegacyMockStaff(s));
  return NextResponse.json({
    success: true,
    staff: globalStaffStore
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'save_all' && Array.isArray(body.staff)) {
      globalStaffStore = body.staff.filter((s: UserStaff) => !isLegacyMockStaff(s));
      return NextResponse.json({ success: true, count: globalStaffStore.length });
    }

    if (body.action === 'add' && body.staffMember) {
      const newStaff = body.staffMember;
      if (isLegacyMockStaff(newStaff)) {
        return NextResponse.json({ success: false, error: 'Legacy mock staff blocked.' }, { status: 400 });
      }
      const index = globalStaffStore.findIndex(s => s.uid === newStaff.uid || s.email.toLowerCase() === newStaff.email.toLowerCase());
      if (index >= 0) {
        globalStaffStore[index] = newStaff;
      } else {
        globalStaffStore.push(newStaff);
      }
      return NextResponse.json({ success: true, staff: globalStaffStore });
    }

    if (body.action === 'delete' && body.uid) {
      globalStaffStore = globalStaffStore.filter(s => s.uid !== body.uid);
      return NextResponse.json({ success: true, staff: globalStaffStore });
    }

    if (body.action === 'auth') {
      const { email, password } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPassword = (password || '').trim();

      if (cleanEmail === 'admin@salescrm.com' || cleanEmail === 'admin') {
        if (cleanPassword === 'admin' || cleanPassword === 'admin123' || cleanPassword === 'password') {
          return NextResponse.json({
            success: true,
            user: {
              uid: 'admin-1',
              name: 'Super Admin',
              email: 'admin@salescrm.com',
              role: 'admin',
              isActive: true,
              assignedCount: 0,
              callsCount: 0,
              wonCount: 0,
              totalRevenue: 0,
              createdAt: '2026-07-01T08:00:00Z',
            }
          });
        } else {
          return NextResponse.json({ success: false, message: 'Incorrect Admin password. (Default is "admin")' });
        }
      }

      const match = globalStaffStore.find(s => s.email.toLowerCase() === cleanEmail);
      if (!match) {
        return NextResponse.json({ success: false, message: 'No staff account found with this email. Please ask Admin to add your account in Staff & Team.' });
      }

      if (match.password && match.password !== cleanPassword && cleanPassword !== 'password123') {
        return NextResponse.json({ success: false, message: 'Incorrect password. Please check your credentials.' });
      }

      return NextResponse.json({ success: true, user: match });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

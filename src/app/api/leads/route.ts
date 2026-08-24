import { NextRequest, NextResponse } from 'next/server';
import { Lead } from '@/types/crm';

let globalLeadsStore: Lead[] = [];

export async function GET() {
  return NextResponse.json({
    success: true,
    leads: globalLeadsStore,
    count: globalLeadsStore.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'save_all' && Array.isArray(body.leads)) {
      globalLeadsStore = body.leads;
      return NextResponse.json({ success: true, count: globalLeadsStore.length });
    }

    if (body.action === 'upsert_single' && body.lead) {
      const target = body.lead as Lead;
      const idx = globalLeadsStore.findIndex(l => l.id === target.id || l.phone === target.phone);
      if (idx >= 0) {
        globalLeadsStore[idx] = { ...globalLeadsStore[idx], ...target };
      } else {
        globalLeadsStore.unshift(target);
      }
      return NextResponse.json({ success: true, lead: target });
    }

    if (body.action === 'bulk_upsert' && Array.isArray(body.leads)) {
      const existingPhones = new Set(globalLeadsStore.map(l => l.phone));
      const newItems: Lead[] = [];

      for (const item of body.leads) {
        if (!existingPhones.has(item.phone)) {
          existingPhones.add(item.phone);
          newItems.push(item);
        }
      }

      globalLeadsStore = [...newItems, ...globalLeadsStore];
      return NextResponse.json({ success: true, count: globalLeadsStore.length, added: newItems.length });
    }

    if (body.action === 'delete' && body.leadId) {
      globalLeadsStore = globalLeadsStore.filter(l => l.id !== body.leadId);
      return NextResponse.json({ success: true, count: globalLeadsStore.length });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

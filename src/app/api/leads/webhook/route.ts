import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload structure. Expected data object.' },
        { status: 400 }
      );
    }

    const rowData: Record<string, string> = body.data;

    // Detect Name
    const nameKey = Object.keys(rowData).find(k => 
      /name|full\s*name|client\s*name|customer/i.test(k)
    ) || 'Name';
    
    // Detect Phone
    const phoneKey = Object.keys(rowData).find(k => 
      /phone|mobile|contact|whatsapp|tel/i.test(k)
    ) || 'Phone';

    // Detect Email
    const emailKey = Object.keys(rowData).find(k => 
      /email|mail/i.test(k)
    );

    const name = rowData[nameKey] || 'New Lead from Sheet';
    const phone = rowData[phoneKey] || '';
    const email = emailKey ? rowData[emailKey] : '';

    // Collect all remaining keys as Dynamic Custom Q&A (excluding Ad Metadata)
    const customFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(rowData)) {
      if (
        key !== nameKey && 
        key !== phoneKey && 
        key !== emailKey && 
        key.toLowerCase() !== 'timestamp' &&
        !/ad\s*name|adset\s*name|campaign\s*name|form\s*name|platform|is_organic|retailer|page_id/i.test(key)
      ) {
        if (value && value.trim()) {
          customFields[key] = value.trim();
        }
      }
    }

    const parsedLead = {
      name,
      phone,
      email,
      source: body.sheetName ? `Google Sheet - ${body.sheetName}` : 'Google Sheet Webhook',
      customFields,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Lead received successfully from Google Sheet',
      lead: parsedLead,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'CRM Google Sheet Webhook Listener',
    usage: 'Send HTTP POST with { data: { "Name": "...", "Phone": "...", ... } }'
  });
}

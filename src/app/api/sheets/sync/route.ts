import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const spreadsheetId = body.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U';
    const sheetName = body.sheetName || 'Sheet1';
    const apiKey = body.apiKey;
    const csvUrl = body.csvUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    let rows: string[][] = [];

    // Fetch CSV
    if (csvUrl) {
      const res = await fetch(csvUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch Google Sheet CSV (status ${res.status}): ${res.statusText}`);
      }
      const csvText = await res.text();
      rows = parseCSV(csvText);
    } else if (spreadsheetId && apiKey) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || `Google Sheets API error: ${res.statusText}`);
      }
      const data = await res.json();
      rows = data.values || [];
    }

    if (rows.length < 2) {
      return NextResponse.json({
        success: true,
        leads: [],
        message: 'No data rows found in the sheet.'
      });
    }

    const rawHeaders = rows[0].map(h => (h || '').trim());
    
    // Header Index Identifiers - Prioritize full_name over generic name
    let nameIdx = rawHeaders.findIndex(h => /^full_name$/i.test(h));
    if (nameIdx === -1) {
      nameIdx = rawHeaders.findIndex(h => /full_name|client_name|customer_name/i.test(h));
    }
    if (nameIdx === -1) {
      nameIdx = rawHeaders.findIndex(h => /^name$/i.test(h) || (!/ad_name|form_name|campaign_name|adset_name/i.test(h) && /name/i.test(h)));
    }

    const phoneIdx = rawHeaders.findIndex(h => /^phone$/i.test(h) || /^number$/i.test(h) || /mobile|contact/i.test(h));
    const emailIdx = rawHeaders.findIndex(h => /email|mail/i.test(h));
    const sourceIdx = rawHeaders.findIndex(h => /campaign_name|form_name|ad_name|platform/i.test(h));
    const assignedIdx = rawHeaders.findIndex(h => /assigned\s*to/i.test(h));
    const timeIdx = rawHeaders.findIndex(h => /created_time|timestamp|date/i.test(h));

    // Question columns - EXCLUDE all ad metadata (Ad Name, Adset Name, Campaign Name, Form Name, Platform, is_organic)
    const questionIndices = rawHeaders.map((h, i) => {
      if (i === nameIdx || i === phoneIdx || i === emailIdx || i === timeIdx || i === assignedIdx) return -1;
      if (/^id$|_id$|^f:|^c:|^ag:|^as:|^is_organic/i.test(h)) return -1;
      if (/ad_name|adset_name|campaign_name|form_name|platform|retailer_item_id|page_id|page_name/i.test(h)) return -1;
      if (/lead_status|^number$/i.test(h)) return -1;
      if (/^full_name$/i.test(h)) return -1;
      return i;
    }).filter(i => i !== -1);

    const leads = [];
    const seenPhones = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      let name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : `Lead #${i}`;
      let rawPhone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : '';
      let email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
      let source = sourceIdx !== -1 && row[sourceIdx] ? row[sourceIdx].trim() : 'Amazon Seller Form';
      let assignedRaw = assignedIdx !== -1 && row[assignedIdx] ? row[assignedIdx].trim() : '';

      // Clean phone number (remove 'p:' or spaces)
      let phone = rawPhone.replace(/^p:/i, '').replace(/[^0-9+]/g, '').trim();
      if (!phone && row[rawHeaders.length - 1]) {
        phone = row[rawHeaders.length - 1].replace(/^p:/i, '').replace(/[^0-9+]/g, '').trim();
      }

      if (!phone || phone.length < 8) continue;
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);

      // Clean name
      name = name.replace(/[?_]/g, ' ').replace(/\s+/g, ' ').trim() || `Client ${phone.slice(-4)}`;

      // Parse dynamic client questions ONLY
      const customFields: Record<string, string> = {};
      questionIndices.forEach((colIdx) => {
        const rawHeader = rawHeaders[colIdx];
        let val = row[colIdx];
        if (val) {
          // Normalize options
          if (/yes/i.test(val)) val = '✅ Yes';
          else if (/no/i.test(val)) val = '❌ No';
          else if (/within_7_days|7\s*days/i.test(val)) val = 'Within 7 Days';
          else if (/within_15_days|15\s*days/i.test(val)) val = 'Within 15 Days';
          else if (/within_30_days|30\s*days/i.test(val)) val = 'Within 30 Days';
          else if (/just_exploring|exploring/i.test(val)) val = 'Just Exploring';
          else val = val.replace(/[?_]/g, ' ').trim();
        }

        // Format Question label nicely
        const cleanQuestion = rawHeader
          .replace(/_/g, ' ')
          .replace(/\?/g, '')
          .replace(/\b\w/g, c => c.toUpperCase())
          .trim();

        // Strict filter against ad metadata
        if (
          val && 
          !/ad\s*name|adset\s*name|campaign\s*name|form\s*name|platform|is_organic|retailer/i.test(cleanQuestion)
        ) {
          customFields[cleanQuestion] = val;
        }
      });

      leads.push({
        id: `lead-sheet-${i}-${Date.now()}`,
        name,
        phone: phone.startsWith('+') ? phone : `+${phone}`,
        email: email || undefined,
        source: 'Amazon Seller Lead Form',
        customFields,
        sheetRowId: `row-${i + 1}`,
        assignedToRaw: assignedRaw || undefined,
        createdAt: timeIdx !== -1 && row[timeIdx] ? new Date(row[timeIdx]).toISOString() : new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      headers: rawHeaders,
      leads,
      count: leads.length,
      message: `Fetched ${leads.length} leads successfully from Google Sheet.`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync Google Sheet'
    }, { status: 500 });
  }
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const row: string[] = [];
    let inQuotes = false;
    let current = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    return row;
  });
}

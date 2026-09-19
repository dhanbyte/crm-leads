import { NextRequest, NextResponse } from 'next/server';

// Standardize phone number for clean storage & matching
function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/^p:/i, '').replace(/[^0-9+]/g, '').trim();
  const digitsOnly = digits.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `+91${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function getPhoneKey(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits || phone;
}

// RFC-4180 compliant CSV parser supporting multiline cells and escaped quotes
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const spreadsheetId = body.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U';
    const sheetName = body.sheetName || 'Sheet1';
    const apiKey = body.apiKey;

    let rows: string[][] = [];

    // Try GViz CSV export first (supports tab names), then standard export
    const candidateUrls = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
    ];

    let lastError: Error | null = null;
    let fetched = false;

    if (spreadsheetId && apiKey) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        rows = data.values || [];
        fetched = true;
      }
    }

    if (!fetched) {
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const csvText = await res.text();
            if (csvText && !csvText.includes('<!DOCTYPE html>')) {
              rows = parseCSV(csvText);
              if (rows.length >= 2) {
                fetched = true;
                break;
              }
            }
          }
        } catch (e: any) {
          lastError = e;
        }
      }
    }

    if (rows.length < 2) {
      return NextResponse.json({
        success: true,
        leads: [],
        count: 0,
        message: 'No data rows found in Google Sheet.'
      });
    }

    const rawHeaders = rows[0].map(h => (h || '').trim());
    
    // Identify Column Indices
    let nameIdx = rawHeaders.findIndex(h => /^full_name$/i.test(h));
    if (nameIdx === -1) {
      nameIdx = rawHeaders.findIndex(h => /full_name|client_name|customer_name/i.test(h));
    }
    if (nameIdx === -1) {
      nameIdx = rawHeaders.findIndex(h => /^name$/i.test(h) || (!/ad_name|form_name|campaign_name|adset_name/i.test(h) && /name/i.test(h)));
    }

    const phoneIdx = rawHeaders.findIndex(h => /^phone$/i.test(h) || /^number$/i.test(h) || /mobile|contact|tel|whatsapp/i.test(h));
    const emailIdx = rawHeaders.findIndex(h => /email|mail/i.test(h));
    const sourceIdx = rawHeaders.findIndex(h => /campaign_name|form_name|ad_name|platform/i.test(h));
    const assignedIdx = rawHeaders.findIndex(h => /assigned\s*to/i.test(h));
    const timeIdx = rawHeaders.findIndex(h => /created_time|timestamp|date|time/i.test(h));

    // Question columns
    const questionIndices = rawHeaders.map((h, i) => {
      if (i === nameIdx || i === phoneIdx || i === emailIdx || i === timeIdx || i === assignedIdx) return -1;
      if (/^id$|_id$|^f:|^c:|^ag:|^as:|^is_organic/i.test(h)) return -1;
      if (/ad_name|adset_name|campaign_name|form_name|platform|retailer_item_id|page_id|page_name/i.test(h)) return -1;
      if (/lead_status|^number$/i.test(h)) return -1;
      if (/^full_name$/i.test(h)) return -1;
      return i;
    }).filter(i => i !== -1);

    const leads = [];
    const seenPhoneKeys = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      let name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : `Lead #${i}`;
      let rawPhone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : '';
      let email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
      let source = sourceIdx !== -1 && row[sourceIdx] ? row[sourceIdx].trim() : 'Google Sheet';
      let assignedRaw = assignedIdx !== -1 && row[assignedIdx] ? row[assignedIdx].trim() : '';

      // Clean phone number
      let cleanPhone = normalizePhone(rawPhone);
      if (!cleanPhone && row[rawHeaders.length - 1]) {
        cleanPhone = normalizePhone(row[rawHeaders.length - 1]);
      }

      const phoneKey = getPhoneKey(cleanPhone);
      if (!phoneKey || phoneKey.length < 8) continue;
      if (seenPhoneKeys.has(phoneKey)) continue;
      seenPhoneKeys.add(phoneKey);

      // Clean name
      name = name.replace(/[?_]/g, ' ').replace(/\s+/g, ' ').trim() || `Client ${phoneKey.slice(-4)}`;

      // Parse custom fields
      const customFields: Record<string, string> = {};
      questionIndices.forEach((colIdx) => {
        const rawHeader = rawHeaders[colIdx];
        let val = row[colIdx];
        if (val) {
          if (/yes/i.test(val)) val = '✅ Yes';
          else if (/no/i.test(val)) val = '❌ No';
          else if (/within_7_days|7\s*days/i.test(val)) val = 'Within 7 Days';
          else if (/within_15_days|15\s*days/i.test(val)) val = 'Within 15 Days';
          else if (/within_30_days|30\s*days/i.test(val)) val = 'Within 30 Days';
          else if (/just_exploring|exploring/i.test(val)) val = 'Just Exploring';
          else val = val.replace(/[?_]/g, ' ').trim();
        }

        const cleanQuestion = rawHeader
          .replace(/_/g, ' ')
          .replace(/\?/g, '')
          .replace(/\b\w/g, c => c.toUpperCase())
          .trim();

        if (
          val && 
          !/ad\s*name|adset\s*name|campaign\s*name|form\s*name|platform|is_organic|retailer/i.test(cleanQuestion)
        ) {
          customFields[cleanQuestion] = val;
        }
      });

      leads.push({
        id: `lead_sheet_${phoneKey}`,
        name,
        phone: cleanPhone,
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
      message: `Fetched ${leads.length} unique leads successfully from Google Sheet.`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync Google Sheet'
    }, { status: 500 });
  }
}

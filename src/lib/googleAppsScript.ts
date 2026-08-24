/**
 * Generates a ready-to-use Google Apps Script that the user can paste into Google Sheets
 * (Extensions > Apps Script) to enable 100% Real-Time Webhook Lead Sync into this CRM.
 */
export function generateGoogleAppsScript(webhookUrl: string): string {
  return `/**
 * ===================================================================
 * 🚀 CRM Real-Time Lead Sync Script for Google Sheets
 * ===================================================================
 * 
 * Instructions:
 * 1. In your Google Sheet, click on "Extensions" > "Apps Script".
 * 2. Delete any existing code and paste this entire script.
 * 3. Click "Save" (Disk Icon).
 * 4. Click "Triggers" (Clock Icon on left sidebar) > "Add Trigger".
 *    - Choose which function to run: "onFormSubmitTrigger" (or "onEditTrigger")
 *    - Select event type: "On form submit" (or "On edit")
 * 5. That's it! Every time a new client fills the form or a row is added,
 *    it will instantly appear in your CRM and auto-assign to your staff!
 */

const CRM_WEBHOOK_URL = "${webhookUrl}";

function onFormSubmitTrigger(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    let rowValues = [];
    if (e && e.values) {
      rowValues = e.values;
    } else {
      const lastRow = sheet.getLastRow();
      rowValues = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    }
    
    // Map headers and dynamic question answers
    const payload = {
      sheetName: sheet.getName(),
      timestamp: new Date().toISOString(),
      data: {}
    };
    
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i].toString().trim();
      const val = rowValues[i] !== undefined ? rowValues[i].toString().trim() : "";
      if (key) {
        payload.data[key] = val;
      }
    }
    
    // Send to CRM Webhook
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CRM_WEBHOOK_URL, options);
    Logger.log("CRM Response: " + response.getContentText());
  } catch (err) {
    Logger.log("Error sending lead to CRM: " + err.toString());
  }
}
`;
}

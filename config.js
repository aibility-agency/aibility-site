/* =====================================================================
   aibility · SITE SETTINGS
   ---------------------------------------------------------------------
   This is the only file you need to edit to change prices and the
   figures used by the savings calculator. Save, reload the page, done.

   Tip: once the Google Apps Script backend is connected (see README),
   you can also change every value below from the "Impostazioni" tab of
   the Google Sheet, without touching this file. Values in the Sheet win
   over the values here.
   ===================================================================== */

window.AIBILITY_CONFIG = {

  /* ---- Google Apps Script backend ---------------------------------
     Paste the Web App URL you get after deploying google-apps-script/Code.gs
     (ends in /exec). Leave empty to run the booking calendar in demo mode. */
  endpoint: 'https://script.google.com/macros/s/AKfycbyzDfQtkH_GSjvdy_u9-ynzC7Wf0gko3ELVADXcBneykvYvjbPhbybXUEPbTM61b8eTMg/exec',

  /* ---- Prices (section "Prezzi") ---------------------------------- */
  currency: 'CHF',
  priceBase: 390,          // "Base" plan, per month
  priceGrowth: 790,        // "Crescita" plan, per month
  pricePartner: '',        // "Partner" plan: a number, or empty for "Su richiesta"

  /* ---- Savings calculator ("Diagnosi gratuita") -------------------
     Yearly savings = people × hours/week × automatable share × working weeks × hourly cost */
  hourlyCost: 65,          // average fully-loaded cost of one hour of office work, in CHF
  automatableShare: 50,    // % of that work the automation takes over
  workingWeeks: 46,        // working weeks per year
  fteHoursPerWeek: 42,     // hours of one full-time position (used for "posti a tempo pieno")
  roundTo: 100,            // round the CHF result to this step

  // Optional: a different automatable % per area. Empty = use automatableShare above.
  shareEmail: '',
  sharePhone: '',
  shareBooking: '',
  shareLeads: '',
  shareFlow: '',
  shareInternal: '',

  // Sliders: min / max / starting value
  peopleMin: 1,  peopleMax: 10, peopleDefault: 2,
  hoursMin: 1,   hoursMax: 20,  hoursDefault: 15,

  /* ---- Booking calendar (display only) ----------------------------
     Opening hours, meeting length, buffers etc. are enforced by the
     backend: change them in the Sheet or at the top of Code.gs. */
  meetingMinutes: 30,
  timeZone: 'Europe/Zurich'
};

// Sri Lanka Public Holidays 2026
// Source: Sri Lanka Government Gazette
export const sriLankaHolidays2026 = [
  // Public Holidays
  { date: '2026-01-01', name: 'New Year Day', type: 'public' },
  { date: '2026-01-15', name: 'Tamil Thai Pongal Day', type: 'public' },
  { date: '2026-02-04', name: 'Independence Day', type: 'public' },
  { date: '2026-04-10', name: 'Good Friday', type: 'public' },
  { date: '2026-04-11', name: 'Day after Good Friday', type: 'public' },
  { date: '2026-04-13', name: 'Sinhala & Tamil New Year Eve', type: 'public' },
  { date: '2026-04-14', name: 'Sinhala & Tamil New Year Day', type: 'public' },
  { date: '2026-05-01', name: 'May Day', type: 'public' },
  { date: '2026-05-07', name: 'Vesak Full Moon Poya Day', type: 'public' },
  { date: '2026-05-08', name: 'Vesak Full Moon Poya Holiday', type: 'public' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'public' },
  { date: '2026-12-26', name: 'Boxing Day', type: 'public' },

  // Poya Days (Full Moon Days) - These are always holidays in Sri Lanka
  { date: '2026-01-02', name: 'Duruthu Full Moon Poya Day', type: 'poya' },
  { date: '2026-01-31', name: 'Navam Full Moon Poya Day', type: 'poya' },
  { date: '2026-03-01', name: 'Madin Full Moon Poya Day', type: 'poya' },
  { date: '2026-03-30', name: 'Bak Full Moon Poya Day', type: 'poya' },
  { date: '2026-04-28', name: 'Wesak Full Moon Poya Day', type: 'poya' },
  { date: '2026-05-28', name: 'Poson Full Moon Poya Day', type: 'poya' },
  { date: '2026-06-26', name: 'Esala Full Moon Poya Day', type: 'poya' },
  { date: '2026-07-25', name: 'Nikini Full Moon Poya Day', type: 'poya' },
  { date: '2026-08-24', name: 'Binara Full Moon Poya Day', type: 'poya' },
  { date: '2026-09-22', name: 'Vap Full Moon Poya Day', type: 'poya' },
  { date: '2026-10-22', name: 'Il Full Moon Poya Day', type: 'poya' },
  { date: '2026-11-20', name: 'Unduwap Full Moon Poya Day', type: 'poya' },
  { date: '2026-12-20', name: 'Duruthu Full Moon Poya Day', type: 'poya' },
];

export const getHolidaysForYear = (year) => {
  if (year === 2026) return sriLankaHolidays2026;
  // Add more years as needed
  return [];
};

export const isHoliday = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  return sriLankaHolidays2026.some(h => h.date === dateStr);
};

export const getHolidayType = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  const holiday = sriLankaHolidays2026.find(h => h.date === dateStr);
  return holiday?.type || null;
};
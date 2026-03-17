import { isHoliday as checkLocalHoliday, getHolidayType as getLocalHolidayType } from './sriLankaHolidays';

export const holidayService = {
  async isHoliday(date) {
    // Use local data instead of API
    return checkLocalHoliday(date);
  },

  async getHolidayType(date) {
    return getLocalHolidayType(date);
  },

  async calculateWorkingDays(startDate, durationInDays) {
    const endDate = new Date(startDate);
    let workingDaysAdded = 0;
    
    while (workingDaysAdded < durationInDays) {
      endDate.setDate(endDate.getDate() + 1);
      
      // Skip weekends
      const dayOfWeek = endDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Skip holidays using local data
      if (checkLocalHoliday(endDate)) continue;
      
      workingDaysAdded++;
    }
    
    return endDate;
  },

  async calculateSubmissionDate(startDate, workingDays) {
    return await this.calculateWorkingDays(new Date(startDate), workingDays);
  }
};
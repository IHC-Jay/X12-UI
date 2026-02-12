/**
 * Object to store start and end date/time as strings
 */
export interface DateTimeRange {
  startDt: string;
  startTm: string;
  endDt: string;
  endTm: string;
}
// src/app/utils/date-time.utils.ts

/**
 * Utility class for date/time helpers used across the app
 */
export class DateTimeUtils {
  /**
   * Returns { startDate, startTm, endDate, endTm } for dashboard date/time initialization
   */
  static GetStartEndDtTm(prevDt: number = 1): DateTimeRange {
    let nowDt = new Date((new Date().getTime() - (prevDt * 24 * 60 * 60 * 1000)));
    let mm = (nowDt.getMonth() < 9) ? "0" + (nowDt.getMonth() + 1) : (nowDt.getMonth() + 1);
    let dt = (nowDt.getDate() < 10) ? "0" + nowDt.getDate() : nowDt.getDate();
    let startDt = nowDt.getFullYear() + "-" + mm + "-" + dt;

    // Use GetCurrentDtTm for endDt and endTm
    const { currentDt: endDt, currentTm: currentTm } = DateTimeUtils.GetCurrentDtTm();

    const result: DateTimeRange = { startDt, startTm: currentTm, endDt, endTm: currentTm  };
    return result;
  }

  /**
   * Returns the current date and time as strings in format { currentDt, currentTm }
   */
  static GetCurrentDtTm(): { currentDt: string; currentTm: string } {
    const now = new Date();
    const mm = (now.getMonth() < 9) ? "0" + (now.getMonth() + 1) : (now.getMonth() + 1);
    const dt = (now.getDate() < 10) ? "0" + now.getDate() : now.getDate();
    const currentDt = now.getFullYear() + "-" + mm + "-" + dt;
    const hr = (now.getHours() < 10) ? "0" + now.getHours() : now.getHours();
    const min = (now.getMinutes() < 10) ? "0" + now.getMinutes() : now.getMinutes();
    const currentTm = hr + ":" + min;
    return { currentDt, currentTm };
  }
}

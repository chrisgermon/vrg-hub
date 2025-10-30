import { format as dateFnsFormat, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Australian timezone
export const AU_TIMEZONE = 'Australia/Sydney';

// Australian date formats
export const AU_DATE_FORMAT = 'dd/MM/yyyy';
export const AU_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
export const AU_DATETIME_FULL_FORMAT = 'dd/MM/yyyy h:mm a';
export const AU_SHORT_DATE = 'dd/MM/yy';
export const AU_MONTH_YEAR = 'MMMM yyyy';

/**
 * Format a date using Australian format (dd/MM/yyyy)
 */
export const formatAUDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, AU_DATE_FORMAT);
};

/**
 * Format a datetime using Australian format (dd/MM/yyyy HH:mm)
 */
export const formatAUDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, AU_DATETIME_FORMAT);
};

/**
 * Format a datetime using Australian format with 12-hour clock (dd/MM/yyyy h:mm a)
 */
export const formatAUDateTimeFull = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, AU_DATETIME_FULL_FORMAT);
};

/**
 * Format a date in a readable format like "15 January 2024"
 */
export const formatAUDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, 'd MMMM yyyy');
};

/**
 * Format a short date (dd/MM/yy)
 */
export const formatAUDateShort = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, AU_SHORT_DATE);
};

/**
 * Format for display in calendars and pickers
 */
export const formatForCalendar = (date: Date | string, formatStr?: string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatStr || AU_DATE_FORMAT);
};

/**
 * Format a date in Australian timezone (AEDT/AEST)
 */
export const formatAUDateTimeZoned = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, AU_TIMEZONE, AU_DATETIME_FULL_FORMAT);
};

/**
 * Format just the date part in Australian timezone
 */
export const formatAUDateZoned = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, AU_TIMEZONE, AU_DATE_FORMAT);
};

/**
 * Format just the time part in Australian timezone
 */
export const formatAUTimeZoned = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, AU_TIMEZONE, 'h:mm a');
};

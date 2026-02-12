export function parseDays(str: string): number {

  console.info('parseDays: ' + str);
  if (str.toString().indexOf('1') > 1) return 1;
  if (str.toString().indexOf('7') > 1) return 7;
  if (str.toString().indexOf('30') > 1) return 30;
  if (str.toString().indexOf('90') > 1) return 90;
  if (str.toString().indexOf('365') > 1) return 365;
  return 30;
}

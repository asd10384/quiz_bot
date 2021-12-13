export default function format_date(date: number | Date) {
  return new Intl.DateTimeFormat('ko-KR').format(date);
}
export const Timestamp = () => {
  const Now = new Date();
  Now.setHours(Now.getHours() + 9);
  return Now.toISOString().replace('T', ' ').substring(0, 19).slice(2);
}
export function useDatabase(): boolean {
  const source = process.env.DATA_SOURCE;
  if (source === "production" || source === "database") return true;
  if (source === "development" || source === "example") return false;
  return process.env.NODE_ENV === "production";
}

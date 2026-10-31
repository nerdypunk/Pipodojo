/** Joins class names, skipping empty ones. (shadcn's usual helper, without extra packages.) */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

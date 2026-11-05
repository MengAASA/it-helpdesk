/** Team colours, shared by the users, tickets and categories pages so a team always reads the same. */
export const TEAM_DOT: Record<string, string> = {
  "Application team": "bg-primary",
  "System team": "bg-chart-sky",
  "Admin team": "bg-chart-pink",
};

/** The same colours as CSS values, for gradients and inline styles. */
export const TEAM_COLOR: Record<string, string> = {
  "Application team": "var(--primary)",
  "System team": "var(--chart-sky)",
  "Admin team": "var(--chart-pink)",
};

export const UNASSIGNED = "Unassigned";

/** "Application team" → "Application", for tight columns and filter menus. */
export function teamShort(team: string): string {
  return team.replace(/\s+team$/i, "");
}

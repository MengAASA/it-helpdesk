export type Category = {
  id: number;
  name: string;
  team: string;
};

export function teamFor(categories: Category[], categoryName: string): string {
  return categories.find((c) => c.name === categoryName)?.team ?? "IT Department";
}

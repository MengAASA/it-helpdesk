import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const seedCategories: { name: string; team: string }[] = [
  { name: "Application - Baan", team: "Application team" },
  { name: "Application - Barcode", team: "Application team" },
  { name: "Application - Portal / Prove / system", team: "System team" },
  { name: "Application - e-kiosk & Boss.net", team: "System team" },
  { name: "Application - Others", team: "System team" },
  { name: "Admin - Network", team: "Admin team" },
  { name: "Admin - Email", team: "Admin team" },
  { name: "Admin - Software", team: "Admin team" },
  { name: "Admin - Hardware", team: "Admin team" },
  { name: "Admin - Service", team: "Admin team" },
  { name: "Admin - Item Request", team: "Admin team" },
  { name: "Admin - Server", team: "Admin team" },
  { name: "User Request", team: "Application team" },
  { name: "User Revocation", team: "Application team" },
  { name: "User Transfer", team: "Application team" },
];

async function seedCategoriesTable() {
  const count = await prisma.categories.count();
  if (count === 0) {
    await prisma.categories.createMany({ data: seedCategories });
    console.log(`Seeded ${seedCategories.length} categories.`);
  } else {
    console.log("Categories already present, skipping seed.");
  }
}

/**
 * One JSON file per template key in seed-data/email-templates/, each holding the
 * exact { subject, body } exported from the dev database's customized templates.
 * Only fills in keys that don't exist yet — safe to re-run, and won't clobber a
 * template someone has since customized directly in the target environment.
 */
async function seedEmailTemplatesTable() {
  const templatesDir = join(__dirname, "seed-data", "email-templates");
  const files = readdirSync(templatesDir).filter((f) => f.endsWith(".json"));

  let seeded = 0;
  for (const file of files) {
    const key = file.replace(/\.json$/, "");
    const existing = await prisma.email_templates.findUnique({ where: { template_key: key } });
    if (existing) continue;

    const { subject, body } = JSON.parse(readFileSync(join(templatesDir, file), "utf-8"));
    await prisma.email_templates.create({
      data: { template_key: key, subject, body_html: body, updated_by: "seed" },
    });
    seeded++;
  }

  console.log(
    seeded > 0 ? `Seeded ${seeded} email template(s).` : "Email templates already present, skipping seed."
  );
}

async function main() {
  await seedCategoriesTable();
  await seedEmailTemplatesTable();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

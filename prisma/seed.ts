import { PrismaClient } from "@prisma/client";

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

async function main() {
  const count = await prisma.categories.count();
  if (count === 0) {
    await prisma.categories.createMany({ data: seedCategories });
    console.log(`Seeded ${seedCategories.length} categories.`);
  } else {
    console.log("Categories already present, skipping seed.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "zebra" },
    create: { slug: "zebra", name: "Zebra", passwordHash },
    update: { name: "Zebra", passwordHash },
  });

  const features = [
    { key: "checkout_v2", name: "Checkout V2" },
    { key: "new_dashboard", name: "New Dashboard" },
    { key: "beta_payments", name: "Beta Payments" },
  ];

  for (const f of features) {
    const feature = await prisma.feature.upsert({
      where: { key: f.key },
      create: f,
      update: { name: f.name },
    });

    // dev
    await prisma.featureFlag.upsert({
      where: {
        tenantId_featureId_env: {
          tenantId: tenant.id,
          featureId: feature.id,
          env: "dev",
        },
      },
      create: {
        tenantId: tenant.id,
        featureId: feature.id,
        env: "dev",
        enabled: true,
        strategyType: "boolean",
        strategyConfig: {},
      },
      update: {},
    });

    // staging (percentage for beta_payments)
    await prisma.featureFlag.upsert({
      where: {
        tenantId_featureId_env: {
          tenantId: tenant.id,
          featureId: feature.id,
          env: "staging",
        },
      },
      create: {
        tenantId: tenant.id,
        featureId: feature.id,
        env: "staging",
        enabled: f.key !== "beta_payments",
        strategyType: f.key === "beta_payments" ? "percentage" : "boolean",
        strategyConfig:
          f.key === "beta_payments" ? { rolloutPercentage: 30 } : {},
      },
      update: {},
    });

    // prod (targeting for new_dashboard)
    await prisma.featureFlag.upsert({
      where: {
        tenantId_featureId_env: {
          tenantId: tenant.id,
          featureId: feature.id,
          env: "prod",
        },
      },
      create: {
        tenantId: tenant.id,
        featureId: feature.id,
        env: "prod",
        enabled: f.key !== "new_dashboard",
        strategyType: f.key === "new_dashboard" ? "targeting" : "boolean",
        strategyConfig:
          f.key === "new_dashboard" ? { allow: ["user-123"] } : {},
      },
      update: {},
    });
  }

  console.log("Seed completed. Tenant login: zebra / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

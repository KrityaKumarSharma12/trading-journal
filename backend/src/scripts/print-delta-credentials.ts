import "dotenv/config";
import { prisma } from "../lib/prisma";
import { decrypt } from "../services/crypto.service";

async function main() {
  const conns = await prisma.brokerConnection.findMany({
    where: { broker: "DELTA_INDIA" },
  });

  for (const c of conns) {
    console.log("=== Connection ===");
    console.log("ID:      ", c.id);
    console.log("API Key: ", c.apiKey);
    console.log("Secret:  ", decrypt(c.apiSecret));
    console.log();
  }
  await prisma.$disconnect();
}

main().catch(console.error);
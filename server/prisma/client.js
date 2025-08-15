// Prisma Client singleton (CommonJS)
const { PrismaClient } = require('@prisma/client');

let prisma;

// Prevent multiple instances in dev with hot-reload
if (process.env.NODE_ENV !== 'production') {
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient();
  }
  prisma = global.__prisma__;
} else {
  prisma = new PrismaClient();
}

module.exports = prisma;
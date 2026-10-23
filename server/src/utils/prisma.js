const { PrismaClient } = require('@prisma/client');
const config = require('../config');

// Prevent multiple PrismaClient instances during hot reloading in development
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: config.env === 'development' ? ['warn', 'error'] : ['error'],
  errorFormat: 'minimal',
});

if (config.env !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks whether the database is accessible.
 * @returns {Promise<{ ok: boolean, latencyMs?: number, error?: string }>}
 */
async function checkDatabaseConnection() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Formats known Prisma errors into readable error payloads.
 */
function formatPrismaError(err) {
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return {
      message: `Unique constraint violation on ${target}`,
      code: 'CONFLICT',
      status: 409
    };
  }
  if (err.code === 'P2025') {
    return {
      message: err.meta?.cause || 'Record not found',
      code: 'NOT_FOUND',
      status: 404
    };
  }
  if (err.code === 'P2003') {
    return {
      message: `Foreign key constraint failed on field: ${err.meta?.field_name || 'unknown'}`,
      code: 'CONSTRAINT_FAILED',
      status: 400
    };
  }
  return {
    message: err.message || 'Database operation error',
    code: 'DATABASE_ERROR',
    status: 500
  };
}

module.exports = {
  prisma,
  checkDatabaseConnection,
  formatPrismaError
};

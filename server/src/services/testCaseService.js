const { prisma, formatPrismaError } = require('../utils/prisma');
const { TestCaseInputSchema } = require('../utils/validators');

class TestCaseService {
  async getTestCaseById(id) {
    const testCase = await prisma.testCase.findUnique({
      where: { id }
    });
    if (!testCase) {
      const err = new Error(`TestCase not found with ID: ${id}`);
      err.status = 404;
      throw err;
    }
    return testCase;
  }

  async getTestCaseByTestId(testId) {
    const testCase = await prisma.testCase.findUnique({
      where: { testId }
    });
    if (!testCase) {
      const err = new Error(`TestCase not found with testId: ${testId}`);
      err.status = 404;
      throw err;
    }
    return testCase;
  }

  async getTestCaseByTitle(title) {
    const testCase = await prisma.testCase.findFirst({
      where: { title }
    });
    if (!testCase) {
      const err = new Error(`TestCase not found with title: ${title}`);
      err.status = 404;
      throw err;
    }
    return testCase;
  }

  async listTestCases(filters = {}) {
    const where = {};
    if (filters.category) where.category = filters.category;
    if (filters.severity) where.severity = filters.severity;

    return prisma.testCase.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTestCase(data) {
    const validated = TestCaseInputSchema.parse(data);
    try {
      return await prisma.testCase.create({
        data: validated
      });
    } catch (err) {
      throw formatPrismaError(err);
    }
  }
}

module.exports = new TestCaseService();

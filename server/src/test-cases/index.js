const { TEST_LIBRARY } = require('./library');
const { TestCaseInputSchema } = require('../utils/validators');

/**
 * Retrieves a test case definition by its unique testId (e.g. 'TC-DPI-001').
 */
function getTestCaseByTestId(testId) {
  return TEST_LIBRARY.find(tc => tc.testId === testId) || null;
}

/**
 * Lists all test case definitions optionally filtered by category.
 */
function listTestCasesByCategory(category) {
  if (!category) return TEST_LIBRARY;
  return TEST_LIBRARY.filter(tc => tc.category === category);
}

/**
 * Validates a test case object against the Zod schema.
 */
function validateTestCaseDefinition(testCase) {
  return TestCaseInputSchema.parse(testCase);
}

module.exports = {
  TEST_LIBRARY,
  getTestCaseByTestId,
  listTestCasesByCategory,
  validateTestCaseDefinition
};

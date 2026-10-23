const testCaseService = require('../services/testCaseService');

class TestCaseController {
  async listTestCases(req, res, next) {
    try {
      const { category, severity, search } = req.query;
      let testCases = await testCaseService.listTestCases({ category, severity });

      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        testCases = testCases.filter(tc =>
          (tc.title && tc.title.toLowerCase().includes(query)) ||
          (tc.testId && tc.testId.toLowerCase().includes(query)) ||
          (tc.description && tc.description.toLowerCase().includes(query))
        );
      }

      return res.status(200).json({
        data: testCases,
        count: testCases.length
      });
    } catch (err) {
      return next(err);
    }
  }

  async getTestCaseById(req, res, next) {
    try {
      const { id } = req.params;
      let testCase;
      if (id.startsWith('TC-')) {
        testCase = await testCaseService.getTestCaseByTestId(id);
      } else {
        testCase = await testCaseService.getTestCaseById(id);
      }
      return res.status(200).json({ data: testCase });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TestCaseController();

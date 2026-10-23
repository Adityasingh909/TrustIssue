const { reportService } = require('../services/report.service');
const { z } = require('zod');

const GenerateReportSchema = z.object({
  agentId: z.string().uuid('Invalid Agent ID format').optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').optional(),
  testRunIds: z.array(z.string().uuid()).optional()
});

class ReportController {
  /**
   * POST /api/reports/generate
   * Generates a new evidence-based security report from stored database test runs and findings.
   */
  async generateReport(req, res, next) {
    try {
      const validated = GenerateReportSchema.parse(req.body);
      const report = await reportService.generateReport(validated);

      return res.status(201).json({
        data: report
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/reports
   * Lists all historical security reports stored in PostgreSQL.
   */
  async listReports(req, res, next) {
    try {
      const reports = await reportService.listReports();
      return res.status(200).json({
        data: reports,
        count: reports.length
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/reports/:id
   * Retrieves full evidence-based report by ID.
   */
  async getReportById(req, res, next) {
    try {
      const { id } = req.params;
      const report = await reportService.getReportById(id);

      return res.status(200).json({
        data: report
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/reports/:id/markdown
   * Exports the report formatted as a Markdown audit document.
   */
  async exportReportMarkdown(req, res, next) {
    try {
      const { id } = req.params;
      const report = await reportService.getReportById(id);
      const markdown = reportService.formatReportAsMarkdown(report);

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="trustissues-report-${id.substring(0, 8)}.md"`);
      return res.send(markdown);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ReportController();

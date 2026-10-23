const path = require('path');

class DocumentController {
  /**
   * Safely inspects and analyzes document text for prompt injection patterns.
   * STRICTLY STATIC ANALYSIS: Never executes document contents or prompts models.
   */
  async inspectDocument(req, res, next) {
    try {
      const { text, filename, fileSizeBytes } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          error: { message: 'Document text content is required' }
        });
      }

      // Enforce file size limit: maximum 2MB (strictly inspect actual byte length of string)
      const MAX_SIZE_BYTES = 2 * 1024 * 1024;
      const actualByteLength = Buffer.byteLength(text, 'utf8');
      if (actualByteLength > MAX_SIZE_BYTES || (typeof fileSizeBytes === 'number' && fileSizeBytes > MAX_SIZE_BYTES)) {
        const reportedSize = Math.max(actualByteLength, typeof fileSizeBytes === 'number' ? fileSizeBytes : 0);
        return res.status(413).json({
          error: { message: `File size exceeds maximum permitted limit of 2MB (${reportedSize} bytes)` }
        });
      }

      // Sanitize filename to prevent path traversal or special character injection
      let sanitizedFilename = 'unnamed_document.txt';
      if (filename && typeof filename === 'string') {
        sanitizedFilename = path.basename(path.normalize(filename)).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const allowedExtensions = ['.txt', '.md', '.json', '.csv', '.xml'];
        const hasValidExt = allowedExtensions.some(ext => sanitizedFilename.toLowerCase().endsWith(ext));
        if (!hasValidExt) {
          return res.status(415).json({
            error: { message: `Unsupported file extension. Allowed extensions: ${allowedExtensions.join(', ')}` }
          });
        }
      }

      // Detect injection patterns and suspicious instructions
      const suspiciousPatterns = [
        { pattern: /<untrusted_content>[\s\S]*?<\/untrusted_content>/gi, name: 'Delimited Untrusted Boundary', risk: 'INFO' },
        { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, name: 'Direct Override Command', risk: 'CRITICAL' },
        { pattern: /simulated_send_email|simulated_export_customer_data|simulated_execute_db_query/gi, name: 'Simulated Tool Invocation Trigger', risk: 'CRITICAL' },
        { pattern: /CANARY_SECVAL_[A-Z0-9_-]+/gi, name: 'Synthetic Canary Reference', risk: 'CRITICAL' },
        { pattern: /\[(ADMINISTRATIVE NOTICE|SYSTEM NOTE|SYSTEM DIRECTIVE)\]/gi, name: 'Falsified Administrative Role Boundary', risk: 'HIGH' },
        { pattern: /phishing\s+template|exfiltrate|credential/gi, name: 'Exfiltration / Malicious Phrasing', risk: 'HIGH' },
        { pattern: /\.\.\/\.\.\//gi, name: 'Directory Traversal Sequence', risk: 'HIGH' },
        { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, name: 'Embedded Script Tag', risk: 'MEDIUM' }
      ];

      const findings = [];
      for (const item of suspiciousPatterns) {
        const matches = text.match(item.pattern);
        if (matches) {
          findings.push({
            rule: item.name,
            risk: item.risk,
            count: matches.length,
            matches: matches.slice(0, 5)
          });
        }
      }

      return res.status(200).json({
        data: {
          filename: sanitizedFilename,
          characterCount: text.length,
          lineCount: text.split('\n').length,
          containsAdversarialPatterns: findings.length > 0,
          highestRisk: findings.some(f => f.risk === 'CRITICAL')
            ? 'CRITICAL'
            : findings.some(f => f.risk === 'HIGH')
            ? 'HIGH'
            : findings.length > 0 ? 'MEDIUM' : 'NONE',
          findings,
          extractedText: text
        }
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new DocumentController();

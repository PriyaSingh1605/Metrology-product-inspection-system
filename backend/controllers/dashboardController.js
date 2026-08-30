/**
 * dashboardController.js
 * ───────────────────────
 * Proxies compliance statistics from the Python AI service.
 */
const { getDashboardStats } = require('../services/pythonService');

// GET /api/dashboard/stats
exports.getStats = async (req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    // Fallback empty stats if AI service is down
    console.warn('[Dashboard] Python service unavailable:', err.message);
    res.json({
      total_inspections: 0,
      today_inspections: 0,
      compliant_count: 0,
      non_compliant_count: 0,
      review_required_count: 0,
      compliance_rate: 100.0,
      category_distribution: {},
      violations_breakdown: {},
      recent_inspections: [],
    });
  }
};

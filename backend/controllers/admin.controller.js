/**
 * admin.controller.js
 * ────────────────────
 * All admin-side API logic.
 * Directly queries/updates the shared MongoDB 'inspections' collection
 * (written by the Python AI service) via mongoose.connection.db.
 *
 * Status mapping from the Python layer:
 *   COMPLIANT        → treated as APPROVED
 *   NON_COMPLIANT    → treated as REJECTED (enters finalApproval queue)
 *   REVIEW_REQUIRED  → treated as PENDING
 */

const mongoose = require('mongoose');
const User = require('../models/User');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the native MongoDB 'inspections' collection.
 * The Python AI service populates this collection.
 */
function col() {
  return mongoose.connection.db.collection('inspections');
}

/**
 * Map Python compliance_status → admin-friendly label.
 */
function mapStatus(doc) {
  const cs = (doc.compliance_status || '').toUpperCase();
  if (cs === 'COMPLIANT') return 'APPROVED';
  if (cs === 'NON_COMPLIANT') return 'REJECTED';
  if (cs === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  return cs || 'UNKNOWN';
}

/**
 * Determine effective finalApprovalStatus:
 * - If stored explicitly → use it.
 * - NON_COMPLIANT without explicit finalApprovalStatus → PENDING.
 * - Everything else → NOT_REQUIRED.
 */
function effectiveFinalStatus(doc) {
  if (doc.finalApprovalStatus) return doc.finalApprovalStatus;
  const cs = (doc.compliance_status || '').toUpperCase();
  if (cs === 'NON_COMPLIANT') return 'PENDING';
  return 'NOT_REQUIRED';
}

/** Safely parse ISO date string to a YYYY-MM-DD string */
function toDateStr(val) {
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/**
 * Build per-officer scan totals using the immutable user_id stored on new
 * inspections. Older inspections did not have a user_id, so they are matched
 * to an officer name as a backwards-compatible fallback.
 */
async function getOfficerStats(officerUsers) {
  const usersById = new Map(officerUsers.map((user) => [user._id.toString(), user]));
  const usersByName = new Map(
    officerUsers.map((user) => [String(user.name || '').trim().toLowerCase(), user])
  );
  const totals = new Map(
    officerUsers.map((user) => [user._id.toString(), {
      totalScans: 0, approved: 0, rejected: 0, reviewRequired: 0, lastScan: null,
    }])
  );

  // Only the fields needed for the dashboard are read. This also supports
  // user_id values stored as strings by the Python service.
  const scans = await col().find({}, {
    projection: { user_id: 1, inspector_name: 1, compliance_status: 1, created_at: 1 },
  }).toArray();

  for (const scan of scans) {
    const owner = usersById.get(String(scan.user_id || ''))
      || usersByName.get(String(scan.inspector_name || '').trim().toLowerCase());
    if (!owner) continue;

    const stat = totals.get(owner._id.toString());
    stat.totalScans += 1;
    const status = String(scan.compliance_status || '').toUpperCase();
    if (status === 'COMPLIANT') stat.approved += 1;
    else if (status === 'NON_COMPLIANT') stat.rejected += 1;
    else if (status === 'REVIEW_REQUIRED') stat.reviewRequired += 1;

    if (scan.created_at && (!stat.lastScan || new Date(scan.created_at) > new Date(stat.lastScan))) {
      stat.lastScan = scan.created_at;
    }
  }

  return totals;
}

function officerScanQuery(officer) {
  // user_id is the authoritative relationship. The name condition keeps
  // historical records, created before user_id was added, visible as well.
  return {
    $or: [
      { user_id: officer._id.toString() },
      { inspector_name: officer.name },
    ],
  };
}

// ── GET /api/admin/dashboard ───────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const db = col();

    // Totals
    const totalScans = await db.countDocuments({});

    // Final outcome counts are mutually exclusive:
    // - COMPLIANT scans are automatically approved.
    // - NON_COMPLIANT scans are pending until an admin takes final action.
    // - Once reviewed, they become final APPROVED or REJECTED.
    const approved = await db.countDocuments({ compliance_status: 'COMPLIANT' });
    const rejected = await db.countDocuments({ compliance_status: 'NON_COMPLIANT' });
    const reviewRequired = await db.countDocuments({ compliance_status: 'REVIEW_REQUIRED' });

    // Pending Final Approval = NON_COMPLIANT AND (no finalApprovalStatus OR PENDING)
    const pendingFinalApproval = await db.countDocuments({
      compliance_status: 'NON_COMPLIANT',
      $or: [
        { finalApprovalStatus: { $exists: false } },
        { finalApprovalStatus: 'PENDING' },
      ],
    });

    // Total officers comes from the users collection, not inspections.
    // This ensures newly registered officers (including those with 0 scans)
    // are visible on the admin dashboard.
    const totalOfficers = await User.countDocuments({ role: 'officer' });

    // Today's scans
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayScans = await db.countDocuments({
      created_at: { $gte: todayStart.toISOString() },
    });

    // Status distribution
    const statusDistribution = [
      { status: 'APPROVED', count: await db.countDocuments({ compliance_status: 'COMPLIANT' }) },
      {
        status: 'REJECTED',
        count: await db.countDocuments({ compliance_status: 'NON_COMPLIANT' }),
      },
      {
        status: 'REVIEW_REQUIRED',
        count: await db.countDocuments({ compliance_status: 'REVIEW_REQUIRED' }),
      },
    ];

    // Daily scans — last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCursor = db.aggregate([
      { $match: { created_at: { $gte: thirtyDaysAgo.toISOString() } } },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyRaw = await dailyCursor.toArray();
    const dailyScans = dailyRaw.map((d) => ({ date: d._id, count: d.count }));

    // Officer stats are based on ALL officer accounts, then enriched with
    // inspection counts. Officers with no inspections are included with 0s.
    const officerUsers = await User.find({ role: 'officer' })
      .select('_id name email')
      .lean();

    const statsByUserId = await getOfficerStats(officerUsers);

    const officerStats = officerUsers
      .map((user) => {
        const stats = statsByUserId.get(user._id.toString()) || {};
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          totalScans: stats.totalScans || 0,
          approved: stats.approved || 0,
          rejected: stats.rejected || 0,
          reviewRequired: stats.reviewRequired || 0,
          lastScan: stats.lastScan || null,
        };
      })
      .sort((a, b) => b.totalScans - a.totalScans || a.name.localeCompare(b.name));

    res.json({
      totalScans,
      approved,
      rejected,
      reviewRequired,
      pendingFinalApproval,
      totalOfficers,
      todayScans,
      statusDistribution,
      dailyScans,
      officerStats,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/officers ────────────────────────────────────────────────────
exports.getOfficers = async (req, res, next) => {
  try {
    // Start from users so every officer account is listed, even if they
    // have never performed an inspection.
    const officerUsers = await User.find({ role: 'officer' })
      .select('_id name email')
      .lean();

    const statsByUserId = await getOfficerStats(officerUsers);

    const officers = officerUsers
      .map((user) => {
        const o = statsByUserId.get(user._id.toString()) || {};
        return {
          // Use the MongoDB user ID so officers with zero scans still have a valid detail route.
          id: user._id.toString(),
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
          totalScans: o.totalScans || 0,
          approved: o.approved || 0,
          rejected: o.rejected || 0,
          reviewRequired: o.reviewRequired || 0,
          lastScan: o.lastScan || null,
        };
      })
      .sort((a, b) => b.totalScans - a.totalScans || a.name.localeCompare(b.name));

    res.json({ officers });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/officers/:id ────────────────────────────────────────────────
exports.getOfficerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid officer ID.' });
    }

    const officer = await User.findOne({
      _id: id,
      role: 'officer',
    }).lean();

    if (!officer) {
      return res.status(404).json({ error: 'Officer not found.' });
    }

    const db = col();
    const scanQuery = officerScanQuery(officer);
    const totalScans = await db.countDocuments(scanQuery);
    const approved = await db.countDocuments({ ...scanQuery, compliance_status: 'COMPLIANT' });
    const rejected = await db.countDocuments({ ...scanQuery, compliance_status: 'NON_COMPLIANT' });
    const reviewRequired = await db.countDocuments({ ...scanQuery, compliance_status: 'REVIEW_REQUIRED' });

    const recentDocs = await db
      .find(scanQuery)
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();

    const recentScans = recentDocs.map((d) => {
      const { _id, ...rest } = d;
      return {
        ...rest,
        complianceStatus: mapStatus(d),
        finalApprovalStatus: effectiveFinalStatus(d),
      };
    });

    res.json({
      id: officer._id.toString(),
      name: officer.name,
      email: officer.email,
      totalScans,
      approved,
      rejected,
      reviewRequired,
      lastScan: recentDocs[0]?.created_at || null,
      recentScans,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/scans ───────────────────────────────────────────────────────
exports.getScans = async (req, res, next) => {
  try {
    const db = col();
    const { search = '', status = '', officer = '', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const query = {};

    if (search) {
      query['$or'] = [
        { product_name: { $regex: search, $options: 'i' } },
        { inspection_id: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();

      // Approved = automatically compliant OR non-compliant that an admin approved.
      if (normalizedStatus === 'APPROVED') {
        query.$or = [
          { compliance_status: 'COMPLIANT' },
          {
            compliance_status: 'NON_COMPLIANT',
            finalApprovalStatus: 'APPROVED',
          },
        ];
      }

      // Rejected = non-compliant that an admin finally rejected.
      if (normalizedStatus === 'REJECTED') {
        query.compliance_status = 'NON_COMPLIANT';
        query.finalApprovalStatus = 'REJECTED';
      }

      if (normalizedStatus === 'REVIEW_REQUIRED') {
        query.compliance_status = 'REVIEW_REQUIRED';
      }
    }

    if (officer) {
      query.inspector_name = { $regex: officer, $options: 'i' };
    }

    const total = await db.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;

    const docs = await db
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const items = docs.map((d) => {
      const { _id, ...rest } = d;
      return {
        ...rest,
        complianceStatus: mapStatus(d),
        finalApprovalStatus: effectiveFinalStatus(d),
      };
    });

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/approvals ───────────────────────────────────────────────────
exports.getApprovals = async (req, res, next) => {
  try {
    const docs = await col()
      .find({
        compliance_status: 'NON_COMPLIANT',
        $or: [
          { finalApprovalStatus: { $exists: false } },
          { finalApprovalStatus: 'PENDING' },
        ],
      })
      .sort({ created_at: -1 })
      .toArray();

    const items = docs.map((d) => {
      const { _id, ...rest } = d;
      return {
        ...rest,
        complianceStatus: mapStatus(d),
        finalApprovalStatus: 'PENDING',
      };
    });

    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/approvals/:id ───────────────────────────────────────────────
exports.getApprovalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await col().findOne({
      $or: [{ inspection_id: id }, { id }],
    });

    if (!doc) {
      return res.status(404).json({ error: `Inspection '${id}' not found.` });
    }

    const { _id, ...rest } = doc;
    res.json({
      ...rest,
      complianceStatus: mapStatus(doc),
      finalApprovalStatus: effectiveFinalStatus(doc),
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/approvals/:id/approve ─────────────────────────────────────
exports.approveInspection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.user.sub;

    const result = await col().updateOne(
      { $or: [{ inspection_id: id }, { id }] },
      {
        $set: {
          finalApprovalStatus: 'APPROVED',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          adminComment: req.body.comment || '',
          updated_at: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Inspection '${id}' not found.` });
    }

    res.json({ success: true, finalApprovalStatus: 'APPROVED' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/approvals/:id/reject ──────────────────────────────────────
exports.rejectInspection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const reviewedBy = req.user.sub;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Admin comment is required when rejecting.' });
    }

    const result = await col().updateOne(
      { $or: [{ inspection_id: id }, { id }] },
      {
        $set: {
          finalApprovalStatus: 'REJECTED',
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          adminComment: comment.trim(),
          updated_at: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Inspection '${id}' not found.` });
    }

    res.json({ success: true, finalApprovalStatus: 'REJECTED' });
  } catch (err) {
    next(err);
  }
};

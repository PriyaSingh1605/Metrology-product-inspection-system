/**
 * inspectionController.js
 * ────────────────────────
 * All inspection CRUD and compliance analysis is delegated to the Python AI service.
 * Auth is handled by this Node.js layer; the Python service handles OCR/LLM/storage.
 */
const {
  createComplianceInspection,
  getInspections,
  getInspectionById,
  deleteInspection,
  streamPdfReport,
} = require('../services/pythonService');

// POST /api/inspections
exports.createInspection = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'At least 1 product image is required.' });
    }

    const { product_name, category, manufacturer, location, notes } = req.body;
    if (!product_name || !product_name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    const fields = {
      product_name: product_name.trim(),
      category: category || 'General Packaged Commodity',
      manufacturer: manufacturer || undefined,
      location: location || undefined,
      notes: notes || undefined,
      inspector_name: req.user?.name || 'Legal Metrology Officer',
    };

    const result = await createComplianceInspection(req.files, fields);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/inspections
exports.listInspections = async (req, res, next) => {
  try {
    const params = {};
    if (req.query.search) params.search = req.query.search;
    if (req.query.status) params.status = req.query.status;
    if (req.query.page) params.page = req.query.page;
    if (req.query.limit) params.limit = req.query.limit;

    const result = await getInspections(params);

    // Normalize items for frontend compatibility
    if (result.items) {
      result.items = result.items.map((item) => ({
        ...item,
        status: item.compliance_status || item.status || 'unknown',
        created_at: item.created_at || item.createdAt,
      }));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/inspections/:id
exports.getInspection = async (req, res, next) => {
  try {
    const doc = await getInspectionById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: `Inspection '${req.params.id}' not found.` });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/inspections/:id
exports.deleteInspection = async (req, res, next) => {
  try {
    const result = await deleteInspection(req.params.id);
    if (!result) {
      return res.status(404).json({ error: `Inspection '${req.params.id}' not found.` });
    }
    res.json({ message: `Inspection '${req.params.id}' deleted successfully.` });
  } catch (err) {
    next(err);
  }
};

// GET /api/inspections/:id/pdf
exports.downloadPdf = async (req, res, next) => {
  try {
    const pdfResponse = await streamPdfReport(req.params.id);
    if (!pdfResponse) {
      return res.status(404).json({ error: `Inspection '${req.params.id}' not found.` });
    }

    const filename = `Legal_Metrology_Inspection_${req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    pdfResponse.data.pipe(res);
  } catch (err) {
    next(err);
  }
};

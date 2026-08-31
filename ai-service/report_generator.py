"""
report_generator.py
────────────────────
Generates official Digital Compliance Reports and Certificates in PDF format
under the Legal Metrology (Packaged Commodities) Rules, 2011.
"""

import io
from datetime import datetime
from typing import Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm


def generate_compliance_pdf(inspection_data: Dict[str, Any]) -> io.BytesIO:
    """
    Builds a professional Legal Metrology Inspection Report PDF.
    Returns a BytesIO stream containing the PDF binary.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
    )

    sub_style = ParagraphStyle(
        "HeaderSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        alignment=1,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )

    bold_body = ParagraphStyle(
        "ReportBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("OFFICIAL COMPLIANCE & VERIFICATION INSPECTION REPORT", sub_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=10))

    # Inspection Metadata Table
    insp_id = inspection_data.get("inspection_id", "N/A")
    created_at = inspection_data.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    product_name = inspection_data.get("product_name", "N/A")
    category = inspection_data.get("category", "General Packaged Commodity")
    location = inspection_data.get("location", "Standard Retail Inspection")
    officer = inspection_data.get("inspector_name", "Legal Metrology Inspector")
    status = inspection_data.get("compliance_status", "REVIEW_REQUIRED")

    status_bg = colors.HexColor("#10b981") if status == "COMPLIANT" else colors.HexColor("#ef4444") if status == "NON_COMPLIANT" else colors.HexColor("#f59e0b")

    status_para = Paragraph(f"<font color='white'><b>{status}</b></font>", ParagraphStyle("St", alignment=1, fontSize=11, fontName="Helvetica-Bold"))

    meta_table_data = [
        [
            Paragraph(f"<b>Inspection ID:</b> {insp_id}", body_style),
            Paragraph(f"<b>Date & Time:</b> {created_at[:19]}", body_style),
        ],
        [
            Paragraph(f"<b>Product Name:</b> {product_name}", body_style),
            Paragraph(f"<b>Category:</b> {category}", body_style),
        ],
        [
            Paragraph(f"<b>Inspection Location:</b> {location}", body_style),
            Paragraph(f"<b>Enforcement Official:</b> {officer}", body_style),
        ],
    ]

    t_meta = Table(meta_table_data, colWidths=[260, 260])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # Verdict Box
    verdict_table = Table([[Paragraph(f"<b>OVERALL COMPLIANCE VERDICT: {status}</b>", ParagraphStyle("V", alignment=1, fontSize=11, fontName="Helvetica-Bold", textColor=colors.white))]], colWidths=[520])
    verdict_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), status_bg),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 10))

    # 2. Product Information Extracted
    prod_info = inspection_data.get("product_information", {})
    story.append(Paragraph("1. Extracted Package Declarations (Rule 6)", section_heading))

    prod_rows = [
        [Paragraph("<b>Declaration Field</b>", bold_body), Paragraph("<b>Detected Value</b>", bold_body), Paragraph("<b>Declaration Field</b>", bold_body), Paragraph("<b>Detected Value</b>", bold_body)],
        [
            Paragraph("Brand / Product Identity", body_style),
            Paragraph(str(prod_info.get("product_name") or "Not Detected"), body_style),
            Paragraph("MRP (incl. of all taxes)", body_style),
            Paragraph(f"{prod_info.get('mrp_currency') or 'Rs.'} {prod_info.get('mrp') or 'Not Detected'}", body_style),
        ],
        [
            Paragraph("Net Quantity", body_style),
            Paragraph(f"{prod_info.get('net_quantity') or 'Not Detected'} {prod_info.get('net_quantity_unit') or ''}", body_style),
            Paragraph("Unit Sale Price (USP)", body_style),
            Paragraph(str(prod_info.get("unit_sale_price") or "Not Detected"), body_style),
        ],
        [
            Paragraph("Date of Mfg / Pack", body_style),
            Paragraph(f"{prod_info.get('manufacture_month') or ''}/{prod_info.get('manufacture_year') or ''}" if prod_info.get('manufacture_month') else "Not Detected", body_style),
            Paragraph("Best Before / Expiry", body_style),
            Paragraph(str(prod_info.get("best_before") or prod_info.get("use_by_date") or "Not Detected"), body_style),
        ],
        [
            Paragraph("Manufacturer Name & Address", body_style),
            Paragraph(f"{prod_info.get('manufacturer_name') or ''} - {prod_info.get('manufacturer_address') or ''}".strip(" -") or "Not Detected", body_style),
            Paragraph("Country of Origin", body_style),
            Paragraph(str(prod_info.get("country_of_origin") or "Not Detected"), body_style),
        ],
        [
            Paragraph("Consumer Care Helpline", body_style),
            Paragraph(str(prod_info.get("consumer_care_phone") or "Not Detected"), body_style),
            Paragraph("Consumer Care Email", body_style),
            Paragraph(str(prod_info.get("consumer_care_email") or "Not Detected"), body_style),
        ],
    ]

    t_prod = Table(prod_rows, colWidths=[130, 130, 130, 130])
    t_prod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_prod)
    story.append(Spacer(1, 10))

    # 3. Rule Checks Table
    story.append(Paragraph("2. Mandatory Legal Metrology Compliance Evaluation", section_heading))
    rules = inspection_data.get("rule_checks", {})

    rule_list = [
        ("Product Identity (Generic / Brand Name)", "Rule 6(1)(a)", rules.get("has_product_name", False), True),
        ("Manufacturer / Packer Name & Complete Address", "Rule 6(1)(b)", rules.get("has_manufacturer", False), True),
        ("Net Quantity with Standard Metric Unit", "Rule 6(1)(c)", rules.get("has_net_quantity", False), True),
        ("Maximum Retail Price (MRP inclusive of all taxes)", "Rule 6(1)(d)", rules.get("has_mrp", False), True),
        ("Month & Year of Manufacture / Packing", "Rule 6(1)(e)", rules.get("has_manufacture_date", False), True),
        ("Consumer Care Phone / Email / Address", "Rule 6(1)(f)", rules.get("has_consumer_care", False), True),
        ("Standard MRP Currency & Syntax Validity", "Rule 6(1)(d)", rules.get("mrp_format_valid", False), True),
        ("Recognized Metric Unit (g, kg, ml, l, count)", "Rule 13 / Sched", rules.get("quantity_format_valid", False), True),
        ("Manufacturing Date Format Validity", "Rule 6(1)(e)", rules.get("date_format_valid", False), True),
        ("Consumer Care Contact Verification", "Rule 6(1)(f)", rules.get("consumer_care_format_valid", False), True),
        ("Country of Origin Declaration", "Rule 6(10)", rules.get("has_country_of_origin", False), False),
        ("Unit Sale Price (USP) Declaration", "Rule 6(11)", rules.get("has_unit_sale_price", False), False),
    ]

    rule_rows = [
        [Paragraph("<b>Prescribed Legal Requirement</b>", bold_body), Paragraph("<b>Rule Reference</b>", bold_body), Paragraph("<b>Mandatory</b>", bold_body), Paragraph("<b>Status</b>", bold_body)]
    ]

    for title, ref, passed, is_mand in rule_list:
        status_text = "<font color='#10b981'><b>PASSED</b></font>" if passed else ("<font color='#ef4444'><b>VIOLATION</b></font>" if is_mand else "<font color='#f59e0b'>NOT FOUND</font>")
        rule_rows.append([
            Paragraph(title, body_style),
            Paragraph(ref, body_style),
            Paragraph("Yes" if is_mand else "Optional", body_style),
            Paragraph(status_text, body_style),
        ])

    t_rules = Table(rule_rows, colWidths=[240, 110, 80, 90])
    t_rules.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t_rules)
    story.append(Spacer(1, 10))

    # 4. Font Size & Readability Analysis (Rule 7 & Schedule)
    font_data = inspection_data.get("font_analysis", {})
    if font_data:
        story.append(Paragraph("3. Font Size & Readability Analysis (Rule 7 & Schedule Table)", section_heading))
        font_rows = [
            [Paragraph("<b>Parameter</b>", bold_body), Paragraph("<b>Measurement / Result</b>", bold_body), Paragraph("<b>Legal Standard</b>", bold_body), Paragraph("<b>Evaluation</b>", bold_body)],
            [
                Paragraph("Net Quantity Numeral Height", body_style),
                Paragraph(f"{font_data.get('net_quantity_height_mm', 'N/A')} mm", body_style),
                Paragraph(f"Min {font_data.get('min_required_height_mm', '2.0')} mm", body_style),
                Paragraph("<font color='#10b981'><b>COMPLIANT</b></font>" if font_data.get("font_size_compliant") else "<font color='#ef4444'><b>NON-COMPLIANT</b></font>", body_style),
            ],
            [
                Paragraph("Label Contrast & Readability", body_style),
                Paragraph(f"{font_data.get('readability_score', 85)}% Score", body_style),
                Paragraph("Min 60% Readability", body_style),
                Paragraph("<font color='#10b981'><b>CLEAR</b></font>" if font_data.get("readability_compliant", True) else "<font color='#f59e0b'><b>LOW CONTRAST</b></font>", body_style),
            ],
        ]
        t_font = Table(font_rows, colWidths=[150, 120, 130, 120])
        t_font.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_font)
        story.append(Spacer(1, 10))

    # 5. Violations and Warnings Callout
    final_res = inspection_data.get("final_result", {})
    violations = final_res.get("violations") or inspection_data.get("violations", [])
    warnings = final_res.get("warnings") or inspection_data.get("warnings", [])

    if violations or warnings:
        story.append(Paragraph("4. Specific Non-Compliances & Inspector Findings", section_heading))
        finding_rows = []
        for v in violations:
            finding_rows.append([Paragraph("<b>CRITICAL VIOLATION</b>", ParagraphStyle("cv", textColor=colors.HexColor("#ef4444"), fontSize=8)), Paragraph(str(v), body_style)])
        for w in warnings:
            finding_rows.append([Paragraph("<b>WARNING / ADVISORY</b>", ParagraphStyle("wa", textColor=colors.HexColor("#f59e0b"), fontSize=8)), Paragraph(str(w), body_style)])

        t_find = Table(finding_rows, colWidths=[140, 380])
        t_find.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#fff1f2")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_find)
        story.append(Spacer(1, 12))

    # 6. Official Sign-off Box
    sign_table_data = [
        [
            Paragraph("<b>Automated AI Verification Engine:</b><br/>PaddleOCR v3 + Groq Semantic Label Parser<br/>Verified under Legal Metrology Rules, 2011", body_style),
            Paragraph("<b>Official Enforcement Authority:</b><br/>Department of Legal Metrology<br/>Digitally generated compliance certificate", body_style),
        ]
    ]
    t_sign = Table(sign_table_data, colWidths=[260, 260])
    t_sign.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(KeepTogether([t_sign]))

    doc.build(story)
    buffer.seek(0)
    return buffer

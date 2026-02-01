"""Enhanced PDF report generation with professional formatting and table support."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from datetime import datetime
from typing import Optional
import re


def _parse_table_row(line: str, num_cols: Optional[int] = None) -> list:
    """Parse a single markdown table row. If num_cols is set, pad/truncate to that count."""
    line = line.strip()
    if not line or '|' not in line:
        return []
    parts = line.split('|')
    # Strip outer empty cells from leading/trailing pipes: | A | B | C | -> ['', ' A ', ' B ', ' C ', '']
    if len(parts) > 2:
        cells = [p.strip() for p in parts[1:-1]]
    else:
        cells = [p.strip() for p in parts if p.strip()]
    if num_cols is not None:
        if len(cells) < num_cols:
            cells.extend([''] * (num_cols - len(cells)))
        elif len(cells) > num_cols:
            cells = cells[:num_cols]
    return cells


def parse_markdown_table(lines_iter):
    """Parse a markdown table from lines. Preserves column count and consistent structure."""
    table_data = []
    headers = []

    # Get header row
    header_line = next(lines_iter, None)
    if not header_line:
        return None

    # Parse headers (no padding; we use this to get num_cols)
    headers = _parse_table_row(header_line)
    if not headers:
        return None
    num_cols = len(headers)

    # Skip separator line (e.g., |---|---|)
    next(lines_iter, None)

    # Get data rows with same column count as header
    for line in lines_iter:
        if not line.strip():
            break
        row = _parse_table_row(line, num_cols)
        if not row and '|' not in line:
            break
        if row:
            table_data.append(row)

    if headers:
        return [headers] + table_data
    return None


def _cell_paragraph(text: str, style: ParagraphStyle, font_size: int = 9, text_color: str = "#1f2937") -> Paragraph:
    """Wrap cell text in a Paragraph so it wraps inside the table cell. Escapes HTML."""
    if not text:
        return Paragraph("&nbsp;", style)
    clean = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(f'<font size="{font_size}" color="{text_color}">{clean}</font>', style)


def create_styled_table(table_data, col_widths=None):
    """Create a beautifully styled table with wrapping text in cells."""
    if not table_data:
        return None

    num_cols = len(table_data[0])
    available_width = 6.5 * inch

    # Proportional column widths for common 6-column parts table to prevent truncation
    if num_cols == 6:
        # Name/Type, Model Number, Part Number(s), Serial Number, Category, Manufacturer
        col_widths = [
            1.25 * inch,   # Name/Type
            1.0 * inch,   # Model Number
            1.2 * inch,   # Part Number(s)
            0.85 * inch,  # Serial Number
            1.5 * inch,   # Category (often long)
            1.2 * inch,   # Manufacturer
        ]
    elif col_widths is None:
        col_widths = [available_width / num_cols] * num_cols

    # Cell style for wrapping text
    cell_style = ParagraphStyle(
        'TableCell',
        parent=getSampleStyleSheet()['Normal'],
        fontSize=9,
        leading=11,
        leftIndent=0,
        rightIndent=0,
        spaceBefore=0,
        spaceAfter=0,
        wordWrap='CJK',  # enable word wrap
    )

    # Build table with Paragraphs so content wraps (no overflow/truncation)
    wrapped_data = []
    for r, row in enumerate(table_data):
        wrapped_row = []
        for c, cell in enumerate(row):
            if r == 0:
                # Header: bold, white text on blue background
                header_style = ParagraphStyle(
                    'TableHeader',
                    parent=cell_style,
                    fontName='Helvetica-Bold',
                    fontSize=10,
                )
                wrapped_row.append(_cell_paragraph(cell, header_style, 10, text_color="#f8fafc"))
            else:
                wrapped_row.append(_cell_paragraph(cell, cell_style))
        wrapped_data.append(wrapped_row)

    table = Table(wrapped_data, colWidths=col_widths, repeatRows=1)
    
    # Apply beautiful styling
    table.setStyle(TableStyle([
        # Header row styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),  # Blue header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows styling
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        
        # Grid and borders
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
        ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#2563eb')),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#2563eb')),
        
        # Hover effect simulation with subtle borders
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    return table


def generate_enhanced_report(report_text: str, output_path: str) -> str:
    """
    Generate an enhanced PDF report with professional formatting and styled tables.
    
    Args:
        report_text: Structured report text from AI agents
        output_path: Path where PDF should be saved
        
    Returns:
        Path to generated PDF
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles with vibrant colors
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),  # Deep blue
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#2563eb'),  # Bright blue
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold',
        borderPadding=10,
        backColor=colors.HexColor('#eff6ff'),  # Light blue background
        leftIndent=10,
        rightIndent=10,
        borderWidth=1,
        borderColor=colors.HexColor('#2563eb'),
        borderRadius=5
    )
    
    subsection_style = ParagraphStyle(
        'SubSection',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=colors.HexColor('#059669'),  # Green
        spaceAfter=8,
        spaceBefore=12,
        fontName='Helvetica-Bold',
        leftIndent=15
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=15,
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#374151')  # Dark gray
    )
    
    bullet_style = ParagraphStyle(
        'BulletPoint',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        leftIndent=30,
        spaceAfter=5,
        textColor=colors.HexColor('#374151'),
        bulletIndent=15
    )
    
    # Title with decorative elements
    story.append(Paragraph("Comprehensive Part Analysis Report", title_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Date stamp in a colored box
    date_style = ParagraphStyle(
        'DateStyle',
        parent=normal_style,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#6b7280'),
        fontSize=9
    )
    story.append(Paragraph(f"<i>Generated: {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}</i>", date_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Parse and format the report (index-based so we can skip table lines and avoid duplicate pipe output)
    lines = report_text.split('\n')
    i = 0

    try:
        while i < len(lines):
            line = lines[i]
            if not line.strip():
                i += 1
                continue

            line_clean = line.strip()
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""

            # Check if this is a table header (current line has |, next line is separator ---)
            if '|' in line_clean and next_line and '---' in next_line:
                # Parse table from this point
                table_data = parse_markdown_table(iter(lines[i:]))
                if table_data:
                    table = create_styled_table(table_data)
                    if table:
                        story.append(Spacer(1, 0.15*inch))
                        story.append(KeepTogether(table))
                        story.append(Spacer(1, 0.15*inch))
                    # Skip header + separator + data rows so pipe-delimited data is not repeated below
                    num_table_lines = 1 + 1 + (len(table_data) - 1)  # header, separator, data rows
                    i += num_table_lines
                    continue

            # Section headers with emoji/checkmarks (✅ **1. SECTION**)
            if re.match(r'^✅?\s*\*?\*?\d+\.\s+\*?\*?[A-Z]', line_clean):
                header_text = re.sub(r'^✅?\s*\*?\*?\d+\.\s+\*?\*?', '', line_clean).strip('*#:')
                story.append(Spacer(1, 0.2*inch))
                story.append(Paragraph(f"✅ {header_text}", section_style))
                i += 1
                continue

            # Subsection headers (**Text**)
            if line_clean.startswith('**') and line_clean.endswith('**') and len(line_clean) < 100:
                header_text = line_clean.strip('*')
                story.append(Paragraph(header_text, subsection_style))
                i += 1
                continue

            # Bullet points
            if line_clean.startswith('-') or line_clean.startswith('•') or line_clean.startswith('*'):
                bullet_text = re.sub(r'^[-•*]\s+', '', line_clean)
                # Handle nested bold text in bullets
                bullet_text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', bullet_text)
                story.append(Paragraph(f"• {bullet_text}", bullet_style))
                i += 1
                continue

            # Skip pipe-only lines that look like duplicate table rows (avoid raw pipe output below table)
            if line_clean.startswith('|') and line_clean.count('|') >= 2 and not line_clean.startswith('| **'):
                i += 1
                continue

            # Normal paragraphs
            if line_clean and not line_clean.startswith('#'):
                # Clean up markdown
                clean_line = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', line_clean)
                clean_line = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', clean_line)

                # Handle links [text](url)
                clean_line = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2" color="blue">\1</a>', clean_line)

                # Escape remaining HTML
                clean_line = clean_line.replace('<', '&lt;').replace('>', '&gt;')
                clean_line = clean_line.replace('&lt;b&gt;', '<b>').replace('&lt;/b&gt;', '</b>')
                clean_line = clean_line.replace('&lt;i&gt;', '<i>').replace('&lt;/i&gt;', '</i>')
                clean_line = clean_line.replace('&lt;a ', '<a ').replace('&lt;/a&gt;', '</a>')

                if clean_line:
                    story.append(Paragraph(clean_line, normal_style))

            i += 1

    except Exception as e:
        print(f"Error parsing report: {e}")
        # Fallback: add remaining content as is
        story.append(Paragraph(report_text.replace('\n', '<br/>'), normal_style))
    
    # Build PDF
    try:
        doc.build(story)
        return output_path
    except Exception as e:
        print(f"Error building enhanced PDF: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to simpler version
        story = [
            Paragraph("Comprehensive Part Analysis Report", title_style),
            Spacer(1, 0.3*inch),
            Paragraph(report_text.replace('\n', '<br/>'), normal_style)
        ]
        doc.build(story)
        return output_path

"""Enhanced PDF report generation with professional formatting and table support."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from datetime import datetime
import re


def parse_markdown_table(lines_iter):
    """Parse a markdown table from lines."""
    table_data = []
    headers = []
    
    # Get header row
    header_line = next(lines_iter, None)
    if not header_line:
        return None
        
    # Parse headers
    headers = [cell.strip() for cell in header_line.split('|') if cell.strip()]
    
    # Skip separator line (e.g., |---|---|)
    next(lines_iter, None)
    
    # Get data rows
    for line in lines_iter:
        if not line.strip() or not '|' in line:
            break
        row = [cell.strip() for cell in line.split('|') if cell.strip()]
        if row:
            table_data.append(row)
    
    if headers:
        return [headers] + table_data
    return None


def create_styled_table(table_data, col_widths=None):
    """Create a beautifully styled table."""
    if not table_data:
        return None
    
    # Create table
    if col_widths is None:
        # Auto-calculate column widths based on content
        available_width = 6.5 * inch
        num_cols = len(table_data[0])
        col_widths = [available_width / num_cols] * num_cols
    
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
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
    
    # Parse and format the report
    lines = report_text.split('\n')
    lines_iter = iter(lines)
    
    try:
        for line in lines_iter:
            if not line.strip():
                continue
                
            line_clean = line.strip()
            
            # Check if this is a table header
            if '|' in line_clean and '---' in lines[lines.index(line) + 1] if lines.index(line) + 1 < len(lines) else False:
                # This is a markdown table
                table_data = parse_markdown_table(iter(lines[lines.index(line):]))
                if table_data:
                    table = create_styled_table(table_data)
                    if table:
                        story.append(Spacer(1, 0.15*inch))
                        story.append(KeepTogether(table))
                        story.append(Spacer(1, 0.15*inch))
                continue
            
            # Section headers with emoji/checkmarks (✅ **1. SECTION**)
            if re.match(r'^✅?\s*\*?\*?\d+\.\s+\*?\*?[A-Z]', line_clean):
                header_text = re.sub(r'^✅?\s*\*?\*?\d+\.\s+\*?\*?', '', line_clean).strip('*#:')
                story.append(Spacer(1, 0.2*inch))
                story.append(Paragraph(f"✅ {header_text}", section_style))
                continue
                
            # Subsection headers (**Text**)
            if line_clean.startswith('**') and line_clean.endswith('**') and len(line_clean) < 100:
                header_text = line_clean.strip('*')
                story.append(Paragraph(header_text, subsection_style))
                continue
                
            # Bullet points
            if line_clean.startswith('-') or line_clean.startswith('•') or line_clean.startswith('*'):
                bullet_text = re.sub(r'^[-•*]\s+', '', line_clean)
                # Handle nested bold text in bullets
                bullet_text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', bullet_text)
                story.append(Paragraph(f"• {bullet_text}", bullet_style))
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

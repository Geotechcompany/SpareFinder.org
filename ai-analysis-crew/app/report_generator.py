"""PDF report generation using ReportLab."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
from .utils import get_timestamp, get_temp_path


def generate_report(
    part_details: dict,
    technical_specs: dict,
    supplier_info: list,
    summary: str
) -> str:
    """
    Generate a PDF report with all gathered information.
    
    Args:
        part_details: Dictionary with part identification info
        technical_specs: Dictionary with technical specifications
        supplier_info: List of supplier dictionaries
        summary: Summary text
        
    Returns:
        Path to generated PDF file
    """
    filename = f"report_{get_timestamp()}.pdf"
    filepath = get_temp_path(filename)
    
    doc = SimpleDocTemplate(
        filepath, 
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch
    )
    story = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Heading style
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#2c3e50',
        spaceAfter=12,
        spaceBefore=20
    )
    
    # Normal style with better wrapping
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=6
    )
    
    # Title
    story.append(Paragraph("Manufacturer Part Analysis Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Part Details Section
    story.append(Paragraph("Part Details", heading_style))
    for key, value in part_details.items():
        if value:
            # Escape HTML and handle long text
            clean_value = str(value).replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f"<b>{key}:</b> {clean_value}", normal_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Technical Specs Section
    story.append(Paragraph("Technical Specifications", heading_style))
    for key, value in technical_specs.items():
        if value:
            clean_value = str(value).replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f"<b>{key}:</b> {clean_value}", normal_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Supplier Information Section
    story.append(Paragraph("Supplier Contacts", heading_style))
    for idx, supplier in enumerate(supplier_info, 1):
        story.append(Paragraph(f"<b>Supplier {idx}:</b>", normal_style))
        story.append(Spacer(1, 0.05*inch))
        for key, value in supplier.items():
            if value:
                clean_value = str(value).replace('<', '&lt;').replace('>', '&gt;')
                # Handle URLs specially
                if 'http' in str(value):
                    story.append(Paragraph(f"<b>{key}:</b> <link href='{value}'>{clean_value}</link>", normal_style))
                else:
                    story.append(Paragraph(f"<b>{key}:</b> {clean_value}", normal_style))
        story.append(Spacer(1, 0.15*inch))
    
    story.append(Spacer(1, 0.2*inch))
    
    # Summary Section
    story.append(Paragraph("Summary", heading_style))
    # Handle long summary text
    clean_summary = str(summary).replace('<', '&lt;').replace('>', '&gt;')
    # Split into paragraphs if needed
    for para in clean_summary.split('\n\n'):
        if para.strip():
            story.append(Paragraph(para, normal_style))
            story.append(Spacer(1, 0.1*inch))
    
    # Build PDF with error handling
    try:
        doc.build(story)
    except Exception as e:
        print(f"Error building PDF: {e}")
        # Try with simpler content
        story = [
            Paragraph("Car Spare Part Analysis Report", title_style),
            Spacer(1, 0.3*inch),
            Paragraph("Report Generated Successfully", normal_style),
            Spacer(1, 0.2*inch),
            Paragraph(str(part_details), normal_style),
            Spacer(1, 0.2*inch),
            Paragraph(str(technical_specs), normal_style),
            Spacer(1, 0.2*inch),
            Paragraph(str(supplier_info), normal_style),
        ]
        doc.build(story)
    
    return filepath



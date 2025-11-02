"""CrewAI agent setup for spare part analysis."""

import os
import asyncio
from typing import Callable, Optional
from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from .report_generator import generate_report
from .email_sender import send_email_with_attachment


# Global progress emitter function
progress_emitter: Optional[Callable] = None


def set_progress_emitter(emitter: Callable):
    """Set the function to emit progress updates."""
    global progress_emitter
    progress_emitter = emitter


def emit_progress(stage: str, message: str, status: str = "in_progress"):
    """Emit a progress update if emitter is set."""
    if progress_emitter:
        try:
            # Handle async emitters
            if asyncio.iscoroutinefunction(progress_emitter):
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(progress_emitter(stage=stage, message=message, status=status))
                else:
                    loop.run_until_complete(progress_emitter(stage=stage, message=message, status=status))
            else:
                progress_emitter(stage=stage, message=message, status=status)
        except Exception as e:
            print(f"Error emitting progress: {e}")


def create_part_identifier_agent(llm, has_vision=False):
    """Create the Part Identifier agent."""
    if has_vision:
        backstory = "You are an expert industrial and manufacturer parts identification specialist with advanced analytical capabilities. You can identify components from various industries including automotive, industrial machinery, electronics, appliances, and mechanical equipment. You excel at recognizing brands, part numbers, and specific features from detailed descriptions."
    else:
        backstory = "You are an expert industrial and manufacturer parts identification specialist with years of experience recognizing components from textual descriptions, keywords, and part numbers across multiple industries."
    
    return Agent(
        role="Part Identifier",
        goal="Identify manufacturer parts and components from any industry, including brand names, model numbers, and OEM/aftermarket part codes",
        backstory=backstory,
        llm=llm,
        verbose=True,
        allow_delegation=False
    )


def create_research_agent(llm):
    """Create the Research agent."""
    return Agent(
        role="Technical Research Specialist",
        goal="Find detailed technical specifications, compatibility information, materials, and known issues for identified parts across all industries",
        backstory="You are a meticulous technical researcher with expertise across multiple industries including automotive, industrial equipment, electronics, and mechanical systems. You gather comprehensive technical data, specifications, and compatibility information for any manufacturer part.",
        llm=llm,
        verbose=True,
        allow_delegation=False
    )


def create_supplier_finder_agent(llm):
    """Create the Supplier Finder agent."""
    return Agent(
        role="Supplier Finder",
        goal="Locate 2-3 reliable suppliers with complete contact information including addresses, websites, and phone numbers",
        backstory="You are a procurement specialist with extensive knowledge of industrial and manufacturer part suppliers across multiple industries. You have contacts for automotive, electronics, industrial equipment, mechanical components, and aftermarket parts distributors worldwide.",
        llm=llm,
        verbose=True,
        allow_delegation=False
    )


def create_report_generator_agent(llm):
    """Create the Report Generator agent."""
    return Agent(
        role="Report Compiler",
        goal="Compile all gathered information into a professional, structured technical report",
        backstory="You are a technical writer who creates clear, comprehensive reports from technical data. You organize information into well-structured sections.",
        llm=llm,
        verbose=True,
        allow_delegation=False
    )


def create_email_agent(llm):
    """Create the Email agent."""
    return Agent(
        role="Completion Coordinator",
        goal="Finalize the analysis and confirm completion",
        backstory="You are responsible for ensuring all analysis tasks are completed and summarized properly.",
        llm=llm,
        verbose=True,
        allow_delegation=False
    )


def generate_report_tool_func(comprehensive_report_text: str) -> str:
    """Generate an enhanced PDF report from comprehensive analysis."""
    emit_progress("report_generator", "Generating professional PDF report...", "in_progress")
    
    from .report_generator_enhanced import generate_enhanced_report
    from .utils import get_timestamp, get_temp_path
    
    # Generate filename
    filename = f"report_{get_timestamp()}.pdf"
    filepath = get_temp_path(filename)
    
    try:
        # Use enhanced report generator
        filepath = generate_enhanced_report(comprehensive_report_text, filepath)
        emit_progress("report_generator", f"Professional PDF report generated: {filepath}", "completed")
    except Exception as e:
        print(f"Error with enhanced report, falling back to standard: {e}")
        # Fallback to standard report generator
        from .report_generator import generate_report
        part_details = {"Report": comprehensive_report_text[:500]}
        technical_specs = {"Details": comprehensive_report_text[500:1500]}
        suppliers = [{"Information": comprehensive_report_text[1500:2500]}]
        summary = comprehensive_report_text[-500:]
        filepath = generate_report(part_details, technical_specs, suppliers, summary)
        emit_progress("report_generator", f"PDF report generated: {filepath}", "completed")
    
    return filepath


def send_email_tool_func(to_email: str, pdf_path: str) -> str:
    """Send an email with PDF attachment via Gmail SMTP."""
    emit_progress("email_agent", f"Sending email to {to_email}...", "in_progress")
    subject = "Comprehensive Part Analysis Report"
    body = """Dear Customer,

Please find attached your comprehensive manufacturer part analysis report.

This professional report includes:

✅ Identified Part Details
   • Complete part identification with model/serial numbers
   • Manufacturer information and category classification

✅ Full Technical Analysis
   • Detailed technical specifications
   • Dimensions, weight, power ratings, and materials
   • Key features and technology highlights

✅ Top 3 Verified Suppliers
   • Complete contact information (phone, email, website, address)
   • Price ranges and availability
   • Business analysis and service offerings

✅ Alternative/Replacement Options
   • 3-5 compatible alternatives with specifications
   • Comparative pricing and compatibility notes

✅ Professional Recommendations
   • Availability assessment
   • Best options for different requirements

This report has been professionally formatted and structured for your convenience.

Best regards,
AI Spare Part Analyzer Team
"""
    success = send_email_with_attachment(to_email, subject, body, pdf_path)
    if success:
        emit_progress("email_agent", f"Email sent successfully to {to_email}", "completed")
        return f"Email sent successfully to {to_email}"
    else:
        emit_progress("email_agent", "Failed to send email", "error")
        return "Failed to send email"


def setup_crew(image_data: Optional[bytes], keywords: Optional[str], user_email: str) -> Crew:
    """
    Set up and configure the CrewAI crew for spare part analysis.
    
    Args:
        image_data: Optional image bytes
        keywords: Optional part keywords
        user_email: User's email address
        
    Returns:
        Configured Crew instance
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable must be set")
    
    # Initialize LLMs - using model names directly
    # GPT-4o has native vision capabilities
    has_image = image_data is not None
    
    # GPT-4o supports both text and vision natively
    gpt4o = ChatOpenAI(model="gpt-4o", temperature=0.7, max_tokens=4096)
    gpt4_turbo = ChatOpenAI(model="gpt-4-turbo", temperature=0.7)
    
    # Create agents
    part_identifier = create_part_identifier_agent(gpt4o, has_vision=has_image)
    research_agent = create_research_agent(gpt4_turbo)
    supplier_finder = create_supplier_finder_agent(gpt4_turbo)
    report_generator_agent = create_report_generator_agent(gpt4_turbo)
    email_agent = create_email_agent(gpt4_turbo)
    
    # Note: In newer versions of CrewAI, tools are not always required
    # Agents can work without explicit tools defined
    
    # Build input description
    input_desc = []
    image_base64 = None
    
    if image_data:
        # Convert image bytes to base64 for GPT-4o vision
        import base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        # Determine image type (assume JPEG if not specified)
        image_type = "image/jpeg"
        if image_data[:4] == b'\x89PNG':
            image_type = "image/png"
        elif image_data[:2] == b'\xff\xd8':
            image_type = "image/jpeg"
        
        input_desc.append(f"An image of a car part has been provided. Please analyze this image carefully and identify the specific automotive part shown.")
    
    if keywords:
        if image_data:
            input_desc.append(f"Additional keywords provided: {keywords}")
        else:
            # For keyword-only searches, provide enhanced context
            input_desc.append(f"""
            Keyword-based part search: {keywords}
            
            IMPORTANT: Conduct a COMPREHENSIVE analysis using these keywords. Treat this as a full professional part identification request.
            Research thoroughly to identify:
            - Exact part name and type
            - Manufacturer and brand
            - Model numbers and part numbers (research actual OEM numbers)
            - Compatible vehicles/equipment with specific years and models
            - Technical specifications with real measurements
            - Real suppliers with actual contact information
            
            Provide the same level of detail and professionalism as an image-based analysis.
            """)
    
    analysis_input = " ".join(input_desc) if input_desc else "No specific input provided."
    
    # Note for image handling
    image_note = ""
    if image_data:
        image_note = f"\n\n**IMPORTANT**: Use your vision capabilities to analyze the uploaded image. The image is available for analysis."
    
    # Create tasks
    identify_task = Task(
        description=f"""
        Analyze the provided input: {analysis_input}{image_note}
        
        Identify:
        - The type of part/component (mechanical, electronic, industrial, etc.)
        - Brand/manufacturer (if visible/known)
        - Part number, model number, or serial number (if available)
        - Application/compatibility (what equipment, machinery, or products it fits)
        - Industry category (automotive, industrial, electronics, appliances, etc.)
        
        Format your response as a clear structured description.
        """,
        agent=part_identifier,
        expected_output="Structured description of the identified part including type, brand, part numbers, and application/compatibility"
    )
    
    research_task = Task(
        description="""
        Based on the part identification, conduct COMPREHENSIVE technical research:
        
        **REQUIRED SECTIONS:**
        
        1. **Full Technical Specifications** (organized as spec: value)
           - Type/Category
           - Model/Part Numbers
           - Dimensions (L × W × H in mm and inches)
           - Weight (in kg and lbs)
           - Power/Capacity ratings
           - Material specifications
           - Operating specifications (voltage, pressure, RPM, etc.)
           - Fuel/Energy requirements
           - Environmental ratings
        
        2. **Applications/Compatibility**
           - What equipment/machinery it fits
           - Compatible models and years
           - OEM applications
        
        3. **Key Features**
           - Notable design features
           - Technology highlights
           - Quality indicators
        
        4. **Alternative/Replacement Options** (3-5 alternatives)
           For EACH alternative provide:
           - Model name and number
           - Key specs comparison
           - Power/capacity rating
           - Price range
           - Why it's a suitable replacement
        
        5. **Price Range**
           - OEM pricing
           - Aftermarket pricing
           - Replacement options pricing
        
        Format all information clearly with headers and bullet points.
        """,
        agent=research_agent,
        expected_output="Comprehensive technical specifications, compatibility info, key features, alternative options with pricing, all well-organized",
        context=[identify_task]
    )
    
    supplier_task = Task(
        description="""
        Find 2-3 TOP reliable suppliers for this part. For EACH supplier, provide:
        
        **REQUIRED FOR EACH SUPPLIER:**
        1. Company Name (Official name)
        2. Supplier Type (Manufacturer/Distributor/Repower Specialist)
        3. Full Analysis (2-3 sentences about their business, reputation, services)
        4. Price Range (specific prices if available, e.g., $1,800 - $2,600)
        5. Full Address (City, State, Country)
        6. Phone Number (with country code if international)
        7. Email Address
        8. Website URL
        9. Special Services (warranty, shipping, technical support, etc.)
        
        Format clearly with headers for each supplier.
        Prioritize suppliers with complete contact information and competitive pricing.
        """,
        agent=supplier_finder,
        expected_output="Detailed list of 2-3 suppliers with complete information including business analysis, pricing, and full contact details",
        context=[identify_task, research_task]
    )
    
    report_task = Task(
        description=f"""
        Compile ALL information into a COMPREHENSIVE professional report using this EXACT structure:
        
        **REPORT STRUCTURE:**
        
        ✅ **1. IDENTIFIED PART DETAILS**
        Present as a clean table with:
        - Name/Type
        - Model Number
        - Part Number(s)
        - Serial Number (if applicable)
        - Category
        - Manufacturer
        
        ✅ **2. FULL ANALYSIS**
        2-3 paragraphs describing:
        - What the part is and its purpose
        - Key features and technology
        - Typical applications
        - Quality/durability notes
        
        ✅ **3. TECHNICAL SPECIFICATIONS**
        Organized list format:
        - Each spec on its own line
        - Format as "Spec Name: Value with units"
        - Group related specs together
        - Include dimensions, weight, power, materials, etc.
        
        ✅ **4. TOP 3 SUPPLIERS**
        For EACH supplier, include:
        **[Number]. [Company Name] ([Type])**
        
        **Full Analysis:**
        [2-3 sentences about the supplier]
        
        **Technical Specs/Offerings:**
        [What they offer for this part]
        
        **Price Range:**
        [Specific prices]
        
        **Contact Information:**
        - Phone: [number]
        - Email: [email]
        - Website: [url]
        - Address: [full address]
        
        ✅ **5. ALTERNATIVE/REPLACEMENT OPTIONS**
        List 3-5 alternatives, each with:
        - Model name and number
        - Key specifications
        - Power/capacity rating
        - Price range
        - Compatibility notes
        
        ✅ **6. CONCLUSION**
        Professional summary with:
        - Availability assessment
        - Best options for different needs
        - Recommendations
        
        Use clear headers, bullet points, and organized formatting throughout.
        """,
        agent=report_generator_agent,
        expected_output="Professionally structured comprehensive report following the exact format specified, ready for PDF generation",
        context=[identify_task, research_task, supplier_task]
    )
    
    email_task = Task(
        description=f"""
        Finalize the analysis process and prepare for email delivery to {user_email}.
        
        Confirm that all information has been compiled successfully and is ready to be sent.
        Provide a summary confirmation message.
        """,
        agent=email_agent,
        expected_output="Confirmation that the analysis is complete and ready for delivery",
        context=[report_task]
    )
    
    # Create crew
    crew = Crew(
        agents=[
            part_identifier,
            research_agent,
            supplier_finder,
            report_generator_agent,
            email_agent
        ],
        tasks=[
            identify_task,
            research_task,
            supplier_task,
            report_task,
            email_task
        ],
        verbose=True
    )
    
    # Return crew and report_task so we can access the report output
    return crew, report_task


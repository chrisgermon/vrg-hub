import HTMLtoDOCX from 'html-to-docx';
import { saveAs } from 'file-saver';

interface SectionData {
  section: string;
  content: string;
  isRequired: boolean;
}

interface DepartmentSection {
  key: string;
  name: string;
  isRequired: boolean;
}

export async function exportNewsletterToWord(
  title: string,
  department: string,
  contributorName: string,
  sectionsData: SectionData[],
  departmentSections: DepartmentSection[],
  noUpdateThisMonth: boolean = false
) {
  try {
    // Build HTML content with proper styling
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Calibri', 'Arial', sans-serif; 
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
          }
          h1 { 
            font-size: 20pt; 
            font-weight: bold; 
            color: #2B579A;
            margin-bottom: 8pt;
            border-bottom: 2px solid #2B579A;
            padding-bottom: 4pt;
          }
          h2 { 
            font-size: 16pt; 
            font-weight: bold; 
            color: #4472C4;
            margin-top: 16pt;
            margin-bottom: 8pt;
          }
          h3 { 
            font-size: 14pt; 
            font-weight: bold; 
            color: #5B9BD5;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }
          p { 
            margin: 8pt 0; 
            text-align: justify;
          }
          ul, ol { 
            margin: 8pt 0; 
            padding-left: 20pt;
          }
          li { 
            margin: 4pt 0; 
          }
          .header-info {
            font-size: 10pt;
            color: #666666;
            margin-bottom: 16pt;
            font-style: italic;
          }
          .section-title {
            background-color: #E7E6E6;
            padding: 8pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
            border-left: 4pt solid #4472C4;
          }
          .content-block {
            margin: 8pt 0;
            padding-left: 8pt;
          }
          .no-update {
            text-align: center;
            font-style: italic;
            color: #666666;
            padding: 16pt;
            background-color: #F2F2F2;
            border-radius: 4pt;
          }
          strong, b { 
            font-weight: bold; 
          }
          em, i { 
            font-style: italic; 
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 8pt 0;
          }
          th, td {
            border: 1px solid #DDDDDD;
            padding: 8pt;
            text-align: left;
          }
          th {
            background-color: #4472C4;
            color: white;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="header-info">
          <strong>Department:</strong> ${department}<br/>
          <strong>Contributor:</strong> ${contributorName}<br/>
          <strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
    `;

    if (noUpdateThisMonth) {
      htmlContent += `
        <div class="no-update">
          <p><strong>No updates for this month</strong></p>
        </div>
      `;
    } else {
      // Add each section with its content
      sectionsData.forEach(sectionData => {
        const section = departmentSections.find(s => s.key === sectionData.section);
        if (section && sectionData.content) {
          htmlContent += `
            <div class="section-title">
              <h2>${section.name}${section.isRequired ? ' (Required)' : ''}</h2>
            </div>
            <div class="content-block">
              ${sectionData.content}
            </div>
          `;
        }
      });
    }

    htmlContent += `
      </body>
      </html>
    `;

    // Convert HTML to DOCX
    const fileBuffer = await HTMLtoDOCX(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: 'Calibri',
      fontSize: 22, // 11pt in half-points
      complexScriptSize: 22,
      header: true,
      title: title,
      subject: `Newsletter - ${department}`,
      creator: contributorName,
      description: `Newsletter submission for ${department}`,
    });

    // Save the file
    const blob = new Blob([fileBuffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${department.replace(/[^a-z0-9]/gi, '_')}.docx`;
    saveAs(blob, fileName);

    return true;
  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw error;
  }
}

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import DOMPurify from 'dompurify';

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

function parseHtmlToDocxParagraphs(html: string): Paragraph[] {
  const sanitizedHtml = DOMPurify.sanitize(html);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitizedHtml;
  
  const paragraphs: Paragraph[] = [];
  
  const processNode = (node: Node): TextRun[] => {
    const runs: TextRun[] = [];
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        runs.push(new TextRun({ text }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'strong' || tagName === 'b') {
        const text = element.textContent?.trim();
        if (text) {
          runs.push(new TextRun({ text, bold: true }));
        }
      } else if (tagName === 'em' || tagName === 'i') {
        const text = element.textContent?.trim();
        if (text) {
          runs.push(new TextRun({ text, italics: true }));
        }
      } else if (tagName === 'u') {
        const text = element.textContent?.trim();
        if (text) {
          runs.push(new TextRun({ text, underline: { type: UnderlineType.SINGLE } }));
        }
      } else {
        element.childNodes.forEach(child => {
          runs.push(...processNode(child));
        });
      }
    }
    
    return runs;
  };
  
  tempDiv.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'p') {
        const runs = processNode(element);
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({ children: runs, spacing: { after: 200 } }));
        }
      } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
        const text = element.textContent?.trim();
        if (text) {
          const level = tagName === 'h1' ? HeadingLevel.HEADING_1 : 
                       tagName === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
          paragraphs.push(new Paragraph({
            text,
            heading: level,
            spacing: { before: 240, after: 120 }
          }));
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        element.querySelectorAll('li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) {
            paragraphs.push(new Paragraph({
              text: `• ${text}`,
              spacing: { after: 100 },
              indent: { left: 720 }
            }));
          }
        });
      } else {
        const runs = processNode(element);
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({ children: runs, spacing: { after: 200 } }));
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(new Paragraph({ text, spacing: { after: 200 } }));
      }
    }
  });
  
  return paragraphs;
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
    const sections: Paragraph[] = [];
    
    // Title
    sections.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
      })
    );
    
    // Header info
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Department: ', bold: true }),
          new TextRun({ text: department }),
        ],
        spacing: { after: 100 },
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Contributor: ', bold: true }),
          new TextRun({ text: contributorName }),
        ],
        spacing: { after: 100 },
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Generated: ', bold: true }),
          new TextRun({ 
            text: new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    if (noUpdateThisMonth) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'No updates for this month', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
    } else {
      // Add each section with its content
      sectionsData.forEach(sectionData => {
        const section = departmentSections.find(s => s.key === sectionData.section);
        if (section && sectionData.content) {
          // Section title
          sections.push(
            new Paragraph({
              text: `${section.name}${section.isRequired ? ' (Required)' : ''}`,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            })
          );
          
          // Section content - parse HTML
          const contentParagraphs = parseHtmlToDocxParagraphs(sectionData.content);
          sections.push(...contentParagraphs);
        }
      });
    }
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });
    
    const blob = await Packer.toBlob(doc);
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${department.replace(/[^a-z0-9]/gi, '_')}.docx`;
    saveAs(blob, fileName);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw error;
  }
}
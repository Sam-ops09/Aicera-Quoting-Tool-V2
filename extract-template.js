import mammoth from 'mammoth';
import { readFileSync } from 'fs';

const docxPath = './client/public/Optivalue Tek - Commercial Proposal _ Dell Laptops and Desktops.docx';

(async () => {
  try {
    const buffer = readFileSync(docxPath);

    // Extract raw text
    const result = await mammoth.extractRawText({ buffer });
    console.log('=== RAW TEXT ===');
    console.log(result.value);
    console.log('\n\n');

    // Convert to HTML to see structure
    const htmlResult = await mammoth.convertToHtml({ buffer });
    console.log('=== HTML STRUCTURE ===');
    console.log(htmlResult.value);

  } catch (error) {
    console.error('Error:', error);
  }
})();


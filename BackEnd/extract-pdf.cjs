const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractPdf() {
  const pdfPath = 'Knowledge_base/CamTech_info.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF not found at:', pdfPath);
    return;
  }

  console.log('Found PDF, extracting...');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  console.log('Pages:', doc.numPages);

  let fullText = '';
  for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    console.log('\n--- Page', i, '---');
    console.log(text);
    fullText += text + '\n';
  }

  // Save to file
  fs.writeFileSync('knowledge-base-extracted.txt', fullText);
  console.log('\nSaved to knowledge-base-extracted.txt');
}

extractPdf().catch(e => console.error(e));


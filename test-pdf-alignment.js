// Quick PDF alignment test
const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ size: 'A4', margin: 40 });
const output = fs.createWriteStream('alignment-test.pdf');
doc.pipe(output);

// Test label-value alignment
const MARGIN_LEFT = 40;
const labelWidth = 120;
const valueX = MARGIN_LEFT + labelWidth + 5;

let y = 100;

// Test 1: Label and value alignment
doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
doc.text('Label 1:', MARGIN_LEFT, y);
doc.font('Helvetica').fillColor('#000000');
doc.text('Value 1', valueX, y);

y += 20;

doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
doc.text('Longer Label:', MARGIN_LEFT, y);
doc.font('Helvetica').fillColor('#000000');
doc.text('Value 2', valueX, y);

y += 20;

doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
doc.text('Label 3:', MARGIN_LEFT, y);
doc.font('Helvetica').fillColor('#000000');
doc.text('Value 3', valueX, y);

// Draw vertical line to show alignment
doc.strokeColor('#ff0000').lineWidth(0.5);
doc.moveTo(valueX, 80).lineTo(valueX, y + 20).stroke();

// Test 2: Table alignment
y += 60;
const tableTop = y;
const col1X = MARGIN_LEFT + 8;
const col1W = 40;
const col2X = col1X + col1W;
const col2W = 300;
const col3X = col2X + col2W;
const col3W = 55;
const col4X = col3X + col3W;
const col4W = 75;

// Header
doc.rect(MARGIN_LEFT, tableTop, 515, 30).fill('#1e3a8a');
doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
doc.text('No', col1X, tableTop + 10, { width: col1W, align: 'center' });
doc.text('Description', col2X + 8, tableTop + 10, { width: col2W - 16, align: 'left' });
doc.text('Qty', col3X, tableTop + 10, { width: col3W, align: 'center' });
doc.text('Price', col4X, tableTop + 10, { width: col4W, align: 'right' });

// Row
y = tableTop + 30;
doc.rect(MARGIN_LEFT, y, 515, 24).fill('#fafbfc');
doc.fontSize(9).font('Helvetica').fillColor('#000000');
const textY = y + 6;
doc.text('1', col1X, textY, { width: col1W, align: 'center' });
doc.text('Sample Item Description', col2X + 8, textY, { width: col2W - 16, align: 'left' });
doc.text('10', col3X, textY, { width: col3W, align: 'center' });
doc.text('₹1,000.00', col4X, textY, { width: col4W - 8, align: 'right' });

// Draw vertical lines to show column boundaries
doc.strokeColor('#ff0000').lineWidth(0.5);
doc.moveTo(col2X, tableTop).lineTo(col2X, y + 24).stroke();
doc.moveTo(col3X, tableTop).lineTo(col3X, y + 24).stroke();
doc.moveTo(col4X, tableTop).lineTo(col4X, y + 24).stroke();

doc.end();
console.log('Test PDF created: alignment-test.pdf');


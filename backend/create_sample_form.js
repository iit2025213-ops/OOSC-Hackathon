import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';

async function createForm() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();

  page.drawText('Adhikaar Sample Fillable Form', { x: 50, y: 750, size: 20, font });
  page.drawText('This is a REAL interactive PDF. Notice the clickable boxes!', { x: 50, y: 720, size: 12, font });

  // 1. Full Name
  page.drawText('Full Name:', { x: 50, y: 650, size: 12, font });
  const nameField = form.createTextField('fullName');
  nameField.addToPage(page, { x: 150, y: 645, width: 300, height: 20 });

  // 2. Age
  page.drawText('Age:', { x: 50, y: 600, size: 12, font });
  const ageField = form.createTextField('age');
  ageField.addToPage(page, { x: 150, y: 595, width: 100, height: 20 });

  // 3. Address
  page.drawText('Address:', { x: 50, y: 550, size: 12, font });
  const addressField = form.createTextField('address');
  addressField.addToPage(page, { x: 150, y: 545, width: 300, height: 20 });

  // 4. Scheme Type Dropdown
  page.drawText('Scheme Type:', { x: 50, y: 500, size: 12, font });
  const schemeDropdown = form.createDropdown('schemeType');
  schemeDropdown.addOptions(['Housing', 'Education', 'Healthcare', 'Pension']);
  schemeDropdown.addToPage(page, { x: 150, y: 495, width: 200, height: 20 });

  // 5. Declaration Checkbox
  page.drawText('I declare the above info is true:', { x: 50, y: 450, size: 12, font });
  const checkField = form.createCheckBox('declaration');
  checkField.addToPage(page, { x: 250, y: 445, width: 20, height: 20 });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('Sample_Interactive_Form.pdf', pdfBytes);
  console.log('✅ Successfully created Sample_Interactive_Form.pdf!');
}

createForm().catch(console.error);

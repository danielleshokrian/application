/**
 * Resume parser: extracts text from PDF or DOCX files.
 * Used server-side only.
 */

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop()

  if (ext === 'pdf') {
    return extractFromPDF(buffer)
  } else if (ext === 'docx' || ext === 'doc') {
    return extractFromDOCX(buffer)
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  } catch (err) {
    console.error('[ResumeParser] PDF parse error:', err)
    // Fallback: return placeholder — AI will handle incomplete text gracefully
    return '[PDF text extraction failed — AI screening may be incomplete]'
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (err) {
    console.error('[ResumeParser] DOCX parse error:', err)
    return '[DOCX text extraction failed — AI screening may be incomplete]'
  }
}

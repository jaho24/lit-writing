declare module 'pdf-parse' {
  interface PDFData {
    info?: Record<string, string>;
    metadata?: Record<string, string>;
    text?: string;
    numpages?: number;
  }
  function pdfParse(dataBuffer: Buffer): Promise<PDFData>;
  export default pdfParse;
}

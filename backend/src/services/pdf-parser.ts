import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

interface RawPDFData {
  info?: Record<string, string>;
  metadata?: Record<string, string>;
  text?: string;
  numpages?: number;
}

async function parsePDF(filePath: string): Promise<RawPDFData> {
  const data = new Uint8Array(fs.readFileSync(filePath));

  const doc = await pdfjsLib.getDocument({ data }).promise;

  const metadata = await doc.getMetadata().catch(() => null);

  let fullText = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return {
    numpages: doc.numPages,
    info: metadata?.info as Record<string, string> | undefined,
    metadata: metadata?.metadata as Record<string, string> | undefined,
    text: fullText.trim(),
  };
}

function extractTitle(data: RawPDFData): { value: string | null; confidence: 'high' | 'medium' | 'low' } {
  if (data.info?.Title && data.info.Title.trim().length > 3) {
    return { value: data.info.Title.trim(), confidence: 'high' };
  }

  const text = data.text || '';
  const firstPageLines = text.split('\n').slice(0, 20).filter(l => l.trim().length > 5);
  if (firstPageLines.length > 0) {
    const longestFirstLines = firstPageLines.slice(0, 3).sort((a, b) => b.trim().length - a.trim().length);
    if (longestFirstLines[0]?.trim().length > 10) {
      return { value: longestFirstLines[0].trim(), confidence: 'low' };
    }
  }

  return { value: null, confidence: 'low' };
}

function extractAuthors(data: RawPDFData): { value: string | null; confidence: 'high' | 'medium' | 'low' } {
  if (data.info?.Author && data.info.Author.trim().length > 2) {
    return { value: data.info.Author.trim(), confidence: 'high' };
  }

  const text = data.text || '';
  const authorPatterns = [
    /(?:by|作者[:\s])\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+\s+[A-Z][a-z]+)*)/,
  ];

  for (const pattern of authorPatterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      return { value: match[1].trim(), confidence: 'medium' };
    }
  }

  return { value: null, confidence: 'low' };
}

function extractYear(data: RawPDFData): { value: number | null; confidence: 'high' | 'medium' | 'low' } {
  if (data.info?.CreationDate) {
    const yearMatch = data.info.CreationDate.match(/D:(\d{4})/);
    if (yearMatch) return { value: Number(yearMatch[1]), confidence: 'medium' };
  }

  const text = data.text || '';
  const yearPatterns = [
    /©\s*(\d{4})/,
    /(?:published|published|published in|accepted)\s*(?:\w+\s+)?(\d{4})/i,
    /(\d{4})\s*(?:IEEE|ACM|Springer|Elsevier|Nature|Science)/i,
    /\b(19[9]\d|20[0-2]\d)\b/,
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const year = Number(match[1]);
      if (year >= 1990 && year <= 2030) {
        return { value: year, confidence: 'medium' };
      }
    }
  }

  return { value: null, confidence: 'low' };
}

function extractDOI(data: RawPDFData): { value: string | null; confidence: 'high' | 'medium' | 'low' } {
  const text = data.text || '';
  const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
  const match = text.match(doiPattern);
  if (match) return { value: match[0], confidence: 'high' };
  return { value: null, confidence: 'low' };
}

function extractAbstract(data: RawPDFData): { value: string | null; confidence: 'high' | 'medium' | 'low' } {
  const text = data.text || '';
  const abstractPatterns = [
    /(?:Abstract|ABSTRACT|摘要|摘\s*要)[:\s]*\n?\s*([\s\S]{50,500}?)(?:\n\s*\n|[1-9]\.|Introduction|INTRODUCTION|Keywords|关键词|1\s)/i,
  ];

  for (const pattern of abstractPatterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      return { value: match[1].trim().slice(0, 500), confidence: 'high' };
    }
  }

  if (text.length > 100) {
    return { value: text.slice(0, 200).trim(), confidence: 'low' };
  }

  return { value: null, confidence: 'low' };
}

function extractJournal(data: RawPDFData): { value: string | null; confidence: 'high' | 'medium' | 'low' } {
  const text = data.text || '';
  const journalPatterns = [
    /(?:published in|published by|journal of|transactions on|proceedings of)\s*([\w\s&.,]+?)(?:\s*,\s*|\s*\n)/i,
  ];

  for (const pattern of journalPatterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      return { value: match[1].trim(), confidence: 'medium' };
    }
  }

  return { value: null, confidence: 'low' };
}

export async function extractPDFMetadata(filePath: string) {
  const data = await parsePDF(filePath);

  const title = extractTitle(data);
  const authors = extractAuthors(data);
  const year = extractYear(data);
  const doi = extractDOI(data);
  const abstract = extractAbstract(data);
  const journal = extractJournal(data);

  const confidence: Record<string, 'high' | 'medium' | 'low'> = {
    title: title.confidence,
    authors: authors.confidence,
    year: year.confidence,
    doi: doi.confidence,
    abstract: abstract.confidence,
    journal: journal.confidence,
  };

  return {
    title: title.value,
    authors: authors.value,
    year: year.value,
    doi: doi.value,
    abstract: abstract.value,
    journal: journal.value,
    confidence,
  };
}
import fs from 'fs';
import path from 'path';
import db, { statements } from '../database';
import { extractPDFMetadata } from './pdf-parser';
import type { FolderScanResult } from '../types';

const DATA_DIR = process.env.DATA_DIR || './data';
const PDF_DIR = path.join(DATA_DIR, 'pdfs');

export async function scanAndImport(folderPath: string, libraryId: number | null): Promise<FolderScanResult> {
  const result: FolderScanResult = {
    total: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    files: [],
  };

  const pdfFiles = findPDFFiles(folderPath);
  result.total = pdfFiles.length;

  for (const filePath of pdfFiles) {
    const fileName = path.basename(filePath);
    const destFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`;
    const destPath = path.join(PDF_DIR, destFileName);

    try {
      const existing = db.prepare('SELECT id FROM literature WHERE file_name = ?').get(fileName);
      if (existing) {
        result.skipped++;
        result.files.push({ path: filePath, status: 'skipped' });
        continue;
      }

      fs.copyFileSync(filePath, destPath);
      const relativePath = path.relative(DATA_DIR, destPath);

      const metadata = await extractPDFMetadata(destPath);

      const insertResult = statements.createLiterature.run(
        metadata.title,
        metadata.authors,
        metadata.year,
        metadata.journal,
        metadata.doi,
        metadata.abstract,
        relativePath,
        fileName,
        libraryId,
        JSON.stringify(metadata.confidence)
      );

      const literatureId = Number(insertResult.lastInsertRowid);

      if (libraryId) {
        statements.addLiteratureLibrary.run(literatureId, libraryId);
      }

      result.imported++;
      result.files.push({ path: filePath, status: 'imported', literature_id: literatureId });
    } catch (err) {
      result.failed++;
      result.files.push({ path: filePath, status: 'failed', error: String(err) });
    }
  }

  return result;
}

function findPDFFiles(dirPath: string): string[] {
  const results: string[] = [];

  function scan(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf') {
        results.push(fullPath);
      }
    }
  }

  scan(dirPath);
  return results;
}
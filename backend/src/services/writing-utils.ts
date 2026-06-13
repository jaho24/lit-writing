import db from '../database';
import type { Annotation, CitationItem } from '../types';

export interface AnnotationWithLiterature extends Annotation {
  literature_title: string;
  literature_authors: string;
  literature_year: number | null;
  literature_journal: string | null;
  literature_doi: string | null;
}

export interface LiteratureWithInfo {
  id: number;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
}

interface LiteratureInfo {
  id: number;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  doi: string | null;
}

export function fetchAnnotationsWithLiterature(annotationIds: number[]): AnnotationWithLiterature[] {
  if (annotationIds.length === 0) return [];
  const placeholders = annotationIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT a.*, l.title as literature_title, l.authors as literature_authors,
           l.year as literature_year, l.journal as literature_journal, l.doi as literature_doi
    FROM annotations a
    JOIN literature l ON a.literature_id = l.id
    WHERE a.id IN (${placeholders})
    ORDER BY a.created_at DESC
  `).all(...annotationIds) as AnnotationWithLiterature[];
}

export function buildLiteratureMap(annotations: AnnotationWithLiterature[]): Map<number, LiteratureInfo> {
  const map = new Map<number, LiteratureInfo>();
  for (const a of annotations) {
    if (!map.has(a.literature_id)) {
      map.set(a.literature_id, {
        id: a.literature_id,
        title: a.literature_title || 'Unknown',
        authors: a.literature_authors || 'Unknown',
        year: a.literature_year,
        journal: a.literature_journal,
        doi: a.literature_doi,
      });
    }
  }
  return map;
}

export function buildCitationsFromLiteratureMap(literatureMap: Map<number, LiteratureInfo>): CitationItem[] {
  const seenIds = new Set<number>();
  const citations: CitationItem[] = [];
  let markerIndex = 1;
  for (const [_, lit] of literatureMap) {
    if (seenIds.has(lit.id)) continue;
    seenIds.add(lit.id);
    citations.push({
      marker: `[${markerIndex}]`,
      literature_id: lit.id,
      title: lit.title,
      authors: lit.authors,
      year: lit.year,
      journal: lit.journal,
      doi: lit.doi,
    });
    markerIndex++;
  }
  return citations;
}

export function buildAnnotationMaterial(annotations: AnnotationWithLiterature[]): string {
  return annotations.map(a => {
    return `- 来源：${a.literature_title || 'Unknown'} (${a.literature_authors || 'Unknown'}, ${a.literature_year || 'N/A'})，DOI: ${a.literature_doi || 'N/A'}，第${a.page}页\n  原文："${a.text || ''}"\n  批注："${a.note || ''}"`;
  }).join('\n\n');
}

export function fetchAllAnnotationsForLiteratures(literatureIds: number[]): AnnotationWithLiterature[] {
  if (literatureIds.length === 0) return [];
  const placeholders = literatureIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT a.*, l.title as literature_title, l.authors as literature_authors,
           l.year as literature_year, l.journal as literature_journal, l.doi as literature_doi
    FROM annotations a
    JOIN literature l ON a.literature_id = l.id
    WHERE a.literature_id IN (${placeholders})
    ORDER BY a.literature_id, a.created_at DESC
  `).all(...literatureIds) as AnnotationWithLiterature[];
}

export function fetchLiteraturesByIds(literatureIds: number[]): LiteratureWithInfo[] {
  if (literatureIds.length === 0) return [];
  const placeholders = literatureIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT id, title, authors, year, journal, doi, abstract
    FROM literature
    WHERE id IN (${placeholders})
  `).all(...literatureIds) as LiteratureWithInfo[];
}

export function buildLiteratureMaterial(literatures: LiteratureWithInfo[]): string {
  if (literatures.length === 0) return '';
  return literatures.map(lit => {
    const parts = [`- 文献：${lit.title || 'Unknown'} (${lit.authors || 'Unknown'}, ${lit.year || 'N/A'})`];
    if (lit.journal) parts.push(`  期刊：${lit.journal}`);
    if (lit.doi) parts.push(`  DOI：${lit.doi}`);
    if (lit.abstract) parts.push(`  摘要："${lit.abstract}"`);
    return parts.join('\n');
  }).join('\n\n');
}

export function addLiteraturesToMap(literatures: LiteratureWithInfo[], map: Map<number, LiteratureInfo>): void {
  for (const lit of literatures) {
    if (!map.has(lit.id)) {
      map.set(lit.id, {
        id: lit.id,
        title: lit.title || 'Unknown',
        authors: lit.authors || 'Unknown',
        year: lit.year,
        journal: lit.journal,
        doi: lit.doi,
      });
    }
  }
}

export function parseJSONField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
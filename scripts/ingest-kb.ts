import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { prisma } from '../src/lib/db'

const KB_ROOT = process.env.HOME + '/Documents/PM_AI_Knowledge_Base'
const CSV_PATH = KB_ROOT + '/Document_Register.csv'

async function main() {
  const csv = readFileSync(CSV_PATH, 'utf-8')
  const records = parse(csv, { columns: true, skip_empty_lines: true })

  for (const row of records) {
    const docId = row['Doc ID']?.trim()
    if (!docId) continue

    const category = docId.split('-')[1] || 'OTHER'
    const folder = `PM-${category}`

    await prisma.kBDocument.upsert({
      where: { docId },
      update: {
        name: row['Document Name']?.trim() || '',
        summary: row['Summary']?.trim() || '',
        sourceUrl: row['Source URL']?.trim() || null,
        lastUpdated: row['Source Last Updated']?.trim() || null,
        reviewDate: row['Review Date']?.trim() || null,
        fileStatus: row['File Status']?.trim() || 'Unknown',
        category,
      },
      create: {
        docId,
        name: row['Document Name']?.trim() || '',
        filePath: `${folder}/${docId}`,
        summary: row['Summary']?.trim() || '',
        sourceUrl: row['Source URL']?.trim() || null,
        lastUpdated: row['Source Last Updated']?.trim() || null,
        reviewDate: row['Review Date']?.trim() || null,
        fileStatus: row['File Status']?.trim() || 'Unknown',
        category,
      },
    })
  }

  const count = await prisma.kBDocument.count()
  console.log(`✓ Ingested ${count} KB documents`)
}

main().catch(console.error)

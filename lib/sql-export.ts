import type { Field, Schema } from './schema-types'

export type SqlExportDialect = 'postgres' | 'mysql' | 'sqlite'

function quoteIdent(name: string, dialect: SqlExportDialect): string {
  if (dialect === 'mysql') return `\`${name}\``
  return `"${name.replace(/"/g, '""')}"`
}

function mapFieldType(type: string, dialect: SqlExportDialect): string {
  const normalized = type.toLowerCase()

  switch (normalized) {
    case 'uuid':
      return dialect === 'sqlite' ? 'TEXT' : 'UUID'
    case 'bigint':
      return 'BIGINT'
    case 'integer':
      return 'INTEGER'
    case 'decimal':
      return 'DECIMAL(10, 2)'
    case 'float':
      return dialect === 'postgres' ? 'DOUBLE PRECISION' : 'FLOAT'
    case 'boolean':
      return dialect === 'sqlite' ? 'INTEGER' : 'BOOLEAN'
    case 'timestamp':
      return dialect === 'mysql' ? 'TIMESTAMP' : 'TIMESTAMP'
    case 'datetime':
      return dialect === 'postgres' ? 'TIMESTAMP' : 'DATETIME'
    case 'date':
      return 'DATE'
    case 'json':
      return dialect === 'sqlite' ? 'TEXT' : 'JSON'
    case 'blob':
      return dialect === 'postgres' ? 'BYTEA' : 'BLOB'
    case 'text':
      return 'TEXT'
    case 'string':
    default:
      return dialect === 'sqlite' ? 'TEXT' : 'VARCHAR(255)'
  }
}

export function exportSchemaToSql(
  schema: Schema,
  options?: { dialect?: SqlExportDialect }
): string {
  const dialect = options?.dialect ?? 'postgres'

  const relationshipTargets = new Map<string, { toModelId: string; toFieldId: string }>()
  for (const rel of schema.relationships) {
    relationshipTargets.set(`${rel.fromModelId}:${rel.fromFieldId}`, {
      toModelId: rel.toModelId,
      toFieldId: rel.toFieldId,
    })
  }

  const modelById = new Map(schema.models.map((model) => [model.id, model]))
  const statements: string[] = []

  for (const model of schema.models) {
    const lines: string[] = []

    for (const field of model.fields) {
      const parts: string[] = [
        quoteIdent(field.name, dialect),
        mapFieldType(field.type ?? 'string', dialect),
      ]

      if (!field.nullable || field.primaryKey) {
        parts.push('NOT NULL')
      }
      if (field.primaryKey) {
        parts.push('PRIMARY KEY')
      }

      lines.push(`  ${parts.join(' ')}`)
    }

    for (const field of model.fields) {
      const fk = relationshipTargets.get(`${model.id}:${field.id}`)
      if (!fk) continue

      const targetModel = modelById.get(fk.toModelId)
      const targetField = targetModel?.fields.find((candidate) => candidate.id === fk.toFieldId)
      if (!targetModel || !targetField) continue

      const constraintName = `fk_${model.name}_${field.name}`
      lines.push(
        `  CONSTRAINT ${quoteIdent(constraintName, dialect)} FOREIGN KEY (${quoteIdent(field.name, dialect)}) REFERENCES ${quoteIdent(targetModel.name, dialect)} (${quoteIdent(targetField.name, dialect)})`
      )
    }

    statements.push(
      `CREATE TABLE ${quoteIdent(model.name, dialect)} (\n${lines.join(',\n')}\n);`
    )
  }

  return statements.join('\n\n')
}

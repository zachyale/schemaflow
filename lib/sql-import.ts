import type { Field, Model, Relationship, Schema } from './schema-types'

interface SqlForeignKey {
  sourceTable: string
  sourceColumns: string[]
  targetTable: string
  targetColumns: string[]
}

function stripIdentifierQuotes(input: string): string {
  let value = input.trim()
  if (!value) return value

  const pairs: Array<[string, string]> = [
    ['`', '`'],
    ['"', '"'],
    ['[', ']'],
  ]

  for (const [left, right] of pairs) {
    if (value.startsWith(left) && value.endsWith(right) && value.length >= 2) {
      value = value.slice(1, -1)
      break
    }
  }

  return value
}

function canonicalName(input: string): string {
  return stripIdentifierQuotes(input).trim().toLowerCase()
}

function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote: "'" | '"' | '`' | null = null

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    const prev = input[i - 1]

    if (quote) {
      current += ch
      if (ch === quote && prev !== '\\') {
        quote = null
      }
      continue
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      current += ch
      continue
    }

    if (ch === '(') depth += 1
    if (ch === ')') depth = Math.max(0, depth - 1)

    if (ch === separator && depth === 0) {
      const piece = current.trim()
      if (piece) parts.push(piece)
      current = ''
      continue
    }

    current += ch
  }

  const tail = current.trim()
  if (tail) parts.push(tail)
  return parts
}

function splitSqlStatements(sql: string): string[] {
  return splitTopLevel(sql, ';')
}

function cleanSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
}

function mapSqlType(typeText: string): string {
  const type = typeText.toLowerCase()
  if (type.includes('uuid')) return 'uuid'
  if (type.includes('bigint')) return 'bigint'
  if (type.includes('smallint') || type.includes('int') || type.includes('serial')) return 'integer'
  if (type.includes('numeric') || type.includes('decimal')) return 'decimal'
  if (type.includes('double') || type.includes('real') || type.includes('float')) return 'float'
  if (type.includes('bool')) return 'boolean'
  if (type.includes('timestamptz') || type.includes('timestamp')) return 'timestamp'
  if (type.includes('datetime')) return 'datetime'
  if (type === 'date' || type.startsWith('date ')) return 'date'
  if (type.includes('json')) return 'json'
  if (type.includes('blob') || type.includes('bytea') || type.includes('binary')) return 'blob'
  if (type.includes('text')) return 'text'
  return 'string'
}

function toSafeId(prefix: string, value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${prefix}-${normalized || 'item'}`
}

function findFieldByName(fields: Field[], fieldName: string): Field | undefined {
  const target = canonicalName(fieldName)
  return fields.find((field) => canonicalName(field.name) === target)
}

function extractColumnReferenceList(segment: string): string[] {
  return splitTopLevel(segment, ',').map((item) => stripIdentifierQuotes(item.trim()))
}

function parseForeignKeySegment(segment: string): Omit<SqlForeignKey, 'sourceTable'> | null {
  const fkMatch = segment.match(
    /foreign\s+key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*\(([^)]+)\)/i
  )
  if (!fkMatch) return null

  return {
    sourceColumns: extractColumnReferenceList(fkMatch[1]),
    targetTable: stripIdentifierQuotes(fkMatch[2]),
    targetColumns: extractColumnReferenceList(fkMatch[3]),
  }
}

function parseCreateTable(statement: string): {
  tableName: string
  columns: Field[]
  foreignKeys: SqlForeignKey[]
} | null {
  const createMatch = statement.match(
    /create\s+table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(([\s\S]*)\)\s*$/i
  )
  if (!createMatch) return null

  const rawTableName = stripIdentifierQuotes(createMatch[1])
  const body = createMatch[2].trim()
  const segments = splitTopLevel(body, ',')

  const tablePrimaryKeys = new Set<string>()
  const columns: Field[] = []
  const foreignKeys: SqlForeignKey[] = []

  for (const rawSegment of segments) {
    const segment = rawSegment.trim()
    if (!segment) continue

    const normalized = segment.toLowerCase()

    const tablePkMatch = segment.match(
      /^(?:constraint\s+[^\s]+\s+)?primary\s+key\s*\(([^)]+)\)/i
    )
    if (tablePkMatch) {
      for (const col of extractColumnReferenceList(tablePkMatch[1])) {
        tablePrimaryKeys.add(canonicalName(col))
      }
      continue
    }

    const tableFk = parseForeignKeySegment(segment)
    if (tableFk) {
      foreignKeys.push({ sourceTable: rawTableName, ...tableFk })
      continue
    }

    const colMatch = segment.match(/^([`"\[\]A-Za-z0-9_.-]+)\s+(.+)$/)
    if (!colMatch) continue

    const columnName = stripIdentifierQuotes(colMatch[1])
    const definition = colMatch[2].trim()
    const colTypeTokenMatch = definition.match(/^[A-Za-z0-9_]+(?:\s*\([^)]*\))?/)
    const sqlType = colTypeTokenMatch ? colTypeTokenMatch[0] : definition
    const columnId = toSafeId(toSafeId('field', rawTableName), columnName)

    const field: Field = {
      id: columnId,
      name: columnName,
      type: mapSqlType(sqlType),
      nullable: !/\bnot\s+null\b/i.test(definition),
      primaryKey: /\bprimary\s+key\b/i.test(definition),
      foreignKey: /\breferences\b/i.test(definition),
    }

    const inlineFkMatch = definition.match(/references\s+([^\s(]+)\s*\(([^)]+)\)/i)
    if (inlineFkMatch) {
      foreignKeys.push({
        sourceTable: rawTableName,
        sourceColumns: [columnName],
        targetTable: stripIdentifierQuotes(inlineFkMatch[1]),
        targetColumns: extractColumnReferenceList(inlineFkMatch[2]),
      })
    }

    columns.push(field)
  }

  if (columns.length === 0) return null

  for (const field of columns) {
    if (tablePrimaryKeys.has(canonicalName(field.name))) {
      field.primaryKey = true
      field.nullable = false
    }
  }

  return {
    tableName: rawTableName,
    columns,
    foreignKeys,
  }
}

export function parseSqlSchema(sql: string): { valid: boolean; error?: string; schema?: Schema } {
  const cleaned = cleanSql(sql)
  const statements = splitSqlStatements(cleaned)
  const createStatements = statements
    .map((statement) => statement.trim())
    .filter((statement) => /^create\s+table\b/i.test(statement))

  if (createStatements.length === 0) {
    return { valid: false, error: 'No CREATE TABLE statements found' }
  }

  const parsedTables = createStatements
    .map(parseCreateTable)
    .filter(Boolean) as Array<NonNullable<ReturnType<typeof parseCreateTable>>>

  if (parsedTables.length === 0) {
    return { valid: false, error: 'Could not parse any tables from SQL input' }
  }

  const models: Model[] = parsedTables.map((table, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const modelId = toSafeId('model', table.tableName)
    const displayName = stripIdentifierQuotes(table.tableName.split('.').pop() ?? table.tableName)

    return {
      id: modelId,
      name: displayName || table.tableName,
      position: { x: 100 + col * 350, y: 100 + row * 280 },
      fields: table.columns.map((column) => ({
        ...column,
        id: toSafeId(modelId, column.name),
      })),
    }
  })

  const modelByTableName = new Map<string, Model>()
  parsedTables.forEach((table, index) => {
    const model = models[index]
    modelByTableName.set(canonicalName(table.tableName), model)
    const bare = canonicalName(table.tableName.split('.').pop() ?? table.tableName)
    modelByTableName.set(bare, model)
  })

  const relationships: Relationship[] = []
  let relCounter = 0

  for (const table of parsedTables) {
    const sourceModel =
      modelByTableName.get(canonicalName(table.tableName)) ??
      modelByTableName.get(canonicalName(table.tableName.split('.').pop() ?? table.tableName))
    if (!sourceModel) continue

    for (const fk of table.foreignKeys) {
      const targetModel =
        modelByTableName.get(canonicalName(fk.targetTable)) ??
        modelByTableName.get(canonicalName(fk.targetTable.split('.').pop() ?? fk.targetTable))
      if (!targetModel) continue

      const pairCount = Math.min(fk.sourceColumns.length, fk.targetColumns.length)
      for (let i = 0; i < pairCount; i += 1) {
        const sourceField = findFieldByName(sourceModel.fields, fk.sourceColumns[i])
        const targetField =
          findFieldByName(targetModel.fields, fk.targetColumns[i]) ??
          targetModel.fields.find((field) => field.primaryKey) ??
          targetModel.fields[0]

        if (!sourceField || !targetField) continue

        sourceField.foreignKey = true
        relCounter += 1
        relationships.push({
          id: `rel-${relCounter}`,
          fromModelId: sourceModel.id,
          fromFieldId: sourceField.id,
          toModelId: targetModel.id,
          toFieldId: targetField.id,
          type: 'many-to-one',
        })
      }
    }
  }

  return {
    valid: true,
    schema: {
      models,
      relationships,
    },
  }
}

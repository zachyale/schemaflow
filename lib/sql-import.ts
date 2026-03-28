import NodeSQLParser from 'node-sql-parser'
import type { Field, Model, Relationship, Schema } from './schema-types'

interface SqlForeignKey {
  sourceTable: string
  sourceColumns: string[]
  targetTable: string
  targetColumns: string[]
}

interface ParsedTable {
  tableName: string
  columns: Field[]
  foreignKeys: SqlForeignKey[]
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

function cleanSql(sql: string): string {
  return sql
    .replace(/\/\*![\s\S]*?\*\//g, '')
    .replace(/\/\*M![\s\S]*?\*\//g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
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

function extractCreateTableStatements(sql: string): string[] {
  return splitTopLevel(sql, ';')
    .map((statement) => statement.trim())
    .filter((statement) => /^create\s+table\b/i.test(statement))
}

function normalizeCreateTableStatement(statement: string): string {
  return statement
    // Some dumps include trailing commas before table close.
    .replace(/,\s*\)\s*$/, ')')
}

function mapSqlType(typeText: string): string {
  const type = typeText.toLowerCase()
  if (/tinyint\s*\(\s*1\s*\)/i.test(typeText)) return 'boolean'
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

function readColumnRefName(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null
  const value = node as { column?: unknown; value?: unknown; expr?: { column?: unknown } }
  if (typeof value.column === 'string') return stripIdentifierQuotes(value.column)
  if (typeof value.value === 'string') return stripIdentifierQuotes(value.value)
  if (value.expr && typeof value.expr.column === 'string') {
    return stripIdentifierQuotes(value.expr.column)
  }
  return null
}

function readAstReferenceDefinition(
  sourceTable: string,
  sourceColumns: string[],
  referenceDefinition: unknown
): SqlForeignKey | null {
  if (!referenceDefinition || typeof referenceDefinition !== 'object') return null
  const ref = referenceDefinition as {
    table?: unknown
    definition?: unknown
    columns?: unknown
    reference?: { table?: unknown; definition?: unknown }
  }

  let targetTable: string | null = null
  const tableNode = ref.table ?? ref.reference?.table

  if (typeof tableNode === 'string') {
    targetTable = stripIdentifierQuotes(tableNode)
  } else if (Array.isArray(tableNode) && tableNode.length > 0) {
    const first = tableNode[0] as { table?: unknown }
    if (first && typeof first.table === 'string') {
      targetTable = stripIdentifierQuotes(first.table)
    }
  } else if (tableNode && typeof tableNode === 'object') {
    const single = tableNode as { table?: unknown }
    if (typeof single.table === 'string') {
      targetTable = stripIdentifierQuotes(single.table)
    }
  }

  const targetColumnsNodes =
    (Array.isArray(ref.definition) ? ref.definition : null) ??
    (Array.isArray(ref.columns) ? ref.columns : null) ??
    (Array.isArray(ref.reference?.definition) ? ref.reference?.definition : null) ??
    []

  const targetColumns = targetColumnsNodes
    .map(readColumnRefName)
    .filter(Boolean) as string[]

  if (!targetTable || targetColumns.length === 0) return null

  return {
    sourceTable,
    sourceColumns,
    targetTable,
    targetColumns,
  }
}

function parseCreateTableAst(astNode: unknown): ParsedTable | null {
  if (!astNode || typeof astNode !== 'object') return null
  const create = astNode as {
    type?: string
    keyword?: string
    table?: unknown
    create_definitions?: unknown
  }

  if (create.type !== 'create' || create.keyword !== 'table') return null
  const defs = Array.isArray(create.create_definitions) ? create.create_definitions : []
  if (defs.length === 0) return null

  let rawTableName = ''
  const tableNode = create.table
  if (Array.isArray(tableNode) && tableNode.length > 0) {
    const first = tableNode[0] as { table?: unknown }
    rawTableName = typeof first?.table === 'string' ? stripIdentifierQuotes(first.table) : ''
  } else if (tableNode && typeof tableNode === 'object') {
    const single = tableNode as { table?: unknown }
    rawTableName = typeof single.table === 'string' ? stripIdentifierQuotes(single.table) : ''
  } else if (typeof tableNode === 'string') {
    rawTableName = stripIdentifierQuotes(tableNode)
  }
  if (!rawTableName) return null

  const tablePrimaryKeys = new Set<string>()
  const columns: Field[] = []
  const foreignKeys: SqlForeignKey[] = []

  for (const def of defs) {
    if (!def || typeof def !== 'object') continue
    const item = def as {
      resource?: string
      column?: unknown
      definition?: { dataType?: string; length?: number; scale?: number }
      nullable?: { type?: string }
      primary?: unknown
      reference_definition?: unknown
      constraint_type?: string
    }

    if (item.resource === 'column') {
      const columnName = readColumnRefName(item.column)
      if (!columnName) continue
      const dataType = item.definition?.dataType ?? 'string'
      const typeSuffix =
        item.definition?.length !== undefined
          ? `(${item.definition.length}${item.definition.scale !== undefined ? `,${item.definition.scale}` : ''})`
          : ''
      const sqlType = `${dataType}${typeSuffix}`

      const field: Field = {
        id: toSafeId(toSafeId('field', rawTableName), columnName),
        name: columnName,
        type: mapSqlType(sqlType),
        nullable: item.nullable?.type !== 'not null',
        primaryKey: Boolean(item.primary),
        foreignKey: Boolean(item.reference_definition),
      }

      if (field.primaryKey) {
        field.nullable = false
      }

      if (item.reference_definition) {
        const fk = readAstReferenceDefinition(rawTableName, [columnName], item.reference_definition)
        if (fk) foreignKeys.push(fk)
      }

      columns.push(field)
      continue
    }

    if (item.resource === 'constraint') {
      const constraintType = (item.constraint_type ?? '').toLowerCase()
      const definitionCols = Array.isArray((item as { definition?: unknown }).definition)
        ? ((item as { definition?: unknown[] }).definition ?? [])
            .map(readColumnRefName)
            .filter(Boolean) as string[]
        : []

      if (constraintType === 'primary key') {
        for (const col of definitionCols) tablePrimaryKeys.add(canonicalName(col))
        continue
      }

      if (constraintType === 'foreign key' && item.reference_definition) {
        const fk = readAstReferenceDefinition(rawTableName, definitionCols, item.reference_definition)
        if (fk) foreignKeys.push(fk)
      }
    }
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

function parseSqlWithAst(cleanedSql: string): ParsedTable[] {
  const parser = new (NodeSQLParser as unknown as { Parser: new () => { astify: (sql: string, opt?: { database?: string }) => unknown } }).Parser()
  const createStatements = extractCreateTableStatements(cleanedSql)
  if (createStatements.length === 0) return []
  const dialects = ['MySQL', 'MariaDB', 'Postgresql', 'SQLite', 'TransactSQL'] as const
  const parsedTables: ParsedTable[] = []

  for (const rawStatement of createStatements) {
    const statement = normalizeCreateTableStatement(rawStatement)
    let parsedTable: ParsedTable | null = null

    for (const dialect of dialects) {
      try {
        const ast = parser.astify(statement, { database: dialect })
        const statements = (Array.isArray(ast) ? ast : [ast]) as unknown[]
        parsedTable = statements.map(parseCreateTableAst).find(Boolean) as ParsedTable | null
        if (parsedTable) break
      } catch {
        // Try next dialect.
      }
    }

    if (parsedTable) {
      parsedTables.push(parsedTable)
    }
  }

  return parsedTables
}

function buildSchemaFromParsedTables(parsedTables: ParsedTable[]): Schema {
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
  const relationshipKeys = new Set<string>()
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
        const relKey = `${sourceModel.id}:${sourceField.id}->${targetModel.id}:${targetField.id}`
        if (relationshipKeys.has(relKey)) continue
        relationshipKeys.add(relKey)

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

  return { models, relationships }
}

export function parseSqlSchema(sql: string): { valid: boolean; error?: string; schema?: Schema } {
  const cleaned = cleanSql(sql)
  const parsedTables = parseSqlWithAst(cleaned)

  if (parsedTables.length === 0) {
    return {
      valid: false,
      error: 'Could not parse CREATE TABLE statements with SQL parser',
    }
  }

  return {
    valid: true,
    schema: buildSchemaFromParsedTables(parsedTables),
  }
}

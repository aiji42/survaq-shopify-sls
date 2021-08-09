import * as sql from 'sqlstring'
import { BigQuery } from '@google-cloud/bigquery'

const credentials = JSON.parse(
  process.env.BIGQUERY_CREDENTIALS ??
    '{"client_email":"","private_key":"","project_id":""}'
) as { client_email: string; private_key: string; project_id: '' }

const client = new BigQuery({
  credentials,
  projectId: credentials.project_id
})

export const getLatestUpdatedAt = async (table: string): Promise<string> => {
  const [res] = await client.query({
    query: `select updated_at from shopify.${table}
            order by updated_at desc limit 1;`
  })
  if (res.length < 1) return '2000-01-01T00:00:00.000T'

  const [
    {
      updated_at: { value: latest }
    }
  ] = res
  return latest.replace(/\.000Z$/, '.999Z')
}

export const insertRecords = (
  table: string,
  columns: string[],
  data: Record<string, string | number | boolean>[]
): ReturnType<typeof client.query> => client.query({ query: makeInsertQuery(table, columns, data) })

const makeInsertQuery = (
  table: string,
  columns: string[],
  data: Record<string, string | number | boolean>[]
) => {
  return sql.format(
    `
    INSERT INTO shopify.${table} (${columns.join(',')})
    VALUES ?
    `,
    [data.map((record) => columns.map((col) => record[col]))]
  )
}

export const removeDuplicates = async (table: string): Promise<void> => {
  const [res] = await client.query({
    query: `select id from shopify.${table} group by id having count(id) > 1 limit 1;`
  })
  if (res.length < 1) {
    console.log('Not existing duplicated records: ', table)
    return
  }

  console.log('Existing duplicated records: ', table)
  console.log('Removing duplicated records: ', table)

  await client.query({
    query: makeRemoveDuplicateRecordQuery(table)
  })
}

const makeRemoveDuplicateRecordQuery = (table: string) => {
  return sql.format(
    `
    CREATE TEMPORARY TABLE ${table}_tmp AS
    SELECT * FROM(
      SELECT *, COUNT(id)over (PARTITION BY id ORDER BY id ROWS 3 PRECEDING) as count FROM  shopify.${table}
    ) where count = 1;
    DELETE FROM shopify.${table} where true;
    INSERT INTO shopify.${table} select * EXCEPT(count) FROM ${table}_tmp;
    DROP TABLE ${table}_tmp;
    `
  )
}

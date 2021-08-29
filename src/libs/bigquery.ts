import * as sql from 'sqlstring'
import { BigQuery, SimpleQueryRowsResponse } from '@google-cloud/bigquery'

const credentials = JSON.parse(
  process.env.BIGQUERY_CREDENTIALS ??
    '{"client_email":"","private_key":"","project_id":""}'
) as { client_email: string; private_key: string; project_id: '' }

export const client = new BigQuery({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/bigquery'
  ],
  projectId: credentials.project_id
})

export const getLatestUpdatedAt = async (
  table: string,
  dataset = 'shopify'
): Promise<string> => {
  const [res] = await client.query({
    query: `select updated_at from ${dataset}.${table}
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
  dataset: string,
  columns: string[],
  data: Record<string, string | number | boolean>[]
): Promise<SimpleQueryRowsResponse> =>
  client.query({ query: makeInsertQuery(table, dataset, columns, data) })

const makeInsertQuery = (
  table: string,
  dataset: string,
  columns: string[],
  data: Record<string, string | number | boolean>[]
) => {
  return sql.format(
    `
    INSERT INTO ${dataset}.${table} (${columns.join(',')})
    VALUES ?
    `,
    [data.map((record) => columns.map((col) => record[col]))]
  )
}

export const removeDuplicates = async (
  table: string,
  dataset = 'shopify'
): Promise<void> => {
  const [res] = await client.query({
    query: `select id from ${dataset}.${table} group by id having count(id) > 1 limit 1;`
  })
  if (res.length < 1) {
    console.log('Not existing duplicated records: ', table)
    return
  }

  console.log('Existing duplicated records: ', table)
  console.log('Removing duplicated records: ', table)

  await client.query({
    query: makeRemoveDuplicateRecordQuery(table, dataset)
  })
}

const makeRemoveDuplicateRecordQuery = (table: string, dataset: string) => {
  return sql.format(
    `
    CREATE TEMPORARY TABLE ${dataset}_${table}_tmp AS
    SELECT * FROM(
      SELECT *, COUNT(id)over (PARTITION BY id ORDER BY id ROWS 3 PRECEDING) as count FROM  ${dataset}.${table}
    ) where count = 1;
    DELETE FROM ${dataset}.${table} where true;
    INSERT INTO ${dataset}.${table} select * EXCEPT(count) FROM ${dataset}_${table}_tmp;
    DROP TABLE ${dataset}_${table}_tmp;
    `
  )
}

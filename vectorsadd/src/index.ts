import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

interface CloudflareBindings {
  VECTORIZE: Vectorize;
  AI: Ai;
}

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => {
  return c.json({ code: 200, status: 'healthy' })
})

app.post('/:userId/:semester/:courseId/:filename/:pageNumber', async (c) => {
  const userId = c.req.param('userId')
  const semester = c.req.param('semester')
  const courseId = c.req.param('courseId')
  const filename = c.req.param('filename')
  const pageNumber = c.req.param('pageNumber')
  const { title, text } = await c.req.json()

  const docId = uuidv4()

  const { data } = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {text: text})

  if (!data) {
    return c.json({ error: 'Failed to generate vector embeddings' })
  }

  const inserted = await c.env.VECTORIZE.upsert([
    {
      id: docId,
      values: data[0],
      metadata: {user: userId, semester: semester, course: courseId, filename: filename, pageNumber: pageNumber, title: title}
    }
  ])

  return c.json({ docId, inserted })
})

export default app
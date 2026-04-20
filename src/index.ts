export default {
  async fetch(): Promise<Response> {
    return new Response('item-image-worker', { status: 200 })
  },
}

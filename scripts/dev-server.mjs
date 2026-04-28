import { createServer } from "node:http"
import next from "next"

const dev = true
const hostname = process.env.HOSTNAME || "localhost"
const port = Number(process.env.PORT || 3000)

const app = next({
  dev,
  dir: process.cwd(),
  hostname,
  port,
  customServer: true,
})

const handle = app.getRequestHandler()

await app.prepare()

const upgradeHandler = app.getUpgradeHandler()

const server = createServer(async (req, res) => {
  try {
    await handle(req, res)
  } catch (error) {
    console.error("Erro ao processar requisicao:", error)
    res.statusCode = 500
    res.end("Internal Server Error")
  }
})

server.on("upgrade", async (req, socket, head) => {
  try {
    await upgradeHandler(req, socket, head)
  } catch (error) {
    console.error("Erro no upgrade do dev server:", error)
    socket.destroy()
  }
})

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`)
})

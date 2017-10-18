class EventBag {
  constructor() {
    this.bag = {}
  }

  listenOn(node, event, handler) {
    this.bag[node] = this.bag[node] || []
    this.bag[node].push({ node, event, handler })
    node.addEventListener(event, handler)
  }

  unlistenNode(node) {
    this.bag[node].forEach(({ event, handler }) => {
      node.removeEventListener(event, handler)
    })
  }

  unlistenAll() {
    Object.keys(this.bag).forEach(node => {
      this.unlistenNode(node)
    })
  }
}

class SwarmBoardState {
  constructor(width, height) {
    this.factions = new Int8Array(width * height)
  }
}

class SwarmBoard {
  constructor(width, height) {
    this.width = width
    this.height = height

    this.palette = [
      { r: 0, g: 0, b: 0 }, // black
      { r: 1, g: 1, b: 1 }, // white
      { r: 1, g: 0, b: 0 },
      { r: 0, g: 0, b: 1 },
      { r: 0, g: 1, b: 0 },
      { r: 1, g: 1, b: 0 },
      { r: 0, g: 1, b: 1 },
    ]

    this.world = new SwarmBoardState(this.width, this.height)
  }

  tick(mouse) {
    const getI = (x, y) => x + y * this.width
    const at = (x, y, d) => d[getI(x, y)]

    const ow = this.world
    const w = this.world = new SwarmBoardState(this.width, this.height)

    for (var y = 0; y < this.height; y += 1) {
      for (var x = 0; x < this.width; x += 1) {
        const i = getI(x, y)
        w.factions[i] = ~~(Math.random() * this.palette.length)
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    const imgd = ctx.createImageData(this.width, this.height)
    const data = imgd.data

    for (var i = 0; i < data.length; i += 4) {
      const faction = this.world.factions[i / 4]
      const color = this.palette[faction]

      data[i] = color.r * 255
      data[i + 1] = color.g * 255
      data[i + 2] = color.b * 255
      data[i + 3] = 255
    }

    ctx.putImageData(imgd, 0, 0)
  }
}

class SwarmGame {
  /**
   * @param {HTMLCanvasElement} canvas Game board
   */
  constructor(canvas) {
    this.canvas = canvas
    this.tps = 20
    this.mouse = {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }

    canvas.addEventListener("mousemove", e => {
      this.mouse = { x: e.x, y: e.y }
      this.needsRedraw = true
    })

    this.reset()
  }

  reset() {
    this.board = new SwarmBoard(this.canvas.width, this.canvas.height)
  }

  run() {
    this.runOnce()
  }

  runOnce(ms) {
    this.tickTo(ms)
    this.draw()
    requestAnimationFrame(ms => this.runOnce(ms))
  }

  tickTo(ms) {
    if (ms - this.lastTick > 1000) this.lastTick = ms
    if (ms && !this.lastTick) this.lastTick = ms

    const mspt = 1000 / this.tps // milliseconds per tick
    while (ms > this.lastTick + mspt) {
      this.lastTick += mspt
      this.needsRedraw = true

      this.board.tick(this.mouse)
    }
  }

  draw() {
    if (!this.needsRedraw) return
    this.needsRedraw = false
    const ctx = this.canvas.getContext('2d')

    this.board.draw(ctx)
  }
}

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

class SwarmBoard {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.state = new Int8Array(width * height)
    this.prevState = null
  }
  
  tick() {
    this.prevState = this.state
    this.state = new Int8Array(this.width * this.height)
  }

  /**
   * @param {HTMLCanvasElement} canvas 
   */
  draw(canvas) {
    const ctx = canvas.getContext('2d')
    const imgd = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgd.data

    for (var i = 0; i < data.length; i += 4) {
      data[i] = Math.random() * 255
      data[i + 1] = Math.random() * 255
      data[i + 2] = Math.random() * 255
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
    const mspt = 1000 / this.tps // milliseconds per tick
    if (ms && !this.lastTick) this.lastTick = ms
    while (ms > this.lastTick + mspt) {
      this.lastTick += mspt
      this.needsRedraw = true
      this.board.tick()
    }
  }

  draw() {
    if (!this.needsRedraw) return
    this.needsRedraw = false
    this.board.draw(this.canvas)

    // const ctx = this.canvas.getContext("2d")
  }
}

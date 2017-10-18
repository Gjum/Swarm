let perfResults = {}
let perfStarts = {}

function perfStart(name) {
  perfStarts[name] = performance.now()
}

function perfEnd(name) {
  const perfEnd = performance.now()
  if (!perfResults[name]) perfResults[name] = []
  perfResults[name].push(perfEnd - perfStarts[name])
  delete perfStarts[name]
}

function updatePerf() {
  const names = ['cell.tick', 'cell.tick.lookup', 'cell.tick.calc']

  let txt = names.map(name => {
    const entries = perfResults[name]

    if (!entries || entries.length <= 0)
      return name + ': no data'

    let min = Infinity
    let max = 0
    let avg = 0
    for (var i = 0; i < entries.length; i++) {
      const dt = entries[i] * 1000
      if (min > dt) min = dt
      if (max < dt) max = dt
      avg += dt
    }
    avg /= entries.length

    return `${avg.toFixed(2)} ${name}`
  }).join('\n')

  document.getElementById('perfOut').innerText = txt

  perfResults = {}
}

class SwarmBoardState {
  constructor(width, height) {
    this.factions = new Int8Array(width * height)
    this.pressures = new Int8Array(width * height)
    this.xvels = new Int8Array(width * height)
    this.yvels = new Int8Array(width * height)
  }
}

class SwarmBoard {
  constructor(width, height) {
    this.width = width
    this.height = height

    this.palette = [
      { r: 1, g: 0, b: 1 }, // error: fuchsia
      { r: 0, g: 0, b: 0 }, // empty: black
      { r: 1, g: 1, b: 1 }, // player: white
      { r: 1, g: 0, b: 0 },
      { r: 0, g: 0, b: 1 },
      { r: 0, g: 1, b: 0 },
      { r: 1, g: 1, b: 0 },
      { r: 0, g: 1, b: 1 },
    ]

    this.world = new SwarmBoardState(this.width, this.height)

    // init board with circle of player cells
    for (var y = 0; y < this.height; y += 1) {
      for (var x = 0; x < this.width; x += 1) {
        const i = this.getI(x, y)
        const dx = x - this.width / 2
        const dy = y - this.height / 2
        if (dx * dx + dy * dy < 400) {
          this.world.factions[i] = 2 // player
        } else {
          this.world.factions[i] = 1 // empty
        }
      }
    }
  }

  getI(x, y) {
    return x + y * this.width
  }

  /**
   * @param {Int8Array} d
   * @param {number} x
   * @param {number} y
   */
  at(d, x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      return 0
    return d[x + y * this.width]
  }

  /**
   * cells close to the player, next to its cells, can become player cells
   * cells far from the player can become empty, depending on the number of neighboring player cells
   *
   * @param {{x: number, y: number}} mouse
   */
  tick(mouse) {
    const ow = this.world
    const w = this.world = new SwarmBoardState(this.width, this.height)

    const nextCellState = this.nextCellState.bind(this)
    for (var y = 0; y < this.height; y += 1) {
      for (var x = 0; x < this.width; x += 1) {
        perfStart('cell.tick')
        const i = this.getI(x, y)
        w.factions[i] = nextCellState(ow, x, y, mouse)
        perfEnd('cell.tick')
      }
    }
  }

  /**
   * @param {SwarmBoardState} ow
   * @param {number} x
   * @param {number} y
   * @param {{x: number, y: number}} mouse
   */
  nextCellState(ow, x, y, mouse) {
    const at = this.at.bind(this)

    perfStart('cell.tick.lookup')
    const cellFac = at(ow.factions, x, y)
    const directNeighbors = [
      at(ow.factions, x, y - 1), // N
      at(ow.factions, x - 1, y), // W
      at(ow.factions, x, y + 1), // S
      at(ow.factions, x + 1, y), // E
    ]

    const diagonalNeighbors = [
      at(ow.factions, x - 1, y - 1), // NW
      at(ow.factions, x - 1, y + 1), // SW
      at(ow.factions, x + 1, y + 1), // SE
      at(ow.factions, x + 1, y - 1), // NE
    ]
    perfEnd('cell.tick.lookup')

    perfStart('cell.tick.calc')
    let numNeighbors = 0
    let numSameNeighbors = 0

    for (let i = 0; i < 4; i++) {
      const nf = directNeighbors[i]
      numNeighbors += ~~(nf !== 0)
      numSameNeighbors += ~~(nf === 2)

      const df = diagonalNeighbors[i]
      numNeighbors += ~~(df !== 0) / 2
      numSameNeighbors += ~~(df === 2) / 2
    }
    perfEnd('cell.tick.calc')

    const mdx = mouse.x - x
    const mdy = mouse.y - y
    const md = Math.sqrt(mdx * mdx + mdy * mdy)
    const closeness = Math.pow(64 / md, .2)

    if (cellFac === 1) { // empty
      const convertProb = numSameNeighbors / numNeighbors * closeness
      const convert = Math.random() < convertProb
      return convert ? 2 : 1 // XXX depends on player
    } else { // player cell
      const deathProb = 1 - numSameNeighbors / numNeighbors * closeness
      const die = Math.random() < deathProb
      return die ? 1 : cellFac
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
    this.tps = 10
    this.mouse = {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }

    canvas.addEventListener("mousemove", e => {
      this.mouse = { x: e.offsetX, y: e.offsetY }
    })
    canvas.addEventListener("click", e => {
      this.reset()
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
    if (ms && !this.lastTick) this.lastTick = ms
    if (ms - this.lastTick > 1000) this.lastTick = ms

    const mspt = 1000 / this.tps // milliseconds per tick
    while (ms > this.lastTick + mspt) {
      this.lastTick += mspt
      this.needsRedraw = true

      this.board.tick(this.mouse)
    }
    if (this.needsRedraw) updatePerf()
  }

  draw() {
    if (!this.needsRedraw) return
    this.needsRedraw = false
    const ctx = this.canvas.getContext('2d')

    this.board.draw(ctx)
  }
}

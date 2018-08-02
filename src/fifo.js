/**
 * 先进先出的任务队列
 *
 * @author Y3G
 */

const PENDING = 'Pending'
const WAITTING = 'WaittingPrev'

class FIFO {
  get queue () {
    return this.queue_
  }

  constructor () {
    this.queue_ = []
    this.currId_ = 0
  }

  transform (fn) {
    const self = this
    const id = this.currId_++

    const retFn = async function fifoFn (...params) {
      return new Promise(async (resolve, reject) => {
        let ret

        try {
          ret = await fn.apply(this, params)
        } catch (err) {
          self._handleResult(id, reject.bind(this, err))
          return
        }

        self._handleResult(id, resolve.bind(this, ret))
      })
    }

    retFn.__fifo_id__ = id // for debug
    this.queue.push({ id, status: PENDING })

    return retFn
  }

  _handleResult (id, callback) {
    const { queue } = this
    const index = queue.findIndex(el => el.id === id)

    if (index < 0) {
      throw new Error(`Bad id: ${id}.`)
    }

    const item = queue[index]

    item.status = WAITTING
    item.callback = callback

    this._checkWaitingItems()
  }

  _checkWaitingItems () {
    const { queue } = this

    while (queue.length) {
      const item = queue[0]
      const { status, callback } = item

      if (status === PENDING) {
        break
      } else if (status === WAITTING) {
        callback()
        queue.shift()
      }
    }
  }
}

const fifos = {}

export default function fifo (fn, queueName = '__DEFAULT_FIFO__') {
  let fifo = fifos[queueName]

  if (!fifo) {
    fifo = fifos[queueName] = new FIFO()
  }

  return fifo.transform(fn)
}
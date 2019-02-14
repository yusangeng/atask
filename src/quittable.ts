/**
 * 可中途停止的异步任务
 *
 * @author Y3G
 */

// import { isGeneratorFn } from 'is-generator'

export interface IQuittable<ContextType> {
  quitted: boolean
  readonly context: ContextType
  quit () : void
}

export type QuittableFunc<ContextType, RetType> = (q: IQuittable<ContextType>) => RetType
// type QuittableGeneratorFunc<ContextType, RetType> = (q: IQuittable<ContextType>) => IterableIterator<RetType>

export type QuittableCallable<ContextType, RetType> = QuittableFunc<ContextType, RetType>

type QuittableOptions<ContextType> = {
  context?: ContextType
  name?: symbol | null
}

const { assign } = Object
const namedQuittableMap: any = {}

export type FQUITTED = () => void
export const QUITTED: FQUITTED = () => {}

export class Quittable<ContextType, RetType> implements IQuittable<ContextType> {
  public quitted: boolean = false
  public readonly context: ContextType

  private readonly name: symbol | null
  private readonly fn: QuittableCallable<ContextType, RetType>
  private used: boolean = false

  constructor (fn: QuittableCallable<ContextType, RetType>, options: QuittableOptions<ContextType>) {
    const opt = assign({ context: {}, name: null }, options || {})
    const { context, name } = opt

    this.fn = fn
    this.context = context
    this.name = name
  }

  quit () : void {
    this.quitted = true
  }

  async run () : Promise<FQUITTED | RetType> {
    if (this.used) {
      throw new Error(`Quittable object should NOT be executed repeatly.`)
    }

    this._beforeRun()

    if (this.quitted) {
      return QUITTED
    }

    let ret: RetType

    try {
      ret = await this.fn(this)
    } finally {
      this._afterRun()
    }

    return ret
  }

  private _beforeRun () : void {
    this.used = true
    const { name } = this

    if (name) {
      this._quitPrev()
      namedQuittableMap[name] = this
    }
  }

  private _afterRun () : void {
    const { name } = this

    if (!name) {
      return
    }

    if (namedQuittableMap[name] === this) {
      delete namedQuittableMap[name]
    }
  }

  private _quitPrev () : void {
    const { name } = this

    if (!name) {
      return
    }

    const prev = namedQuittableMap[name]

    if (prev) {
      prev.quit()
      delete namedQuittableMap[name]
    }
  }
}

export function quittable<ContextType, RetType = void> (
  context: ContextType,
  fn: QuittableCallable<ContextType, RetType>) : Quittable<ContextType, RetType> {
  return new Quittable<ContextType, RetType>(fn, {
    name: null,
    context
  })
}

export function namedQuittable<ContextType, RetType = void> (
  name: symbol,
  context: ContextType,
  fn: QuittableCallable<ContextType, RetType>) : Quittable<ContextType, RetType> {
  return new Quittable<ContextType, RetType>(fn, {
    name,
    context
  })
}

export default quittable
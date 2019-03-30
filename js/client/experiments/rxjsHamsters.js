/* global hamsters */
/* eslint-disable no-console */

const firstFewLastFew = (xs, size = 8) => {
  const arr = Array.from(xs)
  const firstFew = arr.slice(0, size)
  const lastFew = arr.slice(-size)
  return `${JSON.stringify(firstFew)}...${JSON.stringify(lastFew)}`
}

hamsters.init()

const buffer = Float32Array.from(R.range(0, 8192))

const hamstersBasic = async numThreads => {
  try {
    const outerParams = {
      array: buffer,
      threads: numThreads,
      aggregate: numThreads > 1,
      dataType: 'Float32'
    }
    const results = await hamsters.promise(outerParams, () => {
      /* eslint-disable no-undef */
      console.log(`[hamstersBasic web worker] params.array.length: ${params.array.length}`)
      rtn.data = params.array.map(n => n * 4)
      /* eslint-enable no-undef */
    })
    const resultsData = numThreads === 1 ? results.data[0] : results.data
    console.log(`[hamstersBasic] values: ${firstFewLastFew(resultsData.values())}`)
  } catch (error) {
    console.log(`[hamstersBasic] error: ${error}`)
  }
}

const rxjsBasic = async () => {
  const { map } = rxjs.operators
  const observable = rxjs.of(buffer)
    .pipe(map(array => array.map(n => n * 4)))
  observable.subscribe(values => console.log(`[rxjsBasic] values: ${firstFewLastFew(values)}`))
}

const hamsterify = (numThreads, functionToRun) => async array => {
  const outerParams = {
    array,
    threads: numThreads,
    aggregate: true,
    dataType: 'Float32'
  }
  const result = await hamsters.promise(outerParams, functionToRun)
  return numThreads === 1 ? result.data[0] : result.data
}

const rxjsWithHamsters = async numThreads => {
  const { flatMap } = rxjs.operators
  const observable = rxjs.of(buffer)
    .pipe(
      flatMap(hamsterify(numThreads, () => {
        /* eslint-disable no-undef */
        console.log(`[rxjsWithHamsters web worker] params.array.length: ${params.array.length}`)
        rtn.data = params.array.map(n => n * 4)
        /* eslint-enable no-undef */
      }))
    )
  observable.subscribe(values => console.log(`[rxjsWithHamsters] values: ${firstFewLastFew(values)}`))
}

// export interface SubscriptionLike extends Unsubscribable {
//   unsubscribe(): void;
//   readonly closed: boolean;
// }
// 
// export interface SchedulerAction<T> extends Subscription {
//   schedule(state?: T, delay?: number): Subscription;
// }
class HamstersAction extends rxjs.Subscription {

  constructor(scheduler, work) {
    super()
    this.scheduler = scheduler
    this.work = work
  }

  schedule(state /*, delay */) {
    // if (this.closed) {
    //   return this;
    // }
    // this.state = state
    this.work(state)
    return this
  }

  execute() {
    try {
      this.work(this.state)
    } catch (error) {
      console.log(`[HamstersAction#execute] error: ${error.message}`)
    }
  }
}

// export interface SchedulerLike {
//   now(): number;
//   schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription;
// }
// class HamstersScheduler extends rxjs.Scheduler {
class HamstersScheduler {

  constructor(numThreads) {
    // super(HamstersAction)
    this.numThreads = numThreads
  }

  now() {
    const result = rxjs.scheduler.now()
    console.log(`[HamstersScheduler#now] result: ${result}`)
    return result
  }

  schedule(work, delay, state) {
    console.log(`[HamstersScheduler#schedule]`)
    console.log(work)
    // console.dir(delay)
    console.dir(state)
    return new HamstersAction(this, work).schedule(state, delay);
  }
}

const rxjsWithHamstersScheduler = async numThreads => {
  const { map, observeOn } = rxjs.operators
  // TODO: const scheduler = new HamstersScheduler(numThreads)
  // https://stackoverflow.com/questions/30917363/creating-a-simple-scheduler
  // https://coderanch.com/t/682927/languages/RxJS-Action-custom-RxJS-scheduler
  // const scheduler = rxjs.asyncScheduler
  const scheduler = new HamstersScheduler(numThreads)
  const observable = rxjs.of(buffer)
    .pipe(
      observeOn(scheduler),
      map(array => array.map(n => n * 4))
      // how to reinstate the default scheduler ?
    )
  observable.subscribe(values => console.log(`[rxjsWithHamstersScheduler] values: ${firstFewLastFew(values)}`))
}

const main = async () => {
  const numThreads = hamsters.maxThreads
  // await hamstersBasic(numThreads)
  // await rxjsBasic()
  // await rxjsWithHamsters(numThreads)
  await rxjsWithHamstersScheduler(numThreads)
}

main()

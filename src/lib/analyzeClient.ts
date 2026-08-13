import type { EngineEval } from '@/lib/analysis/types'
import type { WorkerRequest, WorkerResponse } from '@/workers/analyze.worker'

let worker: Worker | null = null

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/analyze.worker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return worker
}

export function getAnalyzeWorker() {
  return getWorker()
}

export function evaluateFen(fen: string, movetime = 150): Promise<EngineEval> {
  const id = crypto.randomUUID()
  const w = getWorker()
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data
      if (data.type === 'evalResult' && data.id === id) {
        w.removeEventListener('message', onMessage)
        resolve(data.result)
      }
      if (data.type === 'error') {
        w.removeEventListener('message', onMessage)
        reject(new Error(data.message))
      }
    }
    w.addEventListener('message', onMessage)
    const request: WorkerRequest = { type: 'eval', id, fen, movetime }
    w.postMessage(request)
  })
}

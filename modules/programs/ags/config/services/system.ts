import { readFileAsync } from "ags/file"
import { createPoll } from "ags/time"
import { cpuSample, cpuUsage, memoryUsed } from "./parsers"

export function createSystemStats() {
  let previous: ReturnType<typeof cpuSample> | undefined
  return {
    cpu: createPoll(0, 10000, async (last) => {
      try {
        const current = cpuSample(await readFileAsync("/proc/stat"))
        const usage = previous ? cpuUsage(previous, current) : 0
        previous = current
        return usage
      } catch (error) {
        console.error("CPU:", error)
        return last
      }
    }),
    memory: createPoll(0, 3000, async (last) => {
      try {
        return memoryUsed(await readFileAsync("/proc/meminfo"))
      } catch (error) {
        console.error("Memory:", error)
        return last
      }
    }),
  }
}

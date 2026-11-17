import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { useClassEvents } from './use-class-events'

class FakeEventSource extends EventTarget {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: FakeEventSource[] = []

  readyState = FakeEventSource.CONNECTING
  closed = false

  constructor(readonly url: string) {
    super()
    FakeEventSource.instances.push(this)
  }

  open() {
    this.readyState = FakeEventSource.OPEN
    this.dispatchEvent(new Event('open'))
  }

  receive(data: string) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }

  fail(readyState: number) {
    this.readyState = readyState
    this.dispatchEvent(new Event('error'))
  }

  close() {
    this.closed = true
    this.readyState = FakeEventSource.CLOSED
  }
}

const latestSource = () => FakeEventSource.instances.at(-1)!

beforeEach(() => {
  FakeEventSource.instances = []
  vi.useFakeTimers()
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useClassEvents', () => {
  test('listens to the stream of the class', () => {
    renderHook(() => useClassEvents('class-1', vi.fn()))

    expect(latestSource().url).toBe('/api/turmas/class-1/eventos')
  })

  test('passes on the known event types and ignores anything else', () => {
    const onEvent = vi.fn()
    renderHook(() => useClassEvents('class-1', onEvent))

    act(() => {
      latestSource().open()
      latestSource().receive('{"type":"ledger"}')
      latestSource().receive('{"type":"unknown"}')
      latestSource().receive('not json')
    })

    expect(onEvent.mock.calls).toEqual([['ledger']])
  })

  test('asks for a resync when the browser reconnects', () => {
    const onEvent = vi.fn()
    renderHook(() => useClassEvents('class-1', onEvent))

    act(() => {
      latestSource().open()
      latestSource().fail(FakeEventSource.CONNECTING)
      latestSource().open()
    })

    expect(FakeEventSource.instances).toHaveLength(1)
    expect(onEvent.mock.calls).toEqual([['resync']])
  })

  test('opens a new stream with a growing delay when the browser gives up', () => {
    const onEvent = vi.fn()
    renderHook(() => useClassEvents('class-1', onEvent))

    act(() => latestSource().fail(FakeEventSource.CLOSED))
    act(() => vi.advanceTimersByTime(999))
    expect(FakeEventSource.instances).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(FakeEventSource.instances).toHaveLength(2)

    act(() => latestSource().fail(FakeEventSource.CLOSED))
    act(() => vi.advanceTimersByTime(1999))
    expect(FakeEventSource.instances).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1))
    expect(FakeEventSource.instances).toHaveLength(3)

    // The first connection never opened, so this one isn't a reconnection
    act(() => latestSource().open())
    expect(onEvent).not.toHaveBeenCalled()
  })

  test('closes the stream and cancels a pending retry on unmount', () => {
    const { unmount } = renderHook(() => useClassEvents('class-1', vi.fn()))
    act(() => latestSource().fail(FakeEventSource.CLOSED))

    unmount()
    act(() => vi.advanceTimersByTime(60_000))

    expect(FakeEventSource.instances).toHaveLength(1)
    expect(latestSource().closed).toBe(true)
  })
})

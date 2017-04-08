// @flow
import { withIterable } from '@/core/stream'

test('finishes at last character', () => {
  const sInput = 'abc'
  const step1 = withIterable(sInput)
  expect(step1.done).toBeFalsy()

  const step2 = step1.shiftForward()
  expect(step2.done).toBeFalsy()

  const step3 = step2.shiftForward()
  expect(step3.done).toBeFalsy()

  const step4 = step3.shiftForward()
  expect(step4.done).toBeTruthy()
})


test('non destructive updates', () => {
  const sInput = 'abc'
  const stream = withIterable(sInput)
  const a = stream.shiftForward().shiftForward()
  const b = stream.shiftForward().shiftForward()
  expect(a).toEqual(b)
})
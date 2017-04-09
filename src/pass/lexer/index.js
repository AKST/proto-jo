// @flow
import type { Stream } from '@/data/stream'
import type Token from '@/data/lex-token'
import type { StateProcess } from '@/pass/lexer/state'

import { withIterable } from '@/data/stream'
import * as tokens from '@/data/lex-token'
import { init } from '@/util/data'
import * as error from '@/pass/lexer/error'
import State from '@/pass/lexer/state'

/**
 * Makes a piece of state that can be consumed
 * functions exported by this module.
 */
export function initialState (): State {
  return State.create(withIterable(''), branchInit)
}

/**
 * Main entry point of the module, basically consumes the input from
 * the stream, until it reaches the end of the stream.
 *
 * @param input - A stream of strings.
 */
export function tokenStream (input: AsyncIterable<string>): AsyncIterable<Token> {
  return asyncLoop(initialState(), input)
}

async function* asyncLoop (state: State, iterator: AsyncIterable<string>): AsyncIterable<Token> {
  // $FlowTodo
  const { done, value } = await iterator.next()

  if (! done && value == null) {
    throw new error.EmptyInputError()
  }
  else if (! done) {
    const stream = withIterable(value)
    // $FlowTodo
    const update = yield * withState(state, stream)
    yield * asyncLoop(update, iterator)
  }
}

/**
 * Takes a stream and feed additional input into it.
 *
 * @param state - A stream of characters.
 *
 * @param stream - An optional parameter for taking left over state
 * for additional input.
 *
 * @returns An iterator that will yields lexical tokens for the
 * provided input, but all also return the state left over by
 * the iterator, which can be passed back into this function for
 * additional input.
 */
export function withState (state: State, stream: Stream<string>): StateProcess {
  return loop(state.addInput(stream))
}

///////////////////////////////////////////////////////////

function* loop (state: State): StateProcess {
  const current = state.current
  if (current.kind === 'just') {
    const update = yield * state.withBranch(current.value)
    return yield * loop(update)
  }
  else {
    return state
  }
}

///////////////////////////////////////////////////////////

function* branchInit (character: string, state: State): StateProcess {
  if (isWhitespace(character)) {
    return state.setBranch(branchWS)
  }
  else if (isAlpha(character)) {
    return state.shiftForward()
      .setBranch(branchId)
  }
  else if (character === '"') {
    return state.shiftForward()
      .dropBuffer()
      .setBranch(branchString)
  }
  else if (character === ')') {
    const shifted = state.shiftForward()
    const location = shifted.location
    yield init(tokens.RParenLexicon, location)
    return shifted.dropBuffer()
  }
  else if (character === '(') {
    const shifted = state.shiftForward()
    const location = shifted.location
    yield init(tokens.LParenLexicon, location)
    return shifted.dropBuffer()
  }
  else {
    throw new error.UnexpectedChar(character)
  }
}

function* branchId (character: string, state: State): StateProcess {
  if (isIdChar(character)) {
    return state.shiftForward()
  }
  else {
    const repr = state.enqueued
    const location = state.location
    yield init(tokens.IdentifierLexicon, repr, location)
    return state.dropBuffer().setBranch(branchInit)
  }
}

function* branchString (character: string, state: State): StateProcess {
  if (character !== '"') {
    return state.shiftForward()
  }
  else {
    const content = state.enqueued
    const shifted = state.shiftForward()
    const location = shifted.location
    yield init(tokens.StringLexicon, content, location)
    return shifted.dropBuffer().setBranch(branchInit)
  }
}

function* branchWS (character: string, state: State): StateProcess {
  if (isWhitespace(character)) {
    return state.shiftForward()
  }
  else {
    const nchars = state.enqueued.length
    const lchars = state.location
    yield init(tokens.WhiteSpaceLexicon, nchars, lchars)
    return state.dropBuffer().setBranch(branchInit)
  }
}

///////////////////////////////////////////////////////////

function isAlpha (character: string): boolean {
  return !! character.match(/^[a-zA-Z]$/)
}

function isIdChar (character: string): boolean {
  return !! character.match(/^[a-zA-Z0-9-]$/)
}

function isWhitespace (character: string): boolean {
  return !! character.match(/(\s|\n|\t)/)
}

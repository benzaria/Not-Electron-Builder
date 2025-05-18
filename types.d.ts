import '@total-typescript/ts-reset'
import { } from 'type-fest'

declare const no_value: unique symbol

declare global {
    //* global vars
    const __dirname: string
    const __filename: string

    //* global types
    type __no_value__ = Obfuscate<typeof no_value>
    type $eqH<K> = <T>() => T extends K ? 1 : 2
    type $eq<A, B> = $eqH<A> extends $eqH<B> ? true : false

    type AnyKey<T> = LooseUnion<keyof T, string>
    type Prettify<T> = { [K in keyof T]: T[K] } & {}
    type Obfuscate<T> = T & Prettify<Record<never, 0>>
    type LooseUnion<T, O> = T | (O & Dictionary<never, 0>)
    type MutateProps<T, O> = Prettify<Omit<T, keyof O> & O>
    type Except<T, K extends AnyKey<T>> = Prettify<Omit<T, K>>
    type Dictionary<K = unknown, T = __no_value__> = Prettify<
        $eq<T, __no_value__> extends true
        ? Record<string, K>
        : Record<K, T>
    >

    //! Error vars

    //? Dev vars
    const DEV: boolean
    const CJS: boolean
    const ESM: boolean
    const PROD: boolean
    const TEST: boolean
    const FORMAT: 'cjs' | 'esm'
}

export { }

// tslint:disable-next-line:no-reference
/// <reference path="../node_modules/assemblyscript/index.d.ts" />

import { precompBase } from './precomp';

const RELEASE: bool = true;

type aisize = i32;

export const U8ARRAY_ID = idof<Uint8Array>();

// Helpers

@inline function setU8(t: Uint8Array, s: Uint8Array, o: isize = 0): void {
    memory.copy(t.dataStart + o, s.dataStart, s.length);
}

function load64_be(x: Uint8Array, offset: isize): u64 {
    return bswap(load<u64>(changetype<usize>(x.buffer) + offset));
}

function store64_be(x: Uint8Array, offset: isize, u: u64): void {
    store<u64>(changetype<usize>(x.buffer) + offset, bswap(u));
}

function load32_be(x: Uint8Array, offset: isize): u32 {
    return bswap(load<u32>(changetype<usize>(x.buffer) + offset));
}

function store32_be(x: Uint8Array, offset: isize, u: u32): void {
    store<u32>(changetype<usize>(x.buffer) + offset, bswap(u));
}

// SHA256

class Sha256 {
    @inline static Sigma0(x: u32): u32 {
        return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
    }

    @inline static Sigma1(x: u32): u32 {
        return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
    }

    @inline static sigma0(x: u32): u32 {
        return rotr(x, 7) ^ rotr(x, 18) ^ (x >> 3);
    }

    @inline static sigma1(x: u32): u32 {
        return rotr(x, 17) ^ rotr(x, 19) ^ (x >> 10);
    }

    @inline static Ch(x: u32, y: u32, z: u32): u32 {
        return z ^ (x & (y ^ z));
    }

    @inline static Maj(x: u32, y: u32, z: u32): u32 {
        return (x & (y ^ z)) ^ (y & z);
    }

    static expand(w: StaticArray<u32>): void {
        for (let i = 0; i < 16; i++) {
            unchecked(w[i] += w[(i + 9) & 15] + Sha256.sigma1(w[(i + 14) & 15]) + Sha256.sigma0(w[(i + 1) & 15]));
        }
    }

    static handle(r: StaticArray<u32>, w: StaticArray<u32>, c: u32[]): void {
        for (let i = 0; i < 16; i++) {
            var x = (r[7 & (7 - i)] + w[i] + c[i]);
            x += unchecked(Sha256.Sigma1(r[7 & (4 - i)]));
            x += unchecked(Sha256.Ch(r[7 & (4 - i)], r[7 & (5 - i)], r[7 & (6 - i)]));
            unchecked(r[7 & (3 - i)] += x);
            x += unchecked(Sha256.Sigma0(r[7 & (0 - i)]));
            x += unchecked(Sha256.Maj(r[7 & (0 - i)], r[7 & (1 - i)], r[7 & (2 - i)]));
            unchecked(r[7 & (7 - i)] = x);
        }
    }

    static K: u32[] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    static _hashblocks(st: Uint8Array, m: Uint8Array, n_: isize): isize {
        let z = new StaticArray<u32>(8),
            r = new StaticArray<u32>(8),
            w = new StaticArray<u32>(16);
        for (let i = 0; i < 8; ++i) {
            unchecked(z[i] = r[i] = load32_be(st, i << 2));
        }
        let pos = 0, n = n_;
        while (n >= 64) {
            for (let i = 0; i < 16; ++i) {
                w[i] = load32_be(m, (i << 2) + pos);
            }
            Sha256.handle(r, w, Sha256.K.slice(0));
            Sha256.expand(w);
            Sha256.handle(r, w, Sha256.K.slice(16));
            Sha256.expand(w);
            Sha256.handle(r, w, Sha256.K.slice(32));
            Sha256.expand(w);
            Sha256.handle(r, w, Sha256.K.slice(48));
            for (let i = 0; i < 8; ++i) {
                let x = unchecked(r[i] + z[i]);
                unchecked(z[i] = x);
                unchecked(r[i] = x);
            }
            pos += 64;
            n -= 64;
        }
        for (let i = 0; i < 8; ++i) {
            store32_be(st, i << 2, unchecked(z[i]));
        }
        return n;
    }

    static iv: u8[] = [
        0x6a, 0x09, 0xe6, 0x67, 0xbb, 0x67, 0xae, 0x85, 0x3c, 0x6e, 0xf3, 0x72, 0xa5, 0x4f, 0xf5, 0x3a,
        0x51, 0x0e, 0x52, 0x7f, 0x9b, 0x05, 0x68, 0x8c, 0x1f, 0x83, 0xd9, 0xab, 0x5b, 0xe0, 0xcd, 0x19,
    ];

    static _hashInit(): Uint8Array {
        let st = new Uint8Array(32 + 64 + 8 * 2);

        for (let i = 0; i < 32; ++i) {
            st[i] = Sha256.iv[i];
        }
        return st;
    }

    static _hashUpdate(st: Uint8Array, m: Uint8Array, n: isize, r: isize): isize {
        let obuffered = st.subarray(32);
        let buffered = new Uint8Array(64);
        setU8(buffered, obuffered.subarray(0, 64)); // extra copy to work around compiler bugs

        let still_available_in_buffer = <isize>64 - r;
        let copiable_to_buffer = min(n, still_available_in_buffer);
        setU8(buffered, m.subarray(0, <aisize>copiable_to_buffer), r);
        r += copiable_to_buffer;
        n -= copiable_to_buffer;
        let pos: isize = 0;
        if (r === 64) {
            Sha256._hashblocks(st, buffered, 64);
            r = 0;
            pos = copiable_to_buffer;
        }
        if (n == 0) {
            setU8(obuffered, buffered);
            return r;
        }
        let left = m.subarray(<aisize>pos);
        r = Sha256._hashblocks(st, left, left.length);
        if (r > 0) {
            setU8(obuffered, left.subarray(left.length - <aisize>r));
        }
        return r;
    }

    static _hashFinal(st: Uint8Array, out: Uint8Array, t: isize, r: isize): void {
        let buffered = st.subarray(32);
        let padded = new Uint8Array(128);
        setU8(padded, buffered.subarray(0, <aisize>r));
        padded[<aisize>r] = 0x80;
        if (r < 56) {
            store64_be(padded, 64 - 8, t << 3);
            Sha256._hashblocks(st, padded, 64);
        } else {
            store64_be(padded, 128 - 8, t << 3);
            Sha256._hashblocks(st, padded, 128);
        }
        for (let i = 0; i < 32; ++i) {
            out[i] = st[i];
        }
    }

    static _hash(out: Uint8Array, m: Uint8Array, n: isize): void {
        let st = Sha256._hashInit();
        let r = Sha256._hashUpdate(st, m, n, 0);

        Sha256._hashFinal(st, out, n, r);
    }

    // HMAC

    static _hmac(m: Uint8Array, k: Uint8Array): Uint8Array {
        if (k.length > 64) {
            k = hash(k);
        }
        let b = new Uint8Array(64);
        setU8(b, k);
        for (let i = 0; i < b.length; ++i) {
            b[i] ^= 0x36;
        }
        let out = new Uint8Array(32);
        let st = Sha256._hashInit();
        let r = Sha256._hashUpdate(st, b, b.length, 0);
        r = Sha256._hashUpdate(st, m, m.length, r);
        Sha256._hashFinal(st, out, b.length + m.length, r);
        for (let i = 0; i < b.length; ++i) {
            b[i] ^= 0x6a;
        }
        st = Sha256._hashInit();
        r = Sha256._hashUpdate(st, b, b.length, 0);
        r = Sha256._hashUpdate(st, out, out.length, r);
        Sha256._hashFinal(st, out, b.length + out.length, r);
        return out;
    }
}

// SHA512

class Sha512 {
    @inline static Sigma0(x: u64): u64 {
        return rotr(x, 28) ^ rotr(x, 34) ^ rotr(x, 39);
    }

    @inline static Sigma1(x: u64): u64 {
        return rotr(x, 14) ^ rotr(x, 18) ^ rotr(x, 41);
    }

    @inline static sigma0(x: u64): u64 {
        return rotr(x, 1) ^ rotr(x, 8) ^ (x >> 7);
    }

    @inline static sigma1(x: u64): u64 {
        return rotr(x, 19) ^ rotr(x, 61) ^ (x >> 6);
    }

    @inline static Ch(x: u64, y: u64, z: u64): u64 {
        return z ^ (x & (y ^ z));
    }

    @inline static Maj(x: u64, y: u64, z: u64): u64 {
        return (x & (y ^ z)) ^ (y & z);
    }

    static expand(w: StaticArray<u64>): void {
        for (let i = 0; i < 16; i++) {
            unchecked(w[i] += w[(i + 9) & 15] + Sha512.sigma1(w[(i + 14) & 15]) + Sha512.sigma0(w[(i + 1) & 15]));
        }
    }

    static handle(r: StaticArray<u64>, w: StaticArray<u64>, c: u64[]): void {
        for (let i = 0; i < 16; i++) {
            var x = unchecked(r[7 & (7 - i)] + w[i] + c[i]);
            x += unchecked(Sha512.Sigma1(r[7 & (4 - i)]));
            x += unchecked(Sha512.Ch(r[7 & (4 - i)], r[7 & (5 - i)], r[7 & (6 - i)]));
            unchecked(r[7 & (3 - i)] += x);
            x += unchecked(Sha512.Sigma0(r[7 & (0 - i)]));
            x += unchecked(Sha512.Maj(r[7 & (0 - i)], r[7 & (1 - i)], r[7 & (2 - i)]));
            unchecked(r[7 & (7 - i)] = x);
        }
    }

    static K: u64[] = [
        0x428a2f98d728ae22, 0x7137449123ef65cd, 0xb5c0fbcfec4d3b2f, 0xe9b5dba58189dbbc,
        0x3956c25bf348b538, 0x59f111f1b605d019, 0x923f82a4af194f9b, 0xab1c5ed5da6d8118,
        0xd807aa98a3030242, 0x12835b0145706fbe, 0x243185be4ee4b28c, 0x550c7dc3d5ffb4e2,
        0x72be5d74f27b896f, 0x80deb1fe3b1696b1, 0x9bdc06a725c71235, 0xc19bf174cf692694,
        0xe49b69c19ef14ad2, 0xefbe4786384f25e3, 0x0fc19dc68b8cd5b5, 0x240ca1cc77ac9c65,
        0x2de92c6f592b0275, 0x4a7484aa6ea6e483, 0x5cb0a9dcbd41fbd4, 0x76f988da831153b5,
        0x983e5152ee66dfab, 0xa831c66d2db43210, 0xb00327c898fb213f, 0xbf597fc7beef0ee4,
        0xc6e00bf33da88fc2, 0xd5a79147930aa725, 0x06ca6351e003826f, 0x142929670a0e6e70,
        0x27b70a8546d22ffc, 0x2e1b21385c26c926, 0x4d2c6dfc5ac42aed, 0x53380d139d95b3df,
        0x650a73548baf63de, 0x766a0abb3c77b2a8, 0x81c2c92e47edaee6, 0x92722c851482353b,
        0xa2bfe8a14cf10364, 0xa81a664bbc423001, 0xc24b8b70d0f89791, 0xc76c51a30654be30,
        0xd192e819d6ef5218, 0xd69906245565a910, 0xf40e35855771202a, 0x106aa07032bbd1b8,
        0x19a4c116b8d2d0c8, 0x1e376c085141ab53, 0x2748774cdf8eeb99, 0x34b0bcb5e19b48a8,
        0x391c0cb3c5c95a63, 0x4ed8aa4ae3418acb, 0x5b9cca4f7763e373, 0x682e6ff3d6b2b8a3,
        0x748f82ee5defb2fc, 0x78a5636f43172f60, 0x84c87814a1f0ab72, 0x8cc702081a6439ec,
        0x90befffa23631e28, 0xa4506cebde82bde9, 0xbef9a3f7b2c67915, 0xc67178f2e372532b,
        0xca273eceea26619c, 0xd186b8c721c0c207, 0xeada7dd6cde0eb1e, 0xf57d4f7fee6ed178,
        0x06f067aa72176fba, 0x0a637dc5a2c898a6, 0x113f9804bef90dae, 0x1b710b35131c471b,
        0x28db77f523047d84, 0x32caab7b40c72493, 0x3c9ebe0a15c9bebc, 0x431d67c49c100d4c,
        0x4cc5d4becb3e42b6, 0x597f299cfc657e2a, 0x5fcb6fab3ad6faec, 0x6c44198c4a475817,
    ];

    static _hashblocks(st: Uint8Array, m: Uint8Array, n_: isize): isize {
        let z = new StaticArray<u64>(8),
            r = new StaticArray<u64>(8),
            w = new StaticArray<u64>(16);
        for (let i = 0; i < 8; ++i) {
            z[i] = load64_be(st, i << 3);
            r[i] = z[i];
        }
        let pos = 0, n = n_;
        while (n >= 128) {
            for (let i = 0; i < 16; ++i) {
                w[i] = load64_be(m, (i << 3) + pos);
            }
            Sha512.handle(r, w, Sha512.K.slice(0));
            Sha512.expand(w);
            Sha512.handle(r, w, Sha512.K.slice(16));
            Sha512.expand(w);
            Sha512.handle(r, w, Sha512.K.slice(32));
            Sha512.expand(w);
            Sha512.handle(r, w, Sha512.K.slice(48));
            Sha512.expand(w);
            Sha512.handle(r, w, Sha512.K.slice(64));
            for (let i = 0; i < 8; ++i) {
                let x = r[i] + z[i];
                z[i] = x;
                r[i] = x;
            }
            pos += 128;
            n -= 128;
        }
        for (let i = 0; i < 8; ++i) {
            store64_be(st, i << 3, z[i]);
        }
        return n;
    }

    static iv: u8[] = [
        0x6a, 0x09, 0xe6, 0x67, 0xf3, 0xbc, 0xc9, 0x08, 0xbb, 0x67, 0xae, 0x85, 0x84, 0xca, 0xa7, 0x3b,
        0x3c, 0x6e, 0xf3, 0x72, 0xfe, 0x94, 0xf8, 0x2b, 0xa5, 0x4f, 0xf5, 0x3a, 0x5f, 0x1d, 0x36, 0xf1,
        0x51, 0x0e, 0x52, 0x7f, 0xad, 0xe6, 0x82, 0xd1, 0x9b, 0x05, 0x68, 0x8c, 0x2b, 0x3e, 0x6c, 0x1f,
        0x1f, 0x83, 0xd9, 0xab, 0xfb, 0x41, 0xbd, 0x6b, 0x5b, 0xe0, 0xcd, 0x19, 0x13, 0x7e, 0x21, 0x79,
    ];

    static _hashInit(): Uint8Array {
        let st = new Uint8Array(64 + 128 + 8 * 2);

        for (let i = 0; i < 64; ++i) {
            st[i] = Sha512.iv[i];
        }
        return st;
    }

    static _hashUpdate(st: Uint8Array, m: Uint8Array, n: isize, r: isize): isize {
        let obuffered = st.subarray(64);
        let buffered = new Uint8Array(128);
        setU8(buffered, obuffered.subarray(0, 128)); // extra copy work around compiler bugs

        let still_available_in_buffer = <isize>128 - r;
        let copiable_to_buffer = min(n, still_available_in_buffer);
        setU8(buffered, m.subarray(0, <aisize>copiable_to_buffer), r);
        r += copiable_to_buffer;
        n -= copiable_to_buffer;
        let pos: isize = 0;
        if (r === 128) {
            Sha512._hashblocks(st, buffered, 128);
            r = 0;
            pos = copiable_to_buffer;
        }
        if (n == 0) {
            setU8(obuffered, buffered);
            return r;
        }
        let left = m.subarray(<aisize>pos);
        r = Sha512._hashblocks(st, left, left.length);
        if (r > 0) {
            setU8(obuffered, left.subarray(left.length - <aisize>r));
        }
        return r;
    }

    static _hashFinal(st: Uint8Array, out: Uint8Array, t: isize, r: isize): void {
        let buffered = st.subarray(64);
        let padded = new Uint8Array(256);
        setU8(padded, buffered.subarray(0, <aisize>r));
        padded[<aisize>r] = 0x80;
        if (r < 112) {
            store64_be(padded, 128 - 8, t << 3);
            Sha512._hashblocks(st, padded, 128);
        } else {
            store64_be(padded, 256 - 8, t << 3);
            Sha512._hashblocks(st, padded, 256);
        }
        for (let i = 0; i < 64; ++i) {
            out[i] = st[i];
        }
    }

    static _hash(out: Uint8Array, m: Uint8Array, n: isize): void {
        let st = Sha512._hashInit();
        let r = Sha512._hashUpdate(st, m, n, 0);
        Sha512._hashFinal(st, out, n, r);
    }

    // HMAC

    static _hmac(m: Uint8Array, k: Uint8Array): Uint8Array {
        if (k.length > 128) {
            k = hash(k);
        }
        let b = new Uint8Array(128);
        setU8(b, k);
        for (let i = 0; i < b.length; ++i) {
            b[i] ^= 0x36;
        }
        let out = new Uint8Array(64);
        let st = Sha512._hashInit();
        let r = Sha512._hashUpdate(st, b, b.length, 0);
        r = Sha512._hashUpdate(st, m, m.length, r);
        Sha512._hashFinal(st, out, b.length + m.length, r);
        for (let i = 0; i < b.length; ++i) {
            b[i] ^= 0x6a;
        }
        st = Sha512._hashInit();
        r = Sha512._hashUpdate(st, b, b.length, 0);
        r = Sha512._hashUpdate(st, out, out.length, r);
        Sha512._hashFinal(st, out, b.length + out.length, r);
        return out;
    }
}

// helpers

function verify32(x: Uint8Array, y: Uint8Array): bool {
    let d: u8 = 0;

    for (let i = 0; i < 32; ++i) {
        d |= x[i] ^ y[i];
    }
    return d === 0;
}

function allZeros(x: Uint8Array): bool {
    let len = x.length;
    let c: u8 = 0;
    for (let i = 0; i < len; ++i) {
        c |= x[i];
    }
    return c === 0;
}

// mod(2^252 + 27742317777372353535851937790883648495) field arithmetic

type Scalar = StaticArray<i64>(64);
type ScalarPacked = Uint8Array(32);
type ScalarDouble = Uint8Array(64);

@inline function newScalar(): Scalar {
    return new StaticArray<i64>(64);
}

@inline function newScalarPacked(): ScalarPacked {
    return new Uint8Array(32);
}

@inline function newScalarDouble(): ScalarDouble {
    return new Uint8Array(64);
}

let _L: StaticArray<i64> = new StaticArray<i64>(32);
_L[0] = 237;
_L[1] = 211;
_L[2] = 245;
_L[3] = 92;
_L[4] = 26;
_L[5] = 99;
_L[6] = 18;
_L[7] = 88;
_L[8] = 214;
_L[9] = 156;
_L[10] = 247;
_L[11] = 162;
_L[12] = 222;
_L[13] = 249;
_L[14] = 222;
_L[15] = 20;
_L[31] = 16;

function scIsLtL(s: ScalarPacked): bool {
    let c: u8 = 0, n: u8 = 1, i = 32;

    if ((unchecked(s[31]) & 0xf0) === 0) {
        return true;
    }
    do {
        i--;
        let l = unchecked(_L[i]) as u8;
        let si = unchecked(s[i]);
        c |= ((si - l) >> 8) & n;
        n &= ((si ^ l) - 1) >> 8;
    } while (i !== 0);

    return c === 0;
}

function scModL(r: ScalarPacked, x: Scalar): void {
    let carry: i64;

    for (let i = 63; i >= 32; --i) {
        carry = 0;
        let k = i - 12;
        let xi = x[i];
        for (let j = i - 32; j < k; ++j) {
            let xj = unchecked(x[j] + carry - 16 * xi * _L[j - (i - 32)]);
            carry = (xj + 128) >> 8;
            x[j] = xj - carry * 256;
        }
        x[k] += carry;
        x[i] = 0;
    }
    carry = 0;
    for (let j = 0; j < 32; ++j) {
        let xj = unchecked(x[j] + carry - (x[31] >> 4) * _L[j]);
        carry = xj >> 8;
        x[j] = xj & 255;
    }
    for (let j = 0; j < 32; ++j) {
        x[j] -= unchecked(carry * _L[j]);
    }
    for (let i = 0; i < 32; ++i) {
        let xi = unchecked(x[i]);
        x[i + 1] += xi >> 8;
        r[i] = xi as u8;
    }
}

function scReduce(r: ScalarDouble): void {
    let x = newScalar();

    for (let i = 0; i < 64; ++i) {
        x[i] = r[i];
        r[i] = 0;
    }
    scModL(r, x);
}

function scCarry(a: Scalar): void {
    let carry: i64 = 0;
    for (let i = 0; i < 64; ++i) {
        let c = a[i] + carry;
        a[i] = c & 0xff;
        carry = (c >>> 8);
    }
    if (!RELEASE && carry > 0) {
        throw new Error('overflow');
    }
}

function scMult(o: Scalar, a: Scalar, b: Scalar): void {
    let r = newScalarPacked();
    let t = newScalar();

    for (let i = 0; i < 32; ++i) {
        let ai = a[i];
        for (let j = 0; j < 32; ++j) {
            t[i + j] += ai * unchecked(b[j]);
        }
    }
    scCarry(t);
    scModL(r, t);
    for (let i = 0; i < 32; ++i) {
        o[i] = r[i];
    }
    for (let i = 32; i < 64; ++i) {
        o[i] = 0;
    }
}

function scSq(o: Scalar, a: Scalar): void {
    scMult(o, a, a);
}

function scSqMult(y: Scalar, squarings: isize, x: Scalar): void {
    for (let i = <isize>0; i < squarings; ++i) {
        scSq(y, y);
    }
    scMult(y, y, x);
}

function scInverse(s: Uint8Array): Uint8Array {
    let res = newScalarPacked();
    let _1 = newScalar();
    for (let i = 0; i < 32; ++i) {
        _1[i] = s[i];
    }
    let _10 = newScalar(), _100 = newScalar(), _1000 = newScalar(), _10000 = newScalar(), _100000 = newScalar(),
        _1000000 = newScalar(), _10010011 = newScalar(), _10010111 = newScalar(), _100110 = newScalar(), _1010 = newScalar(),
        _1010000 = newScalar(), _1010011 = newScalar(), _1011 = newScalar(), _10110 = newScalar(), _10111101 = newScalar(),
        _11 = newScalar(), _1100011 = newScalar(), _1100111 = newScalar(), _11010011 = newScalar(), _1101011 = newScalar(),
        _11100111 = newScalar(), _11101011 = newScalar(), _11110101 = newScalar(), recip = newScalar();

    scSq(_10, _1);
    scMult(_11, _1, _10);
    scMult(_100, _1, _11);
    scSq(_1000, _100);
    scMult(_1010, _10, _1000);
    scMult(_1011, _1, _1010);
    scSq(_10000, _1000);
    scSq(_10110, _1011);
    scMult(_100000, _1010, _10110);
    scMult(_100110, _10000, _10110);
    scSq(_1000000, _100000);
    scMult(_1010000, _10000, _1000000);
    scMult(_1010011, _11, _1010000);
    scMult(_1100011, _10000, _1010011);
    scMult(_1100111, _100, _1100011);
    scMult(_1101011, _100, _1100111);
    scMult(_10010011, _1000000, _1010011);
    scMult(_10010111, _100, _10010011);
    scMult(_10111101, _100110, _10010111);
    scMult(_11010011, _10110, _10111101);
    scMult(_11100111, _1010000, _10010111);
    scMult(_11101011, _100, _11100111);
    scMult(_11110101, _1010, _11101011);

    scMult(recip, _1011, _11110101);
    scSqMult(recip, 126, _1010011);
    scSqMult(recip, 9, _10);
    scMult(recip, recip, _11110101);
    scSqMult(recip, 7, _1100111);
    scSqMult(recip, 9, _11110101);
    scSqMult(recip, 11, _10111101);
    scSqMult(recip, 8, _11100111);
    scSqMult(recip, 9, _1101011);
    scSqMult(recip, 6, _1011);
    scSqMult(recip, 14, _10010011);
    scSqMult(recip, 10, _1100011);
    scSqMult(recip, 9, _10010111);
    scSqMult(recip, 10, _11110101);
    scSqMult(recip, 8, _11010011);
    scSqMult(recip, 8, _11101011);

    for (let i = 0; i < 32; ++i) {
        recip[i + 1] += recip[i] >> 8;
        res[i] = recip[i] as u8;
    }
    return res;
}

@inline function scClamp(s: ScalarPacked): void {
    s[0] &= 248;
    s[31] = (s[31] & 127) | 64;
}

function scAdd(a: Uint8Array, b: Uint8Array): void {
    let c: u32 = 0;
    for (let i = 0, len = a.length; i < len; i++) {
        c += (a[i] as u32) + (b[i] as u32);
        a[i] = c as u8;
        c >>= 8;
    }
}

function scSub(a: Uint8Array, b: Uint8Array): void {
    let c: u32 = 0;
    for (let i = 0, len = a.length; i < len; i++) {
        c = (a[i] as u32) - (b[i] as u32) - c;
        a[i] = c as u8;
        c = (c >> 8) & 1;
    }
}

// mod(2^255-19) field arithmetic - Doesn't use 51-bit limbs yet to keep the
// code short and simple

type Fe25519 = StaticArray<i64>(16);
type Fe25519Packed = Uint8Array(32);

@inline function newFe25519(): Fe25519 {
    return new StaticArray<i64>(16);
}

@inline function newFe25519Packed(): Fe25519Packed {
    return new Uint8Array(32);
}

function fe25519(init: i64[]): Fe25519 {
    let r = newFe25519();

    for (let i = 0, len = init.length; i < len; ++i) {
        r[i] = init[i];
    }
    return r;
}

let fe25519_0 = newFe25519();
let fe25519_1 = fe25519([1]);

let D = fe25519([
    0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070,
    0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203,
]);

let D2 = fe25519([
    0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0,
    0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406,
]);

let SQRTM1 = fe25519([
    0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43,
    0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83,
]);

let SQRTADM1 = fe25519([
    0x2e1b, 0x497b, 0xf6a0, 0x7e97, 0x54bd, 0x1b78, 0x8e0c, 0xaf9d,
    0xd1fd, 0x31f5, 0xfcc9, 0x0f3c, 0x48ac, 0x2b83, 0x31bf, 0x3769,
]);

let INVSQRTAMD = fe25519([
    0x40ea, 0x805d, 0xfdaa, 0x99c8, 0x72be, 0x5a41, 0x1617, 0x9d2f,
    0xd840, 0xfe01, 0x7b91, 0x16c2, 0xfca2, 0xcfaf, 0x8905, 0x786c,
]);

let ONEMSQD = fe25519([
    0xc176, 0x945f, 0x09c1, 0xe27c, 0x350f, 0xcd5e, 0xa138, 0x2c81,
    0xdfe4, 0xbe70, 0xabdd, 0x9994, 0xe0d7, 0xb2b3, 0x72a8, 0x0290,
]);

let SQDMONE = fe25519([
    0x4d20, 0x44ed, 0x5aaa, 0x31ad, 0x1999, 0xb01e, 0x4a2c, 0xd29e,
    0x4eeb, 0x529b, 0xd32f, 0x4cdc, 0x2241, 0xf66c, 0xb37a, 0x5968,
]);

@inline function fe25519Copy(r: Fe25519, a: Fe25519): void {
    memory.copy(changetype<usize>(r), changetype<usize>(a), sizeof<i64>() * 16);
}

// @inline // -- commenting out this @inline attr causes exponential compilation time
function fe25519Cmov(p: Fe25519, q: Fe25519, b: i64): void {
    let mask = ~(b - 1);
    unchecked(p[0] ^= (p[0] ^ q[0]) & mask);
    unchecked(p[1] ^= (p[1] ^ q[1]) & mask);
    unchecked(p[2] ^= (p[2] ^ q[2]) & mask);
    unchecked(p[3] ^= (p[3] ^ q[3]) & mask);
    unchecked(p[4] ^= (p[4] ^ q[4]) & mask);
    unchecked(p[5] ^= (p[5] ^ q[5]) & mask);
    unchecked(p[6] ^= (p[6] ^ q[6]) & mask);
    unchecked(p[7] ^= (p[7] ^ q[7]) & mask);
    unchecked(p[8] ^= (p[8] ^ q[8]) & mask);
    unchecked(p[9] ^= (p[9] ^ q[9]) & mask);
    unchecked(p[10] ^= (p[10] ^ q[10]) & mask);
    unchecked(p[11] ^= (p[11] ^ q[11]) & mask);
    unchecked(p[12] ^= (p[12] ^ q[12]) & mask);
    unchecked(p[13] ^= (p[13] ^ q[13]) & mask);
    unchecked(p[14] ^= (p[14] ^ q[14]) & mask);
    unchecked(p[15] ^= (p[15] ^ q[15]) & mask);
}

function fe25519Pack(o: Fe25519Packed, n: Fe25519): void {
    let b: i64;
    let m = newFe25519();
    let t = newFe25519();

    fe25519Copy(t, n);
    fe25519Carry(t);
    fe25519Carry(t);
    fe25519Carry(t);
    for (let j = 0; j < 2; ++j) {
        m[0] = t[0] - 0xffed;
        for (let i = 1; i < 15; ++i) {
            let mp = m[i - 1];
            m[i] = t[i] - 0xffff - ((mp >> 16) & 1);
            m[i - 1] = mp & 0xffff;
        }
        m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
        b = (m[15] >> 16) & 1;
        m[14] &= 0xffff;
        fe25519Cmov(t, m, 1 - b);
    }
    for (let i = 0; i < 16; ++i) {
        let ti = t[i] as u32;
        o[2 * i + 0] = ti & 0xff;
        o[2 * i + 1] = ti >> 8;
    }
}

function fe25519Unpack(o: Fe25519, n: Fe25519Packed): void {
    let nb = changetype<usize>(n.buffer);
    for (let i = 0; i < 16; ++i) {
        o[i] = load<u16>(nb + 2 * i) as i64;
    }
    o[15] &= 0x7fff;
}

function fe25519Eq(a: Fe25519, b: Fe25519): bool {
    let c = newFe25519Packed(), d = newFe25519Packed();

    fe25519Pack(c, a);
    fe25519Pack(d, b);

    return verify32(c, d);
}

function fe25519IsNegative(a: Fe25519): bool {
    let d = newFe25519Packed();

    fe25519Pack(d, a);

    return (d[0] & 1) as bool;
}

function fe25519Neg(f: Fe25519): void {
    fe25519Sub(f, fe25519_0, f);
}

function fe25519Cneg(h: Fe25519, f: Fe25519, b: bool): void {
    let negf = newFe25519();
    fe25519Sub(negf, fe25519_0, f);
    fe25519Copy(h, f);
    fe25519Cmov(h, negf, b as i64);
}

function fe25519Abs(h: Fe25519, f: Fe25519): void {
    fe25519Cneg(h, f, fe25519IsNegative(f));
}

function fe25519IsZero(a: Fe25519): bool {
    let b = newFe25519Packed();

    fe25519Pack(b, a);
    let c: i64 = 0;
    for (let i = 0; i < 16; i++) {
        c |= b[i];
    }
    return c === 0;
}

@inline function fe25519Add(o: Fe25519, a: Fe25519, b: Fe25519): void {
    for (let i = 0; i < 16; ++i) {
        o[i] = a[i] + b[i];
    }
}

@inline function fe25519Sub(o: Fe25519, a: Fe25519, b: Fe25519): void {
    for (let i = 0; i < 16; ++i) {
        o[i] = a[i] - b[i];
    }
}

function fe25519Carry(o: Fe25519): void {
    let c: i64;

    for (let i = 0; i < 15; ++i) {
        o[i] += (1 << 16);
        c = o[i] >> 16;
        o[(i + 1)] += c - 1;
        o[i] -= c << 16;
    }
    o[15] += (1 << 16);
    c = o[15] >> 16;
    o[0] += c - 1 + 37 * (c - 1);
    o[15] -= c << 16;
}

@inline function fe25519Reduce(o: Fe25519, a: Fe25519): void {
    for (let i = 0; i < 15; ++i) {
        a[i] += 38 as i64 * a[i + 16];
    }
    fe25519Copy(o, a);
    fe25519Carry(o);
    fe25519Carry(o);
}

function fe25519Mult(o: Fe25519, a: Fe25519, b: Fe25519): void {
    let t = new StaticArray<i64>(31 + 1);

    for (let i = 0; i < 16; ++i) {
        let ai = unchecked(a[i]);
        for (let j = 0; j < 16; ++j) {
            t[i + j] += ai * unchecked(b[j]);
        }
    }
    fe25519Reduce(o, t);
}

@inline function fe25519Sq(o: Fe25519, a: Fe25519): void {
    fe25519Mult(o, a, a);
}

function fe25519Sq2(o: Fe25519, a: Fe25519): void {
    let t = new StaticArray<i64>(31 + 1);

    for (let i = 0; i < 16; ++i) {
        let ai = 2 * unchecked(a[i]);
        for (let j = 0; j < 16; ++j) {
            t[i + j] += ai * unchecked(a[j]);
        }
    }
    fe25519Reduce(o, t);
}

function fe25519Inverse(o: Fe25519, i: Fe25519): void {
    let c = newFe25519();

    fe25519Copy(c, i);
    for (let a = 253; a >= 5; --a) {
        fe25519Sq(c, c);
        fe25519Mult(c, c, i);
    }
    fe25519Sq(c, c);
    fe25519Sq(c, c);
    fe25519Mult(c, c, i);
    fe25519Sq(c, c);
    fe25519Sq(c, c);
    fe25519Mult(c, c, i);
    fe25519Sq(c, c);
    fe25519Mult(c, c, i);
    fe25519Copy(o, c);
}

function fe25519Pow252m3(o: Fe25519, i: Fe25519): void {
    let c = newFe25519();

    fe25519Copy(c, i);
    for (let a = 250; a >= 2; --a) {
        fe25519Sq(c, c);
        fe25519Mult(c, c, i);
    }
    fe25519Sq(c, c);
    fe25519Sq(c, c);
    fe25519Mult(c, c, i);
    fe25519Copy(o, c);
}

// Ed25519 group arithmetic

class Ge {
    x: Fe25519;
    y: Fe25519;
    z: Fe25519;
    t: Fe25519;

    @inline constructor() {
        this.x = newFe25519();
        this.y = newFe25519();
        this.z = newFe25519();
        this.t = newFe25519();
    }
}

type GePacked = Uint8Array(32);

@inline function newGe(): Ge {
    return new Ge();
}

@inline function newGePacked(): GePacked {
    return new Uint8Array(32);
}

@inline function geCopy(r: Ge, a: Ge): void {
    fe25519Copy(r.x, a.x);
    fe25519Copy(r.y, a.y);
    fe25519Copy(r.z, a.z);
    fe25519Copy(r.t, a.t);
}

let Aa = newFe25519(),
    Ab = newFe25519(),
    Ac = newFe25519(),
    Ad = newFe25519(),
    Ae = newFe25519(),
    Af = newFe25519(),
    Ag = newFe25519(),
    Ah = newFe25519(),
    At = newFe25519();

function add(p: Ge, q: Ge): void {
    fe25519Sub(Aa, p.x, p.y);
    fe25519Sub(At, q.x, q.y);
    fe25519Mult(Aa, Aa, At);
    fe25519Add(Ab, p.x, p.y);
    fe25519Add(At, q.x, q.y);
    fe25519Mult(Ab, Ab, At);
    fe25519Mult(Ac, p.t, q.t);
    fe25519Mult(Ac, Ac, D2);
    fe25519Mult(Ad, p.z, q.z);
    fe25519Add(Ad, Ad, Ad);
    fe25519Sub(Ae, Ab, Aa);
    fe25519Sub(Af, Ad, Ac);
    fe25519Add(Ag, Ad, Ac);
    fe25519Add(Ah, Ab, Aa);

    fe25519Mult(p.x, Ae, Af);
    fe25519Mult(p.y, Ah, Ag);
    fe25519Mult(p.z, Ag, Af);
    fe25519Mult(p.t, Ae, Ah);
}

function neg(p: Ge): void {
    fe25519Neg(p.x);
    fe25519Neg(p.t);
}

function sub(p: Ge, q: Ge): void {
    let negq = newGe();
    geCopy(negq, q);
    neg(negq);
    add(p, negq);
}

function dbl(p: Ge): void {
    fe25519Add(At, p.x, p.y);
    fe25519Sq(At, At);
    fe25519Sq(Aa, p.x);
    fe25519Sq(Ac, p.y);
    fe25519Add(Ab, Ac, Aa);
    fe25519Sub(Ac, Ac, Aa);
    fe25519Sub(Aa, At, Ab);
    fe25519Sq2(At, p.z);
    fe25519Sub(At, At, Ac);

    fe25519Mult(p.x, Aa, At);
    fe25519Mult(p.y, Ab, Ac);
    fe25519Mult(p.z, Ac, At);
    fe25519Mult(p.t, Aa, Ab);
}

@inline function cmov(p: Ge, q: Ge, b: i64): void {
    fe25519Cmov(p.x, q.x, b);
    fe25519Cmov(p.y, q.y, b);
    fe25519Cmov(p.z, q.z, b);
    fe25519Cmov(p.t, q.t, b);
}

function clearCofactor(p: Ge): void {
    dbl(p);
    dbl(p);
    dbl(p);
}

function pack(r: GePacked, p: Ge): void {
    let tx = newFe25519(),
        ty = newFe25519(),
        zi = newFe25519();
    fe25519Inverse(zi, p.z);
    fe25519Mult(tx, p.x, zi);
    fe25519Mult(ty, p.y, zi);
    fe25519Pack(r, ty);
    r[31] ^= (fe25519IsNegative(tx) as u8) << 7;
}

function scalarmult(p: Ge, s: ScalarPacked, q: Ge): void {
    let pc: Array<Ge> = [newGe(), newGe(), newGe(), newGe(), newGe(), newGe(), newGe(), newGe(),
    newGe(), newGe(), newGe(), newGe(), newGe(), newGe(), newGe(), newGe()];
    let t = newGe(),
        b: u32;

    fe25519Copy(pc[0].x, fe25519_0);
    fe25519Copy(pc[0].y, fe25519_1);
    fe25519Copy(pc[0].z, fe25519_1);
    fe25519Copy(pc[0].t, fe25519_0);
    geCopy(pc[1], q);
    for (let i = 2; i < 16; ++i) {
        geCopy(pc[i], pc[i - 1]);
        add(pc[i], q);
    }

    geCopy(p, pc[0]);
    for (let i = 252; i >= 0; i -= 4) {
        b = (s[(i >>> 3)] >>> (i as u8 & 7)) & 0xf;
        dbl(p);
        dbl(p);
        dbl(p);
        dbl(p);
        geCopy(t, pc[0]);
        cmov(t, unchecked(pc[15]), (((b ^ 15) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[14]), (((b ^ 14) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[13]), (((b ^ 13) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[12]), (((b ^ 12) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[11]), (((b ^ 11) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[10]), (((b ^ 10) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[9]), (((b ^ 9) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[8]), (((b ^ 8) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[7]), (((b ^ 7) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[6]), (((b ^ 6) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[5]), (((b ^ 5) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[4]), (((b ^ 4) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[3]), (((b ^ 3) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[2]), (((b ^ 2) - 1) >>> 8) as u8 & 1);
        cmov(t, unchecked(pc[1]), (((b ^ 1) - 1) >>> 8) as u8 & 1);
        add(p, t);
    }
}

@inline function fe25519CopyPrecomp(r: Fe25519, a: i64[]): void {
    memory.copy(changetype<usize>(r), a.dataStart, sizeof<i64>() * 16);
}

function scalarmultBase(p: Ge, s: ScalarPacked): void {
    let q = newGe(),
        t = newGe(),
        b: u8;

    fe25519Copy(p.x, fe25519_0);
    fe25519Copy(p.y, fe25519_1);
    fe25519Copy(p.z, fe25519_1);
    fe25519Copy(p.t, fe25519_0);

    fe25519Copy(q.z, fe25519_1);

    let precomp_base = precompBase;
    for (let i = 0; i <= 255; ++i) {
        b = (s[(i >>> 3)] >>> (i as u8 & 7)) & 1;
        let precomp = precomp_base[i];
        fe25519CopyPrecomp(q.x, precomp[0]);
        fe25519CopyPrecomp(q.y, precomp[1]);
        fe25519CopyPrecomp(q.t, precomp[2]);
        geCopy(t, p);
        add(t, q);
        cmov(p, t, b);
    }
}

// Ed25519 encoding

function unpack(r: Ge, p: GePacked, neg: bool = false): bool {
    let t = newFe25519(),
        chk = newFe25519(),
        num = newFe25519(),
        den = newFe25519(),
        den2 = newFe25519(),
        den4 = newFe25519(),
        den6 = newFe25519();

    fe25519Copy(r.z, fe25519_1);
    fe25519Unpack(r.y, p);
    fe25519Sq(num, r.y);
    fe25519Mult(den, num, D);
    fe25519Sub(num, num, r.z);
    fe25519Add(den, r.z, den);
    fe25519Sq(den2, den);
    fe25519Sq(den4, den2);
    fe25519Mult(den6, den4, den2);
    fe25519Mult(t, den6, num);
    fe25519Mult(t, t, den);
    fe25519Pow252m3(t, t);
    fe25519Mult(t, t, num);
    fe25519Mult(t, t, den2);
    fe25519Mult(r.x, t, den);
    fe25519Sq(chk, r.x);
    fe25519Mult(chk, chk, den);
    if (!fe25519Eq(chk, num)) {
        fe25519Mult(r.x, r.x, SQRTM1);
    }
    fe25519Sq(chk, r.x);
    fe25519Mult(chk, chk, den);
    if (!fe25519Eq(chk, num)) {
        return false;
    }
    if ((fe25519IsNegative(r.x) as u8 === (p[31] >> 7)) === neg) {
        fe25519Neg(r.x);
    }
    fe25519Mult(r.t, r.x, r.y);

    return true;
}

@inline function isIdentity(s: GePacked): bool {
    let c: u8 = unchecked(s[0]) ^ 0x01;
    for (let i = 1; i < 31; i++) {
        c |= unchecked(s[i]);
    }
    c |= unchecked(s[31]) & 0x7f;

    return c === 0;
}

// Check if a field element has canonical encoding, ignoring the top bit
function isCanonical(s: GePacked): bool {
    let c: u32 = (s[31] & 0x7f) ^ 0x7f;
    for (let i = 30; i > 0; --i) {
        c |= s[i] ^ 0xff;
    }
    c = (c - 1) >> 8;
    let d = ((0xed - 1) as u32 - (s[0] as u32)) >> 8;

    return !(c & d & 1);
}

function hasLowOrder(q: Ge): bool {
    let p = newGe();
    geCopy(p, q);
    clearCofactor(p);
    return fe25519IsZero(p.x);
}

// Ristretto encoding

function ristrettoSqrtRatioM1(x: Fe25519, u: Fe25519, v: Fe25519): bool {
    let v3 = newFe25519(), vxx = newFe25519(),
        m_root_check = newFe25519(), p_root_check = newFe25519(), f_root_check = newFe25519(),
        x_sqrtm1 = newFe25519();
    fe25519Sq(v3, v);
    fe25519Mult(v3, v3, v);
    fe25519Sq(x, v3);
    fe25519Mult(x, x, v);
    fe25519Mult(x, x, u);

    fe25519Pow252m3(x, x);
    fe25519Mult(x, x, v3);
    fe25519Mult(x, x, u);

    fe25519Sq(vxx, x);
    fe25519Mult(vxx, vxx, v);
    fe25519Sub(m_root_check, vxx, u);
    fe25519Add(p_root_check, vxx, u);
    fe25519Mult(f_root_check, u, SQRTM1);
    fe25519Add(f_root_check, vxx, f_root_check);
    let has_m_root = fe25519IsZero(m_root_check);
    let has_p_root = fe25519IsZero(p_root_check);
    let has_f_root = fe25519IsZero(f_root_check);
    fe25519Mult(x_sqrtm1, x, SQRTM1);

    fe25519Cmov(x, x_sqrtm1, (has_p_root | has_f_root) as i64);
    fe25519Abs(x, x);

    return has_m_root | has_p_root;
}

function ristrettoIsCanonical(s: GePacked): bool {
    let c = ((s[31] & 0x7f) ^ 0x7f) as u64;
    for (let i = 30; i > 0; i--) {
        c |= s[i] ^ 0xff;
    }
    c = (c - 1) >> 8;
    let d = (0xed as u64 - 1 as u64 - (s[0] as u64)) >> 8;
    let e = s[31] >> 7;

    return (1 - (((c & d) | e | s[0]) & 1)) as bool;
}

function ristrettoUnpack(h: Ge, s: GePacked, neg: bool = false): bool {
    let inv_sqrt = newFe25519(), s_ = newFe25519(), ss = newFe25519(),
        u1 = newFe25519(), u2 = newFe25519(), u1u1 = newFe25519(), u2u2 = newFe25519(),
        v = newFe25519(), v_u2u2 = newFe25519();

    if (!ristrettoIsCanonical(s)) {
        return false;
    }
    fe25519Unpack(s_, s);
    fe25519Sq(ss, s_);

    fe25519Copy(u1, fe25519_1);
    fe25519Sub(u1, u1, ss);
    fe25519Sq(u1u1, u1);

    fe25519Copy(u2, fe25519_1);
    fe25519Add(u2, u2, ss);
    fe25519Sq(u2u2, u2);

    fe25519Mult(v, D, u1u1);
    fe25519Neg(v);
    fe25519Sub(v, v, u2u2);

    fe25519Mult(v_u2u2, v, u2u2);

    let was_square = ristrettoSqrtRatioM1(inv_sqrt, fe25519_1, v_u2u2);
    let x = h.x, y = h.y, z = h.z, t = h.t;

    fe25519Mult(x, inv_sqrt, u2);
    fe25519Mult(y, inv_sqrt, x);
    fe25519Mult(y, y, v);

    fe25519Mult(x, x, s_);
    fe25519Add(x, x, x);
    fe25519Abs(x, x);
    fe25519Mult(y, u1, y);

    fe25519Copy(z, fe25519_1);
    if (neg) {
        fe25519Neg(y);
    }
    fe25519Mult(t, x, y);

    return !((!was_square) | (fe25519IsNegative(t) ^ neg) | fe25519IsZero(y));
}

function ristrettoPack(s: GePacked, h: Ge): void {
    let den1 = newFe25519(), den2 = newFe25519(), den_inv = newFe25519(), eden = newFe25519(),
        inv_sqrt = newFe25519(), ix = newFe25519(), iy = newFe25519(), s_ = newFe25519(),
        t_z_inv = newFe25519(), u1 = newFe25519(), u2 = newFe25519(), u1_u2u2 = newFe25519(),
        x_ = newFe25519(), y_ = newFe25519(), x_z_inv = newFe25519(), z_inv = newFe25519(),
        zmy = newFe25519();
    let x = h.x, y = h.y, z = h.z, t = h.t;

    fe25519Add(u1, z, y);
    fe25519Sub(zmy, z, y);
    fe25519Mult(u1, u1, zmy);
    fe25519Mult(u2, x, y);

    fe25519Sq(u1_u2u2, u2);
    fe25519Mult(u1_u2u2, u1, u1_u2u2);

    ristrettoSqrtRatioM1(inv_sqrt, fe25519_1, u1_u2u2);
    fe25519Mult(den1, inv_sqrt, u1);
    fe25519Mult(den2, inv_sqrt, u2);
    fe25519Mult(z_inv, den1, den2);
    fe25519Mult(z_inv, z_inv, t);

    fe25519Mult(ix, x, SQRTM1);
    fe25519Mult(iy, y, SQRTM1);
    fe25519Mult(eden, den1, INVSQRTAMD);

    fe25519Mult(t_z_inv, t, z_inv);
    let rotate = fe25519IsNegative(t_z_inv) as i64;

    fe25519Copy(x_, x);
    fe25519Copy(y_, y);
    fe25519Copy(den_inv, den2);

    fe25519Cmov(x_, iy, rotate);
    fe25519Cmov(y_, ix, rotate);
    fe25519Cmov(den_inv, eden, rotate);

    fe25519Mult(x_z_inv, x_, z_inv);
    fe25519Cneg(y_, y_, fe25519IsNegative(x_z_inv));

    fe25519Sub(s_, z, y_);
    fe25519Mult(s_, den_inv, s_);
    fe25519Abs(s_, s_);
    fe25519Pack(s, s_);
}

@inline function ristrettoIsIdentity(s: GePacked): bool {
    return allZeros(s);
}

function ristrettoElligator(p: Ge, t: Fe25519): void {
    let c = newFe25519(), n = newFe25519(), r = newFe25519(), rpd = newFe25519(),
        s = newFe25519(), s_prime = newFe25519(), ss = newFe25519(),
        u = newFe25519(), v = newFe25519(),
        w0 = newFe25519(), w1 = newFe25519(), w2 = newFe25519(), w3 = newFe25519();

    fe25519Sq(r, t);
    fe25519Mult(r, SQRTM1, r);
    fe25519Add(u, r, fe25519_1);
    fe25519Mult(u, u, ONEMSQD);
    fe25519Sub(c, fe25519_0, fe25519_1);
    fe25519Add(rpd, r, D);
    fe25519Mult(v, r, D);
    fe25519Sub(v, c, v);
    fe25519Mult(v, v, rpd);

    let not_square = 1 - (ristrettoSqrtRatioM1(s, u, v) as i64);
    fe25519Mult(s_prime, s, t);
    fe25519Abs(s_prime, s_prime);
    fe25519Neg(s_prime);
    fe25519Cmov(s, s_prime, not_square);
    fe25519Cmov(c, r, not_square);

    fe25519Sub(n, r, fe25519_1);
    fe25519Mult(n, n, c);
    fe25519Mult(n, n, SQDMONE);
    fe25519Sub(n, n, v);

    fe25519Add(w0, s, s);
    fe25519Mult(w0, w0, v);
    fe25519Mult(w1, n, SQRTADM1);
    fe25519Sq(ss, s);
    fe25519Sub(w2, fe25519_1, ss);
    fe25519Add(w3, fe25519_1, ss);

    fe25519Mult(p.x, w0, w3);
    fe25519Mult(p.y, w2, w1);
    fe25519Mult(p.z, w1, w3);
    fe25519Mult(p.t, w0, w2);
}

type Hash512 = Uint8Array(64);

function ristrettoFromHash(s: GePacked, r: Hash512): void {
    let r0 = newFe25519(), r1 = newFe25519();
    let p0 = newGe(), p1 = newGe();

    fe25519Unpack(r0, r.subarray(0, 32));
    fe25519Unpack(r1, r.subarray(32, 64));
    ristrettoElligator(p0, r0);
    ristrettoElligator(p1, r1);
    add(p0, p1);
    ristrettoPack(s, p0);
}

// Common functions used for signatures

function _signSyntheticRHv(hs: Uint8Array, r: isize, Z: Uint8Array, sk: Uint8Array): isize {
    let zeros = new Uint8Array(128);
    let empty_labelset = new Uint8Array(3);
    let Zlen = Z.length;

    if (Zlen > 128 - (32 + 3)) {
        Z = hash(Z);
        Zlen = Z.length;
    }
    empty_labelset[0] = 0x02;

    r = Sha512._hashUpdate(hs, B, 32, r);
    r = Sha512._hashUpdate(hs, empty_labelset, 3, r);
    r = Sha512._hashUpdate(hs, Z, Zlen, r);
    r = Sha512._hashUpdate(hs, zeros, 128 - ((32 + 3 + Zlen) & 127), r);
    r = Sha512._hashUpdate(hs, sk, 32, r);
    r = Sha512._hashUpdate(hs, zeros, 128 - (32 & 127), r);
    r = Sha512._hashUpdate(hs, empty_labelset, 3, r);
    r = Sha512._hashUpdate(hs, sk.subarray(32), 32, r);

    return r;
}

let B = newFe25519Packed();
for (let i = 0; i < 32; ++i) {
    B[i] = 0x66;
}

// Ed25519

type KeyPair = Uint8Array(64);
type Signature = Uint8Array(64);

function _signEdKeypairFromSeed(kp: KeyPair): void {
    let d = new Uint8Array(64);
    let p = newGe();

    Sha512._hash(d, kp, 32);
    scClamp(d);
    scalarmultBase(p, d);
    pack(kp.subarray(32), p);
}

function _signEdDetached(sig: Signature, m: Uint8Array, kp: KeyPair, Z: Uint8Array | null): void {
    let R = newGe();
    let az = new Uint8Array(64);
    let nonce = newScalarDouble();
    let hram = newScalarDouble();
    let x = newScalar();
    let mlen = m.length;
    let hs = Sha512._hashInit();
    let r: isize = 0;

    Sha512._hash(az, kp, 32);
    if (Z !== null && Z.length > 0) {
        r = _signSyntheticRHv(hs, r, Z, az);
    } else {
        r = Sha512._hashUpdate(hs, az.subarray(32), 32, r);
    }
    r = Sha512._hashUpdate(hs, m, mlen, r);
    Sha512._hashFinal(hs, nonce, 32 + mlen, r);
    scReduce(nonce);
    scalarmultBase(R, nonce);
    pack(sig, R);
    setU8(sig, kp.subarray(32), 32);

    hs = Sha512._hashInit();
    r = Sha512._hashUpdate(hs, sig, 64, 0);
    r = Sha512._hashUpdate(hs, m, mlen, r);
    Sha512._hashFinal(hs, hram, 64 + mlen, r);
    scReduce(hram);
    scClamp(az);
    for (let i = 0; i < 32; ++i) {
        x[i] = nonce[i];
    }
    for (let i = 0; i < 32; ++i) {
        for (let j = 0; j < 32; ++j) {
            x[i + j] += unchecked((hram[i] as i64) * (az[j] as i64));
        }
    }
    scModL(sig.subarray(32), x);
}

function _signEdVerifyDetached(sig: Signature, m: Uint8Array, pk: GePacked): bool {
    if (!isCanonical(pk) || !scIsLtL(sig.subarray(32))) {
        return false;
    }
    let A = newGe();
    if (!unpack(A, pk, true) || hasLowOrder(A)) {
        return false;
    }
    let expectedR_ = sig.subarray(0, 32);
    if (!isCanonical(expectedR_)) {
        return false;
    }
    let expectedR = newGe();
    if (!unpack(expectedR, expectedR_, false)) {
        return false;
    }

    let hram = newScalarDouble();
    let hs = Sha512._hashInit();
    let r = Sha512._hashUpdate(hs, sig, 32, 0);
    r = Sha512._hashUpdate(hs, pk, 32, r);
    r = Sha512._hashUpdate(hs, m, m.length, r);
    Sha512._hashFinal(hs, hram, 32 + 32 + m.length, r);
    scReduce(hram);

    let ah = newGe();
    scalarmult(ah, hram, A);
    let sbAh = newGe();
    scalarmultBase(sbAh, sig.subarray(32));
    add(sbAh, ah);
    sub(expectedR, sbAh);

    return hasLowOrder(expectedR);
}

// Signatures over Ristretto

function _signKeypairFromSeed(kp: KeyPair): void {
    let d = newScalarDouble();
    let p = newGe();

    Sha512._hash(d, kp, 32);
    scalarmultBase(p, d);
    ristrettoPack(kp.subarray(32), p);
}

function _signDetached(sig: Signature, m: Uint8Array, kp: KeyPair, Z: Uint8Array | null): void {
    let R = newGe();
    let az = new Uint8Array(64);
    let nonce = newScalarDouble();
    let hram = newScalarDouble();
    let x = newScalar();
    let mlen = m.length;
    let hs = Sha512._hashInit();
    let r: isize = 0;

    Sha512._hash(az, kp, 32);
    if (Z !== null && Z.length > 0) {
        r = _signSyntheticRHv(hs, r, Z, az);
    } else {
        r = Sha512._hashUpdate(hs, az.subarray(32), 32, r);
    }
    r = Sha512._hashUpdate(hs, m, mlen, r);
    Sha512._hashFinal(hs, nonce, 32 + mlen, r);
    setU8(sig, kp.subarray(32), 32);

    scReduce(nonce);
    scalarmultBase(R, nonce);
    ristrettoPack(sig, R);

    hs = Sha512._hashInit();
    r = Sha512._hashUpdate(hs, sig, 64, 0);
    r = Sha512._hashUpdate(hs, m, mlen, r);
    Sha512._hashFinal(hs, hram, 64 + mlen, r);
    scReduce(hram);
    for (let i = 0; i < 32; ++i) {
        x[i] = nonce[i];
    }
    for (let i = 0; i < 32; ++i) {
        for (let j = 0; j < 32; ++j) {
            x[i + j] += unchecked((hram[i] as i64) * (az[j] as i64));
        }
    }
    scModL(sig.subarray(32), x);
}

function _signVerifyDetached(sig: Signature, m: Uint8Array, pk: GePacked): bool {
    if (ristrettoIsIdentity(pk) || !scIsLtL(sig.subarray(32))) {
        return false;
    }
    let A = newGe();
    if (!ristrettoUnpack(A, pk, true)) {
        return false;
    }
    let h = newScalarDouble();
    let hs = Sha512._hashInit();
    let r = Sha512._hashUpdate(hs, sig, 32, 0);
    r = Sha512._hashUpdate(hs, pk, 32, r);
    r = Sha512._hashUpdate(hs, m, m.length, r);
    Sha512._hashFinal(hs, h, 32 + 32 + m.length, r);
    scReduce(h);

    let R = newGe();
    let rcheck = newFe25519Packed();
    scalarmult(R, h, A);
    scalarmultBase(A, sig.subarray(32));
    add(R, A);

    ristrettoPack(rcheck, R);

    return verify32(rcheck, sig.subarray(0, 32));
}

// Exported API

/**
 * Signature size, in bytes
 */
@global export const SIGN_BYTES: isize = 64;

/**
 * Public key size, in bytes
 */
@global export const SIGN_PUBLICKEYBYTES: isize = 32;

/**
 * Secret key size, in bytes
 */
@global export const SIGN_SECRETKEYBYTES: isize = 32;

/**
 * Key pair size, in bytes
 */
@global export const SIGN_KEYPAIRBYTES: isize = 64;

/**
 * Seed size, in bytes
 */
@global export const SIGN_SEEDBYTES: isize = 32;

/**
 * Recommended random bytes size, in bytes
 */
@global export const SIGN_RANDBYTES: isize = 32;

/**
 * Ed25519 signature size, in bytes
 */
@global export const SIGN_ED_BYTES: isize = 64;

/**
 * Ed25519 public key size, in bytes
 */
@global export const SIGN_ED_PUBLICKEYBYTES: isize = 32;

/**
 * Ed25519 secret key size, in bytes
 */
@global export const SIGN_ED_SECRETKEYBYTES: isize = 32;

/**
 * Ed25519 key pair size, in bytes
 */
@global export const SIGN_ED_KEYPAIRBYTES: isize = 64;

/**
 * Ed25519 seed size, in bytes
 */
@global export const SIGN_ED_SEEDBYTES: isize = 32;

/**
 * Non-deterministic Ed25519 recommended random bytes size, in bytes
 */
@global export const SIGN_ED_RANDBYTES: isize = 32;

/**
 * Hash function output size, in bytes
 */
@global export const HASH_BYTES: isize = 64;

/**
 * HMAC output size, in bytes
 */
@global export const HMAC_BYTES: isize = 64;

/**
 * SHA-256 function output size, in bytes
 */
@global export const SHA256_HASH_BYTES: isize = 32;

/**
 * HMAC-SHA-256 output size, in bytes
 */
@global export const SHA256_HMAC_BYTES: isize = 32;

/**
 * Size of an encoded scalar, in bytes
 */
@global export const FA_SCALARBYTES: isize = 32;

/**
 * Size of an encoded point, in bytes
 */
@global export const FA_POINTBYTES: isize = 32;

/**
 * Fill an array with zeros
 * @param x Array to clear
 */
@global export function memzero(x: Uint8Array): void {
    for (let i = 0, j = x.length; i < j; ++i) {
        x[i] = 0;
    }
}

/**
 * Check two arrays for equality
 * @param x First array
 * @param y Second array
 * @returns true if `x === y`
 */
@global export function equals(x: Uint8Array, y: Uint8Array): bool {
    let len = x.length;
    let d: u8 = 0;

    if (len === 0 || len !== y.length) {
        return false;
    }
    for (let i = 0; i < len; ++i) {
        d |= x[i] ^ y[i];
    }
    return d === 0;
}

/**
 * Sign a message and returns its signature.
 * @param m Message to sign
 * @param kp Key pair (`SIGN_KEYPAIRBYTES` long)
 * @param Z Random bytes. This can be an empty array to produce deterministic
 *     signatures
 * @returns Signature
 */
@global export function sign(m: Uint8Array, kp: Uint8Array, Z: Uint8Array | null = null): Uint8Array {
    let sig = new Uint8Array(<aisize>SIGN_BYTES);
    _signDetached(sig, m, kp, Z);

    return sig;
}

/**
 * Verify a signature
 * @param m Message
 * @param sig Signature
 * @param pk Public key
 * @returns `true` on success
 */
@global export function signVerify(sig: Uint8Array, m: Uint8Array, pk: Uint8Array): bool {
    if (<isize>sig.length !== SIGN_BYTES) {
        throw new Error('bad signature size');
    }
    if (<isize>pk.length !== SIGN_PUBLICKEYBYTES) {
        throw new Error('bad public key size');
    }
    return _signVerifyDetached(sig, m, pk);
}

/**
 * Create a new key pair from a seed
 * @param seed Seed (`SIGN_SEEDBYTES` long)
 * @returns Key pair
 */
@global export function signKeypairFromSeed(seed: Uint8Array): Uint8Array {
    if (<isize>seed.length !== SIGN_SEEDBYTES) {
        throw new Error('bad seed size');
    }
    let kp = new Uint8Array(<aisize>SIGN_KEYPAIRBYTES);
    for (let i = 0; i < 32; ++i) {
        kp[i] = seed[i];
    }
    _signKeypairFromSeed(kp);

    return kp;
}

/**
 * Return the public key from a key pair
 * @param kp Key pair
 * @returns Public key
 */
@global export function signPublicKey(kp: Uint8Array): Uint8Array {
    const len = SIGN_PUBLICKEYBYTES;
    let pk = new Uint8Array(<aisize>len);

    for (let i = <isize>0; i < len; ++i) {
        pk[<aisize>i] = kp[<aisize>(i + 32)];
    }
    return pk;
}

/**
 * Return the secret key from a key pair
 * @param kp Key pair
 * @returns Secret key
 */
@global export function signSecretKey(kp: Uint8Array): Uint8Array {
    const len = SIGN_SECRETKEYBYTES;
    let sk = new Uint8Array(<aisize>len);

    for (let i = <isize>0; i < len; ++i) {
        sk[<aisize>i] = kp[<aisize>i];
    }
    return sk;
}

/**
 * Sign a message using Ed25519 and returns its signature.
 * @param m Message to sign
 * @param kp Key pair (`SIGN_ED_KEYPAIRBYTES` long)
 * @param Z Random bytes. This can be an empty array to produce deterministic
 *     signatures
 * @returns Signature
 */
@global export function signEd(m: Uint8Array, kp: Uint8Array, Z: Uint8Array | null = null): Uint8Array {
    let sig = new Uint8Array(<aisize>SIGN_ED_BYTES);
    _signEdDetached(sig, m, kp, Z);

    return sig;
}

/**
 * Verify a signature using Ed25519
 * @param m Message
 * @param sig Signature
 * @param pk Public key
 * @returns `true` on success
 */
@global export function signEdVerify(sig: Uint8Array, m: Uint8Array, pk: Uint8Array): bool {
    if (<isize>sig.length !== SIGN_ED_BYTES) {
        throw new Error('bad signature size');
    }
    if (<isize>pk.length !== SIGN_ED_PUBLICKEYBYTES) {
        throw new Error('bad public key size');
    }
    return _signEdVerifyDetached(sig, m, pk);
}

/**
 * Create a new Ed25519 key pair from a seed
 * @param seed Seed (`SIGN_ED_SEEDBYTES` long)
 * @returns Key pair
 */
@global export function signEdKeypairFromSeed(seed: Uint8Array): Uint8Array {
    if (<isize>seed.length !== SIGN_ED_SEEDBYTES) {
        throw new Error('bad seed size');
    }
    let kp = new Uint8Array(<aisize>SIGN_ED_KEYPAIRBYTES);
    for (let i = 0; i < 32; ++i) {
        kp[i] = seed[i];
    }
    _signEdKeypairFromSeed(kp);

    return kp;
}

/**
 * Return the public key from an Ed25519 key pair
 * @param kp Key pair
 * @returns Public key
 */
@global export function signEdPublicKey(kp: Uint8Array): Uint8Array {
    const len = SIGN_ED_PUBLICKEYBYTES;
    let pk = new Uint8Array(<aisize>len);

    for (let i = <isize>0; i < len; ++i) {
        pk[<aisize>i] = kp[<aisize>(i + 32)];
    }
    return pk;
}

/**
 * Return the secret key from an Ed25519ED_ key pair
 * @param kp Key pair
 * @returns Secret key
 */
@global export function signEdSecretKey(kp: Uint8Array): Uint8Array {
    const len = SIGN_ED_SECRETKEYBYTES;
    let sk = new Uint8Array(<aisize>len);

    for (let i = <isize>0; i < len; ++i) {
        sk[<aisize>i] = kp[<aisize>i];
    }
    return sk;
}

/**
 * Initialize a multipart hash computation
 * @returns A hash function state
 */
@global export function hashInit(): Uint8Array {
    return Sha512._hashInit();
}

/**
 * Absorb data to be hashed
 * @param st Hash function state
 * @param m (partial) message
 */
@global export function hashUpdate(st: Uint8Array, m: Uint8Array): void {
    let r = load64_be(st, 64 + 128);
    let t = load64_be(st, 64 + 128 + 8);
    let n = m.length;

    t += n;
    r = Sha512._hashUpdate(st, m, n, r as isize);
    store64_be(st, 64 + 128, r as u64);
    store64_be(st, 64 + 128 + 8, t as u64);
}

/**
 * Finalize a hash computation
 * @param st Hash function state
 * @returns Hash
 */
@global export function hashFinal(st: Uint8Array): Uint8Array {
    let h = new Uint8Array(<aisize>HASH_BYTES);
    let r = load64_be(st, 64 + 128);
    let t = load64_be(st, 64 + 128 + 8);

    Sha512._hashFinal(st, h, t as isize, r as isize);

    return h;
}

/**
 * Compute a hash for a single-part message
 * @param m Message
 * @returns Hash
 */
@global export function hash(m: Uint8Array): Uint8Array {
    let h = new Uint8Array(<aisize>HASH_BYTES);
    Sha512._hash(h, m, m.length);
    return h;
}

/**
 * HMAC-SHA-512
 * @param m Message
 * @param k Key
 * @returns `HMAC-SHA-512(m, k)`
 */
@global export function hmac(m: Uint8Array, k: Uint8Array): Uint8Array {
    return Sha512._hmac(m, k);
}

/**
 * Initialize a multipart SHA-256 hash computation
 * @returns A hash function state
 */
@global export function sha256HashInit(): Uint8Array {
    return Sha256._hashInit();
}

/**
 * Absorb data to be hashed using SHA-256
 * @param st Hash function state
 * @param m (partial) message
 */
@global export function sha256HashUpdate(st: Uint8Array, m: Uint8Array): void {
    let r = load64_be(st, 32 + 64);
    let t = load64_be(st, 32 + 64 + 8);
    let n = m.length;
    t += n;
    r = Sha256._hashUpdate(st, m, n, r as isize);
    store64_be(st, 32 + 64, r as u64);
    store64_be(st, 32 + 64 + 8, t as u64);
}

/**
 * Finalize a SHA-256 hash computation
 * @param st Hash function state
 * @returns Hash
 */
@global export function sha256HashFinal(st: Uint8Array): Uint8Array {
    let h = new Uint8Array(<aisize>SHA256_HASH_BYTES);
    let r = load64_be(st, 32 + 64);
    let t = load64_be(st, 32 + 64 + 8);

    Sha256._hashFinal(st, h, t as isize, r as isize);

    return h;
}

/**
 * Compute a SHA-256 hash for a single-part message
 * @param m Message
 * @returns Hash
 */
@global export function sha256Hash(m: Uint8Array): Uint8Array {
    let h = new Uint8Array(<aisize>SHA256_HASH_BYTES);
    Sha256._hash(h, m, m.length);
    return h;
}

/**
 * HMAC-SHA-256
 * @param m Message
 * @param k Key
 * @returns `HMAC-SHA-256(m, k)`
 */
@global export function sha256Hmac(m: Uint8Array, k: Uint8Array): Uint8Array {
    return Sha256._hmac(m, k);
}

/**
 * Compute the multiplicative inverse of a scalar
 * @param s Scalar
 * @returns `s^-1`
 */
@global export function faScalarInverse(s: Uint8Array): Uint8Array {
    return scInverse(s);
}

/**
 * Compute s mod the order of the prime order group
 *
 * @param s Scalar (between 32 and 64 bytes)
 * @returns `s` reduced mod `L`
 */
@global export function faScalarReduce(s: Uint8Array): Uint8Array {
    let s_ = newScalarDouble();
    if (s.length < 32 || s.length > 64) {
        throw new Error('faScalarReduce() argument should be between 32 and 64 bytes long');
    }
    setU8(s_, s);
    scReduce(s_);
    let r = newScalarPacked();
    for (let i = 0; i < 32; ++i) {
        r[i] = s_[i];
    }
    return r;
}

/**
 * Multiply `s` by the Ed25519 group cofactor
 *
 * @param s Scalar (32 bytes)
 * @returns `s * 8`
 */
@global export function faScalarCofactorMult(s: Uint8Array): Uint8Array {
    if (s.length !== 32) {
        throw new Error('faScalarCofactorMult() argument should be 32 bytes long');
    }
    if ((s[31] & 224) !== 0) {
        throw new Error("faScalarCofactorMult() would overflow");
    }
    let r = newScalarPacked(), t: u8 = 0;
    for (let i = 0; i < 32; i++) {
        let si = s[i];
        r[i] = (si << 3) | t;
        t = (si >>> 5);
    }
    return r;
}

/**
 * Compute the additive inverse of a scalar (mod L)
 * @param s Scalar
 * @returns `-s`
 */
@global export function faScalarNegate(s: Uint8Array): Uint8Array {
    let t = newScalarPacked(), t_ = newScalarDouble(), s_ = newScalarDouble();

    for (let i = 0; i < 32; i++) {
        t_[32 + i] = _L[i] as u8;
    }
    setU8(s_, s);
    scSub(t_, s_);
    scReduce(t_);
    setU8(t, t_.subarray(0, 32));

    return t;
}

/**
 * Compute the complement of a scalar (mod L)
 * @param s Scalar
 * @returns `1-s`
 */
@global export function faScalarComplement(s: Uint8Array): Uint8Array {
    let t = newScalarPacked(), t_ = newScalarDouble(), s_ = newScalarDouble();
    t_[0] = 1;
    for (let i = 0; i < 32; i++) {
        t_[32 + i] = _L[i] as u8;
    }
    setU8(s_, s);
    scSub(t_, s_);
    scReduce(t_);
    setU8(t, t_.subarray(0, 32));

    return t;
}

/**
 * Compute `x + y (mod L)`
 * @param x Scalar
 * @param y Scalar
 * @returns `x + y (mod L)`
 */
@global export function faScalarAdd(x: Uint8Array, y: Uint8Array): Uint8Array {
    let x_ = newScalarDouble(), y_ = newScalarDouble();
    setU8(x_, x);
    setU8(y_, y);
    scAdd(x_, y_);

    return faScalarReduce(x_);
}

/**
 * Compute `x - y (mod L)`
 * @param x Scalar
 * @param y Scalar
 * @returns `x - y (mod L)`
 */
@global export function faScalarSub(x: Uint8Array, y: Uint8Array): Uint8Array {
    let yn = faScalarNegate(y);

    return faScalarAdd(x, yn);
}

/**
 * Check whether a scalar is in canonical form.
 * @param x Scalar
 * @returns true` is the scalar is in canonical form
 */
@global export function faScalarIsCanonical(x: Uint8Array): bool {
    return scIsLtL(x);
}

/**
 * Compute `x * y (mod L)`
 * @param x Scalar
 * @param y Scalar
 * @returns `x * y (mod L)`
 */
@global export function faScalarMult(x: Uint8Array, y: Uint8Array): Uint8Array {
    let x_ = newScalar(), y_ = newScalar();
    let o = newScalar(), o_ = newScalarPacked();

    for (let i = 0; i < 32; i++) {
        x_[i] = x[i] as i64;
    }
    for (let i = 0; i < 32; i++) {
        y_[i] = y[i] as i64;
    }
    scMult(o, x_, y_);
    for (let i = 0; i < 32; i++) {
        o_[i] = o[i] as u8;
    }
    return o_;
}

/**
 * Multiply a point by the cofactor
 * @param q Compressed EC point
 * @returns Compressed EC point `q * 8`
 */
@global export function faEdClearCofcator(q: Uint8Array): Uint8Array | null {
    let p_ = newGe();
    let q_ = newGe();
    if (!unpack(q_, q, false)) {
        return null;
    }
    clearCofactor(q_);
    let p = newGePacked();
    pack(p, p_);
    return p;
}

/**
 * Multiply a point `q` by a scalar `s`
 * @param q Compressed EC point
 * @param s Scalar
 * @returns Compressed EC point `q * s`
 */
@global export function faEdPointMult(s: Uint8Array, q: Uint8Array): Uint8Array | null {
    let p_ = newGe();
    let q_ = newGe();
    if (!unpack(q_, q, false) || !faEdPointValidate(q)) {
        return null;
    }
    scalarmult(p_, s, q_);
    let p = newGePacked();
    pack(p, p_);
    if (isIdentity(p)) {
        return null;
    }
    return p;
}

/**
 * Multiply the base point by a scalar `s`
 * @param s Scalar
 * @returns Compressed EC point `B * s`
 */
@global export function faEdBasePointMult(s: Uint8Array): Uint8Array | null {
    if (allZeros(s)) {
        return null;
    }
    let p = newGePacked();
    let p_ = newGe();
    scalarmultBase(p_, s);
    pack(p, p_);

    return p;
}

/**
 * Multiply a point `q` by a scalar `s` after clamping `s`
 * @param q Compressed EC point
 * @param s Scalar
 * @returns Compressed EC point `q * clamp(s)`
 */
@global export function faEdPointMultClamp(s: Uint8Array, q: Uint8Array): Uint8Array | null {
    let s_ = newScalarPacked();
    setU8(s_, s);
    scClamp(s_);

    return faEdPointMult(s_, q);
}

/**
 * Multiply the base point by a clamped scalar `s`
 * @param s Scalar
 * @returns Compressed EC point `B * clamp(s)`
 */
@global export function faEdBasePointMultClamp(s: Uint8Array): Uint8Array | null {
    let s_ = newScalarPacked();
    setU8(s_, s);
    scClamp(s_);

    return faEdBasePointMult(s_);
}

/**
 * Verify that the point is on the main subgroup
 * @param q Compressed EC point
 * @returns `true` if verification succeeds
 */
@global export function faEdPointValidate(q: Uint8Array): bool {
    if (isIdentity(q)) {
        return false;
    }
    let l = newGePacked();
    let p_ = newGe();
    let q_ = newGe();

    for (let i = 0; i < 32; ++i) {
        l[i] = _L[i] as u8;
    }
    if (!unpack(q_, q, false)) {
        return false;
    }
    scalarmult(p_, l, q_);

    let c: i64 = 0;
    let x = p_.x;
    for (let i = 0; i < 16; ++i) {
        c |= x[i];
    }
    return c === 0;
}

/**
 * Point addition
 * @param p Compressed EC point
 * @param q Compressed EC point
 * @returns `p` + `q`
 */
@global export function faEdPointAdd(p: Uint8Array, q: Uint8Array): Uint8Array | null {
    let o = newGePacked();
    let p_ = newGe();
    let q_ = newGe();
    if (!unpack(p_, p, false) || !unpack(q_, q, false)) {
        return null;
    }
    add(p_, q_);
    pack(o, p_);

    return o;
}

/**
 * Point subtraction
 * @param p Compressed EC point
 * @param q Compressed EC point
 * @returns `p` - `q`
 */
@global export function faEdPointSub(p: Uint8Array, q: Uint8Array): Uint8Array | null {
    let o = newGePacked();
    let p_ = newGe();
    let q_ = newGe();
    if (!unpack(p_, p, false) || !unpack(q_, q, true)) {
        return null;
    }
    add(p_, q_);
    pack(o, p_);

    return o;
}

/**
 * Flip the X coordinate of a point
 * @param p Compressed EC point
 * @returns `-p`
 */
@global export function faEdPointNeg(p: Uint8Array): Uint8Array | null {
    let negp = newGePacked();
    let negp_ = newGe();
    if (!unpack(negp_, p, true)) {
        return null;
    }
    pack(negp, negp_);

    return negp;
}

/**
 * Multiply a point `q` by a scalar `s`
 * @param q Ristretto-compressed EC point
 * @param s Scalar
 * @returns Compressed EC point `q * s`
 */
@global export function faPointMult(s: Uint8Array, q: Uint8Array): Uint8Array | null {
    let p_ = newGe();
    let q_ = newGe();
    if (!ristrettoUnpack(q_, q)) {
        return null;
    }
    scalarmult(p_, s, q_);
    let p = newGePacked();
    ristrettoPack(p, p_);
    if (ristrettoIsIdentity(p)) {
        return null;
    }
    return p;
}

/**
 * Multiply the base point by a scalar `s`
 * @param s Scalar
 * @returns Ristretto-compressed EC point `B * s`
 */
@global export function faBasePointMult(s: Uint8Array): Uint8Array | null {
    if (allZeros(s)) {
        return null;
    }
    let p = newGePacked();
    let p_ = newGe();
    scalarmultBase(p_, s);
    ristrettoPack(p, p_);

    return p;
}

/**
 * Verify that the point is on the main subgroup
 * @param q Ristretto-compressed EC point
 * @returns `true` if verification succeeds
 */
@global export function faPointValidate(q: Uint8Array): bool {
    let q_ = newGe();

    return (!ristrettoIsIdentity(q)) & ristrettoUnpack(q_, q);
}

/**
 * Point addition
 * @param p Risterto-compressed EC point
 * @param q Risterto-compressed EC point
 * @returns `p` + `q`
 */
@global export function faPointAdd(p: Uint8Array, q: Uint8Array): Uint8Array | null {
    let o = newGePacked();
    let p_ = newGe();
    let q_ = newGe();
    if (!ristrettoUnpack(p_, p) || !ristrettoUnpack(q_, q, false)) {
        return null;
    }
    add(p_, q_);
    ristrettoPack(o, p_);

    return o;
}

/**
 * Point subtraction
 * @param p Ristretto-compressed EC point
 * @param q Ristretto-compressed EC point
 * @returns `p` - `q`
 */
@global export function faPointSub(p: Uint8Array, q: Uint8Array): Uint8Array | null {
    let o = newGePacked();
    let p_ = newGe();
    let q_ = newGe();
    if (!ristrettoUnpack(p_, p) || !ristrettoUnpack(q_, q, true)) {
        return null;
    }
    add(p_, q_);
    ristrettoPack(o, p_);

    return o;
}

/**
 * Hash-to-point
 * @param r 512 bit hash
 * @returns Ristretto-compressed EC point
 */
@global export function faPointFromHash(r: Uint8Array): Uint8Array {
    let p = newGePacked();

    ristrettoFromHash(p, r);

    return p;
}

/**
 * (best-effort) Constant-time hexadecimal encoding
 * @param bin Binary data
 * @returns Hex-encoded representation
 */
@global export function bin2hex(bin: Uint8Array): string {
    let bin_len = bin.length;
    let hex = "";
    for (let i = 0; i < bin_len; i++) {
        let bin_i = bin[i] as u32;
        let c = bin_i & 0xf;
        let b = bin_i >> 4;
        let x: u32 = ((87 + c + (((c - 10) >> 8) & ~38)) << 8) |
            (87 + b + (((b - 10) >> 8) & ~38));
        hex += String.fromCharCode(x as u8);
        x >>= 8;
        hex += String.fromCharCode(x as u8);
    }
    return hex;
}

/**
 * (best-effort) Constant-time hexadecimal decoding
 * @param hex Hex-encoded data
 * @returns Raw binary representation
 */
@global export function hex2bin(hex: string): Uint8Array | null {
    let hex_len = hex.length;
    if ((hex_len & 1) !== 0) {
        return null;
    }
    let bin = new Uint8Array(<aisize>(hex_len / 2));
    let c_acc = 0;
    let bin_pos = 0;
    let state = false;
    for (let hex_pos = 0; hex_pos < hex_len; hex_pos++) {
        let c = hex.charCodeAt(hex_pos) as u32;
        let c_num = c ^ 48;
        let c_num0 = (c_num - 10) >> 8;
        let c_alpha = (c & ~32) - 55;
        let c_alpha0 = ((c_alpha - 10) ^ (c_alpha - 16)) >> 8;
        if ((c_num0 | c_alpha0) === 0) {
            return null;
        }
        let c_val = ((c_num0 & c_num) | (c_alpha0 & c_alpha)) as u8;
        if (state === false) {
            c_acc = c_val << 4;
        } else {
            bin[bin_pos++] = c_acc | c_val;
        }
        state = !state;
    }
    return bin;
}
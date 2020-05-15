import { PersistentMap, PersistentVector } from "near-sdk-as";

export default class PersistentOrderedMap<K, V> {
  private _map: PersistentMap<K, V>;
  private _keys: PersistentVector<K>;

  constructor(prefix: string) {
    this._map = new PersistentMap<K, V>(prefix + ":map");
    this._keys = new PersistentVector<K>(prefix + ":keys");
  }

  contains(key: K): bool {
    return this._map.contains(key);
  }

  getSome(key: K): V {
    return this._map.getSome(key);
  }

  get(key: K, defaultValue: V | null = null): V | null {
    return this._map.get(key, defaultValue);
  }

  last(count: i32): Map<K, V> {
    const n = min(count, this.length);
    const startIndex = this.length - n;
    const result = new Map<K, V>();
    for (let i = startIndex; i < this.length; i++) {
      const key = this._keys[i];
      result.set(key, this._map.getSome(key));
    }
    return result;
  }

  get length(): i32 {
    return this._keys.length;
  }

  pop(): Map<K, V> {
    const key = this._keys.pop();
    const value = this._map.getSome(key);
    this._map.delete(key);
    const ret = new Map<K, V>();
    ret.set(key, value);
    return ret;
  }

  upsert(key: K, value: V): void {
    if (this._map.contains(key)) {
      if (this._map.get(key) != value) {
        this._map.set(key, value);
      }
    } else {
      this._map.set(key, value);
      this._keys.push(key);
    }
  }
}

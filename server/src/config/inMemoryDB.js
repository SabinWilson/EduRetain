const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class InMemoryCollection {
  constructor(name) {
    this.name = name;
    this.items = [];
  }

  generateId() {
    return crypto.randomBytes(12).toString('hex');
  }

  matchQuery(item, query = {}) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const [key, val] of Object.entries(query)) {
      if (key === '$or') {
        const anyMatch = val.some((subQuery) => this.matchQuery(item, subQuery));
        if (!anyMatch) return false;
        continue;
      }

      if (key === '_id') {
        const idStr = item._id ? item._id.toString() : '';
        const targetId = val ? (val._id ? val._id.toString() : val.toString()) : '';
        if (typeof val === 'object' && val.$in) {
          const inList = val.$in.map((x) => x.toString());
          if (!inList.includes(idStr)) return false;
        } else if (idStr !== targetId) {
          return false;
        }
        continue;
      }

      const itemVal = item[key];

      if (val && typeof val === 'object' && val.$regex) {
        const regex = new RegExp(val.$regex, val.$options || 'i');
        if (!regex.test(String(itemVal || ''))) return false;
      } else if (val && typeof val === 'object' && val.$in) {
        const inValues = val.$in.map(String);
        if (!inValues.includes(String(itemVal))) return false;
      } else if (val && typeof val === 'object' && val.$avg) {
        continue;
      } else if (val !== undefined && String(itemVal) !== String(val)) {
        return false;
      }
    }
    return true;
  }

  wrapDoc(raw) {
    if (!raw) return null;
    const doc = { ...raw };

    doc._id = doc._id || this.generateId();
    doc.id = doc._id.toString();
    doc.toString = () => doc._id.toString();

    // Instance save method
    doc.save = async function () {
      const idx = this._collection.items.findIndex(
        (x) => x._id.toString() === doc._id.toString()
      );
      if (idx !== -1) {
        this._collection.items[idx] = { ...doc };
      } else {
        this._collection.items.push({ ...doc });
      }
      return doc;
    };
    Object.defineProperty(doc, '_collection', {
      value: this,
      enumerable: false,
      writable: true,
    });

    // Model specific helper methods
    if (this.name === 'User') {
      doc.comparePassword = async function (password) {
        return bcrypt.compare(password, this.passwordHash);
      };
    }

    return doc;
  }

  find(query = {}) {
    let results = this.items.filter((item) => this.matchQuery(item, query));
    return this.buildQueryChain(results);
  }

  findOne(query = {}) {
    const chain = this.buildQueryChain(this.items.filter((item) => this.matchQuery(item, query)));
    const origThen = chain.then.bind(chain);
    chain.then = (resolve, reject) => {
      return origThen((results) => {
        resolve(results.length > 0 ? results[0] : null);
      }, reject);
    };
    return chain;
  }

  findById(id) {
    if (!id) return this.findOne({ _id: '__none__' });
    const targetId = id._id ? id._id.toString() : id.toString();
    const chain = this.buildQueryChain(this.items.filter((x) => x._id.toString() === targetId));
    const origThen = chain.then.bind(chain);
    chain.then = (resolve, reject) => {
      return origThen((results) => {
        resolve(results.length > 0 ? results[0] : null);
      }, reject);
    };
    return chain;
  }

  async create(data) {
    if (Array.isArray(data)) {
      const created = data.map((d) => this.wrapDoc({ ...d, _id: this.generateId(), createdAt: new Date() }));
      this.items.push(...created);
      return created;
    }
    const doc = this.wrapDoc({
      ...data,
      _id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.items.push(doc);
    return doc;
  }

  async updateMany(query = {}, update = {}) {
    let count = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.matchQuery(this.items[i], query)) {
        if (update.$set) {
          this.items[i] = { ...this.items[i], ...update.$set, updatedAt: new Date() };
        } else {
          this.items[i] = { ...this.items[i], ...update, updatedAt: new Date() };
        }
        count++;
      }
    }
    return { modifiedCount: count };
  }

  async findOneAndUpdate(query = {}, update = {}, options = {}) {
    let item = this.items.find((x) => this.matchQuery(x, query));
    if (!item && options.upsert) {
      const newDoc = {
        ...query,
        ...(update.$set || update),
        _id: this.generateId(),
        createdAt: new Date(),
      };
      const wrapped = this.wrapDoc(newDoc);
      this.items.push(wrapped);
      return wrapped;
    } else if (item) {
      const updateData = update.$set || update;
      Object.assign(item, updateData, { updatedAt: new Date() });
      return this.wrapDoc(item);
    }
    return null;
  }

  async countDocuments(query = {}) {
    return this.items.filter((item) => this.matchQuery(item, query)).length;
  }

  async deleteMany(query = {}) {
    const prev = this.items.length;
    if (!query || Object.keys(query).length === 0) {
      this.items = [];
      return { deletedCount: prev };
    }
    this.items = this.items.filter((x) => !this.matchQuery(x, query));
    return { deletedCount: prev - this.items.length };
  }

  async aggregate(pipeline = []) {
    let current = [...this.items];
    for (const stage of pipeline) {
      if (stage.$match) {
        current = current.filter((x) => this.matchQuery(x, stage.$match));
      } else if (stage.$group) {
        const avgField = stage.$group.avgScore?.$avg?.replace('$', '');
        if (avgField) {
          const vals = current.map((x) => Number(x[avgField]) || 0);
          const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          return [{ _id: null, avgScore: avg }];
        }
      }
    }
    return current;
  }

  buildQueryChain(initialResults) {
    let results = initialResults.map((x) => this.wrapDoc(x));

    const chain = {
      _results: results,
      sort(criteria) {
        if (criteria && typeof criteria === 'object') {
          const [key, dir] = Object.entries(criteria)[0];
          this._results.sort((a, b) => {
            const vA = a[key] !== undefined ? a[key] : '';
            const vB = b[key] !== undefined ? b[key] : '';
            return dir === 1 || dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
          });
        }
        return this;
      },
      skip(count) {
        this._results = this._results.slice(count);
        return this;
      },
      limit(count) {
        this._results = this._results.slice(0, count);
        return this;
      },
      select(fields) {
        if (typeof fields === 'string' && fields.startsWith('-')) {
          const excluded = fields.slice(1);
          this._results.forEach((r) => delete r[excluded]);
        }
        return this;
      },
      populate(path, select) {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(this._results).then(resolve, reject);
      },
      catch(reject) {
        return Promise.resolve(this._results).catch(reject);
      },
    };

    return chain;
  }
}

const collections = {};

function getInMemoryCollection(name) {
  if (!collections[name]) {
    collections[name] = new InMemoryCollection(name);
  }
  return collections[name];
}

module.exports = { getInMemoryCollection };

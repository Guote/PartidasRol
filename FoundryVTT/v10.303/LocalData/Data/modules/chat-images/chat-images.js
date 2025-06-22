const chatImages = "", create = (n) => $(n), before = (n, i) => n.before(i), find = (n, i) => i ? i.find(n) : $(n), append = (n, i) => n.append(i), on = (n, i, c) => n.on(i, c), trigger = (n, i) => n.trigger(i), removeClass = (n, i) => n.removeClass(i), addClass = (n, i) => n.addClass(i), remove = (n) => n.remove(), attr = (n, i, c) => c ? n.attr(i, c) : n.attr(i), removeAttr = (n, i) => n.removeAttr(i), focus = (n) => n.focus(), createUploadArea = () => create('<div id="ci-chat-upload-area" class="hidden"></div>'), initUploadArea = (n) => {
  const i = find("#chat-controls", n), c = createUploadArea();
  before(i, c);
}, ORIGIN_FOLDER = "data", t = (n) => game.i18n.localize(`CI.${n}`), randomString = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), userCanUpload = (n = !1) => {
  var e, a, f, s;
  const i = (e = game == null ? void 0 : game.user) == null ? void 0 : e.role, c = (a = game == null ? void 0 : game.permissions) == null ? void 0 : a.FILES_UPLOAD;
  if (!i || !c)
    return n || (f = ui.notifications) == null || f.warn(t("uploadPermissions")), !1;
  const r = c.includes(i);
  return !r && !n && ((s = ui.notifications) == null || s.warn(t("uploadPermissions"))), r;
};
function _mergeNamespaces(n, i) {
  return i.forEach(function(c) {
    Object.keys(c).forEach(function(r) {
      if (r !== "default" && !(r in n)) {
        var e = Object.getOwnPropertyDescriptor(c, r);
        Object.defineProperty(n, r, e.get ? e : { enumerable: !0, get: function() {
          return c[r];
        } });
      }
    });
  }), Object.freeze(n);
}
function ownKeys(n, i) {
  var c = Object.keys(n);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(n);
    i && (r = r.filter(function(e) {
      return Object.getOwnPropertyDescriptor(n, e).enumerable;
    })), c.push.apply(c, r);
  }
  return c;
}
function _objectSpread2(n) {
  for (var i = 1; i < arguments.length; i++) {
    var c = arguments[i] != null ? arguments[i] : {};
    i % 2 ? ownKeys(Object(c), !0).forEach(function(r) {
      _defineProperty(n, r, c[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(c)) : ownKeys(Object(c)).forEach(function(r) {
      Object.defineProperty(n, r, Object.getOwnPropertyDescriptor(c, r));
    });
  }
  return n;
}
function _defineProperty(n, i, c) {
  return i in n ? Object.defineProperty(n, i, { value: c, enumerable: !0, configurable: !0, writable: !0 }) : n[i] = c, n;
}
function _slicedToArray(n, i) {
  return _arrayWithHoles(n) || _iterableToArrayLimit(n, i) || _unsupportedIterableToArray(n, i) || _nonIterableRest();
}
function _arrayWithHoles(n) {
  if (Array.isArray(n))
    return n;
}
function _iterableToArrayLimit(n, i) {
  var c = n == null ? null : typeof Symbol < "u" && n[Symbol.iterator] || n["@@iterator"];
  if (c != null) {
    var r, e, a = [], f = !0, s = !1;
    try {
      for (c = c.call(n); !(f = (r = c.next()).done) && (a.push(r.value), !i || a.length !== i); f = !0)
        ;
    } catch (u) {
      s = !0, e = u;
    } finally {
      try {
        f || c.return == null || c.return();
      } finally {
        if (s)
          throw e;
      }
    }
    return a;
  }
}
function _unsupportedIterableToArray(n, i) {
  if (n) {
    if (typeof n == "string")
      return _arrayLikeToArray(n, i);
    var c = Object.prototype.toString.call(n).slice(8, -1);
    return c === "Object" && n.constructor && (c = n.constructor.name), c === "Map" || c === "Set" ? Array.from(n) : c === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(c) ? _arrayLikeToArray(n, i) : void 0;
  }
}
function _arrayLikeToArray(n, i) {
  (i == null || i > n.length) && (i = n.length);
  for (var c = 0, r = new Array(i); c < i; c++)
    r[c] = n[c];
  return r;
}
function _nonIterableRest() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function createCommonjsModule(n) {
  var i = { exports: {} };
  return n(i, i.exports), i.exports;
}
var UZIP_1 = createCommonjsModule(function(n) {
  var i, c, r = {};
  n.exports = r, r.parse = function(e, a) {
    for (var f = r.bin.readUshort, s = r.bin.readUint, u = 0, l = {}, h = new Uint8Array(e), m = h.length - 4; s(h, m) != 101010256; )
      m--;
    u = m, u += 4;
    var d = f(h, u += 4);
    f(h, u += 2);
    var g = s(h, u += 2), p = s(h, u += 4);
    u += 4, u = p;
    for (var v = 0; v < d; v++) {
      s(h, u), u += 4, u += 4, u += 4, s(h, u += 4), g = s(h, u += 4);
      var U = s(h, u += 4), F = f(h, u += 4), I = f(h, u + 2), w = f(h, u + 4);
      u += 6;
      var C = s(h, u += 8);
      u += 4, u += F + I + w, r._readLocal(h, C, l, g, U, a);
    }
    return l;
  }, r._readLocal = function(e, a, f, s, u, l) {
    var h = r.bin.readUshort, m = r.bin.readUint;
    m(e, a), h(e, a += 4), h(e, a += 2);
    var d = h(e, a += 2);
    m(e, a += 2), m(e, a += 4), a += 4;
    var g = h(e, a += 8), p = h(e, a += 2);
    a += 2;
    var v = r.bin.readUTF8(e, a, g);
    if (a += g, a += p, l)
      f[v] = { size: u, csize: s };
    else {
      var U = new Uint8Array(e.buffer, a);
      if (d == 0)
        f[v] = new Uint8Array(U.buffer.slice(a, a + s));
      else {
        if (d != 8)
          throw "unknown compression method: " + d;
        var F = new Uint8Array(u);
        r.inflateRaw(U, F), f[v] = F;
      }
    }
  }, r.inflateRaw = function(e, a) {
    return r.F.inflate(e, a);
  }, r.inflate = function(e, a) {
    return e[0], e[1], r.inflateRaw(new Uint8Array(e.buffer, e.byteOffset + 2, e.length - 6), a);
  }, r.deflate = function(e, a) {
    a == null && (a = { level: 6 });
    var f = 0, s = new Uint8Array(50 + Math.floor(1.1 * e.length));
    s[f] = 120, s[f + 1] = 156, f += 2, f = r.F.deflateRaw(e, s, f, a.level);
    var u = r.adler(e, 0, e.length);
    return s[f + 0] = u >>> 24 & 255, s[f + 1] = u >>> 16 & 255, s[f + 2] = u >>> 8 & 255, s[f + 3] = u >>> 0 & 255, new Uint8Array(s.buffer, 0, f + 4);
  }, r.deflateRaw = function(e, a) {
    a == null && (a = { level: 6 });
    var f = new Uint8Array(50 + Math.floor(1.1 * e.length)), s = r.F.deflateRaw(e, f, s, a.level);
    return new Uint8Array(f.buffer, 0, s);
  }, r.encode = function(e, a) {
    a == null && (a = !1);
    var f = 0, s = r.bin.writeUint, u = r.bin.writeUshort, l = {};
    for (var h in e) {
      var m = !r._noNeed(h) && !a, d = e[h], g = r.crc.crc(d, 0, d.length);
      l[h] = { cpr: m, usize: d.length, crc: g, file: m ? r.deflateRaw(d) : d };
    }
    for (var h in l)
      f += l[h].file.length + 30 + 46 + 2 * r.bin.sizeUTF8(h);
    f += 22;
    var p = new Uint8Array(f), v = 0, U = [];
    for (var h in l) {
      var F = l[h];
      U.push(v), v = r._writeHeader(p, v, h, F, 0);
    }
    var I = 0, w = v;
    for (var h in l)
      F = l[h], U.push(v), v = r._writeHeader(p, v, h, F, 1, U[I++]);
    var C = v - w;
    return s(p, v, 101010256), v += 4, u(p, v += 4, I), u(p, v += 2, I), s(p, v += 2, C), s(p, v += 4, w), v += 4, v += 2, p.buffer;
  }, r._noNeed = function(e) {
    var a = e.split(".").pop().toLowerCase();
    return "png,jpg,jpeg,zip".indexOf(a) != -1;
  }, r._writeHeader = function(e, a, f, s, u, l) {
    var h = r.bin.writeUint, m = r.bin.writeUshort, d = s.file;
    return h(e, a, u == 0 ? 67324752 : 33639248), a += 4, u == 1 && (a += 2), m(e, a, 20), m(e, a += 2, 0), m(e, a += 2, s.cpr ? 8 : 0), h(e, a += 2, 0), h(e, a += 4, s.crc), h(e, a += 4, d.length), h(e, a += 4, s.usize), m(e, a += 4, r.bin.sizeUTF8(f)), m(e, a += 2, 0), a += 2, u == 1 && (a += 2, a += 2, h(e, a += 6, l), a += 4), a += r.bin.writeUTF8(e, a, f), u == 0 && (e.set(d, a), a += d.length), a;
  }, r.crc = { table: function() {
    for (var e = new Uint32Array(256), a = 0; a < 256; a++) {
      for (var f = a, s = 0; s < 8; s++)
        1 & f ? f = 3988292384 ^ f >>> 1 : f >>>= 1;
      e[a] = f;
    }
    return e;
  }(), update: function(e, a, f, s) {
    for (var u = 0; u < s; u++)
      e = r.crc.table[255 & (e ^ a[f + u])] ^ e >>> 8;
    return e;
  }, crc: function(e, a, f) {
    return 4294967295 ^ r.crc.update(4294967295, e, a, f);
  } }, r.adler = function(e, a, f) {
    for (var s = 1, u = 0, l = a, h = a + f; l < h; ) {
      for (var m = Math.min(l + 5552, h); l < m; )
        u += s += e[l++];
      s %= 65521, u %= 65521;
    }
    return u << 16 | s;
  }, r.bin = { readUshort: function(e, a) {
    return e[a] | e[a + 1] << 8;
  }, writeUshort: function(e, a, f) {
    e[a] = 255 & f, e[a + 1] = f >> 8 & 255;
  }, readUint: function(e, a) {
    return 16777216 * e[a + 3] + (e[a + 2] << 16 | e[a + 1] << 8 | e[a]);
  }, writeUint: function(e, a, f) {
    e[a] = 255 & f, e[a + 1] = f >> 8 & 255, e[a + 2] = f >> 16 & 255, e[a + 3] = f >> 24 & 255;
  }, readASCII: function(e, a, f) {
    for (var s = "", u = 0; u < f; u++)
      s += String.fromCharCode(e[a + u]);
    return s;
  }, writeASCII: function(e, a, f) {
    for (var s = 0; s < f.length; s++)
      e[a + s] = f.charCodeAt(s);
  }, pad: function(e) {
    return e.length < 2 ? "0" + e : e;
  }, readUTF8: function(e, a, f) {
    for (var s, u = "", l = 0; l < f; l++)
      u += "%" + r.bin.pad(e[a + l].toString(16));
    try {
      s = decodeURIComponent(u);
    } catch {
      return r.bin.readASCII(e, a, f);
    }
    return s;
  }, writeUTF8: function(e, a, f) {
    for (var s = f.length, u = 0, l = 0; l < s; l++) {
      var h = f.charCodeAt(l);
      if ((4294967168 & h) == 0)
        e[a + u] = h, u++;
      else if ((4294965248 & h) == 0)
        e[a + u] = 192 | h >> 6, e[a + u + 1] = 128 | h >> 0 & 63, u += 2;
      else if ((4294901760 & h) == 0)
        e[a + u] = 224 | h >> 12, e[a + u + 1] = 128 | h >> 6 & 63, e[a + u + 2] = 128 | h >> 0 & 63, u += 3;
      else {
        if ((4292870144 & h) != 0)
          throw "e";
        e[a + u] = 240 | h >> 18, e[a + u + 1] = 128 | h >> 12 & 63, e[a + u + 2] = 128 | h >> 6 & 63, e[a + u + 3] = 128 | h >> 0 & 63, u += 4;
      }
    }
    return u;
  }, sizeUTF8: function(e) {
    for (var a = e.length, f = 0, s = 0; s < a; s++) {
      var u = e.charCodeAt(s);
      if ((4294967168 & u) == 0)
        f++;
      else if ((4294965248 & u) == 0)
        f += 2;
      else if ((4294901760 & u) == 0)
        f += 3;
      else {
        if ((4292870144 & u) != 0)
          throw "e";
        f += 4;
      }
    }
    return f;
  } }, r.F = {}, r.F.deflateRaw = function(e, a, f, s) {
    var u = [[0, 0, 0, 0, 0], [4, 4, 8, 4, 0], [4, 5, 16, 8, 0], [4, 6, 16, 16, 0], [4, 10, 16, 32, 0], [8, 16, 32, 32, 0], [8, 16, 128, 128, 0], [8, 32, 128, 256, 0], [32, 128, 258, 1024, 1], [32, 258, 258, 4096, 1]][s], l = r.F.U, h = r.F._goodIndex;
    r.F._hash;
    var m = r.F._putsE, d = 0, g = f << 3, p = 0, v = e.length;
    if (s == 0) {
      for (; d < v; )
        m(a, g, d + (S = Math.min(65535, v - d)) == v ? 1 : 0), g = r.F._copyExact(e, d, S, a, g + 8), d += S;
      return g >>> 3;
    }
    var U = l.lits, F = l.strt, I = l.prev, w = 0, C = 0, b = 0, A = 0, P = 0, _ = 0;
    for (v > 2 && (F[_ = r.F._hash(e, 0)] = 0), d = 0; d < v; d++) {
      if (P = _, d + 1 < v - 2) {
        _ = r.F._hash(e, d + 1);
        var E = d + 1 & 32767;
        I[E] = F[_], F[_] = E;
      }
      if (p <= d) {
        (w > 14e3 || C > 26697) && v - d > 100 && (p < d && (U[w] = d - p, w += 2, p = d), g = r.F._writeBlock(d == v - 1 || p == v ? 1 : 0, U, w, A, e, b, d - b, a, g), w = C = A = 0, b = d);
        var y = 0;
        d < v - 2 && (y = r.F._bestMatch(e, d, I, P, Math.min(u[2], v - d), u[3]));
        var S = y >>> 16, R = 65535 & y;
        if (y != 0) {
          R = 65535 & y;
          var O = h(S = y >>> 16, l.of0);
          l.lhst[257 + O]++;
          var M = h(R, l.df0);
          l.dhst[M]++, A += l.exb[O] + l.dxb[M], U[w] = S << 23 | d - p, U[w + 1] = R << 16 | O << 8 | M, w += 2, p = d + S;
        } else
          l.lhst[e[d]]++;
        C++;
      }
    }
    for (b == d && e.length != 0 || (p < d && (U[w] = d - p, w += 2, p = d), g = r.F._writeBlock(1, U, w, A, e, b, d - b, a, g), w = 0, C = 0, w = C = A = 0, b = d); (7 & g) != 0; )
      g++;
    return g >>> 3;
  }, r.F._bestMatch = function(e, a, f, s, u, l) {
    var h = 32767 & a, m = f[h], d = h - m + 32768 & 32767;
    if (m == h || s != r.F._hash(e, a - d))
      return 0;
    for (var g = 0, p = 0, v = Math.min(32767, a); d <= v && --l != 0 && m != h; ) {
      if (g == 0 || e[a + g] == e[a + g - d]) {
        var U = r.F._howLong(e, a, d);
        if (U > g) {
          if (p = d, (g = U) >= u)
            break;
          d + 2 < U && (U = d + 2);
          for (var F = 0, I = 0; I < U - 2; I++) {
            var w = a - d + I + 32768 & 32767, C = w - f[w] + 32768 & 32767;
            C > F && (F = C, m = w);
          }
        }
      }
      d += (h = m) - (m = f[h]) + 32768 & 32767;
    }
    return g << 16 | p;
  }, r.F._howLong = function(e, a, f) {
    if (e[a] != e[a - f] || e[a + 1] != e[a + 1 - f] || e[a + 2] != e[a + 2 - f])
      return 0;
    var s = a, u = Math.min(e.length, a + 258);
    for (a += 3; a < u && e[a] == e[a - f]; )
      a++;
    return a - s;
  }, r.F._hash = function(e, a) {
    return (e[a] << 8 | e[a + 1]) + (e[a + 2] << 4) & 65535;
  }, r.saved = 0, r.F._writeBlock = function(e, a, f, s, u, l, h, m, d) {
    var g, p, v, U, F, I, w, C, b, A = r.F.U, P = r.F._putsF, _ = r.F._putsE;
    A.lhst[256]++, p = (g = r.F.getTrees())[0], v = g[1], U = g[2], F = g[3], I = g[4], w = g[5], C = g[6], b = g[7];
    var E = 32 + ((d + 3 & 7) == 0 ? 0 : 8 - (d + 3 & 7)) + (h << 3), y = s + r.F.contSize(A.fltree, A.lhst) + r.F.contSize(A.fdtree, A.dhst), S = s + r.F.contSize(A.ltree, A.lhst) + r.F.contSize(A.dtree, A.dhst);
    S += 14 + 3 * w + r.F.contSize(A.itree, A.ihst) + (2 * A.ihst[16] + 3 * A.ihst[17] + 7 * A.ihst[18]);
    for (var R = 0; R < 286; R++)
      A.lhst[R] = 0;
    for (R = 0; R < 30; R++)
      A.dhst[R] = 0;
    for (R = 0; R < 19; R++)
      A.ihst[R] = 0;
    var O = E < y && E < S ? 0 : y < S ? 1 : 2;
    if (P(m, d, e), P(m, d + 1, O), d += 3, O == 0) {
      for (; (7 & d) != 0; )
        d++;
      d = r.F._copyExact(u, l, h, m, d);
    } else {
      var M, B;
      if (O == 1 && (M = A.fltree, B = A.fdtree), O == 2) {
        r.F.makeCodes(A.ltree, p), r.F.revCodes(A.ltree, p), r.F.makeCodes(A.dtree, v), r.F.revCodes(A.dtree, v), r.F.makeCodes(A.itree, U), r.F.revCodes(A.itree, U), M = A.ltree, B = A.dtree, _(m, d, F - 257), _(m, d += 5, I - 1), _(m, d += 5, w - 4), d += 4;
        for (var G = 0; G < w; G++)
          _(m, d + 3 * G, A.itree[1 + (A.ordr[G] << 1)]);
        d += 3 * w, d = r.F._codeTiny(C, A.itree, m, d), d = r.F._codeTiny(b, A.itree, m, d);
      }
      for (var Z = l, x = 0; x < f; x += 2) {
        for (var D = a[x], T = D >>> 23, L = Z + (8388607 & D); Z < L; )
          d = r.F._writeLit(u[Z++], M, m, d);
        if (T != 0) {
          var q = a[x + 1], z = q >> 16, Q = q >> 8 & 255, V = 255 & q;
          _(m, d = r.F._writeLit(257 + Q, M, m, d), T - A.of0[Q]), d += A.exb[Q], P(m, d = r.F._writeLit(V, B, m, d), z - A.df0[V]), d += A.dxb[V], Z += T;
        }
      }
      d = r.F._writeLit(256, M, m, d);
    }
    return d;
  }, r.F._copyExact = function(e, a, f, s, u) {
    var l = u >>> 3;
    return s[l] = f, s[l + 1] = f >>> 8, s[l + 2] = 255 - s[l], s[l + 3] = 255 - s[l + 1], l += 4, s.set(new Uint8Array(e.buffer, a, f), l), u + (f + 4 << 3);
  }, r.F.getTrees = function() {
    for (var e = r.F.U, a = r.F._hufTree(e.lhst, e.ltree, 15), f = r.F._hufTree(e.dhst, e.dtree, 15), s = [], u = r.F._lenCodes(e.ltree, s), l = [], h = r.F._lenCodes(e.dtree, l), m = 0; m < s.length; m += 2)
      e.ihst[s[m]]++;
    for (m = 0; m < l.length; m += 2)
      e.ihst[l[m]]++;
    for (var d = r.F._hufTree(e.ihst, e.itree, 7), g = 19; g > 4 && e.itree[1 + (e.ordr[g - 1] << 1)] == 0; )
      g--;
    return [a, f, d, u, h, g, s, l];
  }, r.F.getSecond = function(e) {
    for (var a = [], f = 0; f < e.length; f += 2)
      a.push(e[f + 1]);
    return a;
  }, r.F.nonZero = function(e) {
    for (var a = "", f = 0; f < e.length; f += 2)
      e[f + 1] != 0 && (a += (f >> 1) + ",");
    return a;
  }, r.F.contSize = function(e, a) {
    for (var f = 0, s = 0; s < a.length; s++)
      f += a[s] * e[1 + (s << 1)];
    return f;
  }, r.F._codeTiny = function(e, a, f, s) {
    for (var u = 0; u < e.length; u += 2) {
      var l = e[u], h = e[u + 1];
      s = r.F._writeLit(l, a, f, s);
      var m = l == 16 ? 2 : l == 17 ? 3 : 7;
      l > 15 && (r.F._putsE(f, s, h, m), s += m);
    }
    return s;
  }, r.F._lenCodes = function(e, a) {
    for (var f = e.length; f != 2 && e[f - 1] == 0; )
      f -= 2;
    for (var s = 0; s < f; s += 2) {
      var u = e[s + 1], l = s + 3 < f ? e[s + 3] : -1, h = s + 5 < f ? e[s + 5] : -1, m = s == 0 ? -1 : e[s - 1];
      if (u == 0 && l == u && h == u) {
        for (var d = s + 5; d + 2 < f && e[d + 2] == u; )
          d += 2;
        (g = Math.min(d + 1 - s >>> 1, 138)) < 11 ? a.push(17, g - 3) : a.push(18, g - 11), s += 2 * g - 2;
      } else if (u == m && l == u && h == u) {
        for (d = s + 5; d + 2 < f && e[d + 2] == u; )
          d += 2;
        var g = Math.min(d + 1 - s >>> 1, 6);
        a.push(16, g - 3), s += 2 * g - 2;
      } else
        a.push(u, 0);
    }
    return f >>> 1;
  }, r.F._hufTree = function(e, a, f) {
    var s = [], u = e.length, l = a.length, h = 0;
    for (h = 0; h < l; h += 2)
      a[h] = 0, a[h + 1] = 0;
    for (h = 0; h < u; h++)
      e[h] != 0 && s.push({ lit: h, f: e[h] });
    var m = s.length, d = s.slice(0);
    if (m == 0)
      return 0;
    if (m == 1) {
      var g = s[0].lit;
      return d = g == 0 ? 1 : 0, a[1 + (g << 1)] = 1, a[1 + (d << 1)] = 1, 1;
    }
    s.sort(function(C, b) {
      return C.f - b.f;
    });
    var p = s[0], v = s[1], U = 0, F = 1, I = 2;
    for (s[0] = { lit: -1, f: p.f + v.f, l: p, r: v, d: 0 }; F != m - 1; )
      p = U != F && (I == m || s[U].f < s[I].f) ? s[U++] : s[I++], v = U != F && (I == m || s[U].f < s[I].f) ? s[U++] : s[I++], s[F++] = { lit: -1, f: p.f + v.f, l: p, r: v };
    var w = r.F.setDepth(s[F - 1], 0);
    for (w > f && (r.F.restrictDepth(d, f, w), w = f), h = 0; h < m; h++)
      a[1 + (d[h].lit << 1)] = d[h].d;
    return w;
  }, r.F.setDepth = function(e, a) {
    return e.lit != -1 ? (e.d = a, a) : Math.max(r.F.setDepth(e.l, a + 1), r.F.setDepth(e.r, a + 1));
  }, r.F.restrictDepth = function(e, a, f) {
    var s = 0, u = 1 << f - a, l = 0;
    for (e.sort(function(m, d) {
      return d.d == m.d ? m.f - d.f : d.d - m.d;
    }), s = 0; s < e.length && e[s].d > a; s++) {
      var h = e[s].d;
      e[s].d = a, l += u - (1 << f - h);
    }
    for (l >>>= f - a; l > 0; )
      (h = e[s].d) < a ? (e[s].d++, l -= 1 << a - h - 1) : s++;
    for (; s >= 0; s--)
      e[s].d == a && l < 0 && (e[s].d--, l++);
    l != 0 && console.log("debt left");
  }, r.F._goodIndex = function(e, a) {
    var f = 0;
    return a[16 | f] <= e && (f |= 16), a[8 | f] <= e && (f |= 8), a[4 | f] <= e && (f |= 4), a[2 | f] <= e && (f |= 2), a[1 | f] <= e && (f |= 1), f;
  }, r.F._writeLit = function(e, a, f, s) {
    return r.F._putsF(f, s, a[e << 1]), s + a[1 + (e << 1)];
  }, r.F.inflate = function(e, a) {
    var f = Uint8Array;
    if (e[0] == 3 && e[1] == 0)
      return a || new f(0);
    var s = r.F, u = s._bitsF, l = s._bitsE, h = s._decodeTiny, m = s.makeCodes, d = s.codes2map, g = s._get17, p = s.U, v = a == null;
    v && (a = new f(e.length >>> 2 << 3));
    for (var U, F, I = 0, w = 0, C = 0, b = 0, A = 0, P = 0, _ = 0, E = 0, y = 0; I == 0; )
      if (I = u(e, y, 1), w = u(e, y + 1, 2), y += 3, w != 0) {
        if (v && (a = r.F._check(a, E + (1 << 17))), w == 1 && (U = p.flmap, F = p.fdmap, P = 511, _ = 31), w == 2) {
          C = l(e, y, 5) + 257, b = l(e, y + 5, 5) + 1, A = l(e, y + 10, 4) + 4, y += 14;
          for (var S = 0; S < 38; S += 2)
            p.itree[S] = 0, p.itree[S + 1] = 0;
          var R = 1;
          for (S = 0; S < A; S++) {
            var O = l(e, y + 3 * S, 3);
            p.itree[1 + (p.ordr[S] << 1)] = O, O > R && (R = O);
          }
          y += 3 * A, m(p.itree, R), d(p.itree, R, p.imap), U = p.lmap, F = p.dmap, y = h(p.imap, (1 << R) - 1, C + b, e, y, p.ttree);
          var M = s._copyOut(p.ttree, 0, C, p.ltree);
          P = (1 << M) - 1;
          var B = s._copyOut(p.ttree, C, b, p.dtree);
          _ = (1 << B) - 1, m(p.ltree, M), d(p.ltree, M, U), m(p.dtree, B), d(p.dtree, B, F);
        }
        for (; ; ) {
          var G = U[g(e, y) & P];
          y += 15 & G;
          var Z = G >>> 4;
          if (Z >>> 8 == 0)
            a[E++] = Z;
          else {
            if (Z == 256)
              break;
            var x = E + Z - 254;
            if (Z > 264) {
              var D = p.ldef[Z - 257];
              x = E + (D >>> 3) + l(e, y, 7 & D), y += 7 & D;
            }
            var T = F[g(e, y) & _];
            y += 15 & T;
            var L = T >>> 4, q = p.ddef[L], z = (q >>> 4) + u(e, y, 15 & q);
            for (y += 15 & q, v && (a = r.F._check(a, E + (1 << 17))); E < x; )
              a[E] = a[E++ - z], a[E] = a[E++ - z], a[E] = a[E++ - z], a[E] = a[E++ - z];
            E = x;
          }
        }
      } else {
        (7 & y) != 0 && (y += 8 - (7 & y));
        var Q = 4 + (y >>> 3), V = e[Q - 4] | e[Q - 3] << 8;
        v && (a = r.F._check(a, E + V)), a.set(new f(e.buffer, e.byteOffset + Q, V), E), y = Q + V << 3, E += V;
      }
    return a.length == E ? a : a.slice(0, E);
  }, r.F._check = function(e, a) {
    var f = e.length;
    if (a <= f)
      return e;
    var s = new Uint8Array(Math.max(f << 1, a));
    return s.set(e, 0), s;
  }, r.F._decodeTiny = function(e, a, f, s, u, l) {
    for (var h = r.F._bitsE, m = r.F._get17, d = 0; d < f; ) {
      var g = e[m(s, u) & a];
      u += 15 & g;
      var p = g >>> 4;
      if (p <= 15)
        l[d] = p, d++;
      else {
        var v = 0, U = 0;
        p == 16 ? (U = 3 + h(s, u, 2), u += 2, v = l[d - 1]) : p == 17 ? (U = 3 + h(s, u, 3), u += 3) : p == 18 && (U = 11 + h(s, u, 7), u += 7);
        for (var F = d + U; d < F; )
          l[d] = v, d++;
      }
    }
    return u;
  }, r.F._copyOut = function(e, a, f, s) {
    for (var u = 0, l = 0, h = s.length >>> 1; l < f; ) {
      var m = e[l + a];
      s[l << 1] = 0, s[1 + (l << 1)] = m, m > u && (u = m), l++;
    }
    for (; l < h; )
      s[l << 1] = 0, s[1 + (l << 1)] = 0, l++;
    return u;
  }, r.F.makeCodes = function(e, a) {
    for (var f, s, u, l, h = r.F.U, m = e.length, d = h.bl_count, g = 0; g <= a; g++)
      d[g] = 0;
    for (g = 1; g < m; g += 2)
      d[e[g]]++;
    var p = h.next_code;
    for (f = 0, d[0] = 0, s = 1; s <= a; s++)
      f = f + d[s - 1] << 1, p[s] = f;
    for (u = 0; u < m; u += 2)
      (l = e[u + 1]) != 0 && (e[u] = p[l], p[l]++);
  }, r.F.codes2map = function(e, a, f) {
    for (var s = e.length, u = r.F.U.rev15, l = 0; l < s; l += 2)
      if (e[l + 1] != 0)
        for (var h = l >> 1, m = e[l + 1], d = h << 4 | m, g = a - m, p = e[l] << g, v = p + (1 << g); p != v; )
          f[u[p] >>> 15 - a] = d, p++;
  }, r.F.revCodes = function(e, a) {
    for (var f = r.F.U.rev15, s = 15 - a, u = 0; u < e.length; u += 2) {
      var l = e[u] << a - e[u + 1];
      e[u] = f[l] >>> s;
    }
  }, r.F._putsE = function(e, a, f) {
    f <<= 7 & a;
    var s = a >>> 3;
    e[s] |= f, e[s + 1] |= f >>> 8;
  }, r.F._putsF = function(e, a, f) {
    f <<= 7 & a;
    var s = a >>> 3;
    e[s] |= f, e[s + 1] |= f >>> 8, e[s + 2] |= f >>> 16;
  }, r.F._bitsE = function(e, a, f) {
    return (e[a >>> 3] | e[1 + (a >>> 3)] << 8) >>> (7 & a) & (1 << f) - 1;
  }, r.F._bitsF = function(e, a, f) {
    return (e[a >>> 3] | e[1 + (a >>> 3)] << 8 | e[2 + (a >>> 3)] << 16) >>> (7 & a) & (1 << f) - 1;
  }, r.F._get17 = function(e, a) {
    return (e[a >>> 3] | e[1 + (a >>> 3)] << 8 | e[2 + (a >>> 3)] << 16) >>> (7 & a);
  }, r.F._get25 = function(e, a) {
    return (e[a >>> 3] | e[1 + (a >>> 3)] << 8 | e[2 + (a >>> 3)] << 16 | e[3 + (a >>> 3)] << 24) >>> (7 & a);
  }, r.F.U = (i = Uint16Array, c = Uint32Array, { next_code: new i(16), bl_count: new i(16), ordr: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], of0: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999], exb: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0], ldef: new i(32), df0: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535, 65535], dxb: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0], ddef: new c(32), flmap: new i(512), fltree: [], fdmap: new i(32), fdtree: [], lmap: new i(32768), ltree: [], ttree: [], dmap: new i(32768), dtree: [], imap: new i(512), itree: [], rev15: new i(32768), lhst: new c(286), dhst: new c(30), ihst: new c(19), lits: new c(15e3), strt: new i(65536), prev: new i(32768) }), function() {
    for (var e = r.F.U, a = 0; a < 32768; a++) {
      var f = a;
      f = (4278255360 & (f = (4042322160 & (f = (3435973836 & (f = (2863311530 & f) >>> 1 | (1431655765 & f) << 1)) >>> 2 | (858993459 & f) << 2)) >>> 4 | (252645135 & f) << 4)) >>> 8 | (16711935 & f) << 8, e.rev15[a] = (f >>> 16 | f << 16) >>> 17;
    }
    function s(u, l, h) {
      for (; l-- != 0; )
        u.push(0, h);
    }
    for (a = 0; a < 32; a++)
      e.ldef[a] = e.of0[a] << 3 | e.exb[a], e.ddef[a] = e.df0[a] << 4 | e.dxb[a];
    s(e.fltree, 144, 8), s(e.fltree, 112, 9), s(e.fltree, 24, 7), s(e.fltree, 8, 8), r.F.makeCodes(e.fltree, 9), r.F.codes2map(e.fltree, 9, e.flmap), r.F.revCodes(e.fltree, 9), s(e.fdtree, 32, 5), r.F.makeCodes(e.fdtree, 5), r.F.codes2map(e.fdtree, 5, e.fdmap), r.F.revCodes(e.fdtree, 5), s(e.itree, 19, 0), s(e.ltree, 286, 0), s(e.dtree, 30, 0), s(e.ttree, 320, 0);
  }();
}), UZIP = Object.freeze(_mergeNamespaces({ __proto__: null, default: UZIP_1 }, [UZIP_1])), UPNG = {}, N, W, H;
UPNG.toRGBA8 = function(n) {
  var i = n.width, c = n.height;
  if (n.tabs.acTL == null)
    return [UPNG.toRGBA8.decodeImage(n.data, i, c, n).buffer];
  var r = [];
  n.frames[0].data == null && (n.frames[0].data = n.data);
  for (var e = i * c * 4, a = new Uint8Array(e), f = new Uint8Array(e), s = new Uint8Array(e), u = 0; u < n.frames.length; u++) {
    var l = n.frames[u], h = l.rect.x, m = l.rect.y, d = l.rect.width, g = l.rect.height, p = UPNG.toRGBA8.decodeImage(l.data, d, g, n);
    if (u != 0)
      for (var v = 0; v < e; v++)
        s[v] = a[v];
    if (l.blend == 0 ? UPNG._copyTile(p, d, g, a, i, c, h, m, 0) : l.blend == 1 && UPNG._copyTile(p, d, g, a, i, c, h, m, 1), r.push(a.buffer.slice(0)), l.dispose != 0) {
      if (l.dispose == 1)
        UPNG._copyTile(f, d, g, a, i, c, h, m, 0);
      else if (l.dispose == 2)
        for (v = 0; v < e; v++)
          a[v] = s[v];
    }
  }
  return r;
}, UPNG.toRGBA8.decodeImage = function(n, i, c, r) {
  var e = i * c, a = UPNG.decode._getBPP(r), f = Math.ceil(i * a / 8), s = new Uint8Array(4 * e), u = new Uint32Array(s.buffer), l = r.ctype, h = r.depth, m = UPNG._bin.readUshort;
  if (l == 6) {
    var d = e << 2;
    if (h == 8)
      for (var g = 0; g < d; g += 4)
        s[g] = n[g], s[g + 1] = n[g + 1], s[g + 2] = n[g + 2], s[g + 3] = n[g + 3];
    if (h == 16)
      for (g = 0; g < d; g++)
        s[g] = n[g << 1];
  } else if (l == 2) {
    var p = r.tabs.tRNS;
    if (p == null) {
      if (h == 8)
        for (g = 0; g < e; g++) {
          var v = 3 * g;
          u[g] = 255 << 24 | n[v + 2] << 16 | n[v + 1] << 8 | n[v];
        }
      if (h == 16)
        for (g = 0; g < e; g++)
          v = 6 * g, u[g] = 255 << 24 | n[v + 4] << 16 | n[v + 2] << 8 | n[v];
    } else {
      var U = p[0], F = p[1], I = p[2];
      if (h == 8)
        for (g = 0; g < e; g++) {
          var w = g << 2;
          v = 3 * g, u[g] = 255 << 24 | n[v + 2] << 16 | n[v + 1] << 8 | n[v], n[v] == U && n[v + 1] == F && n[v + 2] == I && (s[w + 3] = 0);
        }
      if (h == 16)
        for (g = 0; g < e; g++)
          w = g << 2, v = 6 * g, u[g] = 255 << 24 | n[v + 4] << 16 | n[v + 2] << 8 | n[v], m(n, v) == U && m(n, v + 2) == F && m(n, v + 4) == I && (s[w + 3] = 0);
    }
  } else if (l == 3) {
    var C = r.tabs.PLTE, b = r.tabs.tRNS, A = b ? b.length : 0;
    if (h == 1)
      for (var P = 0; P < c; P++) {
        var _ = P * f, E = P * i;
        for (g = 0; g < i; g++) {
          w = E + g << 2;
          var y = 3 * (S = n[_ + (g >> 3)] >> 7 - ((7 & g) << 0) & 1);
          s[w] = C[y], s[w + 1] = C[y + 1], s[w + 2] = C[y + 2], s[w + 3] = S < A ? b[S] : 255;
        }
      }
    if (h == 2)
      for (P = 0; P < c; P++)
        for (_ = P * f, E = P * i, g = 0; g < i; g++)
          w = E + g << 2, y = 3 * (S = n[_ + (g >> 2)] >> 6 - ((3 & g) << 1) & 3), s[w] = C[y], s[w + 1] = C[y + 1], s[w + 2] = C[y + 2], s[w + 3] = S < A ? b[S] : 255;
    if (h == 4)
      for (P = 0; P < c; P++)
        for (_ = P * f, E = P * i, g = 0; g < i; g++)
          w = E + g << 2, y = 3 * (S = n[_ + (g >> 1)] >> 4 - ((1 & g) << 2) & 15), s[w] = C[y], s[w + 1] = C[y + 1], s[w + 2] = C[y + 2], s[w + 3] = S < A ? b[S] : 255;
    if (h == 8)
      for (g = 0; g < e; g++) {
        var S;
        w = g << 2, y = 3 * (S = n[g]), s[w] = C[y], s[w + 1] = C[y + 1], s[w + 2] = C[y + 2], s[w + 3] = S < A ? b[S] : 255;
      }
  } else if (l == 4) {
    if (h == 8)
      for (g = 0; g < e; g++) {
        w = g << 2;
        var R = n[O = g << 1];
        s[w] = R, s[w + 1] = R, s[w + 2] = R, s[w + 3] = n[O + 1];
      }
    if (h == 16)
      for (g = 0; g < e; g++) {
        var O;
        w = g << 2, R = n[O = g << 2], s[w] = R, s[w + 1] = R, s[w + 2] = R, s[w + 3] = n[O + 2];
      }
  } else if (l == 0)
    for (U = r.tabs.tRNS ? r.tabs.tRNS : -1, P = 0; P < c; P++) {
      var M = P * f, B = P * i;
      if (h == 1)
        for (var G = 0; G < i; G++) {
          var Z = (R = 255 * (n[M + (G >>> 3)] >>> 7 - (7 & G) & 1)) == 255 * U ? 0 : 255;
          u[B + G] = Z << 24 | R << 16 | R << 8 | R;
        }
      else if (h == 2)
        for (G = 0; G < i; G++)
          Z = (R = 85 * (n[M + (G >>> 2)] >>> 6 - ((3 & G) << 1) & 3)) == 85 * U ? 0 : 255, u[B + G] = Z << 24 | R << 16 | R << 8 | R;
      else if (h == 4)
        for (G = 0; G < i; G++)
          Z = (R = 17 * (n[M + (G >>> 1)] >>> 4 - ((1 & G) << 2) & 15)) == 17 * U ? 0 : 255, u[B + G] = Z << 24 | R << 16 | R << 8 | R;
      else if (h == 8)
        for (G = 0; G < i; G++)
          Z = (R = n[M + G]) == U ? 0 : 255, u[B + G] = Z << 24 | R << 16 | R << 8 | R;
      else if (h == 16)
        for (G = 0; G < i; G++)
          R = n[M + (G << 1)], Z = m(n, M + (G << g)) == U ? 0 : 255, u[B + G] = Z << 24 | R << 16 | R << 8 | R;
    }
  return s;
}, UPNG.decode = function(n) {
  for (var i, c = new Uint8Array(n), r = 8, e = UPNG._bin, a = e.readUshort, f = e.readUint, s = { tabs: {}, frames: [] }, u = new Uint8Array(c.length), l = 0, h = 0, m = [137, 80, 78, 71, 13, 10, 26, 10], d = 0; d < 8; d++)
    if (c[d] != m[d])
      throw "The input is not a PNG file!";
  for (; r < c.length; ) {
    var g = e.readUint(c, r);
    r += 4;
    var p = e.readASCII(c, r, 4);
    if (r += 4, p == "IHDR")
      UPNG.decode._IHDR(c, r, s);
    else if (p == "CgBI")
      s.tabs[p] = c.slice(r, r + 4);
    else if (p == "IDAT") {
      for (d = 0; d < g; d++)
        u[l + d] = c[r + d];
      l += g;
    } else if (p == "acTL")
      s.tabs[p] = { num_frames: f(c, r), num_plays: f(c, r + 4) }, i = new Uint8Array(c.length);
    else if (p == "fcTL") {
      var v;
      h != 0 && ((v = s.frames[s.frames.length - 1]).data = UPNG.decode._decompress(s, i.slice(0, h), v.rect.width, v.rect.height), h = 0);
      var U = { x: f(c, r + 12), y: f(c, r + 16), width: f(c, r + 4), height: f(c, r + 8) }, F = a(c, r + 22);
      F = a(c, r + 20) / (F == 0 ? 100 : F);
      var I = { rect: U, delay: Math.round(1e3 * F), dispose: c[r + 24], blend: c[r + 25] };
      s.frames.push(I);
    } else if (p == "fdAT") {
      for (d = 0; d < g - 4; d++)
        i[h + d] = c[r + d + 4];
      h += g - 4;
    } else if (p == "pHYs")
      s.tabs[p] = [e.readUint(c, r), e.readUint(c, r + 4), c[r + 8]];
    else if (p == "cHRM")
      for (s.tabs[p] = [], d = 0; d < 8; d++)
        s.tabs[p].push(e.readUint(c, r + 4 * d));
    else if (p == "tEXt" || p == "zTXt") {
      s.tabs[p] == null && (s.tabs[p] = {});
      var w = e.nextZero(c, r), C = e.readASCII(c, r, w - r), b = r + g - w - 1;
      if (p == "tEXt")
        _ = e.readASCII(c, w + 1, b);
      else {
        var A = UPNG.decode._inflate(c.slice(w + 2, w + 2 + b));
        _ = e.readUTF8(A, 0, A.length);
      }
      s.tabs[p][C] = _;
    } else if (p == "iTXt") {
      s.tabs[p] == null && (s.tabs[p] = {}), w = 0;
      var P = r;
      w = e.nextZero(c, P), C = e.readASCII(c, P, w - P);
      var _, E = c[P = w + 1];
      c[P + 1], P += 2, w = e.nextZero(c, P), e.readASCII(c, P, w - P), P = w + 1, w = e.nextZero(c, P), e.readUTF8(c, P, w - P), b = g - ((P = w + 1) - r), E == 0 ? _ = e.readUTF8(c, P, b) : (A = UPNG.decode._inflate(c.slice(P, P + b)), _ = e.readUTF8(A, 0, A.length)), s.tabs[p][C] = _;
    } else if (p == "PLTE")
      s.tabs[p] = e.readBytes(c, r, g);
    else if (p == "hIST") {
      var y = s.tabs.PLTE.length / 3;
      for (s.tabs[p] = [], d = 0; d < y; d++)
        s.tabs[p].push(a(c, r + 2 * d));
    } else if (p == "tRNS")
      s.ctype == 3 ? s.tabs[p] = e.readBytes(c, r, g) : s.ctype == 0 ? s.tabs[p] = a(c, r) : s.ctype == 2 && (s.tabs[p] = [a(c, r), a(c, r + 2), a(c, r + 4)]);
    else if (p == "gAMA")
      s.tabs[p] = e.readUint(c, r) / 1e5;
    else if (p == "sRGB")
      s.tabs[p] = c[r];
    else if (p == "bKGD")
      s.ctype == 0 || s.ctype == 4 ? s.tabs[p] = [a(c, r)] : s.ctype == 2 || s.ctype == 6 ? s.tabs[p] = [a(c, r), a(c, r + 2), a(c, r + 4)] : s.ctype == 3 && (s.tabs[p] = c[r]);
    else if (p == "IEND")
      break;
    r += g, e.readUint(c, r), r += 4;
  }
  return h != 0 && ((v = s.frames[s.frames.length - 1]).data = UPNG.decode._decompress(s, i.slice(0, h), v.rect.width, v.rect.height), h = 0), s.data = UPNG.decode._decompress(s, u, s.width, s.height), delete s.compress, delete s.interlace, delete s.filter, s;
}, UPNG.decode._decompress = function(n, i, c, r) {
  var e = UPNG.decode._getBPP(n), a = Math.ceil(c * e / 8), f = new Uint8Array((a + 1 + n.interlace) * r);
  return i = n.tabs.CgBI ? UPNG.inflateRaw(i, f) : UPNG.decode._inflate(i, f), n.interlace == 0 ? i = UPNG.decode._filterZero(i, n, 0, c, r) : n.interlace == 1 && (i = UPNG.decode._readInterlace(i, n)), i;
}, UPNG.decode._inflate = function(n, i) {
  return UPNG.inflateRaw(new Uint8Array(n.buffer, 2, n.length - 6), i);
}, UPNG.inflateRaw = (H = {}, H.H = {}, H.H.N = function(n, i) {
  var c, r, e = Uint8Array, a = 0, f = 0, s = 0, u = 0, l = 0, h = 0, m = 0, d = 0, g = 0;
  if (n[0] == 3 && n[1] == 0)
    return i || new e(0);
  var p = H.H, v = p.b, U = p.e, F = p.R, I = p.n, w = p.A, C = p.Z, b = p.m, A = i == null;
  for (A && (i = new e(n.length >>> 2 << 5)); a == 0; )
    if (a = v(n, g, 1), f = v(n, g + 1, 2), g += 3, f != 0) {
      if (A && (i = H.H.W(i, d + (1 << 17))), f == 1 && (c = b.J, r = b.h, h = 511, m = 31), f == 2) {
        s = U(n, g, 5) + 257, u = U(n, g + 5, 5) + 1, l = U(n, g + 10, 4) + 4, g += 14;
        for (var P = 1, _ = 0; _ < 38; _ += 2)
          b.Q[_] = 0, b.Q[_ + 1] = 0;
        for (_ = 0; _ < l; _++) {
          var E = U(n, g + 3 * _, 3);
          b.Q[1 + (b.X[_] << 1)] = E, E > P && (P = E);
        }
        g += 3 * l, I(b.Q, P), w(b.Q, P, b.u), c = b.w, r = b.d, g = F(b.u, (1 << P) - 1, s + u, n, g, b.v);
        var y = p.V(b.v, 0, s, b.C);
        h = (1 << y) - 1;
        var S = p.V(b.v, s, u, b.D);
        m = (1 << S) - 1, I(b.C, y), w(b.C, y, c), I(b.D, S), w(b.D, S, r);
      }
      for (; ; ) {
        var R = c[C(n, g) & h];
        g += 15 & R;
        var O = R >>> 4;
        if (O >>> 8 == 0)
          i[d++] = O;
        else {
          if (O == 256)
            break;
          var M = d + O - 254;
          if (O > 264) {
            var B = b.q[O - 257];
            M = d + (B >>> 3) + U(n, g, 7 & B), g += 7 & B;
          }
          var G = r[C(n, g) & m];
          g += 15 & G;
          var Z = G >>> 4, x = b.c[Z], D = (x >>> 4) + v(n, g, 15 & x);
          for (g += 15 & x; d < M; )
            i[d] = i[d++ - D], i[d] = i[d++ - D], i[d] = i[d++ - D], i[d] = i[d++ - D];
          d = M;
        }
      }
    } else {
      (7 & g) != 0 && (g += 8 - (7 & g));
      var T = 4 + (g >>> 3), L = n[T - 4] | n[T - 3] << 8;
      A && (i = H.H.W(i, d + L)), i.set(new e(n.buffer, n.byteOffset + T, L), d), g = T + L << 3, d += L;
    }
  return i.length == d ? i : i.slice(0, d);
}, H.H.W = function(n, i) {
  var c = n.length;
  if (i <= c)
    return n;
  var r = new Uint8Array(c << 1);
  return r.set(n, 0), r;
}, H.H.R = function(n, i, c, r, e, a) {
  for (var f = H.H.e, s = H.H.Z, u = 0; u < c; ) {
    var l = n[s(r, e) & i];
    e += 15 & l;
    var h = l >>> 4;
    if (h <= 15)
      a[u] = h, u++;
    else {
      var m = 0, d = 0;
      h == 16 ? (d = 3 + f(r, e, 2), e += 2, m = a[u - 1]) : h == 17 ? (d = 3 + f(r, e, 3), e += 3) : h == 18 && (d = 11 + f(r, e, 7), e += 7);
      for (var g = u + d; u < g; )
        a[u] = m, u++;
    }
  }
  return e;
}, H.H.V = function(n, i, c, r) {
  for (var e = 0, a = 0, f = r.length >>> 1; a < c; ) {
    var s = n[a + i];
    r[a << 1] = 0, r[1 + (a << 1)] = s, s > e && (e = s), a++;
  }
  for (; a < f; )
    r[a << 1] = 0, r[1 + (a << 1)] = 0, a++;
  return e;
}, H.H.n = function(n, i) {
  for (var c, r, e, a, f = H.H.m, s = n.length, u = f.j, l = 0; l <= i; l++)
    u[l] = 0;
  for (l = 1; l < s; l += 2)
    u[n[l]]++;
  var h = f.K;
  for (c = 0, u[0] = 0, r = 1; r <= i; r++)
    c = c + u[r - 1] << 1, h[r] = c;
  for (e = 0; e < s; e += 2)
    (a = n[e + 1]) != 0 && (n[e] = h[a], h[a]++);
}, H.H.A = function(n, i, c) {
  for (var r = n.length, e = H.H.m.r, a = 0; a < r; a += 2)
    if (n[a + 1] != 0)
      for (var f = a >> 1, s = n[a + 1], u = f << 4 | s, l = i - s, h = n[a] << l, m = h + (1 << l); h != m; )
        c[e[h] >>> 15 - i] = u, h++;
}, H.H.l = function(n, i) {
  for (var c = H.H.m.r, r = 15 - i, e = 0; e < n.length; e += 2) {
    var a = n[e] << i - n[e + 1];
    n[e] = c[a] >>> r;
  }
}, H.H.M = function(n, i, c) {
  c <<= 7 & i;
  var r = i >>> 3;
  n[r] |= c, n[r + 1] |= c >>> 8;
}, H.H.I = function(n, i, c) {
  c <<= 7 & i;
  var r = i >>> 3;
  n[r] |= c, n[r + 1] |= c >>> 8, n[r + 2] |= c >>> 16;
}, H.H.e = function(n, i, c) {
  return (n[i >>> 3] | n[1 + (i >>> 3)] << 8) >>> (7 & i) & (1 << c) - 1;
}, H.H.b = function(n, i, c) {
  return (n[i >>> 3] | n[1 + (i >>> 3)] << 8 | n[2 + (i >>> 3)] << 16) >>> (7 & i) & (1 << c) - 1;
}, H.H.Z = function(n, i) {
  return (n[i >>> 3] | n[1 + (i >>> 3)] << 8 | n[2 + (i >>> 3)] << 16) >>> (7 & i);
}, H.H.i = function(n, i) {
  return (n[i >>> 3] | n[1 + (i >>> 3)] << 8 | n[2 + (i >>> 3)] << 16 | n[3 + (i >>> 3)] << 24) >>> (7 & i);
}, H.H.m = (N = Uint16Array, W = Uint32Array, { K: new N(16), j: new N(16), X: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], S: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999], T: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0], q: new N(32), p: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535, 65535], z: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0], c: new W(32), J: new N(512), _: [], h: new N(32), $: [], w: new N(32768), C: [], v: [], d: new N(32768), D: [], u: new N(512), Q: [], r: new N(32768), s: new W(286), Y: new W(30), a: new W(19), t: new W(15e3), k: new N(65536), g: new N(32768) }), function() {
  for (var n = H.H.m, i = 0; i < 32768; i++) {
    var c = i;
    c = (4278255360 & (c = (4042322160 & (c = (3435973836 & (c = (2863311530 & c) >>> 1 | (1431655765 & c) << 1)) >>> 2 | (858993459 & c) << 2)) >>> 4 | (252645135 & c) << 4)) >>> 8 | (16711935 & c) << 8, n.r[i] = (c >>> 16 | c << 16) >>> 17;
  }
  function r(e, a, f) {
    for (; a-- != 0; )
      e.push(0, f);
  }
  for (i = 0; i < 32; i++)
    n.q[i] = n.S[i] << 3 | n.T[i], n.c[i] = n.p[i] << 4 | n.z[i];
  r(n._, 144, 8), r(n._, 112, 9), r(n._, 24, 7), r(n._, 8, 8), H.H.n(n._, 9), H.H.A(n._, 9, n.J), H.H.l(n._, 9), r(n.$, 32, 5), H.H.n(n.$, 5), H.H.A(n.$, 5, n.h), H.H.l(n.$, 5), r(n.Q, 19, 0), r(n.C, 286, 0), r(n.D, 30, 0), r(n.v, 320, 0);
}(), H.H.N), UPNG.decode._readInterlace = function(n, i) {
  for (var c = i.width, r = i.height, e = UPNG.decode._getBPP(i), a = e >> 3, f = Math.ceil(c * e / 8), s = new Uint8Array(r * f), u = 0, l = [0, 0, 4, 0, 2, 0, 1], h = [0, 4, 0, 2, 0, 1, 0], m = [8, 8, 8, 4, 4, 2, 2], d = [8, 8, 4, 4, 2, 2, 1], g = 0; g < 7; ) {
    for (var p = m[g], v = d[g], U = 0, F = 0, I = l[g]; I < r; )
      I += p, F++;
    for (var w = h[g]; w < c; )
      w += v, U++;
    var C = Math.ceil(U * e / 8);
    UPNG.decode._filterZero(n, i, u, U, F);
    for (var b = 0, A = l[g]; A < r; ) {
      for (var P = h[g], _ = u + b * C << 3; P < c; ) {
        var E;
        if (e == 1 && (E = (E = n[_ >> 3]) >> 7 - (7 & _) & 1, s[A * f + (P >> 3)] |= E << 7 - ((7 & P) << 0)), e == 2 && (E = (E = n[_ >> 3]) >> 6 - (7 & _) & 3, s[A * f + (P >> 2)] |= E << 6 - ((3 & P) << 1)), e == 4 && (E = (E = n[_ >> 3]) >> 4 - (7 & _) & 15, s[A * f + (P >> 1)] |= E << 4 - ((1 & P) << 2)), e >= 8)
          for (var y = A * f + P * a, S = 0; S < a; S++)
            s[y + S] = n[(_ >> 3) + S];
        _ += e, P += v;
      }
      b++, A += p;
    }
    U * F != 0 && (u += F * (1 + C)), g += 1;
  }
  return s;
}, UPNG.decode._getBPP = function(n) {
  return [1, null, 3, 1, 2, null, 4][n.ctype] * n.depth;
}, UPNG.decode._filterZero = function(n, i, c, r, e) {
  var a = UPNG.decode._getBPP(i), f = Math.ceil(r * a / 8), s = UPNG.decode._paeth;
  a = Math.ceil(a / 8);
  var u = 0, l = 1, h = n[c], m = 0;
  if (h > 1 && (n[c] = [0, 0, 1][h - 2]), h == 3)
    for (m = a; m < f; m++)
      n[m + 1] = n[m + 1] + (n[m + 1 - a] >>> 1) & 255;
  for (var d = 0; d < e; d++)
    if (m = 0, (h = n[(l = (u = c + d * f) + d + 1) - 1]) == 0)
      for (; m < f; m++)
        n[u + m] = n[l + m];
    else if (h == 1) {
      for (; m < a; m++)
        n[u + m] = n[l + m];
      for (; m < f; m++)
        n[u + m] = n[l + m] + n[u + m - a];
    } else if (h == 2)
      for (; m < f; m++)
        n[u + m] = n[l + m] + n[u + m - f];
    else if (h == 3) {
      for (; m < a; m++)
        n[u + m] = n[l + m] + (n[u + m - f] >>> 1);
      for (; m < f; m++)
        n[u + m] = n[l + m] + (n[u + m - f] + n[u + m - a] >>> 1);
    } else {
      for (; m < a; m++)
        n[u + m] = n[l + m] + s(0, n[u + m - f], 0);
      for (; m < f; m++)
        n[u + m] = n[l + m] + s(n[u + m - a], n[u + m - f], n[u + m - a - f]);
    }
  return n;
}, UPNG.decode._paeth = function(n, i, c) {
  var r = n + i - c, e = r - n, a = r - i, f = r - c;
  return e * e <= a * a && e * e <= f * f ? n : a * a <= f * f ? i : c;
}, UPNG.decode._IHDR = function(n, i, c) {
  var r = UPNG._bin;
  c.width = r.readUint(n, i), i += 4, c.height = r.readUint(n, i), i += 4, c.depth = n[i], i++, c.ctype = n[i], i++, c.compress = n[i], i++, c.filter = n[i], i++, c.interlace = n[i], i++;
}, UPNG._bin = { nextZero: function(i, c) {
  for (; i[c] != 0; )
    c++;
  return c;
}, readUshort: function(i, c) {
  return i[c] << 8 | i[c + 1];
}, writeUshort: function(i, c, r) {
  i[c] = r >> 8 & 255, i[c + 1] = 255 & r;
}, readUint: function(i, c) {
  return 16777216 * i[c] + (i[c + 1] << 16 | i[c + 2] << 8 | i[c + 3]);
}, writeUint: function(i, c, r) {
  i[c] = r >> 24 & 255, i[c + 1] = r >> 16 & 255, i[c + 2] = r >> 8 & 255, i[c + 3] = 255 & r;
}, readASCII: function(i, c, r) {
  for (var e = "", a = 0; a < r; a++)
    e += String.fromCharCode(i[c + a]);
  return e;
}, writeASCII: function(i, c, r) {
  for (var e = 0; e < r.length; e++)
    i[c + e] = r.charCodeAt(e);
}, readBytes: function(i, c, r) {
  for (var e = [], a = 0; a < r; a++)
    e.push(i[c + a]);
  return e;
}, pad: function(i) {
  return i.length < 2 ? "0".concat(i) : i;
}, readUTF8: function(i, c, r) {
  for (var e, a = "", f = 0; f < r; f++)
    a += "%".concat(UPNG._bin.pad(i[c + f].toString(16)));
  try {
    e = decodeURIComponent(a);
  } catch {
    return UPNG._bin.readASCII(i, c, r);
  }
  return e;
} }, UPNG._copyTile = function(n, i, c, r, e, a, f, s, u) {
  for (var l = Math.min(i, e), h = Math.min(c, a), m = 0, d = 0, g = 0; g < h; g++)
    for (var p = 0; p < l; p++)
      if (f >= 0 && s >= 0 ? (m = g * i + p << 2, d = (s + g) * e + f + p << 2) : (m = (-s + g) * i - f + p << 2, d = g * e + p << 2), u == 0)
        r[d] = n[m], r[d + 1] = n[m + 1], r[d + 2] = n[m + 2], r[d + 3] = n[m + 3];
      else if (u == 1) {
        var v = n[m + 3] * 0.00392156862745098, U = n[m] * v, F = n[m + 1] * v, I = n[m + 2] * v, w = r[d + 3] * (1 / 255), C = r[d] * w, b = r[d + 1] * w, A = r[d + 2] * w, P = 1 - v, _ = v + w * P, E = _ == 0 ? 0 : 1 / _;
        r[d + 3] = 255 * _, r[d + 0] = (U + C * P) * E, r[d + 1] = (F + b * P) * E, r[d + 2] = (I + A * P) * E;
      } else if (u == 2)
        v = n[m + 3], U = n[m], F = n[m + 1], I = n[m + 2], w = r[d + 3], C = r[d], b = r[d + 1], A = r[d + 2], v == w && U == C && F == b && I == A ? (r[d] = 0, r[d + 1] = 0, r[d + 2] = 0, r[d + 3] = 0) : (r[d] = U, r[d + 1] = F, r[d + 2] = I, r[d + 3] = v);
      else if (u == 3) {
        if (v = n[m + 3], U = n[m], F = n[m + 1], I = n[m + 2], w = r[d + 3], C = r[d], b = r[d + 1], A = r[d + 2], v == w && U == C && F == b && I == A)
          continue;
        if (v < 220 && w > 20)
          return !1;
      }
  return !0;
}, UPNG.encode = function(n, i, c, r, e, a, f) {
  r == null && (r = 0), f == null && (f = !1);
  var s = UPNG.encode.compress(n, i, c, r, [!1, !1, !1, 0, f]);
  return UPNG.encode.compressPNG(s, -1), UPNG.encode._main(s, i, c, e, a);
}, UPNG.encodeLL = function(n, i, c, r, e, a, f, s) {
  for (var u = { ctype: 0 + (r == 1 ? 0 : 2) + (e == 0 ? 0 : 4), depth: a, frames: [] }, l = (r + e) * a, h = l * i, m = 0; m < n.length; m++)
    u.frames.push({ rect: { x: 0, y: 0, width: i, height: c }, img: new Uint8Array(n[m]), blend: 0, dispose: 1, bpp: Math.ceil(l / 8), bpl: Math.ceil(h / 8) });
  return UPNG.encode.compressPNG(u, 0, !0), UPNG.encode._main(u, i, c, f, s);
}, UPNG.encode._main = function(n, i, c, r, e) {
  e == null && (e = {});
  var a = UPNG.crc.crc, f = UPNG._bin.writeUint, s = UPNG._bin.writeUshort, u = UPNG._bin.writeASCII, l = 8, h = n.frames.length > 1, m = !1, d = 33 + (h ? 20 : 0);
  if (e.sRGB != null && (d += 13), e.pHYs != null && (d += 21), n.ctype == 3) {
    for (var g = n.plte.length, p = 0; p < g; p++)
      n.plte[p] >>> 24 != 255 && (m = !0);
    d += 8 + 3 * g + 4 + (m ? 8 + 1 * g + 4 : 0);
  }
  for (var v = 0; v < n.frames.length; v++)
    h && (d += 38), d += (_ = n.frames[v]).cimg.length + 12, v != 0 && (d += 4);
  d += 12;
  var U = new Uint8Array(d), F = [137, 80, 78, 71, 13, 10, 26, 10];
  for (p = 0; p < 8; p++)
    U[p] = F[p];
  if (f(U, l, 13), u(U, l += 4, "IHDR"), f(U, l += 4, i), f(U, l += 4, c), U[l += 4] = n.depth, U[++l] = n.ctype, U[++l] = 0, U[++l] = 0, U[++l] = 0, f(U, ++l, a(U, l - 17, 17)), l += 4, e.sRGB != null && (f(U, l, 1), u(U, l += 4, "sRGB"), U[l += 4] = e.sRGB, f(U, ++l, a(U, l - 5, 5)), l += 4), e.pHYs != null && (f(U, l, 9), u(U, l += 4, "pHYs"), f(U, l += 4, e.pHYs[0]), f(U, l += 4, e.pHYs[1]), U[l += 4] = e.pHYs[2], f(U, ++l, a(U, l - 13, 13)), l += 4), h && (f(U, l, 8), u(U, l += 4, "acTL"), f(U, l += 4, n.frames.length), f(U, l += 4, e.loop != null ? e.loop : 0), f(U, l += 4, a(U, l - 12, 12)), l += 4), n.ctype == 3) {
    for (f(U, l, 3 * (g = n.plte.length)), u(U, l += 4, "PLTE"), l += 4, p = 0; p < g; p++) {
      var I = 3 * p, w = n.plte[p], C = 255 & w, b = w >>> 8 & 255, A = w >>> 16 & 255;
      U[l + I + 0] = C, U[l + I + 1] = b, U[l + I + 2] = A;
    }
    if (f(U, l += 3 * g, a(U, l - 3 * g - 4, 3 * g + 4)), l += 4, m) {
      for (f(U, l, g), u(U, l += 4, "tRNS"), l += 4, p = 0; p < g; p++)
        U[l + p] = n.plte[p] >>> 24 & 255;
      f(U, l += g, a(U, l - g - 4, g + 4)), l += 4;
    }
  }
  var P = 0;
  for (v = 0; v < n.frames.length; v++) {
    var _ = n.frames[v];
    h && (f(U, l, 26), u(U, l += 4, "fcTL"), f(U, l += 4, P++), f(U, l += 4, _.rect.width), f(U, l += 4, _.rect.height), f(U, l += 4, _.rect.x), f(U, l += 4, _.rect.y), s(U, l += 4, r[v]), s(U, l += 2, 1e3), U[l += 2] = _.dispose, U[++l] = _.blend, f(U, ++l, a(U, l - 30, 30)), l += 4);
    var E = _.cimg;
    f(U, l, (g = E.length) + (v == 0 ? 0 : 4));
    var y = l += 4;
    u(U, l, v == 0 ? "IDAT" : "fdAT"), l += 4, v != 0 && (f(U, l, P++), l += 4), U.set(E, l), f(U, l += g, a(U, y, l - y)), l += 4;
  }
  return f(U, l, 0), u(U, l += 4, "IEND"), f(U, l += 4, a(U, l - 4, 4)), l += 4, U.buffer;
}, UPNG.encode.compressPNG = function(n, i, c) {
  for (var r = 0; r < n.frames.length; r++) {
    var e = n.frames[r];
    e.rect.width;
    var a = e.rect.height, f = new Uint8Array(a * e.bpl + a);
    e.cimg = UPNG.encode._filterZero(e.img, a, e.bpp, e.bpl, f, i, c);
  }
}, UPNG.encode.compress = function(n, i, c, r, e) {
  for (var a = e[0], f = e[1], s = e[2], u = e[3], l = e[4], h = 6, m = 8, d = 255, g = 0; g < n.length; g++)
    for (var p = new Uint8Array(n[g]), v = p.length, U = 0; U < v; U += 4)
      d &= p[U + 3];
  var F = d != 255, I = UPNG.encode.framize(n, i, c, a, f, s), w = {}, C = [], b = [];
  if (r != 0) {
    var A = [];
    for (U = 0; U < I.length; U++)
      A.push(I[U].img.buffer);
    var P = UPNG.encode.concatRGBA(A), _ = UPNG.quantize(P, r), E = 0, y = new Uint8Array(_.abuf);
    for (U = 0; U < I.length; U++) {
      var S = (j = I[U].img).length;
      for (b.push(new Uint8Array(_.inds.buffer, E >> 2, S >> 2)), g = 0; g < S; g += 4)
        j[g] = y[E + g], j[g + 1] = y[E + g + 1], j[g + 2] = y[E + g + 2], j[g + 3] = y[E + g + 3];
      E += S;
    }
    for (U = 0; U < _.plte.length; U++)
      C.push(_.plte[U].est.rgba);
  } else
    for (g = 0; g < I.length; g++) {
      var R = I[g], O = new Uint32Array(R.img.buffer), M = R.rect.width, B = (v = O.length, new Uint8Array(v));
      for (b.push(B), U = 0; U < v; U++) {
        var G = O[U];
        if (U != 0 && G == O[U - 1])
          B[U] = B[U - 1];
        else if (U > M && G == O[U - M])
          B[U] = B[U - M];
        else {
          var Z = w[G];
          if (Z == null && (w[G] = Z = C.length, C.push(G), C.length >= 300))
            break;
          B[U] = Z;
        }
      }
    }
  var x = C.length;
  for (x <= 256 && l == 0 && (m = x <= 2 ? 1 : x <= 4 ? 2 : x <= 16 ? 4 : 8, m = Math.max(m, u)), g = 0; g < I.length; g++) {
    (R = I[g]).rect.x, R.rect.y, M = R.rect.width;
    var D = R.rect.height, T = R.img;
    new Uint32Array(T.buffer);
    var L = 4 * M, q = 4;
    if (x <= 256 && l == 0) {
      L = Math.ceil(m * M / 8);
      for (var z = new Uint8Array(L * D), Q = b[g], V = 0; V < D; V++) {
        U = V * L;
        var K = V * M;
        if (m == 8)
          for (var k = 0; k < M; k++)
            z[U + k] = Q[K + k];
        else if (m == 4)
          for (k = 0; k < M; k++)
            z[U + (k >> 1)] |= Q[K + k] << 4 - 4 * (1 & k);
        else if (m == 2)
          for (k = 0; k < M; k++)
            z[U + (k >> 2)] |= Q[K + k] << 6 - 2 * (3 & k);
        else if (m == 1)
          for (k = 0; k < M; k++)
            z[U + (k >> 3)] |= Q[K + k] << 7 - 1 * (7 & k);
      }
      T = z, h = 3, q = 1;
    } else if (F == 0 && I.length == 1) {
      z = new Uint8Array(M * D * 3);
      var J = M * D;
      for (U = 0; U < J; U++) {
        var j, X = 4 * U;
        z[j = 3 * U] = T[X], z[j + 1] = T[X + 1], z[j + 2] = T[X + 2];
      }
      T = z, h = 2, q = 3, L = 3 * M;
    }
    R.img = T, R.bpl = L, R.bpp = q;
  }
  return { ctype: h, depth: m, plte: C, frames: I };
}, UPNG.encode.framize = function(n, i, c, r, e, a) {
  for (var f = [], s = 0; s < n.length; s++) {
    var u, l = new Uint8Array(n[s]), h = new Uint32Array(l.buffer), m = 0, d = 0, g = i, p = c, v = r ? 1 : 0;
    if (s != 0) {
      for (var U = a || r || s == 1 || f[s - 2].dispose != 0 ? 1 : 2, F = 0, I = 1e9, w = 0; w < U; w++) {
        for (var C = new Uint8Array(n[s - 1 - w]), b = new Uint32Array(n[s - 1 - w]), A = i, P = c, _ = -1, E = -1, y = 0; y < c; y++)
          for (var S = 0; S < i; S++)
            h[x = y * i + S] != b[x] && (S < A && (A = S), S > _ && (_ = S), y < P && (P = y), y > E && (E = y));
        _ == -1 && (A = P = _ = E = 0), e && ((1 & A) == 1 && A--, (1 & P) == 1 && P--);
        var R = (_ - A + 1) * (E - P + 1);
        R < I && (I = R, F = w, m = A, d = P, g = _ - A + 1, p = E - P + 1);
      }
      C = new Uint8Array(n[s - 1 - F]), F == 1 && (f[s - 1].dispose = 2), u = new Uint8Array(g * p * 4), UPNG._copyTile(C, i, c, u, g, p, -m, -d, 0), (v = UPNG._copyTile(l, i, c, u, g, p, -m, -d, 3) ? 1 : 0) == 1 ? UPNG.encode._prepareDiff(l, i, c, u, { x: m, y: d, width: g, height: p }) : UPNG._copyTile(l, i, c, u, g, p, -m, -d, 0);
    } else
      u = l.slice(0);
    f.push({ rect: { x: m, y: d, width: g, height: p }, img: u, blend: v, dispose: 0 });
  }
  if (r) {
    for (s = 0; s < f.length; s++)
      if ((D = f[s]).blend != 1) {
        var O = D.rect, M = f[s - 1].rect, B = Math.min(O.x, M.x), G = Math.min(O.y, M.y), Z = { x: B, y: G, width: Math.max(O.x + O.width, M.x + M.width) - B, height: Math.max(O.y + O.height, M.y + M.height) - G };
        f[s - 1].dispose = 1, s - 1 != 0 && UPNG.encode._updateFrame(n, i, c, f, s - 1, Z, e), UPNG.encode._updateFrame(n, i, c, f, s, Z, e);
      }
  }
  if (n.length != 1)
    for (var x = 0; x < f.length; x++) {
      var D;
      (D = f[x]).rect.width * D.rect.height;
    }
  return f;
}, UPNG.encode._updateFrame = function(n, i, c, r, e, a, f) {
  for (var s = Uint8Array, u = Uint32Array, l = new s(n[e - 1]), h = new u(n[e - 1]), m = e + 1 < n.length ? new s(n[e + 1]) : null, d = new s(n[e]), g = new u(d.buffer), p = i, v = c, U = -1, F = -1, I = 0; I < a.height; I++)
    for (var w = 0; w < a.width; w++) {
      var C = a.x + w, b = a.y + I, A = b * i + C, P = g[A];
      P == 0 || r[e - 1].dispose == 0 && h[A] == P && (m == null || m[4 * A + 3] != 0) || (C < p && (p = C), C > U && (U = C), b < v && (v = b), b > F && (F = b));
    }
  U == -1 && (p = v = U = F = 0), f && ((1 & p) == 1 && p--, (1 & v) == 1 && v--), a = { x: p, y: v, width: U - p + 1, height: F - v + 1 };
  var _ = r[e];
  _.rect = a, _.blend = 1, _.img = new Uint8Array(a.width * a.height * 4), r[e - 1].dispose == 0 ? (UPNG._copyTile(l, i, c, _.img, a.width, a.height, -a.x, -a.y, 0), UPNG.encode._prepareDiff(d, i, c, _.img, a)) : UPNG._copyTile(d, i, c, _.img, a.width, a.height, -a.x, -a.y, 0);
}, UPNG.encode._prepareDiff = function(n, i, c, r, e) {
  UPNG._copyTile(n, i, c, r, e.width, e.height, -e.x, -e.y, 2);
}, UPNG.encode._filterZero = function(n, i, c, r, e, a, f) {
  var s, u = [], l = [0, 1, 2, 3, 4];
  a != -1 ? l = [a] : (i * r > 5e5 || c == 1) && (l = [0]), f && (s = { level: 0 });
  for (var h, m = UZIP, d = 0; d < l.length; d++) {
    for (var g = 0; g < i; g++)
      UPNG.encode._filterLine(e, n, g, r, c, l[d]);
    u.push(m.deflate(e, s));
  }
  var p = 1e9;
  for (d = 0; d < u.length; d++)
    u[d].length < p && (h = d, p = u[d].length);
  return u[h];
}, UPNG.encode._filterLine = function(n, i, c, r, e, a) {
  var f = c * r, s = f + c, u = UPNG.decode._paeth;
  if (n[s] = a, s++, a == 0)
    if (r < 500)
      for (var l = 0; l < r; l++)
        n[s + l] = i[f + l];
    else
      n.set(new Uint8Array(i.buffer, f, r), s);
  else if (a == 1) {
    for (l = 0; l < e; l++)
      n[s + l] = i[f + l];
    for (l = e; l < r; l++)
      n[s + l] = i[f + l] - i[f + l - e] + 256 & 255;
  } else if (c == 0) {
    for (l = 0; l < e; l++)
      n[s + l] = i[f + l];
    if (a == 2)
      for (l = e; l < r; l++)
        n[s + l] = i[f + l];
    if (a == 3)
      for (l = e; l < r; l++)
        n[s + l] = i[f + l] - (i[f + l - e] >> 1) + 256 & 255;
    if (a == 4)
      for (l = e; l < r; l++)
        n[s + l] = i[f + l] - u(i[f + l - e], 0, 0) + 256 & 255;
  } else {
    if (a == 2)
      for (l = 0; l < r; l++)
        n[s + l] = i[f + l] + 256 - i[f + l - r] & 255;
    if (a == 3) {
      for (l = 0; l < e; l++)
        n[s + l] = i[f + l] + 256 - (i[f + l - r] >> 1) & 255;
      for (l = e; l < r; l++)
        n[s + l] = i[f + l] + 256 - (i[f + l - r] + i[f + l - e] >> 1) & 255;
    }
    if (a == 4) {
      for (l = 0; l < e; l++)
        n[s + l] = i[f + l] + 256 - u(0, i[f + l - r], 0) & 255;
      for (l = e; l < r; l++)
        n[s + l] = i[f + l] + 256 - u(i[f + l - e], i[f + l - r], i[f + l - e - r]) & 255;
    }
  }
}, UPNG.crc = { table: function() {
  for (var n = new Uint32Array(256), i = 0; i < 256; i++) {
    for (var c = i, r = 0; r < 8; r++)
      1 & c ? c = 3988292384 ^ c >>> 1 : c >>>= 1;
    n[i] = c;
  }
  return n;
}(), update: function(i, c, r, e) {
  for (var a = 0; a < e; a++)
    i = UPNG.crc.table[255 & (i ^ c[r + a])] ^ i >>> 8;
  return i;
}, crc: function(i, c, r) {
  return 4294967295 ^ UPNG.crc.update(4294967295, i, c, r);
} }, UPNG.quantize = function(n, i) {
  var c, r = new Uint8Array(n), e = r.slice(0), a = new Uint32Array(e.buffer), f = UPNG.quantize.getKDtree(e, i), s = f[0], u = f[1], l = UPNG.quantize.planeDst, h = r, m = a, d = h.length, g = new Uint8Array(r.length >> 2);
  if (r.length < 2e7)
    for (var p = 0; p < d; p += 4) {
      var v = h[p] * 0.00392156862745098, U = h[p + 1] * (1 / 255), F = h[p + 2] * (1 / 255), I = h[p + 3] * (1 / 255);
      c = UPNG.quantize.getNearest(s, v, U, F, I), g[p >> 2] = c.ind, m[p >> 2] = c.est.rgba;
    }
  else
    for (p = 0; p < d; p += 4) {
      for (v = h[p] * (1 / 255), U = h[p + 1] * (1 / 255), F = h[p + 2] * (1 / 255), I = h[p + 3] * (1 / 255), c = s; c.left; )
        c = l(c.est, v, U, F, I) <= 0 ? c.left : c.right;
      g[p >> 2] = c.ind, m[p >> 2] = c.est.rgba;
    }
  return { abuf: e.buffer, inds: g, plte: u };
}, UPNG.quantize.getKDtree = function(n, i, c) {
  c == null && (c = 1e-4);
  var r = new Uint32Array(n.buffer), e = { i0: 0, i1: n.length, bst: null, est: null, tdst: 0, left: null, right: null };
  e.bst = UPNG.quantize.stats(n, e.i0, e.i1), e.est = UPNG.quantize.estats(e.bst);
  for (var a = [e]; a.length < i; ) {
    for (var f = 0, s = 0, u = 0; u < a.length; u++)
      a[u].est.L > f && (f = a[u].est.L, s = u);
    if (f < c)
      break;
    var l = a[s], h = UPNG.quantize.splitPixels(n, r, l.i0, l.i1, l.est.e, l.est.eMq255);
    if (l.i0 >= h || l.i1 <= h)
      l.est.L = 0;
    else {
      var m = { i0: l.i0, i1: h, bst: null, est: null, tdst: 0, left: null, right: null };
      m.bst = UPNG.quantize.stats(n, m.i0, m.i1), m.est = UPNG.quantize.estats(m.bst);
      var d = { i0: h, i1: l.i1, bst: null, est: null, tdst: 0, left: null, right: null };
      for (d.bst = { R: [], m: [], N: l.bst.N - m.bst.N }, u = 0; u < 16; u++)
        d.bst.R[u] = l.bst.R[u] - m.bst.R[u];
      for (u = 0; u < 4; u++)
        d.bst.m[u] = l.bst.m[u] - m.bst.m[u];
      d.est = UPNG.quantize.estats(d.bst), l.left = m, l.right = d, a[s] = m, a.push(d);
    }
  }
  for (a.sort(function(g, p) {
    return p.bst.N - g.bst.N;
  }), u = 0; u < a.length; u++)
    a[u].ind = u;
  return [e, a];
}, UPNG.quantize.getNearest = function(n, i, c, r, e) {
  if (n.left == null)
    return n.tdst = UPNG.quantize.dist(n.est.q, i, c, r, e), n;
  var a = UPNG.quantize.planeDst(n.est, i, c, r, e), f = n.left, s = n.right;
  a > 0 && (f = n.right, s = n.left);
  var u = UPNG.quantize.getNearest(f, i, c, r, e);
  if (u.tdst <= a * a)
    return u;
  var l = UPNG.quantize.getNearest(s, i, c, r, e);
  return l.tdst < u.tdst ? l : u;
}, UPNG.quantize.planeDst = function(n, i, c, r, e) {
  var a = n.e;
  return a[0] * i + a[1] * c + a[2] * r + a[3] * e - n.eMq;
}, UPNG.quantize.dist = function(n, i, c, r, e) {
  var a = i - n[0], f = c - n[1], s = r - n[2], u = e - n[3];
  return a * a + f * f + s * s + u * u;
}, UPNG.quantize.splitPixels = function(n, i, c, r, e, a) {
  var f = UPNG.quantize.vecDot;
  for (r -= 4; c < r; ) {
    for (; f(n, c, e) <= a; )
      c += 4;
    for (; f(n, r, e) > a; )
      r -= 4;
    if (c >= r)
      break;
    var s = i[c >> 2];
    i[c >> 2] = i[r >> 2], i[r >> 2] = s, c += 4, r -= 4;
  }
  for (; f(n, c, e) > a; )
    c -= 4;
  return c + 4;
}, UPNG.quantize.vecDot = function(n, i, c) {
  return n[i] * c[0] + n[i + 1] * c[1] + n[i + 2] * c[2] + n[i + 3] * c[3];
}, UPNG.quantize.stats = function(n, i, c) {
  for (var r = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], e = [0, 0, 0, 0], a = c - i >> 2, f = i; f < c; f += 4) {
    var s = n[f] * 0.00392156862745098, u = n[f + 1] * (1 / 255), l = n[f + 2] * (1 / 255), h = n[f + 3] * (1 / 255);
    e[0] += s, e[1] += u, e[2] += l, e[3] += h, r[0] += s * s, r[1] += s * u, r[2] += s * l, r[3] += s * h, r[5] += u * u, r[6] += u * l, r[7] += u * h, r[10] += l * l, r[11] += l * h, r[15] += h * h;
  }
  return r[4] = r[1], r[8] = r[2], r[9] = r[6], r[12] = r[3], r[13] = r[7], r[14] = r[11], { R: r, m: e, N: a };
}, UPNG.quantize.estats = function(n) {
  var i = n.R, c = n.m, r = n.N, e = c[0], a = c[1], f = c[2], s = c[3], u = r == 0 ? 0 : 1 / r, l = [i[0] - e * e * u, i[1] - e * a * u, i[2] - e * f * u, i[3] - e * s * u, i[4] - a * e * u, i[5] - a * a * u, i[6] - a * f * u, i[7] - a * s * u, i[8] - f * e * u, i[9] - f * a * u, i[10] - f * f * u, i[11] - f * s * u, i[12] - s * e * u, i[13] - s * a * u, i[14] - s * f * u, i[15] - s * s * u], h = l, m = UPNG.M4, d = [Math.random(), Math.random(), Math.random(), Math.random()], g = 0, p = 0;
  if (r != 0)
    for (var v = 0; v < 16 && (d = m.multVec(h, d), p = Math.sqrt(m.dot(d, d)), d = m.sml(1 / p, d), !(v != 0 && Math.abs(p - g) < 1e-9)); v++)
      g = p;
  var U = [e * u, a * u, f * u, s * u];
  return { Cov: l, q: U, e: d, L: g, eMq255: m.dot(m.sml(255, U), d), eMq: m.dot(d, U), rgba: (Math.round(255 * U[3]) << 24 | Math.round(255 * U[2]) << 16 | Math.round(255 * U[1]) << 8 | Math.round(255 * U[0]) << 0) >>> 0 };
}, UPNG.M4 = { multVec: function(i, c) {
  return [i[0] * c[0] + i[1] * c[1] + i[2] * c[2] + i[3] * c[3], i[4] * c[0] + i[5] * c[1] + i[6] * c[2] + i[7] * c[3], i[8] * c[0] + i[9] * c[1] + i[10] * c[2] + i[11] * c[3], i[12] * c[0] + i[13] * c[1] + i[14] * c[2] + i[15] * c[3]];
}, dot: function(i, c) {
  return i[0] * c[0] + i[1] * c[1] + i[2] * c[2] + i[3] * c[3];
}, sml: function(i, c) {
  return [i * c[0], i * c[1], i * c[2], i * c[3]];
} }, UPNG.encode.concatRGBA = function(n) {
  for (var i = 0, c = 0; c < n.length; c++)
    i += n[c].byteLength;
  var r = new Uint8Array(i), e = 0;
  for (c = 0; c < n.length; c++) {
    for (var a = new Uint8Array(n[c]), f = a.length, s = 0; s < f; s += 4) {
      var u = a[s], l = a[s + 1], h = a[s + 2], m = a[s + 3];
      m == 0 && (u = l = h = 0), r[e + s] = u, r[e + s + 1] = l, r[e + s + 2] = h, r[e + s + 3] = m;
    }
    e += f;
  }
  return r.buffer;
};
var BROWSER_NAME = { CHROME: "CHROME", FIREFOX: "FIREFOX", DESKTOP_SAFARI: "DESKTOP_SAFARI", IE: "IE", MOBILE_SAFARI: "MOBILE_SAFARI", ETC: "ETC" }, _BROWSER_NAME$CHROME$, MAX_CANVAS_SIZE = (_BROWSER_NAME$CHROME$ = {}, _defineProperty(_BROWSER_NAME$CHROME$, BROWSER_NAME.CHROME, 16384), _defineProperty(_BROWSER_NAME$CHROME$, BROWSER_NAME.FIREFOX, 11180), _defineProperty(_BROWSER_NAME$CHROME$, BROWSER_NAME.DESKTOP_SAFARI, 16384), _defineProperty(_BROWSER_NAME$CHROME$, BROWSER_NAME.IE, 8192), _defineProperty(_BROWSER_NAME$CHROME$, BROWSER_NAME.MOBILE_SAFARI, 4096), _defineProperty(_BROWSER_NAME$CHROME$, BROWSER_NAME.ETC, 8192), _BROWSER_NAME$CHROME$), isBrowser = typeof window < "u", moduleMapper = isBrowser && window.cordova && window.cordova.require && window.cordova.require("cordova/modulemapper"), CustomFile = isBrowser && (moduleMapper && moduleMapper.getOriginalSymbol(window, "File") || window.File !== void 0 && File), CustomFileReader = isBrowser && (moduleMapper && moduleMapper.getOriginalSymbol(window, "FileReader") || window.FileReader !== void 0 && FileReader);
function getFilefromDataUrl(n, i) {
  var c = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Date.now();
  return new Promise(function(r) {
    for (var e = n.split(","), a = e[0].match(/:(.*?);/)[1], f = globalThis.atob(e[1]), s = f.length, u = new Uint8Array(s); s--; )
      u[s] = f.charCodeAt(s);
    var l = new Blob([u], { type: a });
    l.name = i, l.lastModified = c, r(l);
  });
}
function getDataUrlFromFile(n) {
  return new Promise(function(i, c) {
    var r = new CustomFileReader();
    r.onload = function() {
      return i(r.result);
    }, r.onerror = function(e) {
      return c(e);
    }, r.readAsDataURL(n);
  });
}
function loadImage(n) {
  return new Promise(function(i, c) {
    var r = new Image();
    r.onload = function() {
      return i(r);
    }, r.onerror = function(e) {
      return c(e);
    }, r.src = n;
  });
}
function getBrowserName() {
  if (getBrowserName.cachedResult !== void 0)
    return getBrowserName.cachedResult;
  var n = BROWSER_NAME.ETC, i = navigator.userAgent;
  return /Chrom(e|ium)/i.test(i) ? n = BROWSER_NAME.CHROME : /iP(ad|od|hone)/i.test(i) && /WebKit/i.test(i) && !/(CriOS|FxiOS|OPiOS|mercury)/i.test(i) ? n = BROWSER_NAME.MOBILE_SAFARI : /Safari/i.test(i) ? n = BROWSER_NAME.DESKTOP_SAFARI : /Firefox/i.test(i) ? n = BROWSER_NAME.FIREFOX : (/MSIE/i.test(i) || !!document.documentMode) && (n = BROWSER_NAME.IE), getBrowserName.cachedResult = n, getBrowserName.cachedResult;
}
function approximateBelowMaximumCanvasSizeOfBrowser(n, i) {
  for (var c = getBrowserName(), r = MAX_CANVAS_SIZE[c], e = n, a = i, f = e * a, s = e > a ? a / e : e / a; f > r * r; ) {
    var u = (r + e) / 2, l = (r + a) / 2;
    u < l ? (a = l, e = l * s) : (a = u * s, e = u), f = e * a;
  }
  return { width: e, height: a };
}
function getNewCanvasAndCtx(n, i) {
  var c, r;
  try {
    if ((r = (c = new OffscreenCanvas(n, i)).getContext("2d")) === null)
      throw new Error("getContext of OffscreenCanvas returns null");
  } catch {
    r = (c = document.createElement("canvas")).getContext("2d");
  }
  return c.width = n, c.height = i, [c, r];
}
function drawImageInCanvas(n) {
  var i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : void 0, c = approximateBelowMaximumCanvasSizeOfBrowser(n.width, n.height), r = c.width, e = c.height, a = getNewCanvasAndCtx(r, e), f = _slicedToArray(a, 2), s = f[0], u = f[1];
  return i && /jpe?g/.test(i) && (u.fillStyle = "white", u.fillRect(0, 0, s.width, s.height)), u.drawImage(n, 0, 0, s.width, s.height), s;
}
function isIOS() {
  return isIOS.cachedResult !== void 0 || (isIOS.cachedResult = ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(navigator.platform) || navigator.userAgent.includes("Mac") && typeof document < "u" && "ontouchend" in document), isIOS.cachedResult;
}
function drawFileInCanvas(n) {
  var i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return new Promise(function(c, r) {
    var e, a, f = function() {
      try {
        return a = drawImageInCanvas(e, i.fileType || n.type), c([e, a]);
      } catch (l) {
        return r(l);
      }
    }, s = function(l) {
      try {
        var h = function(d) {
          try {
            throw d;
          } catch (g) {
            return r(g);
          }
        };
        try {
          return getDataUrlFromFile(n).then(function(m) {
            try {
              return loadImage(m).then(function(d) {
                try {
                  return e = d, function() {
                    try {
                      return f();
                    } catch (p) {
                      return r(p);
                    }
                  }();
                } catch (g) {
                  return h(g);
                }
              }, h);
            } catch (d) {
              return h(d);
            }
          }, h);
        } catch (m) {
          h(m);
        }
      } catch (m) {
        return r(m);
      }
    };
    try {
      if (isIOS() || [BROWSER_NAME.DESKTOP_SAFARI, BROWSER_NAME.MOBILE_SAFARI].includes(getBrowserName()))
        throw new Error("Skip createImageBitmap on IOS and Safari");
      return createImageBitmap(n).then(function(u) {
        try {
          return e = u, f();
        } catch {
          return s();
        }
      }, s);
    } catch {
      s();
    }
  });
}
function canvasToFile(n, i, c, r) {
  var e = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1;
  return new Promise(function(a, f) {
    var s, u, l;
    if (i === "image/png")
      return u = n.getContext("2d").getImageData(0, 0, n.width, n.height).data, l = UPNG.encode([u], n.width, n.height, 256 * e), (s = new Blob([l], { type: i })).name = c, s.lastModified = r, h.call(this);
    {
      let d = function() {
        return h.call(this);
      };
      var m = d;
      return typeof OffscreenCanvas == "function" && n instanceof OffscreenCanvas ? n.convertToBlob({ type: i, quality: e }).then(function(g) {
        try {
          return (s = g).name = c, s.lastModified = r, d.call(this);
        } catch (p) {
          return f(p);
        }
      }.bind(this), f) : getFilefromDataUrl(n.toDataURL(i, e), c, r).then(function(g) {
        try {
          return s = g, d.call(this);
        } catch (p) {
          return f(p);
        }
      }.bind(this), f);
    }
    function h() {
      return a(s);
    }
  });
}
function cleanupCanvasMemory(n) {
  n.width = 0, n.height = 0;
}
function isAutoOrientationInBrowser() {
  return new Promise(function(n, i) {
    var c, r, e, a;
    return isAutoOrientationInBrowser.cachedResult !== void 0 ? n(isAutoOrientationInBrowser.cachedResult) : getFilefromDataUrl("data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAEAAgMBEQACEQEDEQH/xABKAAEAAAAAAAAAAAAAAAAAAAALEAEAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H//2Q==", "test.jpg", Date.now()).then(function(f) {
      try {
        return drawFileInCanvas(c = f).then(function(s) {
          try {
            return canvasToFile(r = s[1], c.type, c.name, c.lastModified).then(function(u) {
              try {
                return e = u, cleanupCanvasMemory(r), drawFileInCanvas(e).then(function(l) {
                  try {
                    return a = l[0], isAutoOrientationInBrowser.cachedResult = a.width === 1 && a.height === 2, n(isAutoOrientationInBrowser.cachedResult);
                  } catch (h) {
                    return i(h);
                  }
                }, i);
              } catch (l) {
                return i(l);
              }
            }, i);
          } catch (u) {
            return i(u);
          }
        }, i);
      } catch (s) {
        return i(s);
      }
    }, i);
  });
}
function getExifOrientation(n) {
  return new Promise(function(i, c) {
    var r = new CustomFileReader();
    r.onload = function(e) {
      var a = new DataView(e.target.result);
      if (a.getUint16(0, !1) != 65496)
        return i(-2);
      for (var f = a.byteLength, s = 2; s < f; ) {
        if (a.getUint16(s + 2, !1) <= 8)
          return i(-1);
        var u = a.getUint16(s, !1);
        if (s += 2, u == 65505) {
          if (a.getUint32(s += 2, !1) != 1165519206)
            return i(-1);
          var l = a.getUint16(s += 6, !1) == 18761;
          s += a.getUint32(s + 4, l);
          var h = a.getUint16(s, l);
          s += 2;
          for (var m = 0; m < h; m++)
            if (a.getUint16(s + 12 * m, l) == 274)
              return i(a.getUint16(s + 12 * m + 8, l));
        } else {
          if ((65280 & u) != 65280)
            break;
          s += a.getUint16(s, !1);
        }
      }
      return i(-1);
    }, r.onerror = function(e) {
      return c(e);
    }, r.readAsArrayBuffer(n);
  });
}
function handleMaxWidthOrHeight(n, i) {
  var c, r = n.width, e = n.height, a = i.maxWidthOrHeight, f = n;
  if (isFinite(a) && (r > a || e > a)) {
    var s = _slicedToArray(getNewCanvasAndCtx(r, e), 2);
    f = s[0], c = s[1], r > e ? (f.width = a, f.height = e / r * a) : (f.width = r / e * a, f.height = a), c.drawImage(n, 0, 0, f.width, f.height), cleanupCanvasMemory(n);
  }
  return f;
}
function followExifOrientation(n, i) {
  var c = n.width, r = n.height, e = _slicedToArray(getNewCanvasAndCtx(c, r), 2), a = e[0], f = e[1];
  switch (i > 4 && i < 9 ? (a.width = r, a.height = c) : (a.width = c, a.height = r), i) {
    case 2:
      f.transform(-1, 0, 0, 1, c, 0);
      break;
    case 3:
      f.transform(-1, 0, 0, -1, c, r);
      break;
    case 4:
      f.transform(1, 0, 0, -1, 0, r);
      break;
    case 5:
      f.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      f.transform(0, 1, -1, 0, r, 0);
      break;
    case 7:
      f.transform(0, -1, -1, 0, r, c);
      break;
    case 8:
      f.transform(0, -1, 1, 0, 0, c);
  }
  return f.drawImage(n, 0, 0, c, r), cleanupCanvasMemory(n), a;
}
function compress(n, i) {
  var c = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
  return new Promise(function(r, e) {
    var a, f, s, u, l, h, m, d, g, p, v, U, F, I, w, C, b, A, P;
    function _() {
      var y = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 5;
      if (i.signal && i.signal.aborted)
        throw i.signal.reason;
      a += y, i.onProgress(Math.min(a, 100));
    }
    function E(y) {
      if (i.signal && i.signal.aborted)
        throw i.signal.reason;
      a = Math.min(Math.max(y, a), 100), i.onProgress(a);
    }
    return a = c, f = i.maxIteration || 10, s = 1024 * i.maxSizeMB * 1024, _(), drawFileInCanvas(n, i).then(function(y) {
      try {
        var S = _slicedToArray(y, 2);
        return u = S[1], _(), l = handleMaxWidthOrHeight(u, i), _(), new Promise(function(R, O) {
          var M;
          if (!(M = i.exifOrientation))
            return getExifOrientation(n).then(function(G) {
              try {
                return M = G, B.call(this);
              } catch (Z) {
                return O(Z);
              }
            }.bind(this), O);
          function B() {
            return R(M);
          }
          return B.call(this);
        }).then(function(R) {
          try {
            return h = R, _(), isAutoOrientationInBrowser().then(function(O) {
              try {
                return m = O ? l : followExifOrientation(l, h), _(), d = i.initialQuality || 1, g = i.fileType || n.type, canvasToFile(m, g, n.name, n.lastModified, d).then(function(M) {
                  try {
                    {
                      let x = function() {
                        if (f-- && (w > s || w > F)) {
                          var T, L, q = _slicedToArray(getNewCanvasAndCtx(T = P ? 0.95 * A.width : A.width, L = P ? 0.95 * A.height : A.height), 2);
                          return b = q[0], q[1].drawImage(A, 0, 0, T, L), d *= 0.95, canvasToFile(b, g, n.name, n.lastModified, d).then(function(z) {
                            try {
                              return C = z, cleanupCanvasMemory(A), A = b, w = C.size, E(Math.min(99, Math.floor((I - w) / (I - s) * 100))), x;
                            } catch (Q) {
                              return e(Q);
                            }
                          }, e);
                        }
                        return [1];
                      }, D = function() {
                        return cleanupCanvasMemory(A), cleanupCanvasMemory(b), cleanupCanvasMemory(l), cleanupCanvasMemory(m), cleanupCanvasMemory(u), E(100), r(C);
                      };
                      var G = x, Z = D;
                      if (p = M, _(), v = p.size > s, U = p.size > n.size, !v && !U)
                        return E(100), r(p);
                      var B;
                      return F = n.size, I = p.size, w = I, A = m, P = !i.alwaysKeepResolution && v, (B = function(T) {
                        for (; T; ) {
                          if (T.then)
                            return void T.then(B, e);
                          try {
                            if (T.pop) {
                              if (T.length)
                                return T.pop() ? D.call(this) : T;
                              T = x;
                            } else
                              T = T.call(this);
                          } catch (L) {
                            return e(L);
                          }
                        }
                      }.bind(this))(x);
                    }
                  } catch (x) {
                    return e(x);
                  }
                }.bind(this), e);
              } catch (M) {
                return e(M);
              }
            }.bind(this), e);
          } catch (O) {
            return e(O);
          }
        }.bind(this), e);
      } catch (R) {
        return e(R);
      }
    }.bind(this), e);
  });
}
var cnt = 0, imageCompressionLibUrl, worker;
function createWorker(n) {
  var i = [];
  return typeof n == "function" ? i.push("(".concat(n, ")()")) : i.push(n), new Worker(URL.createObjectURL(new Blob(i)));
}
function createSourceObject(n) {
  return URL.createObjectURL(new Blob([n], { type: "application/javascript" }));
}
function stringify(n) {
  return JSON.stringify(n, function(i, c) {
    return typeof c == "function" ? "BIC_FN:::(function () { return ".concat(c.toString(), " })()") : c;
  });
}
function parse(o) {
  if (typeof o == "string")
    return o;
  var result = {};
  return Object.entries(o).forEach(function(_ref) {
    var _ref2 = _slicedToArray(_ref, 2), key = _ref2[0], value = _ref2[1];
    if (typeof value == "string" && value.startsWith("BIC_FN:::"))
      try {
        result[key] = eval(value.replace(/^BIC_FN:::/, ""));
      } catch (n) {
        throw n;
      }
    else
      result[key] = parse(value);
  }), result;
}
function generateLib() {
  return createSourceObject(`
    // reconstruct library
    function imageCompression (){return (`.concat(imageCompression, `).apply(null, arguments)}

    imageCompression.getDataUrlFromFile = `).concat(imageCompression.getDataUrlFromFile, `
    imageCompression.getFilefromDataUrl = `).concat(imageCompression.getFilefromDataUrl, `
    imageCompression.loadImage = `).concat(imageCompression.loadImage, `
    imageCompression.drawImageInCanvas = `).concat(imageCompression.drawImageInCanvas, `
    imageCompression.drawFileInCanvas = `).concat(imageCompression.drawFileInCanvas, `
    imageCompression.canvasToFile = `).concat(imageCompression.canvasToFile, `
    imageCompression.getExifOrientation = `).concat(imageCompression.getExifOrientation, `
    imageCompression.handleMaxWidthOrHeight = `).concat(imageCompression.handleMaxWidthOrHeight, `
    imageCompression.followExifOrientation = `).concat(imageCompression.followExifOrientation, `
    imageCompression.cleanupCanvasMemory = `).concat(imageCompression.cleanupCanvasMemory, `
    imageCompression.isAutoOrientationInBrowser = `).concat(imageCompression.isAutoOrientationInBrowser, `
    imageCompression.approximateBelowMaximumCanvasSizeOfBrowser = `).concat(imageCompression.approximateBelowMaximumCanvasSizeOfBrowser, `
    imageCompression.getBrowserName = `).concat(imageCompression.getBrowserName, `

    // functions / objects
    getDataUrlFromFile = imageCompression.getDataUrlFromFile
    getFilefromDataUrl = imageCompression.getFilefromDataUrl
    loadImage = imageCompression.loadImage
    drawImageInCanvas = imageCompression.drawImageInCanvas
    drawFileInCanvas = imageCompression.drawFileInCanvas
    canvasToFile = imageCompression.canvasToFile
    getExifOrientation = imageCompression.getExifOrientation
    handleMaxWidthOrHeight = imageCompression.handleMaxWidthOrHeight
    followExifOrientation = imageCompression.followExifOrientation
    cleanupCanvasMemory = imageCompression.cleanupCanvasMemory
    isAutoOrientationInBrowser = imageCompression.isAutoOrientationInBrowser
    approximateBelowMaximumCanvasSizeOfBrowser = imageCompression.approximateBelowMaximumCanvasSizeOfBrowser
    getBrowserName = imageCompression.getBrowserName
    isIOS = `).concat(isIOS, `
    
    getNewCanvasAndCtx = `).concat(getNewCanvasAndCtx, `
    CustomFileReader = FileReader
    CustomFile = File
    MAX_CANVAS_SIZE = `).concat(JSON.stringify(MAX_CANVAS_SIZE), `
    BROWSER_NAME = `).concat(JSON.stringify(BROWSER_NAME), `
    function compress (){return (`).concat(compress, `).apply(null, arguments)}

    // core-js
    function _slicedToArray(arr, n) { return arr }
    function _typeof(a) { return typeof a }
    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
  
        Object.assign(target, source)
      }
  
      return target;
    }

    // Libraries
    const parse = `).concat(parse, `
    const UPNG = {}
    UPNG.toRGBA8 = `).concat(UPNG.toRGBA8, `
    UPNG.toRGBA8.decodeImage = `).concat(UPNG.toRGBA8.decodeImage, `
    UPNG.decode = `).concat(UPNG.decode, `
    UPNG.decode._decompress = `).concat(UPNG.decode._decompress, `
    UPNG.decode._inflate = `).concat(UPNG.decode._inflate, `
    UPNG.decode._readInterlace = `).concat(UPNG.decode._readInterlace, `
    UPNG.decode._getBPP = `).concat(UPNG.decode._getBPP, ` 
    UPNG.decode._filterZero = `).concat(UPNG.decode._filterZero, `
    UPNG.decode._paeth = `).concat(UPNG.decode._paeth, `
    UPNG.decode._IHDR = `).concat(UPNG.decode._IHDR, `
    UPNG._bin = parse(`).concat(stringify(UPNG._bin), `)
    UPNG._copyTile = `).concat(UPNG._copyTile, `
    UPNG.encode = `).concat(UPNG.encode, `
    UPNG.encodeLL = `).concat(UPNG.encodeLL, ` 
    UPNG.encode._main = `).concat(UPNG.encode._main, `
    UPNG.encode.compressPNG = `).concat(UPNG.encode.compressPNG, ` 
    UPNG.encode.compress = `).concat(UPNG.encode.compress, `
    UPNG.encode.framize = `).concat(UPNG.encode.framize, ` 
    UPNG.encode._updateFrame = `).concat(UPNG.encode._updateFrame, ` 
    UPNG.encode._prepareDiff = `).concat(UPNG.encode._prepareDiff, ` 
    UPNG.encode._filterZero = `).concat(UPNG.encode._filterZero, ` 
    UPNG.encode._filterLine = `).concat(UPNG.encode._filterLine, `
    UPNG.encode.concatRGBA = `).concat(UPNG.encode.concatRGBA, `
    UPNG.crc = parse(`).concat(stringify(UPNG.crc), `)
    UPNG.crc.table = ( function() {
    var tab = new Uint32Array(256);
    for (var n=0; n<256; n++) {
      var c = n;
      for (var k=0; k<8; k++) {
        if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
        else        c = c >>> 1;
      }
      tab[n] = c;  }
    return tab;  })()
    UPNG.quantize = `).concat(UPNG.quantize, ` 
    UPNG.quantize.getKDtree = `).concat(UPNG.quantize.getKDtree, ` 
    UPNG.quantize.getNearest = `).concat(UPNG.quantize.getNearest, ` 
    UPNG.quantize.planeDst = `).concat(UPNG.quantize.planeDst, ` 
    UPNG.quantize.dist = `).concat(UPNG.quantize.dist, `     
    UPNG.quantize.splitPixels = `).concat(UPNG.quantize.splitPixels, ` 
    UPNG.quantize.vecDot = `).concat(UPNG.quantize.vecDot, ` 
    UPNG.quantize.stats = `).concat(UPNG.quantize.stats, ` 
    UPNG.quantize.estats = `).concat(UPNG.quantize.estats, `
    UPNG.M4 = parse(`).concat(stringify(UPNG.M4), `)
    UPNG.encode.concatRGBA = `).concat(UPNG.encode.concatRGBA, `
    UPNG.inflateRaw=function(){
    var H={};H.H={};H.H.N=function(N,W){var R=Uint8Array,i=0,m=0,J=0,h=0,Q=0,X=0,u=0,w=0,d=0,v,C;
      if(N[0]==3&&N[1]==0)return W?W:new R(0);var V=H.H,n=V.b,A=V.e,l=V.R,M=V.n,I=V.A,e=V.Z,b=V.m,Z=W==null;
      if(Z)W=new R(N.length>>>2<<5);while(i==0){i=n(N,d,1);m=n(N,d+1,2);d+=3;if(m==0){if((d&7)!=0)d+=8-(d&7);
        var D=(d>>>3)+4,q=N[D-4]|N[D-3]<<8;if(Z)W=H.H.W(W,w+q);W.set(new R(N.buffer,N.byteOffset+D,q),w);d=D+q<<3;
        w+=q;continue}if(Z)W=H.H.W(W,w+(1<<17));if(m==1){v=b.J;C=b.h;X=(1<<9)-1;u=(1<<5)-1}if(m==2){J=A(N,d,5)+257;
        h=A(N,d+5,5)+1;Q=A(N,d+10,4)+4;d+=14;var E=d,j=1;for(var c=0;c<38;c+=2){b.Q[c]=0;b.Q[c+1]=0}for(var c=0;
                                                                                                        c<Q;c++){var K=A(N,d+c*3,3);b.Q[(b.X[c]<<1)+1]=K;if(K>j)j=K}d+=3*Q;M(b.Q,j);I(b.Q,j,b.u);v=b.w;C=b.d;
        d=l(b.u,(1<<j)-1,J+h,N,d,b.v);var r=V.V(b.v,0,J,b.C);X=(1<<r)-1;var S=V.V(b.v,J,h,b.D);u=(1<<S)-1;M(b.C,r);
        I(b.C,r,v);M(b.D,S);I(b.D,S,C)}while(!0){var T=v[e(N,d)&X];d+=T&15;var p=T>>>4;if(p>>>8==0){W[w++]=p}else if(p==256){break}else{var z=w+p-254;
        if(p>264){var _=b.q[p-257];z=w+(_>>>3)+A(N,d,_&7);d+=_&7}var $=C[e(N,d)&u];d+=$&15;var s=$>>>4,Y=b.c[s],a=(Y>>>4)+n(N,d,Y&15);
        d+=Y&15;while(w<z){W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a]}w=z}}}return W.length==w?W:W.slice(0,w)};
      H.H.W=function(N,W){var R=N.length;if(W<=R)return N;var V=new Uint8Array(R<<1);V.set(N,0);return V};
      H.H.R=function(N,W,R,V,n,A){var l=H.H.e,M=H.H.Z,I=0;while(I<R){var e=N[M(V,n)&W];n+=e&15;var b=e>>>4;
        if(b<=15){A[I]=b;I++}else{var Z=0,m=0;if(b==16){m=3+l(V,n,2);n+=2;Z=A[I-1]}else if(b==17){m=3+l(V,n,3);
          n+=3}else if(b==18){m=11+l(V,n,7);n+=7}var J=I+m;while(I<J){A[I]=Z;I++}}}return n};H.H.V=function(N,W,R,V){var n=0,A=0,l=V.length>>>1;
        while(A<R){var M=N[A+W];V[A<<1]=0;V[(A<<1)+1]=M;if(M>n)n=M;A++}while(A<l){V[A<<1]=0;V[(A<<1)+1]=0;A++}return n};
      H.H.n=function(N,W){var R=H.H.m,V=N.length,n,A,l,M,I,e=R.j;for(var M=0;M<=W;M++)e[M]=0;for(M=1;M<V;M+=2)e[N[M]]++;
        var b=R.K;n=0;e[0]=0;for(A=1;A<=W;A++){n=n+e[A-1]<<1;b[A]=n}for(l=0;l<V;l+=2){I=N[l+1];if(I!=0){N[l]=b[I];
          b[I]++}}};H.H.A=function(N,W,R){var V=N.length,n=H.H.m,A=n.r;for(var l=0;l<V;l+=2)if(N[l+1]!=0){var M=l>>1,I=N[l+1],e=M<<4|I,b=W-I,Z=N[l]<<b,m=Z+(1<<b);
        while(Z!=m){var J=A[Z]>>>15-W;R[J]=e;Z++}}};H.H.l=function(N,W){var R=H.H.m.r,V=15-W;for(var n=0;n<N.length;
                                                                                                 n+=2){var A=N[n]<<W-N[n+1];N[n]=R[A]>>>V}};H.H.M=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8};
      H.H.I=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8;N[V+2]|=R>>>16};H.H.e=function(N,W,R){return(N[W>>>3]|N[(W>>>3)+1]<<8)>>>(W&7)&(1<<R)-1};
      H.H.b=function(N,W,R){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)&(1<<R)-1};H.H.Z=function(N,W){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)};
      H.H.i=function(N,W){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16|N[(W>>>3)+3]<<24)>>>(W&7)};H.H.m=function(){var N=Uint16Array,W=Uint32Array;
        return{K:new N(16),j:new N(16),X:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],S:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],T:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0],q:new N(32),p:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,65535,65535],z:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0],c:new W(32),J:new N(512),_:[],h:new N(32),$:[],w:new N(32768),C:[],v:[],d:new N(32768),D:[],u:new N(512),Q:[],r:new N(1<<15),s:new W(286),Y:new W(30),a:new W(19),t:new W(15e3),k:new N(1<<16),g:new N(1<<15)}}();
      (function(){var N=H.H.m,W=1<<15;for(var R=0;R<W;R++){var V=R;V=(V&2863311530)>>>1|(V&1431655765)<<1;
        V=(V&3435973836)>>>2|(V&858993459)<<2;V=(V&4042322160)>>>4|(V&252645135)<<4;V=(V&4278255360)>>>8|(V&16711935)<<8;
        N.r[R]=(V>>>16|V<<16)>>>17}function n(A,l,M){while(l--!=0)A.push(0,M)}for(var R=0;R<32;R++){N.q[R]=N.S[R]<<3|N.T[R];
        N.c[R]=N.p[R]<<4|N.z[R]}n(N._,144,8);n(N._,255-143,9);n(N._,279-255,7);n(N._,287-279,8);H.H.n(N._,9);
        H.H.A(N._,9,N.J);H.H.l(N._,9);n(N.$,32,5);H.H.n(N.$,5);H.H.A(N.$,5,N.h);H.H.l(N.$,5);n(N.Q,19,0);n(N.C,286,0);
        n(N.D,30,0);n(N.v,320,0)}());return H.H.N}()
    
    const UZIP = {}
    UZIP["parse"] = `).concat(UZIP_1.parse, `
    UZIP._readLocal = `).concat(UZIP_1._readLocal, `
    UZIP.inflateRaw = `).concat(UZIP_1.inflateRaw, `
    UZIP.inflate = `).concat(UZIP_1.inflate, `
    UZIP.deflate = `).concat(UZIP_1.deflate, `
    UZIP.deflateRaw = `).concat(UZIP_1.deflateRaw, `
    UZIP.encode = `).concat(UZIP_1.encode, `
    UZIP._noNeed = `).concat(UZIP_1._noNeed, `
    UZIP._writeHeader = `).concat(UZIP_1._writeHeader, `
    UZIP.crc = parse(`).concat(stringify(UZIP_1.crc), `)
    UZIP.crc.table = ( function() {
      var tab = new Uint32Array(256);
      for (var n=0; n<256; n++) {
        var c = n;
        for (var k=0; k<8; k++) {
          if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
          else        c = c >>> 1;
        }
        tab[n] = c;  }
      return tab;  })()
    
    UZIP.adler = `).concat(UZIP_1.adler, `
    UZIP.bin = parse(`).concat(stringify(UZIP_1.bin), `)
    UZIP.F = {}
    UZIP.F.deflateRaw = `).concat(UZIP_1.F.deflateRaw, `
    UZIP.F._bestMatch = `).concat(UZIP_1.F._bestMatch, `
    UZIP.F._howLong = `).concat(UZIP_1.F._howLong, `
    UZIP.F._hash = `).concat(UZIP_1.F._hash, `
    UZIP.saved = `).concat(UZIP_1.saved, `
    UZIP.F._writeBlock = `).concat(UZIP_1.F._writeBlock, `
    UZIP.F._copyExact = `).concat(UZIP_1.F._copyExact, `
    UZIP.F.getTrees = `).concat(UZIP_1.F.getTrees, `
    UZIP.F.getSecond = `).concat(UZIP_1.F.getSecond, `
    UZIP.F.nonZero = `).concat(UZIP_1.F.nonZero, `
    UZIP.F.contSize = `).concat(UZIP_1.F.contSize, `
    UZIP.F._codeTiny = `).concat(UZIP_1.F._codeTiny, ` 
    UZIP.F._lenCodes = `).concat(UZIP_1.F._lenCodes, ` 
    UZIP.F._hufTree = `).concat(UZIP_1.F._hufTree, ` 
    UZIP.F.setDepth = `).concat(UZIP_1.F.setDepth, ` 
    UZIP.F.restrictDepth = `).concat(UZIP_1.F.restrictDepth, `
    UZIP.F._goodIndex = `).concat(UZIP_1.F._goodIndex, ` 
    UZIP.F._writeLit = `).concat(UZIP_1.F._writeLit, ` 
    UZIP.F.inflate = `).concat(UZIP_1.F.inflate, ` 
    UZIP.F._check = `).concat(UZIP_1.F._check, ` 
    UZIP.F._decodeTiny = `).concat(UZIP_1.F._decodeTiny, ` 
    UZIP.F._copyOut = `).concat(UZIP_1.F._copyOut, ` 
    UZIP.F.makeCodes = `).concat(UZIP_1.F.makeCodes, ` 
    UZIP.F.codes2map = `).concat(UZIP_1.F.codes2map, ` 
    UZIP.F.revCodes = `).concat(UZIP_1.F.revCodes, ` 

    // used only in deflate
    UZIP.F._putsE = `).concat(UZIP_1.F._putsE, `
    UZIP.F._putsF = `).concat(UZIP_1.F._putsF, `
  
    UZIP.F._bitsE = `).concat(UZIP_1.F._bitsE, `
    UZIP.F._bitsF = `).concat(UZIP_1.F._bitsF, `

    UZIP.F._get17 = `).concat(UZIP_1.F._get17, `
    UZIP.F._get25 = `).concat(UZIP_1.F._get25, `
    UZIP.F.U = function(){
      var u16=Uint16Array, u32=Uint32Array;
      return {
        next_code : new u16(16),
        bl_count  : new u16(16),
        ordr : [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ],
        of0  : [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],
        exb  : [0,0,0,0,0,0,0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0,  0,  0,  0],
        ldef : new u16(32),
        df0  : [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577, 65535, 65535],
        dxb  : [0,0,0,0,1,1,2, 2, 3, 3, 4, 4, 5, 5,  6,  6,  7,  7,  8,  8,   9,   9,  10,  10,  11,  11,  12,   12,   13,   13,     0,     0],
        ddef : new u32(32),
        flmap: new u16(  512),  fltree: [],
        fdmap: new u16(   32),  fdtree: [],
        lmap : new u16(32768),  ltree : [],  ttree:[],
        dmap : new u16(32768),  dtree : [],
        imap : new u16(  512),  itree : [],
        //rev9 : new u16(  512)
        rev15: new u16(1<<15),
        lhst : new u32(286), dhst : new u32( 30), ihst : new u32(19),
        lits : new u32(15000),
        strt : new u16(1<<16),
        prev : new u16(1<<15)
      };
    } ();

    (function(){
      var U = UZIP.F.U;
      var len = 1<<15;
      for(var i=0; i<len; i++) {
        var x = i;
        x = (((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1));
        x = (((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2));
        x = (((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4));
        x = (((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8));
        U.rev15[i] = (((x >>> 16) | (x << 16)))>>>17;
      }
  
      function pushV(tgt, n, sv) {  while(n--!=0) tgt.push(0,sv);  }
  
      for(var i=0; i<32; i++) {  U.ldef[i]=(U.of0[i]<<3)|U.exb[i];  U.ddef[i]=(U.df0[i]<<4)|U.dxb[i];  }
  
      pushV(U.fltree, 144, 8);  pushV(U.fltree, 255-143, 9);  pushV(U.fltree, 279-255, 7);  pushV(U.fltree,287-279,8);
      /*
        var i = 0;
        for(; i<=143; i++) U.fltree.push(0,8);
        for(; i<=255; i++) U.fltree.push(0,9);
        for(; i<=279; i++) U.fltree.push(0,7);
        for(; i<=287; i++) U.fltree.push(0,8);
        */
      UZIP.F.makeCodes(U.fltree, 9);
      UZIP.F.codes2map(U.fltree, 9, U.flmap);
      UZIP.F.revCodes (U.fltree, 9)
  
      pushV(U.fdtree,32,5);
      //for(i=0;i<32; i++) U.fdtree.push(0,5);
      UZIP.F.makeCodes(U.fdtree, 5);
      UZIP.F.codes2map(U.fdtree, 5, U.fdmap);
      UZIP.F.revCodes (U.fdtree, 5)
  
      pushV(U.itree,19,0);  pushV(U.ltree,286,0);  pushV(U.dtree,30,0);  pushV(U.ttree,320,0);
      /*
        for(var i=0; i< 19; i++) U.itree.push(0,0);
        for(var i=0; i<286; i++) U.ltree.push(0,0);
        for(var i=0; i< 30; i++) U.dtree.push(0,0);
        for(var i=0; i<320; i++) U.ttree.push(0,0);
        */
    })()
    `));
}
function generateWorkerScript() {
  return createWorker(`
    let scriptImported = false
    self.addEventListener('message', async (e) => {
      const { file, id, imageCompressionLibUrl, options } = e.data
      options.onProgress = (progress) => self.postMessage({ progress, id })
      try {
        if (!scriptImported) {
          // console.log('[worker] importScripts', imageCompressionLibUrl)
          self.importScripts(imageCompressionLibUrl)
          scriptImported = true
        }
        // console.log('[worker] self', self)
        const compressedFile = await imageCompression(file, options)
        self.postMessage({ file: compressedFile, id })
      } catch (e) {
        // console.error('[worker] error', e)
        self.postMessage({ error: e.message + '\\n' + e.stack, id })
      }
    })
  `);
}
function compressOnWebWorker(n, i) {
  return new Promise(function(c, r) {
    var e = cnt += 1;
    imageCompressionLibUrl || (imageCompressionLibUrl = generateLib()), worker || (worker = generateWorkerScript()), worker.addEventListener("message", function a(f) {
      if (f.data.id === e) {
        if (i.signal && i.signal.aborted)
          return;
        if (f.data.progress !== void 0)
          return void i.onProgress(f.data.progress);
        worker.removeEventListener("message", a), f.data.error && r(new Error(f.data.error)), c(f.data.file);
      }
    }), worker.addEventListener("error", r), i.signal && i.signal.addEventListener("abort", function() {
      worker.terminate(), r(i.signal.reason);
    }), worker.postMessage({ file: n, id: e, imageCompressionLibUrl, options: _objectSpread2(_objectSpread2({}, i), {}, { onProgress: void 0, signal: void 0 }) });
  });
}
function imageCompression(n, i) {
  return new Promise(function(c, r) {
    var e, a, f, s, u, l;
    if (e = _objectSpread2({}, i), f = 0, s = e.onProgress, e.maxSizeMB = e.maxSizeMB || Number.POSITIVE_INFINITY, u = typeof e.useWebWorker != "boolean" || e.useWebWorker, delete e.useWebWorker, e.onProgress = function(g) {
      f = g, typeof s == "function" && s(f);
    }, !(n instanceof Blob || n instanceof CustomFile))
      return r(new Error("The file given is not an instance of Blob or File"));
    if (!/^image/.test(n.type))
      return r(new Error("The file given is not an image"));
    if (l = typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope, !u || typeof Worker != "function" || l)
      return compress(n, e).then(function(g) {
        try {
          return a = g, d.call(this);
        } catch (p) {
          return r(p);
        }
      }.bind(this), r);
    var h = function() {
      try {
        return d.call(this);
      } catch (g) {
        return r(g);
      }
    }.bind(this), m = function(p) {
      try {
        return compress(n, e).then(function(v) {
          try {
            return a = v, h();
          } catch (U) {
            return r(U);
          }
        }, r);
      } catch (v) {
        return r(v);
      }
    };
    try {
      return compressOnWebWorker(n, e).then(function(g) {
        try {
          return a = g, h();
        } catch {
          return m();
        }
      }, m);
    } catch {
      m();
    }
    function d() {
      try {
        a.name = n.name, a.lastModified = n.lastModified;
      } catch {
      }
      return c(a);
    }
  });
}
imageCompression.getDataUrlFromFile = getDataUrlFromFile, imageCompression.getFilefromDataUrl = getFilefromDataUrl, imageCompression.loadImage = loadImage, imageCompression.drawImageInCanvas = drawImageInCanvas, imageCompression.drawFileInCanvas = drawFileInCanvas, imageCompression.canvasToFile = canvasToFile, imageCompression.getExifOrientation = getExifOrientation, imageCompression.handleMaxWidthOrHeight = handleMaxWidthOrHeight, imageCompression.followExifOrientation = followExifOrientation, imageCompression.cleanupCanvasMemory = cleanupCanvasMemory, imageCompression.isAutoOrientationInBrowser = isAutoOrientationInBrowser, imageCompression.approximateBelowMaximumCanvasSizeOfBrowser = approximateBelowMaximumCanvasSizeOfBrowser, imageCompression.getBrowserName = getBrowserName, imageCompression.version = "2.0.0";
const toggleChat = (n, i) => {
  if (!i) {
    attr(n, "disabled", !0);
    return;
  }
  removeAttr(n, "disabled"), focus(n);
}, toggleSpinner = (n, i) => {
  const c = "ci-spinner", r = find(`#${c}`, n);
  if (!i && r[0]) {
    remove(r);
    return;
  }
  if (i && !r[0]) {
    const e = create(`<div id="${c}"></div>`);
    append(n, e);
  }
}, getUploadingStates = (n) => {
  const i = find("#chat-form", n), c = find("#chat-message", n);
  return {
    on() {
      toggleChat(c, !1), toggleSpinner(i, !0);
    },
    off() {
      toggleChat(c, !0), toggleSpinner(i, !1);
    }
  };
}, createUploadFolder = async (n) => {
  const i = n || getSetting("uploadLocation");
  try {
    (await FilePicker.browse(ORIGIN_FOLDER, i)).target === "." && await FilePicker.createDirectory(ORIGIN_FOLDER, i, {});
  } catch {
    await FilePicker.createDirectory(ORIGIN_FOLDER, i, {});
  }
}, setSetting = (n, i) => game.settings.set("chat-images", n, i), getSettings = () => [
  {
    key: "uploadButton",
    options: {
      name: t("uploadButton"),
      hint: t("uploadButtonHint"),
      type: Boolean,
      default: !0,
      config: !0,
      requiresReload: !0
    }
  },
  {
    key: "uploadLocation",
    options: {
      name: t("uploadLocation"),
      hint: t("uploadLocationHint"),
      type: String,
      default: "uploaded-chat-images",
      scope: "world",
      config: !0,
      restricted: !0,
      onChange: async (n) => {
        const i = "uploaded-chat-images";
        let c = n.trim(), r = !1;
        c || (c = i, r = !0), c = c.replace(/\s+/g, "-"), n !== c && (r = !0), await createUploadFolder(c), r && await setSetting("uploadLocation", c);
      }
    }
  }
], registerSetting = (n) => game.settings.register("chat-images", n.key, n.options), getSetting = (n) => game.settings.get("chat-images", n), RESTRICTED_DOMAINS = ["static.wikia"], DOM_PARSER = new DOMParser();
let imageQueue = [];
const isFileImage = (n) => n.type && n.type.startsWith("image/"), createImagePreview = ({ imageSrc: n, id: i }) => create(
  `<div id="${i}" class="ci-upload-area-image">
            <i class="ci-remove-image-icon fa-regular fa-circle-xmark"></i>
            <img class="ci-image-preview" src="${n}" alt="${t("unableToLoadImage")}"/>
        </div>`
), addEventToRemoveButton = (n, i, c) => {
  on(n, "click", () => {
    const e = find(`#${i.id}`, c);
    remove(e), imageQueue = imageQueue.filter((a) => i.id !== a.id), !imageQueue.length && addClass(c, "hidden");
  });
}, uploadImage = async (n) => {
  const i = (c) => {
    const { type: r, name: e, id: a } = c, f = (e == null ? void 0 : e.substring(e.lastIndexOf("."), e.length)) || (r == null ? void 0 : r.replace("image/", ".")) || ".jpeg";
    return `${a}${f}`;
  };
  try {
    const c = i(n), r = await imageCompression(n.file, { maxSizeMB: 1.5, useWebWorker: !0, alwaysKeepResolution: !0 }), e = new File([r], c, { type: n.type }), a = getSetting("uploadLocation"), f = await FilePicker.upload(ORIGIN_FOLDER, a, e, {}, { notify: !1 });
    return !f || !(f != null && f.path) ? n.imageSrc : f == null ? void 0 : f.path;
  } catch {
    return n.imageSrc;
  }
}, addImageToQueue = async (n, i) => {
  const c = getUploadingStates(i);
  c.on();
  const r = find("#ci-chat-upload-area", i);
  if (!r || !r[0])
    return;
  if (n.file) {
    if (!userCanUpload()) {
      c.off();
      return;
    }
    n.imageSrc = await uploadImage(n);
  }
  const e = createImagePreview(n);
  if (!e || !e[0])
    return;
  removeClass(r, "hidden"), append(r, e), imageQueue.push(n);
  const a = find(".ci-remove-image-icon", e);
  addEventToRemoveButton(a, n, r), c.off();
}, imagesFileReaderHandler = (n, i) => async (c) => {
  var a;
  const r = (a = c.target) == null ? void 0 : a.result, e = { type: n.type, name: n.name, imageSrc: r, id: randomString(), file: n };
  await addImageToQueue(e, i);
}, processImageFiles = (n, i) => {
  for (let c = 0; c < n.length; c++) {
    const r = n[c];
    if (!isFileImage(r))
      continue;
    const e = new FileReader();
    e.addEventListener("load", imagesFileReaderHandler(r, i)), e.readAsDataURL(r);
  }
}, processDropAndPasteImages = (n, i) => {
  const c = (s) => {
    const u = s.getData("text/html");
    if (!u)
      return null;
    const l = DOM_PARSER.parseFromString(u, "text/html").querySelectorAll("img");
    if (!l || !l.length)
      return null;
    const h = [...l].map((d) => d.src);
    return h.some((d) => RESTRICTED_DOMAINS.some((g) => d.includes(g))) ? null : h;
  }, r = async (s) => {
    for (let u = 0; u < s.length; u++) {
      const h = { imageSrc: s[u], id: randomString() };
      await addImageToQueue(h, i);
    }
  }, e = c(n);
  if (e && e.length)
    return r(e);
  const f = ((s) => {
    const u = s.items, l = [];
    for (let h = 0; h < u.length; h++) {
      const m = u[h];
      if (!isFileImage(m))
        continue;
      const d = m.getAsFile();
      !d || l.push(d);
    }
    return l;
  })(n);
  if (f && f.length)
    return processImageFiles(f, i);
}, getImageQueue = () => imageQueue, removeAllFromQueue = (n) => {
  for (; imageQueue.length; ) {
    const c = imageQueue.pop();
    if (!c)
      continue;
    const r = find(`#${c.id}`, n);
    remove(r);
  }
  const i = find("#ci-chat-upload-area", n);
  addClass(i, "hidden");
}, createUploadButton = () => create(`<a id="ci-upload-image" title="${t("uploadButtonTitle")}"><i class="fas fa-images"></i></a>`), createHiddenUploadInput = () => create('<input type="file" multiple accept="image/*" id="ci-upload-image-hidden-input">'), setupEvents = (n, i, c) => {
  const r = (a) => {
    const f = a.currentTarget, s = f.files;
    !s || (processImageFiles(s, c), f.value = "");
  }, e = (a) => {
    a.preventDefault(), trigger(i, "click");
  };
  on(i, "change", r), on(n, "click", e);
}, initUploadButton = (n) => {
  if (!getSetting("uploadButton"))
    return;
  const i = find(".control-buttons", n), c = createUploadButton(), r = createHiddenUploadInput();
  if (!!userCanUpload(!0)) {
    if (i[0])
      addClass(i, "ci-control-buttons-gm"), append(i, c), append(i, r);
    else {
      const e = find("#chat-controls", n), a = create('<div class="ci-control-buttons-p"></div>');
      append(a, c), append(a, r), append(e, a);
    }
    setupEvents(c, r, n);
  }
};
let hookIsHandlingTheMessage = !1, eventIsHandlingTheMessage = !1;
const imageTemplate$1 = (n) => `<div class="ci-message-image"><img src="${n.imageSrc}" alt="${n.name || t("unableToLoadImage")}"></div>`, messageTemplate = (n) => `<div class="ci-message">${n.map((c) => imageTemplate$1(c)).join("")}</div>`, preCreateChatMessageHandler = (n) => (i, c, r) => {
  if (eventIsHandlingTheMessage)
    return;
  hookIsHandlingTheMessage = !0;
  const e = getImageQueue();
  if (!e.length) {
    hookIsHandlingTheMessage = !1;
    return;
  }
  const a = getUploadingStates(n);
  a.on();
  const f = `${messageTemplate(e)}<div class="ci-notes">${i.content}</div>`;
  i.content = f, i._source.content = f, r.chatBubble = !1, removeAllFromQueue(n), hookIsHandlingTheMessage = !1, a.off();
}, emptyChatEventHandler = (n) => async (i) => {
  if (hookIsHandlingTheMessage || i.code !== "Enter" && i.code !== "NumpadEnter" || i.shiftKey)
    return;
  eventIsHandlingTheMessage = !0;
  const c = getUploadingStates(n), r = getImageQueue();
  if (!r.length) {
    eventIsHandlingTheMessage = !1;
    return;
  }
  c.on();
  const e = {
    content: messageTemplate(r),
    type: CONST.CHAT_MESSAGE_TYPES.OOC || 1,
    user: game.user
  };
  await ChatMessage.create(e), removeAllFromQueue(n), c.off(), eventIsHandlingTheMessage = !1;
}, pastAndDropEventHandler = (n) => (i) => {
  const c = i.originalEvent, r = c.clipboardData || c.dataTransfer;
  !r || processDropAndPasteImages(r, n);
}, initChatSidebar = (n) => {
  Hooks.on("preCreateChatMessage", preCreateChatMessageHandler(n)), on(n, "keyup", emptyChatEventHandler(n)), on(n, "paste drop", pastAndDropEventHandler(n));
}, initChatMessage = (n) => {
  const i = find(".ci-message-image img", n);
  if (!i[0])
    return;
  on(i, "click", (r) => {
    const e = r.target.src;
    new ImagePopout(e, { editable: !1, shareable: !0 }).render(!0);
  });
}, imageMarkdownReg = /!\s*ci\s*\|\s*(.+?)\s*!/gi, imageReg = /\w+\.(gif|png|jpg|jpeg|webp|svg|psd|bmp|tif)/gi, imageTemplate = (n) => `<div class="ci-message-image"><img src="${n}" alt="${t("unableToLoadImage")}"></div>`, processMessage = (n) => n.match(imageMarkdownReg) ? n.replaceAll(imageMarkdownReg, (i, c) => c.match(imageReg) ? imageTemplate(c) : i) : n, registerSettings = () => {
  getSettings().forEach((i) => registerSetting(i));
};
Hooks.once("init", async () => {
  registerSettings(), await createUploadFolder();
});
Hooks.on("renderSidebarTab", (n, i) => {
  const c = i[0];
  !c || !c.querySelector("#chat-message") || (initUploadArea(i), initUploadButton(i), initChatSidebar(i));
});
Hooks.on("renderChatMessage", (n, i) => {
  !find(".ci-message-image", i)[0] || initChatMessage(i);
});
Hooks.on("preCreateChatMessage", (n, i, c) => {
  const r = processMessage(n.content);
  n.content !== r && (n.content = r, n._source.content = r, c.chatBubble = !1);
});

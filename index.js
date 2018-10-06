const querystring = require('querystring')
const https = require('https')
const iconv = require('iconv-lite')

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
const r = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/='

class VkAudioApi {
  constructor() {
    this.userId = ''
    this.cookie = ''
  }

  init({ userId, cookie }) {
    this.userId = userId
    this.cookie = cookie
  }

  getSource(data) {
    return new Promise((resolve, reject) => {
      const errorData = {
        code: 'invalid_data',
        message: 'Cannot load data from server'
      }
      if (!data || !data.user_id || !data.track_id) reject(errorData)
      const postData = {
        act: 'reload_audio',
        al: '1',
        ids: `${data.user_id}_${data.track_id}`
      }
      audioApi(postData)
        .then(data => {
          const track = parseTrack(data[0])
          resolve(track)
        })
        .catch(error => reject(error))
    })
  }

  getTracks() {
    const playlist = []
    return new Promise((resolve, reject) => {
      const postData = {
        'al': 1,
        'act': 'load_section',
        'owner_id': this.userId,
        'type': 'playlist',
        'playlist_id': '-1',
        'offset': 0
      }
      audioApi(postData)
        .then(data => {
          data.list.forEach(item => playlist.push(parseTrack(item)))
          if (data.hasMore != 0) {
            postData.offset = data.nextOffset
            audioApi(postData)
              .then(data => {
                data.list.forEach(item => playlist.push(parseTrack(item)))
                resolve(playlist)
              })
              .catch(error => reject(error))
          }
        })
        .catch(error => reject(error))
    })
  }
}

const l = {
  v: (t) => t.split('').reverse().join(''),
  r: (t, e) => {
    t = t.split('');
    for (var i, o = r + r, a = t.length; a--;)
      i = o.indexOf(t[a]), ~i && (t[a] = o.substr(i - e, 1));
    return t.join('')
  },
  s: (t, e) => {
    var i = t.length;
    if (i) {
      var o = s(t, e),
        a = 0;
      for (t = t.split(''); ++a < i;)
        t[a] = t.splice(o[i - 1 - a], 1, t[a])[0];
      t = t.join('')
    }
    return t
  },
  i: (t, e) => {
    return l.s(t, e ^ api.userId)
  },
  x: (t, e) => {
    var i = [];
    return e = e.charCodeAt(0),
      each(t.split(''), (t, o) => {
        i.push(String.fromCharCode(o.charCodeAt(0) ^ e))
      }),
      i.join('')
  }
};
const a = (t) => {
  if (!t || t.length % 4 == 1) return !1;
  for (var e, i, o = 0, a = 0, s = ''; i = t.charAt(a++);)
    i = r.indexOf(i), ~i && (e = o % 4 ? 64 * e + i : i, o++ % 4) && (s += String.fromCharCode(255 & e >> (-2 * o & 6)));
  return s
};
const s = (t, e) => {
  var i = t.length, o = [];
  if (i) {
    var a = i;
    for (e = Math.abs(e); a--;)
      e = (i * (a + 1) ^ e + a) % i,
        o[a] = e
  }
  return o;
};
const getRealLink = (t) => {
  if (~t.indexOf('audio_api_unavailable')) {
    var e = t.split('?extra=')[1].split('#'), o = '' === e[1] ? '' : a(e[1]);
    if (e = a(e[0]), 'string' != typeof o || !e)
      return t;
    o = o ? o.split(String.fromCharCode(9)) : [];
    for (var s, r, n = o.length; n--;) {
      if (r = o[n].split(String.fromCharCode(11)),
        s = r.splice(0, 1, e)[0], !l[s])
        return t;
      e = l[s].apply(null, r)
    }
    if (e && 'http' === e.substr(0, 4))
      return e
  }
  return t
};

const prepare = (data) => {
  try {
    let res = iconv.decode(data, 'win1251')
    let json_data = res.split('<!>')[5]
    json_data = JSON.parse(json_data.slice(7))
    return {
      error: false,
      data: json_data
    }
  } catch (e) {
    return {
      error: true,
      data: null
    }
  }
}

const parseTrack = (item) => {
  return {
    'track_id': item[0],
    'user_id': item[1],
    'src': getRealLink(item[2]),
    'title': item[3],
    'author': item[4],
    'cover': item[14].split(',')[0]
  }
}

const audioApi = (payload) => {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(payload)
    const postOptions = {
      host: 'vk.com',
      scheme: 'https',
      port: '443',
      path: '/al_audio.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': api.cookie,
        'user-agent': USER_AGENT
      }
    }
    const errorData = {
      code: 'http_request',
      message: 'Cannot load data from server'
    }
    httpsRequest(postOptions, postData)
      .then(response => {
        const { error, data } = prepare(response)
        if (error && !data) {
          reject(errorData)
        } else {
          resolve(data)
        }
      })
      .catch(() => reject(errorData))
  })
}

const httpsRequest = (params, postData) => {
  return new Promise((resolve, reject) => {
    var req = https.request(params, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode))
      }
      var body = []
      res.on('data', (chunk) => {
        body.push(chunk)
      })
      res.on('end', () => {
        try {
          body = Buffer.concat(body)
        } catch (e) {
          reject(e)
        }
        resolve(body)
      });
    });
    req.on('error', (err) => {
      reject(err)
    });
    if (postData) {
      req.write(postData)
    }
    req.end()
  })
}

const api = new VkAudioApi()

module.exports = api
function getCookie (name) {
  let arr
  let reg = new RegExp('(^| )' + name + '=([^]*)(|$)')
  if (document.cookie.match(reg)) {
    arr = document.cookie.match(reg)
    return (arr[2])
  } else {
    return null
  }
}

function setCookie (cookieName, value, expiredTime) {
  let exp = new Date()
  exp.setTime(expiredTime)
  document.cookie = cookieName + '=' + escape(value) + ((expiredTime == null) ? '' : ';expires=' + exp.toGMTString())
}

function delCookie (name) {
  let exp = new Date()
  exp.setTime(exp.getTime() - 1)
  let cval = getCookie(name)
  if (cval != null) {
    document.cookie = name + '=' + cval + 'expires=' + exp.toGMTString()
  }
}

module.exports = {
  getCookie: getCookie,
  setCookie: setCookie,
  delCookie: delCookie
}

import axios from 'axios'
axios.interceptors.response.use((response) => {
  if (response.data.code) {
    if (response.data.code === 0) {
      return response.data
    } else {
      alert(response.data)
      return Promise.reject(response.data)
    }
  } else {
    return response.data
  }
}, (error) => {
  return Promise.reject(error)
  // switch (error.response.status) {
  //   case 401:
  //     VueCookie.delete('__JWTToken')

  //     window.location.href = `${process.env.VUE_APP_API_BASE_URL}v2/wechat/user/login`
  //     break

  //   default:
  //     alert(error.response.data)
  //     return Promise.reject(error)
  // }
})

export default axios
